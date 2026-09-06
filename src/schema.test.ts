import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 스키마 드리프트 — 마이그레이션이 만든 표 목록과 생성 타입(database.types.ts)의 표 목록이 같아야 한다.
// 표를 추가·삭제하고 npm run db:types를 잊으면 여기서 잡힌다. (컬럼 변경은 재생성으로만 잡힌다)
const root = join(__dirname, "..");

function tablesFromMigrations(): Set<string> {
  const dir = join(root, "supabase/migrations");
  const live = new Set<string>();
  for (const f of readdirSync(dir).sort()) {
    const sql = readFileSync(join(dir, f), "utf8").toLowerCase();
    for (const m of sql.matchAll(/create table (?:if not exists )?([a-z_]+)/g)) live.add(m[1]);
    for (const m of sql.matchAll(/drop table (?:if exists )?([a-z_]+)/g)) live.delete(m[1]);
  }
  return live;
}

function tablesFromTypes(): Set<string> {
  const ts = readFileSync(join(root, "src/modules/shared/db/database.types.ts"), "utf8");
  const block = /Tables: \{\n([\s\S]*?)\n    \}\n    Views:/.exec(ts);
  expect(block, "생성 타입에서 Tables 블록을 못 찾음").toBeTruthy();
  return new Set([...block![1].matchAll(/^      ([a-z_]+): \{$/gm)].map((m) => m[1]));
}

describe("스키마 드리프트 (마이그레이션 ↔ 생성 타입)", () => {
  it("표 목록이 같다", () => {
    const fromSql = [...tablesFromMigrations()].sort();
    const fromTs = [...tablesFromTypes()].sort();
    expect(fromSql.length).toBeGreaterThan(0);
    expect(fromTs).toEqual(fromSql);
  });
});
