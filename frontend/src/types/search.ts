// src/types/search.ts

import type { Verse } from './bible';

/**
 * Represents search statistics returned by the FTS5 search engine.
 */
export interface SearchStatistics {
  executionTimeMs: number;
  totalHits: number;
}

/**
 * Represents the results of a search query, containing both the matching verses and query statistics.
 */
export interface SearchResponse {
  rows: Verse[];
  statistics?: SearchStatistics;
}

/**
 * Represents a single verse returned from the database search.
 * Matches the backend's models.Verse struct.
 */
export interface SearchVerse {
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

