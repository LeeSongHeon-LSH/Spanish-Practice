import { supabase } from "../auth";
import type { Tables } from "../db";

export type FeedItem = Tables<"activity_feed">;

/** 건별 이벤트 발행 (docs/05 §5.3) */
export async function publish(
  domain: string,
  entityType: string,
  entityId: number,
  action: string,
  summary: string,
): Promise<void> {
  const { error } = await supabase
    .from("activity_feed")
    .insert({ domain, entity_type: entityType, entity_id: entityId, action, summary });
  if (error) throw error;
}

/** 로컬(브라우저) 기준 오늘의 시작·끝 — "당일 1건 갱신" 판정용 */
const todayRange = (now: Date): { from: string; to: string } => {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

/** 당일 1건 갱신 발행 — 언어 학습 요약(§6.4)·CS 본문 수정(§8.4)용 */
export async function upsertDaily(
  domain: string,
  entityType: string,
  entityId: number,
  action: string,
  summary: string,
  now: Date = new Date(),
): Promise<void> {
  const { from, to } = todayRange(now);
  const { data, error } = await supabase
    .from("activity_feed")
    .select("id")
    .eq("domain", domain)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("action", action)
    .gte("occurred_at", from)
    .lt("occurred_at", to)
    .limit(1);
  if (error) throw error;
  if (data.length > 0) {
    const { error: updErr } = await supabase
      .from("activity_feed")
      .update({ summary, occurred_at: now.toISOString() })
      .eq("id", data[0].id);
    if (updErr) throw updErr;
  } else {
    await publish(domain, entityType, entityId, action, summary);
  }
}

/** 홈 타임라인 — activity_feed 단일 조회 (docs/05 §5.3) */
export async function getFeed(limit = 30, before?: string): Promise<FeedItem[]> {
  let q = supabase
    .from("activity_feed")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("occurred_at", before);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
