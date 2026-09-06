import { supabase } from "../shared/auth";
import type { Database } from "../shared/db";
import type { LanguageConfig } from "./types";
import type { Word } from "./words";

/** 로컬 기준 YYYY-MM-DD */
export const localDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface DailyCount {
  date: string;
  total: number;
  correct: number;
}

/** 일별 집계 RPC 행 — day는 호출자 타임존 기준 YYYY-MM-DD. es·en RPC는 같은 모양 */
export type DailyRow = Database["public"]["Functions"]["es_daily_stats"]["Returns"][number];

export interface LangStats {
  streak: number;
  todayTotal: number;
  totalReviews: number;
  totalCorrect: number;
  daily: DailyCount[]; // 오래된 → 최신 14일
  stateCounts: [number, number, number, number]; // New/Learning/Review/Relearning
}

/** 연속 학습일 (구 stats.py compute_streak 이식) — 마지막 학습이 오늘/어제인 연속만 인정 */
export function computeStreak(datesDesc: string[], today: string): number {
  if (datesDesc.length === 0) return 0;
  const dayMs = 86400000;
  const t = new Date(today).getTime();
  const latest = new Date(datesDesc[0]).getTime();
  if ((t - latest) / dayMs > 1) return 0;
  let streak = 1;
  let prev = latest;
  for (const ds of datesDesc.slice(1)) {
    const d = new Date(ds).getTime();
    if ((prev - d) / dayMs === 1) {
      streak += 1;
      prev = d;
    } else break;
  }
  return streak;
}

/** 일별 맵에서 통계 구성 — aggregate·aggregateDaily 공용 코어 */
function fromByDay(
  byDay: Map<string, { total: number; correct: number }>,
  words: Word[],
  now: Date,
): LangStats {
  const today = localDate(now);
  const daily: DailyCount[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = localDate(new Date(now.getTime() - i * 86400000));
    const e = byDay.get(d);
    daily.push({ date: d, total: e?.total ?? 0, correct: e?.correct ?? 0 });
  }
  const datesDesc = [...byDay.keys()].sort().reverse();
  const stateCounts: [number, number, number, number] = [0, 0, 0, 0];
  for (const w of words) stateCounts[w.state] = (stateCounts[w.state] ?? 0) + 1;
  let totalReviews = 0;
  let totalCorrect = 0;
  for (const e of byDay.values()) {
    totalReviews += e.total;
    totalCorrect += e.correct;
  }
  return {
    streak: computeStreak(datesDesc, today),
    todayTotal: byDay.get(today)?.total ?? 0,
    totalReviews,
    totalCorrect,
    daily,
    stateCounts,
  };
}

/** 로그·단어에서 통계 집계 (전부 review_log 파생 — 결정 #36) */
export function aggregate(
  logs: { rating: number; reviewed_at: string }[],
  words: Word[],
  now: Date = new Date(),
): LangStats {
  const byDay = new Map<string, { total: number; correct: number }>();
  for (const l of logs) {
    const day = localDate(new Date(l.reviewed_at));
    const e = byDay.get(day) ?? { total: 0, correct: 0 };
    e.total += 1;
    if (l.rating >= 2) e.correct += 1;
    byDay.set(day, e);
  }
  return fromByDay(byDay, words, now);
}

/** 사전 집계된 일별 행에서 통계 구성 — aggregate와 동일 규칙 (성능 리뷰 P1) */
export function aggregateDaily(rows: DailyRow[], words: Word[], now: Date = new Date()): LangStats {
  return fromByDay(new Map(rows.map((r) => [r.day, { total: r.total, correct: r.correct }])), words, now);
}

/** 일별 집계 — DB RPC. 일 경계는 디바이스 타임존 (클라이언트 전량 집계 대체, 성능 리뷰 P1) */
export async function dailyStats(config: LanguageConfig): Promise<DailyRow[]> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, error } = await supabase.rpc(config.dailyStatsFn, { tz });
  if (error) throw error;
  return data;
}

export async function fetchStats(config: LanguageConfig, words: Word[]): Promise<LangStats> {
  return aggregateDaily(await dailyStats(config), words);
}

/** 오늘의 학습 요약 — 일별 집계의 오늘 행 (§6.4 일별 activity 요약·덱 하단 표시용) */
export async function todayReviewSummary(
  config: LanguageConfig,
  now: Date = new Date(),
): Promise<{ count: number; correct: number }> {
  const rows = await dailyStats(config);
  const t = rows.find((r) => r.day === localDate(now));
  return { count: t?.total ?? 0, correct: t?.correct ?? 0 };
}

/** CSV export (§6.5 — 구 EXPORT_COLUMNS를 FSRS 체계로) */
export function buildCsv(words: Word[], perWord: Map<number, { reviews: number; correct: number }>): string {
  const esc = (v: unknown): string => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["word", "gender", "meaning", "reviews", "correct", "state", "due", "created_at"];
  const lines = [header.join(",")];
  for (const w of words) {
    const s = perWord.get(w.id) ?? { reviews: 0, correct: 0 };
    lines.push(
      [w.word, w.gender ?? "", w.meaning, s.reviews, s.correct, w.state, w.due ?? "", w.created_at]
        .map(esc)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}
