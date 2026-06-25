// src/types/search.ts

import { Verse } from './bible';

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
