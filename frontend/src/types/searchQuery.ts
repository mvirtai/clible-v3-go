// src/types/searchQuery.ts

/**
 * Represents the search conditions selected by the user.
 * Matches the query parameters (q, translation, regex) expected by the backend's GET /api/search endpoint.
 */
export interface SearchQueryOptions {
    queryText: string;
    translation: string;
    regex: boolean;
}

/**
 * Represents a previously executed search saved in the database history.
 * Matches the backend's SearchHistoryResponse struct.
 */
export interface SearchHistoryEntry {
    id: string;
    queryText: string;
    searchScope: string;
    scopeValue: string;
    translationId: string;
    mode: string;
    resultCount: number;
    searchedAt: string; // ISO 8601 date string
}
