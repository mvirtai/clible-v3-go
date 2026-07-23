// frontend/src/utils/readerNavigation.ts
import bibleStructure from '../data/bible_structure.json';

interface BookMeta {
  id: string;
  position: number;
  chapters: number;
}

const BOOKS = bibleStructure.books as BookMeta[];

// Precomputed book navigation data for fast lookups
const BY_ID = new Map<string, BookMeta>(BOOKS.map((b) => [b.id, b]));
const BY_POSITION = new Map<number, BookMeta>(BOOKS.map((b) => [b.position, b]));
const MAX_POSITION = Math.max(...BOOKS.map((b) => b.position));

export interface ChapterRef {
  bookId: string;
  chapter: number;
}

/*
  Returns the next chapter reference after the given book and chapter, or null if no next chapter exists.
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

/*
  Returns the previous chapter reference before the given book and chapter, or null if no previous chapter exists.
*/
export function getPreviousChapterRef(bookId: string, currentChapter: number): ChapterRef | null {
  const book = BY_ID.get(bookId)
  if (!book) return null;

  if (currentChapter > 1) {
    return { bookId, chapter: currentChapter - 1 };
  }

  const prevBook = BY_POSITION.get(book.position - 1);
  if (!prevBook) return null; // No previous books

  return { bookId: prevBook.id, chapter: prevBook.chapters };
}

/*
  Returns the number of chapters for a given book, or null if not found.
*/
export function getChapterCount(bookId: string): number | null {
  return BY_ID.get(bookId)?.chapters ?? null;
}

export { MAX_POSITION };
