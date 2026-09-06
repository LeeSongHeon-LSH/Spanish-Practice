#!/bin/sh
# scripts/systemd/ 의 유닛을 ~/.config/systemd/user 에 복사하고 타이머를 켠다 (docs/16 §16.14). 재실행 안전.
# 배포 타이머(lshobby-deploy.*)는 여기 없다 — 2026-08-30에 손으로 만든 그대로다.
set -eu
src="$(cd "$(dirname "$0")" && pwd)/systemd"
dst="$HOME/.config/systemd/user"
mkdir -p "$dst"
cp "$src"/*.service "$src"/*.timer "$dst"/
systemctl --user daemon-reload
for t in lshobby-digest lshobby-notion-backup lshobby-backup; do
  systemctl --user enable --now "$t.timer"
done
systemctl --user list-timers 'lshobby-*' --no-pager
