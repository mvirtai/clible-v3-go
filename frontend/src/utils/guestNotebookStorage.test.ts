import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    GUEST_STORAGE_KEY,
    GUEST_TTL_MS,
    isGuestNotebookId,
    getGuestNotebookStore,
    setGuestNotebookStore,
    getGuestNotebooks,
    getSingleGuestNotebook,
    createGuestNotebook,
    updateSingleGuestNotebook,
    saveGuestCells,
    saveAllGuestNotebooks,
    getGuestRemainingSeconds,
    clearGuestNotebookStore,
    type GuestNotebookStore,
} from './guestNotebookStorage';
import type { Notebook, Cell } from '../components/notebook/types';

describe('guestNotebookStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useRealTimers();
    });

    afterEach(() => {
        localStorage.clear();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('isGuestNotebookId', () => {
        it('identifies guest notebook IDs starting with guest- prefix', () => {
            expect(isGuestNotebookId('guest-1234')).toBe(true);
            expect(isGuestNotebookId('guest-uuid-5678')).toBe(true);
        });

        it('rejects IDs without guest- prefix or non-string values', () => {
            expect(isGuestNotebookId('user-1234')).toBe(false);
            expect(isGuestNotebookId('1234')).toBe(false);
            expect(isGuestNotebookId('')).toBe(false);
            expect(isGuestNotebookId(null)).toBe(false);
            expect(isGuestNotebookId(undefined)).toBe(false);
        });
    });

    describe('getGuestNotebookStore & setGuestNotebookStore', () => {
        it('returns null when localStorage is empty', () => {
            expect(getGuestNotebookStore()).toBeNull();
        });

        it('persists and retrieves valid guest notebook store', () => {
            const sampleStore: GuestNotebookStore = {
                expiresAt: Date.now() + GUEST_TTL_MS,
                notebooks: [
                    {
                        id: 'guest-1',
                        title: 'Saved Notebook',
                        scopeId: 'guest-scope',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                ],
            };

            setGuestNotebookStore(sampleStore);
            const retrieved = getGuestNotebookStore();

            expect(retrieved).not.toBeNull();
            expect(retrieved?.expiresAt).toBe(sampleStore.expiresAt);
            expect(retrieved?.notebooks).toHaveLength(1);
            expect(retrieved?.notebooks[0].title).toBe('Saved Notebook');
        });

        it('clears storage and returns null if JSON is corrupted', () => {
            localStorage.setItem(GUEST_STORAGE_KEY, '{ invalid json');
            expect(getGuestNotebookStore()).toBeNull();
            expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
        });

        it('clears storage and returns null if schema is invalid', () => {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
            expect(getGuestNotebookStore()).toBeNull();
            expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
        });

        it('clears storage and returns null when expiresAt is in the past', () => {
            const expiredStore: GuestNotebookStore = {
                expiresAt: Date.now() - 1000,
                notebooks: [],
            };
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(expiredStore));

            expect(getGuestNotebookStore()).toBeNull();
            expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
        });

        it('handles localStorage getItem throwing an error gracefully', () => {
            vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
                throw new Error('Access denied');
            });
            expect(getGuestNotebookStore()).toBeNull();
        });

        it('handles localStorage setItem throwing an error gracefully', () => {
            vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
                throw new Error('Quota exceeded');
            });

            expect(() => {
                setGuestNotebookStore({ expiresAt: Date.now() + 1000, notebooks: [] });
            }).not.toThrow();
        });
    });

    describe('createGuestNotebook & getGuestNotebooks', () => {
        it('creates a notebook with custom title and default grid dimensions', () => {
            const nb = createGuestNotebook('My Study Notes');

            expect(nb.id.startsWith('guest-')).toBe(true);
            expect(nb.title).toBe('My Study Notes');
            expect(nb.scopeId).toBe('guest-scope');
            expect(nb.colSpan).toBe(12);
            expect(nb.rowSpan).toBe(5);
            expect(nb.cells).toEqual([]);
            expect(nb.cellCounts?.markdown).toBe(0);

            const all = getGuestNotebooks();
            expect(all).toHaveLength(1);
            expect(all[0].id).toBe(nb.id);
        });

        it('uses localized default title in Finnish when no title given', () => {
            const nb = createGuestNotebook(undefined, 'fi');
            expect(nb.title).toBe('Uusi muistikirja');
        });

        it('uses localized default title in English when no title given', () => {
            const nb = createGuestNotebook(undefined, 'en');
            expect(nb.title).toBe('New notebook');
        });

        it('maintains the original expiresAt when creating subsequent notebooks', () => {
            vi.useFakeTimers();
            const initialTime = 1700000000000;
            vi.setSystemTime(initialTime);

            createGuestNotebook('First');
            const initialStore = getGuestNotebookStore();
            const originalExpiresAt = initialStore?.expiresAt;

            // Advance time by 10 minutes
            vi.setSystemTime(initialTime + 10 * 60 * 1000);
            createGuestNotebook('Second');

            const updatedStore = getGuestNotebookStore();
            expect(updatedStore?.notebooks).toHaveLength(2);
            expect(updatedStore?.expiresAt).toBe(originalExpiresAt);
        });
    });

    describe('getSingleGuestNotebook', () => {
        it('returns matching notebook by id', () => {
            createGuestNotebook('One');
            const nb2 = createGuestNotebook('Two');

            const found = getSingleGuestNotebook(nb2.id);
            expect(found).not.toBeNull();
            expect(found?.id).toBe(nb2.id);
            expect(found?.title).toBe('Two');
        });

        it('returns null when notebook id does not exist', () => {
            createGuestNotebook('One');
            expect(getSingleGuestNotebook('guest-nonexistent')).toBeNull();
        });

        it('returns null when store is empty', () => {
            expect(getSingleGuestNotebook('guest-any')).toBeNull();
        });
    });

    describe('updateSingleGuestNotebook', () => {
        it('updates notebook properties and sets new updatedAt timestamp', () => {
            vi.useFakeTimers();
            const initialTime = 1700000000000;
            vi.setSystemTime(initialTime);

            const created = createGuestNotebook('Original Title');

            vi.setSystemTime(initialTime + 5000);
            const updated = updateSingleGuestNotebook(created.id, {
                title: 'Updated Title',
                colSpan: 16,
                rowSpan: 8,
            });

            expect(updated).not.toBeNull();
            expect(updated?.title).toBe('Updated Title');
            expect(updated?.colSpan).toBe(16);
            expect(updated?.rowSpan).toBe(8);
            expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(new Date(created.createdAt).getTime());

            const refreshed = getSingleGuestNotebook(created.id);
            expect(refreshed?.title).toBe('Updated Title');
        });

        it('returns null if notebook id is not found', () => {
            createGuestNotebook('Existing');
            const res = updateSingleGuestNotebook('guest-unknown', { title: 'Nope' });
            expect(res).toBeNull();
        });

        it('returns null if store is empty', () => {
            const res = updateSingleGuestNotebook('guest-any', { title: 'Nope' });
            expect(res).toBeNull();
        });
    });

    describe('saveGuestCells', () => {
        it('saves cells and computes markdown cell count correctly', () => {
            const nb = createGuestNotebook('With Cells');
            const dummyCells: Cell[] = [
                { id: 'c1', notebookId: nb.id, type: 'markdown', content: '# Heading 1' },
                { id: 'c2', notebookId: nb.id, type: 'markdown', content: 'Text paragraph' },
            ];

            const success = saveGuestCells(nb.id, dummyCells);
            expect(success).toBe(true);

            const saved = getSingleGuestNotebook(nb.id);
            expect(saved?.cells).toHaveLength(2);
            expect(saved?.cellCounts?.markdown).toBe(2);
        });

        it('returns false when notebook is not found', () => {
            createGuestNotebook('Some NB');
            const success = saveGuestCells('guest-wrong', []);
            expect(success).toBe(false);
        });

        it('returns false when store is empty', () => {
            const success = saveGuestCells('guest-any', []);
            expect(success).toBe(false);
        });
    });

    describe('saveAllGuestNotebooks', () => {
        it('updates notebook list order e.g. for drag-and-drop', () => {
            const nb1 = createGuestNotebook('First');
            const nb2 = createGuestNotebook('Second');

            // Reorder: second first
            saveAllGuestNotebooks([nb2, nb1]);

            const current = getGuestNotebooks();
            expect(current[0].id).toBe(nb2.id);
            expect(current[1].id).toBe(nb1.id);
        });

        it('does nothing when store is empty', () => {
            const dummy: Notebook = {
                id: 'guest-x',
                title: 'Ghost',
                scopeId: 'ghost',
                createdAt: '',
                updatedAt: '',
            };
            expect(() => saveAllGuestNotebooks([dummy])).not.toThrow();
            expect(getGuestNotebookStore()).toBeNull();
        });
    });

    describe('getGuestRemainingSeconds', () => {
        it('returns 0 when no guest store exists', () => {
            expect(getGuestRemainingSeconds()).toBe(0);
        });

        it('calculates remaining seconds accurately', () => {
            vi.useFakeTimers();
            const now = 1700000000000;
            vi.setSystemTime(now);

            createGuestNotebook('Timed');
            // Fresh store has 1h (3600s) remaining
            expect(getGuestRemainingSeconds()).toBe(3600);

            // Fast-forward 15 minutes
            vi.setSystemTime(now + 15 * 60 * 1000);
            expect(getGuestRemainingSeconds()).toBe(2700);

            // Fast-forward beyond TTL
            vi.setSystemTime(now + GUEST_TTL_MS + 1000);
            expect(getGuestRemainingSeconds()).toBe(0);
        });
    });

    describe('clearGuestNotebookStore', () => {
        it('removes storage key and resets state', () => {
            createGuestNotebook('To be cleared');
            expect(getGuestNotebookStore()).not.toBeNull();

            clearGuestNotebookStore();
            expect(getGuestNotebookStore()).toBeNull();
            expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
        });

        it('handles localStorage removeItem throwing an error gracefully', () => {
            vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
                throw new Error('Access denied');
            });

            expect(() => clearGuestNotebookStore()).not.toThrow();
        });
    });
});