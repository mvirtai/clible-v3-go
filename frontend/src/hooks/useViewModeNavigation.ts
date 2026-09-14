import { useSyncExternalStore, useCallback } from 'react';
import type { ViewMode } from '@/components/layout/AppHeader';

const VALID_MODES: readonly ViewMode[] = [
    'reader',
    'search',
    'analytics',
    'compare',
    'original',
    'notebooks',
] as const;

function isValidViewMode(value: string | null): value is ViewMode {
    return VALID_MODES.includes(value as ViewMode);
}

function subscribeToHistory(callback: () => void): () => void {
    window.addEventListener('popstate', callback);
    return () => window.removeEventListener('popstate', callback);
}

function getViewSnapshot(): ViewMode {
    if (typeof window === 'undefined') return 'reader';
    const param = new URLSearchParams(window.location.search).get('view');
    return isValidViewMode(param) ? param : 'reader';
}

function getServerSnapshot(): ViewMode {
    return 'reader';
}

export function useViewModeNavigation() {
    const viewMode = useSyncExternalStore(
        subscribeToHistory,
        getViewSnapshot,
        getServerSnapshot
    );

    const setViewMode = useCallback((newMode: ViewMode, push = true) => {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('view') === newMode) return;

        currentUrl.searchParams.set('view', newMode);
        if (push) {
            window.history.pushState({ viewMode: newMode }, '', currentUrl.toString());
        } else {
            window.history.replaceState({ viewMode: newMode }, '', currentUrl.toString());
        }
        // Herätetään useSyncExternalStore -tilaajat heti samassa säikeessä
        window.dispatchEvent(new Event('popstate'));
    }, []);

  return [viewMode, setViewMode] as const;
}
