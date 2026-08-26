/**
 * Literary genre classification for Bible books.
 */
export type BookGenre = 'prose' | 'poetry';

/**
 * Bible books classified as Hebrew poetry featuring parallelisms and poetic line structures.
 */
const POETRY_BOOKS = new Set<string>([
  'JOB', // Job
  'PSA', // Psalms
  'PRO', // Proverbs
  'ECC', // Ecclesiastes
  'SNG', // Song of Solomon
  'LAM', // Lamentations
]);

/**
 * Determines whether a given Bible book identifier belongs to poetic or prose literature.
 *
 * @param bookId - The 3-letter USFM Bible book code (e.g., 'PSA', 'GEN').
 * @returns 'poetry' if the book is in the poetry set, otherwise 'prose'.
 */
export function getBookGenre(bookId: string): BookGenre {
  return POETRY_BOOKS.has(bookId) ? 'poetry' : 'prose';
}

