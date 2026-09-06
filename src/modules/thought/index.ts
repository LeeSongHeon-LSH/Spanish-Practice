// thought 모듈 공개 인터페이스 — 타 모듈은 이 파일을 통해서만 접근 (docs/03 §3.4)
export {
  addThought,
  countThoughts,
  dayKey,
  digestsInMonth,
  groupByDay,
  mergeThoughts,
  recentTopics,
  searchThoughts,
  thoughtsDaysAgo,
  thoughtsInMonth,
  topTopics,
  type Thought,
  type ThoughtDigest,
} from "./service";
