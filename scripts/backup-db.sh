#!/bin/sh
# Supabase Postgres 주 1회 백업 + 복원 리허설 (docs/12 NFR-04, docs/16 §16.14).
# lshobby-backup.timer가 부른다 — 손으로 돌릴 때도 그냥 scripts/backup-db.sh
#
# 이 PC엔 pg_dump가 없다. 서버와 같은 메이저(17)의 pg_dump를 로컬 Supabase Postgres 이미지로 돌리고,
# 매번 빈 postgres:17 컨테이너에 복원해 표별 행 수를 원본과 대조한다 — 복원 안 되는 백업은 백업이 아니다.
# 덤프는 public 스키마만: 앱 데이터 전부가 거기 있고, auth·storage는 Supabase가 관리하는 영역이라
# 새 프로젝트에 복원할 때 다시 만드는 쪽이다(계정 1개, Storage 미사용).
set -eu

REPO=/home/leesongheon/projects/LSHobby
DIR="$HOME/.lshobby/backups"
KEEP=8                                                    # 주 1회 × 8 = 두 달치
DUMP_IMAGE=public.ecr.aws/supabase/postgres:17.6.1.155    # pg_dump 17 — `supabase start`가 받아 둔 이미지
RESTORE_IMAGE=postgres:17-alpine                          # 리허설용 빈 DB
POOLER=aws-0-ap-northeast-2.pooler.supabase.com           # 세션 모드 5432. 직접 접속(db.*.supabase.co)은 IPv6 전용이라 이 PC에선 안 된다

REF=$(sed -nE 's#^NEXT_PUBLIC_SUPABASE_URL=https?://([^.]+)\..*#\1#p' "$REPO/.env")
[ -n "$REF" ] || { echo "NEXT_PUBLIC_SUPABASE_URL을 $REPO/.env에서 못 읽음" >&2; exit 1; }
PGPASSWORD=$(cat "$HOME/.lshobby/db-password")
export PGPASSWORD
CONN="host=$POOLER port=5432 user=postgres.$REF dbname=postgres sslmode=require"

work=$(mktemp -d)
cid=""
cleanup() {
  [ -n "$cid" ] && docker rm -f "$cid" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

# public 표마다 정확한 행 수 — "표|행수" 한 줄씩. \gexec가 string_agg로 만든 SELECT들을 실행한다
cat > "$work/count.sql" <<'SQL'
select string_agg(format('select %L, count(*) from %I', tablename, tablename), ' union all ' order by tablename)
from pg_tables where schemaname = 'public'
\gexec
SQL

# --- 1. 덤프 -----------------------------------------------------------------
mkdir -p "$DIR"
file="$DIR/lshobby-$(date +%Y%m%d-%H%M).dump"
echo "덤프: $file"
docker run --rm -e PGPASSWORD "$DUMP_IMAGE" \
  pg_dump "$CONN" --format=custom --schema=public --no-owner --no-privileges > "$file"
[ -s "$file" ] || { echo "덤프 파일이 비었음" >&2; exit 1; }

live=$(docker run --rm -i -e PGPASSWORD "$DUMP_IMAGE" psql "$CONN" -At < "$work/count.sql" | sort)
[ -n "$live" ] || { echo "원본 행 수를 못 읽음" >&2; exit 1; }

# --- 2. 복원 리허설 -----------------------------------------------------------
cid=$(docker run -d --rm -e POSTGRES_PASSWORD=rehearsal -v "$DIR":/backups:ro "$RESTORE_IMAGE")
# 공식 이미지는 initdb 뒤 한 번 재시작한다 — 준비됐다는 답을 두 번 받을 때까지 기다린다
ready=0; i=0
while [ $ready -lt 2 ]; do
  if docker exec "$cid" pg_isready -U postgres -q 2>/dev/null; then ready=$((ready + 1)); sleep 2
  else ready=0; sleep 1; fi
  i=$((i + 1)); [ $i -lt 60 ] || { echo "리허설 컨테이너가 60초 안에 안 뜸" >&2; exit 1; }
done
# 정책이 참조하는 Supabase 역할 셋 — 이것만 있으면 public 스키마는 맨 Postgres에 그대로 들어간다.
# 기본 public 스키마는 지운다(덤프가 CREATE SCHEMA public을 갖고 있어 남겨 두면 그 한 줄이 오류로 찍힌다)
docker exec "$cid" psql -U postgres -q -c \
  "create role anon nologin; create role authenticated nologin; create role service_role nologin; drop schema public;"
docker exec "$cid" pg_restore -U postgres -d postgres --no-owner --no-privileges \
  "/backups/$(basename "$file")" 2> "$work/restore.err" || true
errors=$(grep -c "^pg_restore: error" "$work/restore.err" || true)

restored=$(docker exec -i "$cid" psql -U postgres -At < "$work/count.sql" | sort)
if [ "$live" != "$restored" ]; then
  echo "복원 리허설 실패 — 표별 행 수가 원본과 다름 (pg_restore 오류 $errors건):" >&2
  printf '%s\n' "$live" > "$work/live"; printf '%s\n' "$restored" > "$work/restored"
  diff "$work/live" "$work/restored" >&2 || true
  sed -n 1,20p "$work/restore.err" >&2
  exit 1
fi

# --- 3. 보관 회전 -------------------------------------------------------------
ls -1t "$DIR"/lshobby-*.dump | tail -n +$((KEEP + 1)) | xargs -r rm --

tables=$(printf '%s\n' "$live" | wc -l)
rows=$(printf '%s\n' "$live" | awk -F'|' '{ s += $2 } END { print s }')
echo "완료: 표 $tables개 · 행 $rows개 · $(du -h "$file" | cut -f1) · 복원 리허설 일치 (pg_restore 오류 $errors건) · 보관 $(ls "$DIR"/lshobby-*.dump | wc -l)/$KEEP"
