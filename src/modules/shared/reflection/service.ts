import { supabase } from "../auth";
import type { Tables } from "../db";

export type ReflectionEntry = Pick<Tables<"reflection_entry">, "id" | "content" | "context" | "created_at">;

/** 대상의 생각 타임라인 — 오래된 순 (§11.7: 위→아래로 변화가 읽히도록) */
export async function getTimeline(
  subjectType: string,
  subjectId: number,
): Promise<ReflectionEntry[]> {
  const { data: thread, error } = await supabase
    .from("reflection_thread")
    .select("id")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (error) throw error;
  if (!thread) return [];
  const { data, error: eErr } = await supabase
    .from("reflection_entry")
    .select("id, content, context, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });
  if (eErr) throw eErr;
  return data;
}

/** append-only 추가 — 스레드 없으면 자동 생성 (엔티티당 1개, §4.4). 수정·삭제 API 없음 (§4.2) */
export async function addEntry(
  subjectType: string,
  subjectId: number,
  content: string,
  context?: string,
): Promise<void> {
  const { data: found, error } = await supabase
    .from("reflection_thread")
    .select("id")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (error) throw error;
  let thread = found;
  if (!thread) {
    const { data: created, error: cErr } = await supabase
      .from("reflection_thread")
      .insert({ subject_type: subjectType, subject_id: subjectId })
      .select("id")
      .single();
    if (cErr) throw cErr;
    thread = created;
  }
  const { error: iErr } = await supabase
    .from("reflection_entry")
    .insert({ thread_id: thread.id, content: content.trim(), context: context?.trim() || null });
  if (iErr) throw iErr;
}

/** 대상의 스레드 삭제 (entry는 DB cascade) — 엔티티 삭제 시 앱 레이어 정리용 (§14.7) */
export async function removeThread(subjectType: string, subjectId: number): Promise<void> {
  const { error } = await supabase
    .from("reflection_thread")
    .delete()
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId);
  if (error) throw error;
}
