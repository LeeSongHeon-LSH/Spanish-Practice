export type Gender = "m" | "f" | "n" | "none";

/**
 * 언어별 표·RPC 이름 — 생성 타입(src/modules/shared/db)의 리터럴. 언어 추가 = 여기 멤버 하나 + 테이블 복제.
 * 성별(gender) 컬럼은 성별 언어의 표에만 있으므로(§6.2) hasGender가 표 집합을 판별한다 —
 * 그래야 단어 삽입·갱신에서 gender를 넣는 갈래가 그 표의 삽입 타입으로 검사된다
 */
type EsTables = {
  hasGender: true;
  wordTable: "es_words";
  reviewLogTable: "es_review_log";
  wordStatsFn: "es_word_stats";
  dailyStatsFn: "es_daily_stats";
  sentenceTable: "es_sentences";
  sentenceFetchTable: "es_sentence_fetch";
};
type EnTables = {
  hasGender: false;
  wordTable: "en_words";
  reviewLogTable: "en_review_log";
  wordStatsFn: "en_word_stats";
  dailyStatsFn: "en_daily_stats";
  sentenceTable: "en_sentences";
  sentenceFetchTable: "en_sentence_fetch";
};

/**
 * 언어별 규칙 주입점 (docs/06 §6.2 — 언어별 분기는 config 안에만 존재).
 * 언어 추가 = 이 규칙 구현 1개 + 위 표 집합 1개.
 */
export interface LanguageRules {
  code: string;
  /** 화면 표시명 ("스페인어") */
  label: string;
  /** Tatoeba 검색 소스 언어 코드 (스페인어 'spa') */
  tatoebaLang: string;
  /** Tatoeba 번역 수집 언어 우선순위 — 원문 언어 자신은 제외 */
  transLangs: ("kor" | "eng")[];
  /** 중복 차단용 정규화 — DB norm 컬럼 값 */
  normalize(word: string): string;
  /** 채점 관대 비교용 변형. null이면 정확 일치만 */
  gradeLenient: ((s: string) => string) | null;
  /** speechSynthesis 발음 lang */
  speechLang: string;
  /** 대상 언어 입력 placeholder */
  inputPlaceholder: string;
  /** 입력 보조 문자 버튼 (빈 배열 = 미표시) */
  accentChars: string[];
  /** alt+키 → 특수문자 입력 */
  altKeyMap: Record<string, string>;
}

export type LanguageConfig = LanguageRules & (EsTables | EnTables);
