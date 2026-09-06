import { supabase } from "../shared/auth";
import { publish } from "../shared/activity";
import { removeTaggings, tagsByType } from "../shared/tag";
import { removeThread } from "../shared/reflection";
import type { Tables } from "../shared/db";

export type Book = Tables<"book">;
export type Reading = Tables<"reading">;

export interface BookListItem extends Book {
  readCount: number;
  firstFinishedOn: string | null;
  lastFinishedOn: string | null;
  lastRating: number | null;
  tags: string[];
}

export interface BookFields {
  title: string;
  author: string;
  translator: string | null;
  publisher: string;
  pub_year: string;
}

/** 서재 목록 — 최근 완독순. 독서 여정 화면(#58)은 firstFinishedOn 오름차순으로 재정렬해 쓴다 */
export async function listBooks(): Promise<BookListItem[]> {
  const [{ data: books, error: bErr }, { data: readings, error: rErr }, tags] = await Promise.all([
    supabase.from("book").select("*"),
    supabase.from("reading").select("book_id, finished_on, rating").order("finished_on"),
    tagsByType("book"),
  ]);
  if (bErr) throw bErr;
  if (rErr) throw rErr;
  const byBook = new Map<number, { count: number; first: string; last: string; rating: number | null }>();
  for (const r of readings) {
    const e = byBook.get(r.book_id);
    byBook.set(r.book_id, {
      count: (e?.count ?? 0) + 1,
      first: e?.first ?? r.finished_on, // finished_on 오름차순이라 첫 값이 최초 완독
      last: r.finished_on, // 마지막 값이 최신
      rating: r.rating ?? e?.rating ?? null,
    });
  }
  return books
    .map((b) => ({
      ...b,
      readCount: byBook.get(b.id)?.count ?? 0,
      firstFinishedOn: byBook.get(b.id)?.first ?? null,
      lastFinishedOn: byBook.get(b.id)?.last ?? null,
      lastRating: byBook.get(b.id)?.rating ?? null,
      tags: tags.get(b.id) ?? [],
    }))
    .sort((a, b) => (b.lastFinishedOn ?? "").localeCompare(a.lastFinishedOn ?? ""));
}

export async function getBook(id: number): Promise<{ book: Book; readings: Reading[] } | null> {
  const [{ data: book, error }, { data: readings, error: rErr }] = await Promise.all([
    supabase.from("book").select("*").eq("id", id).maybeSingle(),
    supabase.from("reading").select("*").eq("book_id", id).order("finished_on", { ascending: false }),
  ]);
  if (error) throw error;
  if (rErr) throw rErr;
  if (!book) return null;
  return { book, readings };
}

export async function countBooks(): Promise<number> {
  const { count, error } = await supabase.from("book").select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

// activity는 책 도메인 전부 건별 발행 (§7.2 — 저빈도 도메인)
export async function createBook(fields: BookFields): Promise<Book> {
  const { data, error } = await supabase.from("book").insert(fields).select().single();
  if (error) throw error;
  const book = data;
  await publish("library", "book", book.id, "created", `책 등록: 「${book.title}」`);
  return book;
}

export async function updateBook(id: number, fields: BookFields): Promise<void> {
  const { error } = await supabase.from("book").update(fields).eq("id", id);
  if (error) throw error;
}

/** 회독 기록 (§7.2) — 반환값 = 누적 회독 수 (reflection context "N회독"용) */
export async function recordCompletion(
  book: Pick<Book, "id" | "title">,
  finishedOn: string,
  rating: number | null,
): Promise<number> {
  const { error } = await supabase
    .from("reading")
    .insert({ book_id: book.id, finished_on: finishedOn, rating });
  if (error) throw error;
  const { count, error: cErr } = await supabase
    .from("reading")
    .select("*", { count: "exact", head: true })
    .eq("book_id", book.id);
  if (cErr) throw cErr;
  const n = count ?? 1;
  await publish(
    "library",
    "book",
    book.id,
    "completed",
    `「${book.title}」 ${n}회독 완독${rating ? ` ★${rating}` : ""}`,
  );
  return n;
}

export async function saveNote(book: Pick<Book, "id" | "title">, note: string): Promise<void> {
  const { error } = await supabase.from("book").update({ note: note || null }).eq("id", book.id);
  if (error) throw error;
  await publish("library", "book", book.id, "noted", `「${book.title}」 노트 갱신`);
}

/**
 * 책 삭제 — cascade 이원화 (§14.7):
 * reading은 DB cascade, reflection·tagging 다형 행은 여기서. activity는 보존.
 */
export async function deleteBook(id: number): Promise<void> {
  await removeThread("book", id);
  await removeTaggings("book", id);
  const { error } = await supabase.from("book").delete().eq("id", id);
  if (error) throw error;
}
