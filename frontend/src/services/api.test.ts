// src/services/api.test.ts
import { apiService } from './api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ApiService', () => {
    beforeEach(() => {
        // Clear potential previous mock calls before each test
        vi.restoreAllMocks();
    });

    it('fetches verses successfully from backend (getVerses)', async () => {
        const mockResponse = {
            reference: 'John 3:16',
            verses: [{ bookName: 'John', chapter: 3, verse: 16, text: 'For God so loved...' }],
            text: 'For God so loved...',
            translationName: 'World English Bible',
        };

        // Set global fetch to return a mock response
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        } as Response);

        const result = await apiService.getVerses('John 3:16', 'web');

        expect(result.reference).toBe('John 3:16');
        expect(result.verses[0].text).toContain('God so loved');
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/verses?ref=John%203%3A16&translation=web'),
            expect.any(Object)
        );
    });

    it('throws an error if verses request fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        } as Response);

        await expect(apiService.getVerses('John 3:16', 'web')).rejects.toThrow('GET /api/verses returned 500');
    });

    it('fetches installed translations successfully (getTranslations)', async () => {
        const mockTranslations = [
            { id: 'web', name: 'World English Bible', language: 'en', format: 'xml', sourceUrl: '', installedAt: '' }
        ];

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockTranslations,
        } as Response);

        const result = await apiService.getTranslations();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('web');
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/translations'),
            expect.any(Object)
        );
    });

    it('saves search history successfully (addSearch)', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
        } as Response);

        const payload = {
            queryText: 'forgiveness',
            searchScope: 'book',
            scopeValue: 'PSA',
            translationId: 'web',
            mode: 'phrase',
            resultCount: 5
        };

        await apiService.addSearch(payload);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/history'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(payload)
            })
        );
    });

    it('activates a translation via linkTranslation (POST /api/translations/link)', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ id: 'fin-1992', status: 'activated' }),
        } as Response);

        await apiService.linkTranslation('fin-1992');

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/translations/link'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ translationId: 'fin-1992' }),
            })
        );
    });

    it('deactivates a translation via unlinkTranslation (DELETE /api/translations/link)', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
        } as Response);

        await apiService.unlinkTranslation('fin-1992');

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/translations/link'),
            expect.objectContaining({
                method: 'DELETE',
                body: JSON.stringify({ translationId: 'fin-1992' }),
            })
        );
    });

    it('analyzes text successfully (analyze)', async () => {
        const mockRawStats = {
            token_count: 100,
            unique_token_count: 50,
            type_token_ratio: 0.5,
            character_count: 500,
            avg_word_length: 5.0,
            top_words: [{ word: 'light', count: 10 }],
            top_bigrams: [{ word: 'the light', count: 5 }],
            top_trigrams: [{ word: 'in the light', count: 3 }]
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockRawStats,
        } as Response);

        const result = await apiService.analyze('John 3', 'web');

        expect(result.tokenCount).toBe(100);
        expect(result.uniqueTokenCount).toBe(50);
        expect(result.typeTokenRatio).toBe(0.5);
        expect(result.topWords).toHaveLength(1);
        expect(result.topWords[0].name).toBe('light');
        expect(result.topWords[0].value).toBe(10);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/analytics/analyze'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ reference: 'John 3', translationId: 'web' })
            })
        );
    });

    it('compares translations successfully (compare)', async () => {
        const mockRawComparison = {
            reference: 'John 3:16',
            translation_a: 'web',
            translation_b: 'kjv',
            aligned_verses: [
                {
                    book_id: 'JHN',
                    chapter: 3,
                    verse: 16,
                    text_a: 'For God so loved',
                    text_b: 'For God so loved',
                    similarity: 1.0,
                    exact_match: true
                }
            ],
            summary: {
                total_verses: 1,
                fully_aligned_verses: 1,
                exact_matches: 1,
                exact_match_ratio: 1.0,
                average_similarity: 1.0,
                top_shared_words: [{ word: 'God', count: 1 }],
                most_similar_verse_ref: 'John 3:16'
            }
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockRawComparison,
        } as Response);

        const result = await apiService.compare('John 3:16', 'web', 'kjv');

        expect(result.reference).toBe('John 3:16');
        expect(result.translationA).toBe('web');
        expect(result.translationB).toBe('kjv');
        expect(result.alignedVerses[0].bookId).toBe('JHN');
        expect(result.summary.averageSimilarity).toBe(1.0);
        expect(result.summary.topSharedWords[0].name).toBe('God');
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/analytics/compare'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ reference: 'John 3:16', translationId1: 'web', translationId2: 'kjv' })
            })
        );
    });

    it('fetches AI insights successfully and maps geminiUsageMetadata (getAiInsight)', async () => {
        const mockResponse = {
            text: 'Mocked Insight response text',
            nextFocus: [{ label: 'love', kind: 'theme', reason: 'lexical context' }],
            geminiUsageMetadata: {
                promptTokenCount: 12,
                candidatesTokenCount: 34,
                totalTokenCount: 46
            }
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        } as Response);

        const result = await apiService.getAiInsight('John 3:16', 'love');

        expect(result.text).toBe('Mocked Insight response text');
        expect(result.geminiUsageMetadata).toBeDefined();
        expect(result.geminiUsageMetadata?.promptTokenCount).toBe(12);
        expect(result.geminiUsageMetadata?.totalTokenCount).toBe(46);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/ai/insight'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ text: 'John 3:16', focus: 'love' })
            })
        );
    });

    it('fetches AI original study successfully (getAiOriginalStudy)', async () => {
        const mockResponse = {
            text: 'Mocked Original Study response text',
            geminiUsageMetadata: {
                promptTokenCount: 15,
                candidatesTokenCount: 25,
                totalTokenCount: 40
            }
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        } as Response);

        const result = await apiService.getAiOriginalStudy({
            reference: 'John 3:16',
            sourceText: 'houtos gar',
            sourceLanguage: 'grc',
            outputLanguage: 'fi',
            translations: [{ id: 'kr92', name: '1992', text: 'Jumala' }],
            scope: 'verse',
        });

        expect(result.text).toBe('Mocked Original Study response text');
        expect(result.geminiUsageMetadata).toBeDefined();
        expect(result.geminiUsageMetadata?.promptTokenCount).toBe(15);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/ai/original-study'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    reference: 'John 3:16',
                    sourceText: 'houtos gar',
                    sourceLanguage: 'grc',
                    outputLanguage: 'fi',
                    translations: [{ id: 'kr92', name: '1992', text: 'Jumala' }],
                    scope: 'verse'
                })
            })
        );
    });
});

