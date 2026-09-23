import type { LiturgicalDay } from '../types/liturgical';

/**
 * Fetches the liturgical day information for today or a specified date.
 *
 * @param date - Optional date string in ISO format (YYYY-MM-DD) or Finnish format (d.m.YYYY)
 */
export async function getLiturgicalDay(date?: string): Promise<LiturgicalDay | null> {
  try {
    const url = date
      ? `/api/liturgical/day?date=${encodeURIComponent(date)}`
      : '/api/liturgical/today';
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as LiturgicalDay;
  } catch (err) {
    console.error('Failed to fetch liturgical day:', err);
    return null;
  }
}

/**
 * Fetches all liturgical days for a specific year and month.
 */
export async function getLiturgicalMonth(year: number, month: number): Promise<LiturgicalDay[]> {
  try {
    const res = await fetch(`/api/liturgical/month?year=${year}&month=${month}`);
    if (!res.ok) {
      return [];
    }
    return (await res.json()) as LiturgicalDay[];
  } catch (err) {
    console.error('Failed to fetch liturgical month:', err);
    return [];
  }
}
