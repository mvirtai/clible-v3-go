// src/services/api.ts
import type { BibleResponse, InstalledTranslation, TextStats, ComparisonResult } from "../types/bible";
import type { SearchHistoryEntry } from "../types/searchQuery";
import type { SearchVerse } from "../types/search";


// raw api types matching the Go backend JSON responses
interface RawWordCount {
    word: string;
    count: number;
}

interface RawTextStats {
    token_count: number;
    unique_token_count: number;
    type_token_ratio: number;
    character_count: number;
    avg_word_length: number;
    top_words: RawWordCount[];
    top_bigrams: RawWordCount[];
    top_trigrams: RawWordCount[];
}

interface RawAlignedVerse {
    book_id: string;
    chapter: number;
    verse: number;
    text_a: string;
    text_b: string;
    similarity: number;
    exact_match: boolean;
}

interface RawComparisonSummary {
    total_verses: number;
    fully_aligned_verses: number;
    exact_matches: number;
    exact_match_ratio: number;
    average_similarity: number;
    top_shared_words: RawWordCount[];
    most_similar_verse_ref?: string;
}

interface RawComparisonResult {
    reference: string;
    translation_a: string;
    translation_b: string;
    aligned_verses: RawAlignedVerse[];
    summary: RawComparisonSummary;
}

interface UserResponse {
    id: string;
    email: string;
}

/**
 * Maps RawTextStats structure to the camelCase TextStats interface
 */
const mapTextStats = (raw: RawTextStats): TextStats => ({
    tokenCount: raw.token_count,
    uniqueTokenCount: raw.unique_token_count,
    typeTokenRatio: raw.type_token_ratio,
    characterCount: raw.character_count,
    avgWordLength: raw.avg_word_length,
    topWords: (raw.top_words || []).map(w => ({ name: w.word, value: w.count })),
    topBigrams: (raw.top_bigrams || []).map(w => ({ name: w.word, value: w.count })),
    topTrigrams: (raw.top_trigrams || []).map(w => ({ name: w.word, value: w.count })),
});

/**
 * Maps RawComparisonResult structure to the camelCase ComparisonResult interface.
 */
const mapComparisonResult = (raw: RawComparisonResult): ComparisonResult => ({
    reference: raw.reference,
    translationA: raw.translation_a,
    translationB: raw.translation_b,
    alignedVerses: (raw.aligned_verses || []).map(v => ({
        bookId: v.book_id,
        chapter: v.chapter,
        verse: v.verse,
        textA: v.text_a,
        textB: v.text_b,
        similarity: v.similarity,
        exactMatch: v.exact_match
    })),
    summary: {
        totalVerses: raw.summary.total_verses,
        fullyAlignedVerses: raw.summary.fully_aligned_verses,
        exactMatches: raw.summary.exact_matches,
        exactMatchRatio: raw.summary.exact_match_ratio,
        averageSimilarity: raw.summary.average_similarity,
        topSharedWords: (raw.summary.top_shared_words || []).map(w => ({ name: w.word, value: w.count })),
        mostSimilarVerseRef: raw.summary.most_similar_verse_ref
    }
});

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
        const res = await fetch(`${this.baseUrl}/history`, { credentials: 'include' });
        if (!res.ok) throw new Error(`GET ${this.baseUrl}/history returned ${res.status}`);
        return await res.json();
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
            credentials: 'include',
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
            credentials: 'include',
        });
        if (!res.ok) throw new Error(
            `POST ${this.baseUrl}/analytics/analyze returned ${res.status}`);

        const raw = await res.json() as RawTextStats;
        return mapTextStats(raw);
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
            credentials: 'include',
        });
        if (!res.ok) throw new Error(
            `POST ${this.baseUrl}/analytics/compare returned ${res.status}`);

        const raw = await res.json() as RawComparisonResult;
        return mapComparisonResult(raw);
    }

    /**
     * Imports a new translation by sending metadata and XML payload via multipart/form-data.
     * @param translationId - Short code for the translation (e.g. "web").
     * @param name - The human readable version of the translation.
     * @param language - Language code (e.g. "en", "fi")
     * @param file - The XML File object (USFX, OSIS, Zefania, Beblia format)
     * @returns A promise resolving to the status message.
     * POST /api/translations/import
     */
    async importTranslation(
        translationId: string,
        name: string,
        language: string,
        file: File
    ): Promise<{ id: string, status: string }> {
        const formData = new FormData();
        formData.append('translationId', translationId);
        formData.append('name', name);
        formData.append('language', language);
        formData.append('file', file);

        const res = await fetch(`${this.baseUrl}/translations/import`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`POST ${this.baseUrl}/translations/import returned ${res.status} - ${errData.error || errData.message || 'Unknown error'}`);
        }

        return await res.json();
    }

    /**
     * Registers a new user.
     */
    async register(email: string, password: string): Promise<UserResponse> {
        const res = await fetch(`${this.baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `POST /auth/register returned ${res.status}`);
        }
        return await res.json();
    }

    /**
     * Logs in an existing user.
     */
    async login(email: string, password: string): Promise<UserResponse> {
        const res = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `POST /auth/login returned ${res.status}`);
        }
        return await res.json();
    }

    /**
     * Logs out the current user by clearing the JWT cookie.
     */
    async logout(): Promise<void> {
        const res = await fetch(`${this.baseUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /auth/logout returned ${res.status}`);
    }

    /**
     * Retrieves the currently logged-in user profile.
     */
    async getMe(): Promise<UserResponse> {
        const res = await fetch(`${this.baseUrl}/auth/me`, {
            credentials: 'include',
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `GET /auth/me returned ${res.status}`);
        }
        return await res.json();
    }
}

export const apiService = new ApiService();