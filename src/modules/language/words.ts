import { supabase } from "../shared/auth";
import { publish } from "../shared/activity";
import type { Gender, LanguageConfig } from "./types";
import type { Tables } from "../shared/db";

/**
 * 단어 행 — 생성 타입에서 파생. gender는 성별 언어(es)에만 있는 컬럼(§6.2)이고 DB엔 text라
 * 앱의 Gender 유니온으로 좁혀 둔다. 조회 결과를 Word로 단언하는 자리는 그 좁힘 하나뿐이다
 */
export type Word = Omit<Tables<"es_words">, "gender"> & { gender?: Gender };

/** 전체 단어 (출제 풀·단어장 공용) */
export async function listWords(config: LanguageConfig): Promise<Word[]> {
  const { data, error } = await supabase
    .from(config.wordTable)
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as Word[];
}

/** 보유 단어 수 (허브 카드용) */
export async function countWords(config: LanguageConfig): Promise<number> {
  const { count, error } = await supabase
    .from(config.wordTable)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** norm 중복 조회 — 추가 폼 실시간 힌트용. 겹치는 기존 단어 또는 null */
export async function findByNorm(config: LanguageConfig, word: string): Promise<Word | null> {
  const norm = config.normalize(word);
  if (!norm) return null;
  const { data, error } = await supabase
    .from(config.wordTable)
    .select("*")
    .eq("norm", norm)
    .limit(1);
  if (error) throw error;
  return (data[0] as Word) ?? null;
}

/** 단어 추가 — norm 중복이면 에러 대신 기존 단어 반환 {duplicate} */
export async function addWord(
  config: LanguageConfig,
  input: { word: string; meaning: string; gender?: Gender },
): Promise<{ added: Word | null; duplicate: Word | null }> {
  const word = input.word.trim();
  const meaning = input.meaning.trim();
  const dup = await findByNorm(config, word);
  if (dup) return { added: null, duplicate: dup };
  // gender 컬럼은 성별 언어의 표에만 있다 — hasGender로 갈라야 각 갈래가 자기 표의 삽입 타입으로 검사된다
  const row = { word, meaning, norm: config.normalize(word) };
  const insert = config.hasGender
    ? supabase.from(config.wordTable).insert({ ...row, gender: input.gender ?? "none" })
    : supabase.from(config.wordTable).insert(row);
  const { data, error } = await insert.select().single();
  if (error) throw error;
  const added = data as Word;
  // 단어 추가는 건별 발행 (docs/06 §6.4)
  await publish("language", `${config.code}_word`, added.id, "created", `단어 추가: ${added.word} — ${added.meaning}`);
  return { added, duplicate: null };
}

export async function updateWord(
  config: LanguageConfig,
  id: number,
  input: { word: string; meaning: string; gender?: Gender },
): Promise<void> {
  const word = input.word.trim();
  const row = { word, meaning: input.meaning.trim(), norm: config.normalize(word) };
  const update = config.hasGender
    ? supabase.from(config.wordTable).update({ ...row, gender: input.gender ?? "none" })
    : supabase.from(config.wordTable).update(row);
  const { error } = await update.eq("id", id);
  if (error) throw error;
}

/**
 * 단어 삭제 — cascade 이원화 (docs/09 §9.3, docs/14 §14.7):
 * 자식 테이블(review_log·sentences·fetch)은 DB FK cascade,
 * 다형 참조 행(reflection)은 여기(앱 레이어)서 지운다. activity는 보존.
 */
export async function deleteWord(config: LanguageConfig, id: number): Promise<void> {
  const subjectType = `${config.code}_word`;
  const { data: threads, error: thErr } = await supabase
    .from("reflection_thread")
    .select("id")
    .eq("subject_type", subjectType)
    .eq("subject_id", id);
  if (thErr) throw thErr;
  if (threads.length > 0) {
    const { error } = await supabase
      .from("reflection_thread")
      .delete()
      .in("id", threads.map((t) => t.id));
    if (error) throw error; // entry는 DB cascade
  }
  const { error } = await supabase.from(config.wordTable).delete().eq("id", id);
  if (error) throw error;
}
