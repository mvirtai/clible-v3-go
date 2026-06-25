// src/services/api.ts
import type { BibleResponse, InstalledTranslation, TextStats, ComparisonResult } from "../types/bible";
import type { SearchHistoryEntry } from "../types/searchQuery";
import type { SearchVerse } from "../types/search";


export class ApiService {
    private baseUrl = '/api';

    /**
     * Gets verses from a specified book or range of books and translation.
     * @param reference - Reference to fetch verses for (e.g. "MAT 1:1-5").
     * @param translation - Translation to use (e.g. "KJV").
     * @returns A BibleResponse object containing verses.
     * @throws Error if the request fails.
     * GET /api/verses?ref=...&translation=...
     */
    async getVerses(reference: string, translation: string): Promise<BibleResponse> {
        const res = await fetch(
            `${this.baseUrl}/verses?ref=${encodeURIComponent(reference)}&translation=${encodeURIComponent(translation)}`
            , { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`GET ${this.baseUrl}/verses returned ${res.status}`);
        return await res.json();
    }

    /**
     * Executes a search query with the given parameters.
     * @param query - The keyword or query expression to search for.
     * @param translation - Translation to search in (e.g. "KJV").
     * @param regex - Whether to treat the query as a regular expression.
     * @returns A promise resolving to the search results.
     * @throws Error if the request fails.
     * GET /api/search?q=...&translation=...&regex=...
     */
    async search(query: string, translation: string, regex: boolean): Promise<SearchVerse[]> {
        const res = await fetch(
            `   ${this.baseUrl}/search?q=${encodeURIComponent(query)}&translation=${encodeURIComponent(translation)}&regex=${regex}`
            , { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`GET ${this.baseUrl}/search returned ${res.status}`);
        return await res.json();
    }

    /**
     * Get all translations from the database.
     * @returns An array of InstalledTranslation objects.
     * @throws Error if the request fails.
     * GET /api/translations
     */
    async getTranslations(): Promise<InstalledTranslation[]> {
        const res = await fetch(`${this.baseUrl}/translations`, { credentials: 'include' });
        if (!res.ok) throw new Error(`GET ${this.baseUrl}/translations returned ${res.status}`);
        return await res.json();
    }

    /**
     * Get latest searches from the database.
     * @returns An array of SearchHistoryEntry objects.
     * @throws Error if the request fails.
     * GET /api/history
     */
    async getHistory(): Promise<SearchHistoryEntry[]> {
        const res = await fetch(`${this.baseUrl}/history`);
        if (!res.ok) throw new Error(`GET ${this.baseUrl}/history returned ${res.status}`)
        return await res.json()
    }

    /**
     * Saves a new search into the project history.
     * @param historyEntry - The search history item to save, excluding auto-generated fields.
     * @returns A promise resolving when the save operation completes.
     * @throws Error if the request fails.
     * POST /api/history
     */
    async addSearch(historyEntry: Omit<SearchHistoryEntry, 'id' | 'searchedAt'>): Promise<void> {
        const res = await fetch(`${this.baseUrl}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historyEntry),
        });
        if (!res.ok) throw new Error(
            `POST ${this.baseUrl}/history returned ${res.status}`
        );
    }

    /**
     * Executes textual analysis for a translation and verse reference.
     * @param reference - The verse reference to analyze (e.g. "PSA 23:1").
     * @param translationId - The ID of the translation to analyze.
     * @returns A TextStats object containing analytical metrics.
     * @throws Error if the request fails.
     * POST /api/analytics/analyze
     */
    async analyze(reference: string, translationId: string): Promise<TextStats> {
        const res = await fetch(
            `${this.baseUrl}/analytics/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference, translationId }),
        });
        if (!res.ok) throw new Error(
            `POST ${this.baseUrl}/analytics/analyze returned ${res.status}`);
        return res.json()
    }

    /**
     * Compares two different translations for the same verse reference.
     * @param reference - The verse reference to compare (e.g. "JHN 3:16").
     * @param translationId1 - The ID of the first translation (e.g. "web").
     * @param translationId2 - The ID of the second translation (e.g. "kjv").
     * @returns A ComparisonResult object containing alignment and similarity stats.
     * @throws Error if the request fails.
     * POST /api/analytics/compare
     */
    async compare(
        reference: string,
        translationId1: string,
        translationId2: string): Promise<ComparisonResult> {
        const res = await fetch(
            `${this.baseUrl}/analytics/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference, translationId1, translationId2 }),
        });
        if (!res.ok) throw new Error(
            `POST ${this.baseUrl}/analytics/compare returned ${res.status}`);
        return res.json()
    }
}

export const apiService = new ApiService();