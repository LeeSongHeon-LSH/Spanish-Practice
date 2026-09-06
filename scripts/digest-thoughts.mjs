// 생각 다이제스트 배치 — 로컬 Ollama(EXAONE)로 하루 요약 + 메모별 주제 키워드 (결정: grill 세션 2026-08-21)
// 실행: node --env-file=.env scripts/digest-thoughts.mjs  (집 PC cron 매일 밤)
//
// 정책:
// - 생각 데이터는 어떤 외부 API로도 보내지 않는다 — 분석은 localhost Ollama 전용
// - 판단·조언 없이 요약만. 산출: 하루 요약 3~5줄 + 메모별 주제 키워드 + activity 사실 한 줄
// - 어제까지의 날 중 다이제스트 없는 날만 처리 (소급 — PC가 꺼졌던 날도 다음 실행에서 따라잡음)
// - digest.topics = 그날 메모 주제의 합집합, activity 한 줄은 LLM 없이 activity_feed 집계
// - Ollama 응답이 형식에 안 맞으면 1회 재시도, 그래도 실패하면 그 날은 건너뜀 (다음 실행에서 재시도)
import { createClient } from "@supabase/supabase-js";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.DIGEST_MODEL ?? "exaone3.5:7.8b";
const TOPICS_PER_THOUGHT = 3;
const TOPICS_PER_DAY = 8;

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[key]) {
    console.error(`${key}가 없습니다 — .env를 확인하세요`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// KST 고정 — 앱의 하루 경계를 따른다 (sync-notion-backup.mjs kstDate와 같은 축).
// 이 PC의 타임존으로 계산하면 안 된다: 서버는 UTC로 도는데 앱은 브라우저(KST) 기준이라,
// KST 00:00~09:00에 쓴 메모가 전날로 묶여 앱이 보여 주는 날짜와 어긋난다
const KST_OFFSET_MS = 9 * 3600e3;
const dayKey = (iso) => new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
const dayRange = (day) => {
  const from = new Date(Date.parse(`${day}T00:00:00Z`) - KST_OFFSET_MS); // 그날 00:00 KST
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

// ---------- Ollama (localhost 전용) ----------
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          n: { type: "integer" },
          topics: { type: "array", items: { type: "string" } },
        },
        required: ["n", "topics"],
      },
    },
  },
  required: ["summary", "items"],
};

async function summarizeDay(thoughts) {
  const prompt = [
    "다음은 한 사람이 하루 동안 기록한 개인 생각 메모다.",
    "판단·조언·평가 없이 내용을 있는 그대로 요약만 하라.",
    "",
    "JSON으로 출력:",
    '- "summary": 하루 생각의 흐름을 자연스러운 한국어 문장 3~5줄로 요약. 문장만 쓸 것 — 번호·목록·키워드·JSON 표기를 섞지 말 것',
    `- "items": 메모별 주제 키워드 — {"n": 메모 번호, "topics": 한국어 명사 키워드 1~${TOPICS_PER_THOUGHT}개}`,
    "",
    "메모:",
    ...thoughts.map((t, i) => `${i + 1}. ${t.content}`),
  ].join("\n");

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        format: RESPONSE_SCHEMA,
        options: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(300000),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 300)}`);
    try {
      const out = JSON.parse((await res.json()).message?.content ?? "");
      const summary = typeof out.summary === "string" ? out.summary.trim() : "";
      if (!summary || !Array.isArray(out.items)) continue;
      if (/items|[{}[\]"]/.test(summary)) continue; // 요약에 구조 표기가 새면 재시도
      const topicsByIndex = new Map();
      for (const item of out.items) {
        if (!Number.isInteger(item.n) || !Array.isArray(item.topics)) continue;
        const topics = item.topics
          .filter((t) => typeof t === "string" && t.trim())
          .map((t) => t.trim())
          .slice(0, TOPICS_PER_THOUGHT);
        if (topics.length > 0) topicsByIndex.set(item.n - 1, topics);
      }
      return { summary, topicsByIndex };
    } catch {
      continue;
    }
  }
  return null;
}

// ---------- activity 사실 한 줄 (LLM 없이 집계) ----------
const DOMAIN_LABELS = { language: "언어", library: "책" };

async function activityLine(day) {
  const { from, to } = dayRange(day);
  const { data, error } = await supabase
    .from("activity_feed")
    .select("domain")
    .neq("domain", "thought")
    .gte("occurred_at", from)
    .lt("occurred_at", to);
  if (error) throw error;
  if (data.length === 0) return "이날 기록된 학습 활동 없음";
  const counts = new Map();
  for (const r of data) counts.set(r.domain, (counts.get(r.domain) ?? 0) + 1);
  const parts = [...counts].map(([d, n]) => `${DOMAIN_LABELS[d] ?? d} ${n}건`);
  return `활동: ${parts.join(" · ")}`;
}

// ---------- 본체 ----------
const todayStart = new Date(dayRange(dayKey(new Date().toISOString())).from); // 오늘 00:00 KST

const { data: allThoughts, error: tErr } = await supabase
  .from("thought")
  .select("id, content, topics, created_at")
  .lt("created_at", todayStart.toISOString())
  .order("created_at", { ascending: true });
if (tErr) throw tErr;

const { data: digested, error: dErr } = await supabase.from("thought_digest").select("day");
if (dErr) throw dErr;
const done = new Set(digested.map((r) => r.day));

const byDay = new Map();
for (const t of allThoughts) {
  const day = dayKey(t.created_at);
  if (done.has(day)) continue;
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(t);
}

if (byDay.size === 0) {
  console.log("처리할 날이 없습니다 — 어제까지 모두 다이제스트됨.");
  process.exit(0);
}
console.log(`대상: ${byDay.size}일 (모델 ${MODEL})`);

let ok = 0;
let skipped = 0;
for (const [day, thoughts] of byDay) {
  const result = await summarizeDay(thoughts);
  if (!result) {
    skipped++;
    console.log(`  ✗ ${day} — 모델 응답 형식 불량, 건너뜀 (다음 실행에서 재시도)`);
    continue;
  }

  for (let i = 0; i < thoughts.length; i++) {
    const topics = result.topicsByIndex.get(i);
    if (!topics) continue;
    const { error } = await supabase.from("thought").update({ topics }).eq("id", thoughts[i].id);
    if (error) throw error;
  }

  const dayTopics = [...new Set([...result.topicsByIndex.values()].flat())].slice(0, TOPICS_PER_DAY);
  const summary = `${result.summary}\n${await activityLine(day)}`;
  const { error } = await supabase
    .from("thought_digest")
    .insert({ day, summary, topics: dayTopics, model: MODEL });
  if (error) throw error;
  ok++;
  console.log(`  ✓ ${day} — 메모 ${thoughts.length}개, 주제 ${dayTopics.length}개`);
}

console.log(`완료: ${ok}일 다이제스트${skipped ? ` · ${skipped}일 건너뜀` : ""}`);
// 한 날도 못 하고 전부 건너뛰었다면(Ollama 다운·모델 없음) 실패로 끝낸다 — 타이머의 OnFailure 알림이 간다.
// 일부만 건너뛴 건 정상 경로(다음 실행에서 재시도)라 조용히 0
if (ok === 0 && skipped > 0) process.exit(1);
