import bibleStructure from '../data/bible_structure.json';

/**
 * Metadata structure describing a Bible book and its chapter count.
 */
export interface BookMeta {
  /** 3-letter USFM identifier (e.g. 'GEN', 'MAT') */
  id: string;
  /** Canon position order index (1 to 66) */
  position: number;
  /** Total number of chapters in the book */
  chapters: number;
}

const BOOKS = bibleStructure.books as BookMeta[];

// Precomputed book navigation maps for O(1) lookups
const BY_ID = new Map<string, BookMeta>(BOOKS.map((b) => [b.id, b]));
const BY_POSITION = new Map<number, BookMeta>(BOOKS.map((b) => [b.position, b]));
const MAX_POSITION = Math.max(...BOOKS.map((b) => b.position));

/**
 * Represents a parsed chapter reference containing a book ID and chapter number.
 */
export interface ChapterRef {
  /** 3-letter USFM book code */
  bookId: string;
  /** 1-indexed chapter number */
  chapter: number;
}

/**
 * Returns the next chapter reference across book boundaries, or null if at the end of the canon (Revelation 22).
 *
 * @param bookId - Current book identifier (e.g. 'JHN').
 * @param currentChapter - Current chapter number.
 * @returns Next {@link ChapterRef} or null if no further chapter exists.
 */
export function getNextChapterRef(bookId: string, currentChapter: number): ChapterRef | null {
  const book = BY_ID.get(bookId);
  if (!book) return null;

  if (currentChapter < book.chapters) {
    return { bookId, chapter: currentChapter + 1 };
  }

  const nextBook = BY_POSITION.get(book.position + 1);
  if (!nextBook) return null; // No more books

  return { bookId: nextBook.id, chapter: 1 };
}

/**
 * Returns the previous chapter reference across book boundaries, or null if at Genesis 1.
 *
 * @param bookId - Current book identifier (e.g. 'MAT').
 * @param currentChapter - Current chapter number.
 * @returns Previous {@link ChapterRef} or null if at the beginning of the Bible.
 */
export function getPreviousChapterRef(bookId: string, currentChapter: number): ChapterRef | null {
  const book = BY_ID.get(bookId);
  if (!book) return null;

  if (currentChapter > 1) {
    return { bookId, chapter: currentChapter - 1 };
  }

  const prevBook = BY_POSITION.get(book.position - 1);
  if (!prevBook) return null; // No previous books

  return { bookId: prevBook.id, chapter: prevBook.chapters };
}

/**
 * Returns the total chapter count for a given Bible book identifier.
 *
 * @param bookId - 3-letter USFM book code.
 * @returns Total chapter count, or null if book is not recognized.
 */
export function getChapterCount(bookId: string): number | null {
  return BY_ID.get(bookId)?.chapters ?? null;
}

export { MAX_POSITION };

/**
 * Formats a {@link ChapterRef} into a space-separated reference string (e.g. 'JHN 3').
 *
 * @param ref - Chapter reference object.
 * @returns Formatted reference string.
 */
export function formatChapterRef(ref: ChapterRef): string {
  return `${ref.bookId} ${ref.chapter}`;
}

