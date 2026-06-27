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

    it('imports a new translation successfully (importTranslation)', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ id: 'fin-1992', status: 'imported' }),
        } as Response);

        const file = new File(['<bible></bible>'], 'Finnish1992Bible.xml', { type: 'text/xml' });

        const result = await apiService.importTranslation('fin-1992', 'Kirkkoraamattu 1992', 'fi', file);

        expect(result.id).toBe('fin-1992');
        expect(result.status).toBe('imported');
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/translations/import'),
            expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData),
            })
        );
    });
});
