import type { Notebook, Cell } from '../components/notebook/types';
import { t, type UILanguage } from './i18n';

export interface GuestNotebookStore {
    expiresAt: number;
    notebooks: Notebook[];
}



export const GUEST_STORAGE_KEY = 'clible_guest_notebooks';
export const GUEST_TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Checks if the guest notebook storage is valid and has an ID.
 */
export function isGuestNotebookId(id: string | null | undefined): boolean {
    return typeof id === 'string' && id.startsWith('guest-');
}

/**
 * Gets the guest notebook store from local storage.
 */
export function getGuestNotebookStore(): GuestNotebookStore | null {
    try {
        const raw = localStorage.getItem(GUEST_STORAGE_KEY);
        if (!raw) return null;

        const parsed: GuestNotebookStore = JSON.parse(raw);
        if (!parsed || typeof parsed.expiresAt !== 'number' || !Array.isArray(parsed.notebooks)) {
            localStorage.removeItem(GUEST_STORAGE_KEY);
            return null;
        }

        if (Date.now() > parsed.expiresAt) {
            localStorage.removeItem(GUEST_STORAGE_KEY);
            return null;
        }

        return parsed;
    } catch {
        try {
            localStorage.removeItem(GUEST_STORAGE_KEY);
        } catch {
            // ignore
        }
        return null;
    }
}

/**
* Saves the guest notebook store to local storage.
 */
export function setGuestNotebookStore(store: GuestNotebookStore): void {
    try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
        console.error('Error writing guest notebook store', err);
    }
}

/**
 * Gets all active guest notebooks.
 */
export function getGuestNotebooks(): Notebook[] {
    const store = getGuestNotebookStore();
    return store ? store.notebooks : [];
}

/**
 * Gets a specific notebook by ID.
 */
export function getSingleGuestNotebook(id: string): Notebook | null {
    const notebooks = getGuestNotebooks();
    return notebooks.find(nb => nb.id === id) ?? null;
}

function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a new guest notebook with default values and 1h TTL.
 */
export function createGuestNotebook(title?: string, lang: UILanguage = 'fi'): Notebook {
    let store = getGuestNotebookStore();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    if (!store) {
        store = {
            expiresAt: now + GUEST_TTL_MS,
            notebooks: [],
        };
    }

    const defaultTitle = t(lang).notebookDefaultTitle;

    const newNotebook: Notebook = {
        id: `guest-${generateUUID()}`,
        title: (title || defaultTitle).trim(),
        scopeId: 'guest-scope',
        colSpan: 12,
        rowSpan: 5,
        cells: [],
        cellCounts: { markdown: 0 },
        createdAt: nowIso,
        updatedAt: nowIso,
    };

    store.notebooks.push(newNotebook);
    setGuestNotebookStore(store);

    return newNotebook;
}

/**
 * Updates a specific notebook by ID.
 */
export function updateSingleGuestNotebook(id: string, updates: Partial<Notebook>): Notebook | null {
    const store = getGuestNotebookStore();
    if (!store) return null;

    const index = store.notebooks.findIndex(nb => nb.id === id);
    if (index === -1) return null;

    const updated: Notebook = {
        ...store.notebooks[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    store.notebooks[index] = updated;
    setGuestNotebookStore(store);

    return updated;
}

export const updateGuestNotebook = updateSingleGuestNotebook;
export const getGuestNotebook = getSingleGuestNotebook;


/**
 * Save cells to a guest notebook.
 */
export function saveGuestCells(id: string, cells: Cell[]): boolean {
    const store = getGuestNotebookStore();
    if (!store) return false;

    const index = store.notebooks.findIndex(nb => nb.id === id);
    if (index === -1) return false;

    const mdCount = cells.filter(c => c.type === 'markdown').length;
    
    store.notebooks[index] = {
        ...store.notebooks[index],
        cells,
        cellCounts: { markdown: mdCount },
        updatedAt: new Date().toISOString(),
    };

    setGuestNotebookStore(store);
    return true;
}

/**
 * Save all guest notebooks (e.g. after DnD-operatior)
 */
export function saveAllGuestNotebooks(notebooks: Notebook[]): void {
    const store = getGuestNotebookStore();
    if (!store) return;

    store.notebooks = notebooks;
    setGuestNotebookStore(store);
}

export function getGuestRemainingSeconds(): number {
    const store = getGuestNotebookStore();
    if (!store) return 0;

    const diffMs = store.expiresAt - Date.now();
    return diffMs > 9 ? Math.floor(diffMs / 1000) : 0;
}

/**
 * Removes the guest notebook store from local storage.
 */
export function clearGuestNotebookStore(): void {
    try {
        localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err) {
        console.error('Error clearing guest notebook store', err);
    }
}