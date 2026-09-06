"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/modules/shared/auth";
import {
  addThought,
  dayKey,
  digestsInMonth,
  groupByDay,
  recentTopics,
  searchThoughts,
  thoughtsDaysAgo,
  thoughtsInMonth,
  topTopics,
  type Thought,
  type ThoughtDigest,
} from "@/modules/thought";
import { HomeButton } from "../ui/home-button";
import { PixelPenguinTiny } from "../ui/pixel";
import { NightScene } from "../ui/scene";

// 과거의 오늘 되짚기 — 고치지 않고 남긴 생각을 다시 만나는 자리 (append-only의 보상)
const ECHOES = [
  { label: "1년 전 오늘", days: 365 },
  { label: "한 달 전 오늘", days: 30 },
  { label: "일주일 전 오늘", days: 7 },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const dayLabel = (day: string): string => {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (day === today) return "오늘";
  if (day === yesterday) return "어제";
  const [y, m, d] = day.split("-").map(Number);
  return y === new Date().getFullYear() ? `${m}월 ${d}일` : `${y}년 ${m}월 ${d}일`;
};

const timeOf = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const monthKeyOf = (y: number, m: number): string => `${y}-${String(m).padStart(2, "0")}`;

const firstLine = (s: string): string => s.trimStart().split("\n")[0];

// 메모 카드 — 시트·검색 결과 공용. 주제 칩 클릭 시 해당 주제로 검색
function ThoughtCard({ t, onTopic }: { t: Thought; onTopic: (topic: string) => void }) {
  return (
    <li className="rounded-md border border-line bg-card p-3.5">
      <p className="font-mono text-[11px] text-faint">{timeOf(t.created_at)}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{t.content}</p>
      {t.topics && t.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.topics.map((topic) => (
            <button
              key={topic}
              onClick={() => onTopic(topic)}
              className="rounded-full bg-thought-soft px-2 py-0.5 font-mono text-[10px] text-thought"
            >
              {topic}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

// 하루치를 읽는 시트 — 달력 날짜·되짚기 공용. 스스로 닫히지 않는다
function DaySheet({
  title,
  items,
  digest,
  onClose,
  onTopic,
}: {
  title: string;
  items: Thought[];
  digest?: ThoughtDigest;
  onClose: () => void;
  onTopic: (topic: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // 모바일 = 바텀시트 / 데스크톱(md~) = 중앙
    <div
      className="fixed inset-0 z-10 flex items-end bg-black/40 md:items-center md:justify-center md:p-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-sheet-up relative mx-auto flex max-h-[82dvh] w-full max-w-md flex-col rounded-t-2xl border border-b-0 border-line bg-card shadow-[0_-16px_48px_rgba(0,0,0,0.4)] md:mx-0 md:max-h-full md:w-[560px] md:max-w-[560px] md:rounded-lg md:border-b md:shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-11 shrink-0 rounded-full bg-line md:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 pb-3 pt-2.5">
          <h2 className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold">{title}</span>
            <span className="font-mono text-[11px] text-faint">{items.length}개</span>
          </h2>
          <button onClick={onClose} aria-label="닫기" className="p-2 text-faint">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {digest && (
            <div className="relative mb-2.5 overflow-hidden rounded-md border border-thought/40 bg-thought-soft p-3.5">
              <span className="absolute left-4 top-0 h-1 w-10 bg-thought" aria-hidden="true" />
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-thought">
                하루 요약 · {digest.model}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">{digest.summary}</p>
              {digest.topics.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {digest.topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => onTopic(topic)}
                      className="rounded-full border border-thought/40 bg-card px-2.5 py-0.5 font-mono text-[11px] text-thought"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <ul className="space-y-2">
            {items.map((t) => (
              <ThoughtCard key={t.id} t={t} onTopic={onTopic} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const Triangle = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 10 10"
    fill="currentColor"
    aria-hidden="true"
    className={`h-2.5 w-2.5 ${flip ? "rotate-180" : ""}`}
  >
    <path d="M3 1l4 4-4 4z" />
  </svg>
);

type MonthData = {
  key: string; // YYYY-MM
  days: Map<string, Thought[]>; // 날짜 키 → 그날의 메모 (시간순)
  digests: Map<string, ThoughtDigest>;
};

// 생각 세션 — 달력에 앉은 펭귄이 그날 생각의 표시. 누르면 시트로 읽는다 (append-only)
function ThoughtStream() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  // 검색 결과 — 어떤 질의의 결과인지 함께 저장 (질의가 바뀌면 무시)
  const [results, setResults] = useState<{ q: string; list: Thought[] } | null>(null);
  const [echoes, setEchoes] = useState<{ label: string; items: Thought[] }[]>([]);
  const [trajectory, setTrajectory] = useState<[string, number][]>([]);
  // 보고 있는 달 — 기본은 이번 달. tick은 기록 직후 같은 달을 다시 불러오는 손잡이
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1 };
  });
  const [tick, setTick] = useState(0);
  const [month, setMonth] = useState<MonthData | null>(null);
  const [sheet, setSheet] = useState<{ title: string; items: Thought[]; digest?: ThoughtDigest } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      try {
        const [topics, ...pasts] = await Promise.all([
          recentTopics(),
          ...ECHOES.map((e) => thoughtsDaysAgo(e.days)),
        ]);
        setTrajectory(topTopics(topics));
        setEchoes(
          ECHOES.map((e, i) => ({ label: e.label, items: pasts[i] })).filter(
            (e) => e.items.length > 0,
          ),
        );
      } catch {
        // 궤적·되짚기는 없어도 달력은 선다
      }
    })();
  }, []);

  // 달 단위 로드 — 늦게 온 응답은 버린다. 다른 달의 데이터는 그리는 쪽에서 key로 거른다
  useEffect(() => {
    const key = monthKeyOf(cursor.y, cursor.m);
    let cancelled = false;
    (async () => {
      try {
        const [list, digs] = await Promise.all([
          thoughtsInMonth(cursor.y, cursor.m),
          digestsInMonth(cursor.y, cursor.m),
        ]);
        if (cancelled) return;
        setMonth({
          key,
          days: new Map(groupByDay(list).map((g) => [g.day, g.items])),
          digests: new Map(digs.map((d) => [d.day, d])),
        });
      } catch {
        if (!cancelled) setMonth({ key, days: new Map(), digests: new Map() });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cursor.y, cursor.m, tick]);

  // 검색 — 입력 후 300ms 디바운스, 비우면 달력으로 복귀
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const timer = setTimeout(async () => {
      try {
        setResults({ q, list: await searchThoughts(q) });
      } catch {
        setResults({ q, list: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const submit = async () => {
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await addThought(content);
      setInput("");
      // 오늘 칸에 펭귄이 앉는 것이 저장 확인 — 이번 달로 돌아와 다시 불러온다
      const now = new Date();
      setCursor({ y: now.getFullYear(), m: now.getMonth() + 1 });
      setTick((t) => t + 1);
    } catch {
      alert("저장 실패 — 잠시 후 다시 시도하세요");
    } finally {
      setBusy(false);
    }
  };

  const searchTopic = (topic: string) => {
    setSheet(null);
    setQuery(topic);
  };

  const now = new Date();
  const todayKey = dayKey(now.toISOString());
  const monthKey = monthKeyOf(cursor.y, cursor.m);
  const isThisMonth = monthKey === todayKey.slice(0, 7);
  const shown = month?.key === monthKey ? month : null;
  const lead = new Date(cursor.y, cursor.m - 1, 1).getDay();
  const daysIn = new Date(cursor.y, cursor.m, 0).getDate();
  const shift = (by: number) => {
    const d = new Date(cursor.y, cursor.m - 1 + by, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4 pb-36 md:max-w-2xl">
      <NightScene />
      <header className="focus-night mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-night-faint">Thought</p>
          <h1 className="font-display text-2xl font-bold text-night-ink">생각</h1>
        </div>
        <HomeButton accent="thought" />
      </header>

      <div className="relative overflow-hidden rounded-lg border border-thought/40 bg-card p-4">
        <span className="absolute left-4 top-0 h-1 w-10 bg-thought" aria-hidden="true" />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="지금 드는 생각, 오늘의 정리..."
          className="w-full resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="font-mono text-[11px] text-faint">쓴 생각은 고치지 않아요 — 이어서 쓰기</p>
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            className="rounded-md bg-thought px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            기록
          </button>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="내용·주제 검색"
        className="focus-night mt-3 w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm"
      />

      {!query.trim() && (trajectory.length > 0 || echoes.length > 0) && (
        <div className="mt-5 space-y-3">
          {trajectory.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-night-faint">최근 30일 주제</span>
              {trajectory.map(([topic, n]) => (
                <button
                  key={topic}
                  onClick={() => setQuery(topic)}
                  className="focus-night rounded-full bg-thought-soft px-2.5 py-0.5 font-mono text-[11px] text-thought"
                >
                  {topic} <span className="opacity-60">{n}</span>
                </button>
              ))}
            </div>
          )}
          {echoes.length > 0 && (
            <div>
              <p className="font-mono text-[11px] text-night-faint">그때의 나</p>
              {echoes.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  onClick={() => setSheet({ title: e.label, items: e.items })}
                  className="focus-night flex w-full items-baseline gap-2 py-1.5 text-left"
                >
                  <span className="shrink-0 font-display font-bold text-night-ink">{e.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-night-faint">{e.items.length}개</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-night-faint">
                    {firstLine(e.items[0].content)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {query.trim() ? (
        results?.q !== query.trim() ? (
          <p className="mt-14 text-center text-sm text-night-faint">검색 중…</p>
        ) : results.list.length === 0 ? (
          <p className="mt-14 text-center text-sm text-night-faint">검색 결과가 없어요</p>
        ) : (
          <div className="mt-7 space-y-7">
            {groupByDay(results.list).map((g) => (
              <section key={g.day}>
                <h2 className="mb-2.5 flex items-baseline gap-2">
                  <span className="font-display font-bold text-night-ink">{dayLabel(g.day)}</span>
                  <span className="font-mono text-[11px] text-night-faint">{g.items.length}개</span>
                </h2>
                <ul className="space-y-2">
                  {g.items.map((t) => (
                    <ThoughtCard key={t.id} t={t} onTopic={setQuery} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : (
        <section className="mx-auto mt-7 max-w-md">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="이전 달"
              className="focus-night p-2 text-night-faint"
            >
              <Triangle flip />
            </button>
            <h2 className="font-display font-bold text-night-ink">
              {cursor.y}년 {cursor.m}월
            </h2>
            <button
              type="button"
              onClick={() => shift(1)}
              disabled={isThisMonth}
              aria-label="다음 달"
              className="focus-night p-2 text-night-faint disabled:opacity-30"
            >
              <Triangle />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center font-mono text-[11px] text-night-faint">
                {w}
              </div>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <div key={`lead-${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: daysIn }, (_, i) => i + 1).map((d) => {
              const key = `${monthKey}-${String(d).padStart(2, "0")}`;
              const items = shown?.days.get(key);
              const isToday = key === todayKey;
              const future = key > todayKey;
              const cell = `flex aspect-square flex-col items-center gap-0.5 rounded-md pt-1 ${
                isToday ? "border border-night-faint/60" : ""
              }`;
              const num = `font-mono text-[11px] ${
                items ? "text-night-ink" : future ? "text-night-faint/40" : "text-night-faint"
              }`;
              return items ? (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSheet({ title: dayLabel(key), items, digest: shown?.digests.get(key) })}
                  aria-label={`${dayLabel(key)} 생각 ${items.length}개`}
                  className={`focus-night ${cell} hover:bg-night-ink/10`}
                >
                  <span className={num}>{d}</span>
                  <PixelPenguinTiny size={20} flip={d % 2 === 0} />
                </button>
              ) : (
                <div key={key} className={cell}>
                  <span className={num}>{d}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sheet && (
        <DaySheet
          title={sheet.title}
          items={sheet.items}
          digest={sheet.digest}
          onClose={() => setSheet(null)}
          onTopic={searchTopic}
        />
      )}
    </main>
  );
}

export default function ThoughtsPage() {
  return (
    <AuthGuard>
      <ThoughtStream />
    </AuthGuard>
  );
}
