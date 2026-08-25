// src/services/api.ts
import type { BibleResponse, InstalledTranslation, TextStats, ComparisonResult } from "../types/bible";
import type { SearchHistoryEntry } from "../types/searchQuery";
import type { SearchVerse } from "../types/search";
import type { Scope, SavedSearch, SavedAnalysis, ScopeWorkspace } from "../types/workspace";
import type { AiTextResponse } from "../types/ai";
import type { AiSearchResponse } from "../types/aiSearch";
import type { OriginalStudyResult } from "../types/originalStudy";


/**
 * Raw word frequency entry returned by the backend analytics engine.
 */
interface RawWordCount {
    word: string;
    count: number;
}

/**
 * Raw JSON payload for statistical metrics returned by POST /api/analytics/analyze.
 */
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

/**
 * Raw verse comparison alignment item returned by POST /api/analytics/compare.
 */
interface RawAlignedVerse {
    book_id: string;
    chapter: number;
    verse: number;
    text_a: string;
    text_b: string;
    similarity: number;
    exact_match: boolean;
}

/**
 * Raw summary metrics for a cross-translation comparison.
 */
interface RawComparisonSummary {
    total_verses: number;
    fully_aligned_verses: number;
    exact_matches: number;
    exact_match_ratio: number;
    average_similarity: number;
    top_shared_words: RawWordCount[];
    most_similar_verse_ref?: string;
}

/**
 * Raw response payload for cross-translation alignment and metrics.
 */
interface RawComparisonResult {
    reference: string;
    translation_a: string;
    translation_b: string;
    aligned_verses: RawAlignedVerse[];
    summary: RawComparisonSummary;
}

/**
 * User account response structure returned by authentication endpoints.
 */
interface UserResponse {
    id: string;
    email: string;
}

/**
 * Transforms snake_case backend analytics payload to camelCase {@link TextStats} model.
 *
 * @param raw - The raw text statistics response from the Go API.
 * @returns Normalized camelCase statistics object for frontend charting.
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
 * Transforms snake_case backend comparison payload to camelCase {@link ComparisonResult} model.
 *
 * @param raw - The raw comparison result response from the Go API.
 * @returns Normalized camelCase comparison object for UI diff tables and charts.
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
    async search(query: string, translation: string, regex: boolean, scope = 'all', scopeValue = ''): Promise<SearchVerse[]> {
        const res = await fetch(
            `${this.baseUrl}/search?q=${encodeURIComponent(query)}&translation=${encodeURIComponent(translation)}&regex=${regex}&scope=${scope}&scopeValue=${encodeURIComponent(scopeValue)}`
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
     * Activates a global translation for the current user.
     * Creates a user_translations link (O(1) operation, no data duplication).
     * @param translationId - The ID of the translation to activate (e.g. "fin-1992").
     * POST /api/translations/link
     */
    async linkTranslation(translationId: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/translations/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ translationId }),
            credentials: 'include',
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `POST /translations/link returned ${res.status}`);
        }
    }

    /**
     * Deactivates a translation for the current user.
     * Removes the user_translations link without deleting any verse data.
     * @param translationId - The ID of the translation to deactivate (e.g. "fin-1992").
     * DELETE /api/translations/link
     */
    async unlinkTranslation(translationId: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/translations/link`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ translationId }),
            credentials: 'include',
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `DELETE /translations/link returned ${res.status}`);
        }
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

    /**
     * Gets all scopes (study projects) for the current user.
     */
    async getScopes(): Promise<Scope[]> {
        const res = await fetch(`${this.baseUrl}/scopes`, { credentials: 'include' });
        if (!res.ok) throw new Error(`GET /scopes returned ${res.status}`);
        return await res.json();
    }

    /**
     * Creates a new study scope.
     */
    async createScope(name: string): Promise<Scope> {
        const res = await fetch(`${this.baseUrl}/scopes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /scopes returned ${res.status}`);
        return await res.json();
    }

    /**
     * Deletes an existing scope and cascades all saved child records.
     */
    async deleteScope(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/scopes?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`DELETE /scopes returned ${res.status}`);
    }

    /**
     * Aggregates a scope metadata with all its nested saved items.
     */
    async getScopeWorkspace(id: string): Promise<ScopeWorkspace> {
        const res = await fetch(`${this.baseUrl}/scopes/workspace?id=${encodeURIComponent(id)}`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`GET /scopes/workspace returned ${res.status}`);
        return await res.json();
    }

    /**
     * Saves a text search configuration and its current results JSON.
     */
    async saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt'>): Promise<SavedSearch> {
        const res = await fetch(`${this.baseUrl}/scopes/saved-searches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(search),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /scopes/saved-searches returned ${res.status}`);
        return await res.json();
    }

    /**
     * Saves a text analysis or comparison configuration and its current results JSON.
     */
    async saveAnalysis(analysis: Omit<SavedAnalysis, 'id' | 'createdAt'>): Promise<SavedAnalysis> {
        const res = await fetch(`${this.baseUrl}/scopes/saved-analyses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysis),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /scopes/saved-analyses returned ${res.status}`);
        return await res.json();
    }

    /**
     * Renames an existing scope.
     */
    async renameScope(id: string, name: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/scopes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`PUT /scopes returned ${res.status}`);
    }

    /**
     * Deletes a single saved search.
     */
    async deleteSearch(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/scopes/saved-searches?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`DELETE /scopes/saved-searches returned ${res.status}`);
    }

    /**
     * Renames a single saved search.
     */
    async renameSearch(id: string, name: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/scopes/saved-searches`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`PUT /scopes/saved-searches returned ${res.status}`);
    }

    /**
     * Deletes a single saved analysis.
     */
    async deleteAnalysis(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/scopes/saved-analyses?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`DELETE /scopes/saved-analyses returned ${res.status}`);
    }

    /**
     * Renames a single saved analysis.
     */
    async renameAnalysis(id: string, name: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/scopes/saved-analyses`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`PUT /scopes/saved-analyses returned ${res.status}`);
    }

    /**
     * Fetches detailed AI insights on a Bible passage.
     */
    async getAiInsight(text: string, focus?: string): Promise<AiTextResponse> {
        const res = await fetch(`${this.baseUrl}/ai/insight`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, focus }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /ai/insight returned ${res.status}`);
        return await res.json();
    }

    /**
     * Fetches linguistic and tone analysis on a Bible passage.
     */
    async getAiTone(text: string, focus?: string): Promise<AiTextResponse> {
        const res = await fetch(`${this.baseUrl}/ai/tone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, focus }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /ai/tone returned ${res.status}`);
        return await res.json();
    }

    /**
     * Fetches detailed tekoäly outline of original words.
     */
    async getAiOriginalStudy(params: {
        reference: string;
        sourceText: string;
        sourceLanguage: "grc" | "he";
        outputLanguage: "fi" | "en";
        translations: Array<{ id: string; name: string; text: string }>;
        scope: "verse" | "chapter" | "book";
        focus?: string;
    }): Promise<OriginalStudyResult> {
        const res = await fetch(`${this.baseUrl}/ai/original-study`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /ai/original-study returned ${res.status}`);
        return await res.json();
    }

    /**
     * Fetches original word definition and context.
     */
    async getAiDeepDive(keyword: string, language: string, context?: {
        reference: string;
        translationA?: string;
        textA?: string;
        translationB?: string;
        textB?: string;
    }): Promise<AiTextResponse> {
        const res = await fetch(`${this.baseUrl}/ai/deep-dive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: keyword, outputLanguage: language, context }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /ai/deep-dive returned ${res.status}`);
        return await res.json();
    }

    /**
     * Runs FTS5 RAG Search utilizing Gemini planner and database search.
     */
    async executeAiSearch(query: string, translationId: string, uiLanguage: "fi" | "en"): Promise<AiSearchResponse> {
        const res = await fetch(`${this.baseUrl}/ai/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, translationId, uiLanguage }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /ai/search returned ${res.status}`);
        return await res.json();
    }

    /**
     * Compares differences, style, and theological nuances between two translations.
     */
    async getAiComparison(params: {
        reference: string;
        translationA: string;
        textA: string;
        translationB: string;
        textB: string;
    }): Promise<AiTextResponse> {
        const res = await fetch(`${this.baseUrl}/ai/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`POST /ai/compare returned ${res.status}`);
        return await res.json();
    }
}

export const apiService = new ApiService();