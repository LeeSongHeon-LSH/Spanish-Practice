import { supabase } from "../shared/auth";
import { publish } from "../shared/activity";
import type { Tables } from "../shared/db";

/** topics는 로컬 워커가 채우는 주제 키워드 (null = 미분석) */
export type Thought = Tables<"thought">;
/** day는 YYYY-MM-DD */
export type ThoughtDigest = Tables<"thought_digest">;

/** 생각 기록 — append-only (감상과 같은 원칙, 수정·삭제 없음) */
export async function addThought(content: string): Promise<Thought> {
  const { data, error } = await supabase
    .from("thought")
    .insert({ content })
    .select()
    .single();
  if (error) throw error;
  const added = data;
  const line = content.split("\n")[0].slice(0, 30);
  await publish("thought", "thought", added.id, "created", `생각 기록: ${line}`);
  return added;
}

/** 한 달치 메모 (month는 1~12, 브라우저 로컬 월 경계) — 달력 한 화면의 데이터 */
export async function thoughtsInMonth(year: number, month: number): Promise<Thought[]> {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  const { data, error } = await supabase
    .from("thought")
    .select("*")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function countThoughts(): Promise<number> {
  const { count, error } = await supabase
    .from("thought")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** 최신순 병합 + id 중복 제거 (내용 검색·주제 검색 결과 합치기) */
export function mergeThoughts(a: Thought[], b: Thought[], limit: number): Thought[] {
  const seen = new Set<number>();
  return [...a, ...b]
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))
    .slice(0, limit);
}

/** 검색 — 내용 부분일치 또는 주제 키워드 정확 일치 (최신순) */
export async function searchThoughts(query: string, limit = 80): Promise<Thought[]> {
  const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const [byContent, byTopic] = await Promise.all([
    supabase
      .from("thought")
      .select("*")
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("thought")
      .select("*")
      .contains("topics", [query])
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (byContent.error) throw byContent.error;
  if (byTopic.error) throw byTopic.error;
  return mergeThoughts(byContent.data as Thought[], byTopic.data as Thought[], limit);
}

/** 과거의 오늘 — n일 전 그날 쓴 생각들 (되짚기, 시간순) */
export async function thoughtsDaysAgo(days: number, now: Date = new Date()): Promise<Thought[]> {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("thought")
    .select("*")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** 주제 빈도 집계 — 상위 limit개 [주제, 횟수] (동률은 이름순) */
export function topTopics(topicLists: (string[] | null)[], limit = 8): [string, number][] {
  const counts = new Map<string, number>();
  for (const list of topicLists)
    for (const topic of list ?? []) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

/** 최근 n일간 메모의 주제 목록 (궤적 집계용) */
export async function recentTopics(days = 30): Promise<(string[] | null)[]> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("thought")
    .select("topics")
    .gte("created_at", from)
    .not("topics", "is", null);
  if (error) throw error;
  return (data as { topics: string[] | null }[]).map((r) => r.topics);
}

/** 한 달치 하루 요약 (month는 1~12) — digest.day 문자열 축이라 로컬 월 키로 자른다 */
export async function digestsInMonth(year: number, month: number): Promise<ThoughtDigest[]> {
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}-01`;
  const { data, error } = await supabase
    .from("thought_digest")
    .select("*")
    .gte("day", key(year, month))
    .lt("day", month === 12 ? key(year + 1, 1) : key(year, month + 1));
  if (error) throw error;
  return data;
}

/** 로컬 기준 날짜 키 (YYYY-MM-DD) — digest.day와 같은 축 */
export const dayKey = (iso: string): string => {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** 최신순 목록을 날짜 그룹으로 (입력 순서 유지) */
export function groupByDay(thoughts: Thought[]): { day: string; items: Thought[] }[] {
  const groups: { day: string; items: Thought[] }[] = [];
  for (const t of thoughts) {
    const day = dayKey(t.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(t);
    else groups.push({ day, items: [t] });
  }
  return groups;
}
