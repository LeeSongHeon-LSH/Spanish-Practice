#!/bin/sh
# Supabase 스키마 → TypeScript 타입 재생성 (docs/16 §16.13). 마이그레이션을 적용한 뒤 한 번 돌린다: npm run db:types
# 접속은 backup-db.sh와 같은 풀러 세션 모드 + ~/.lshobby/db-password. CLI는 npx로 받는다 (postgres-meta 도커 이미지를 쓴다).
set -eu
REPO=$(cd "$(dirname "$0")/.." && pwd)
OUT="$REPO/src/modules/shared/db/database.types.ts"
REF=$(sed -nE 's#^NEXT_PUBLIC_SUPABASE_URL=https?://([^.]+)\..*#\1#p' "$REPO/.env")
[ -n "$REF" ] || { echo "NEXT_PUBLIC_SUPABASE_URL을 .env에서 못 읽음" >&2; exit 1; }
PW=$(python3 -c 'import urllib.parse,pathlib,os;print(urllib.parse.quote(pathlib.Path(os.path.expanduser("~/.lshobby/db-password")).read_text().strip(),safe=""))')
URL="postgresql://postgres.$REF:$PW@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
tmp=$(mktemp)
{
  echo "// 생성 파일 — 손으로 고치지 않는다. 재생성: npm run db:types (scripts/gen-db-types.sh)"
  echo "// 원본은 Supabase 실제 스키마(public). 마이그레이션 뒤 재생성하지 않으면 src/schema.test.ts가 표 목록 불일치를 잡는다"
  npx -y supabase@2.116.0 gen types typescript --db-url "$URL" --schema public
} > "$tmp"
mv "$tmp" "$OUT"
echo "생성: $OUT ($(wc -l < "$OUT")줄)"
