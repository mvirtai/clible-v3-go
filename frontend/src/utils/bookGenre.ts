export type BookGenre = 'prose' | 'poetry';

/**
 * Runoudeksi luokitellut kirjat: heprealainen runous, jonka keskeinen piirre
 * on parallelismi (rivipari toistaa/vastakkaisasettaa ajatuksen).
 */
const POETRY_BOOKS = new Set<string>([
  'JOB', // Job
  'PSA', // Psalmit
  'PRO', // Sananlaskut
  'ECC', // Saarnaaja (osin runollinen, käsitellään runoutena)
  'SNG', // Laulujen laulu
  'LAM', // Valitusvirret
]);

export function getBookGenre(bookId: string): BookGenre {
  return POETRY_BOOKS.has(bookId) ? 'poetry' : 'prose';
}
