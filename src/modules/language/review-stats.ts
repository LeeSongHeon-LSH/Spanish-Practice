import { supabase } from "../shared/auth";
import type { LanguageConfig } from "./types";

export interface WordStat {
  reviews: number;
  correct: number;
  /** 최초 복습 시각 — "오늘 신규 시작" 판정용 (퀴즈의 로컬 갱신 객체엔 없음) */
  firstReviewedAt?: string | null;
}

/**
 * 단어별 복습 횟수·정답 수 — review_log 파생 (결정 #36), 집계는 DB RPC.
 * 클라이언트 전량 조회는 PostgREST 1000행 캡에서 조용히 틀려져 RPC로 대체 (성능 리뷰 P1).
 * rating≥2 = 정답(Good) 판정은 RPC 안에 동일하게 산다.
 */
export async function reviewStats(config: LanguageConfig): Promise<Map<number, WordStat>> {
  const { data, error } = await supabase.rpc(config.wordStatsFn);
  if (error) throw error;
  return new Map(
    data.map((r) => [r.word_id, { reviews: r.reviews, correct: r.correct, firstReviewedAt: r.first_reviewed_at }]),
  );
}
