import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VerseReaderSkeleton } from './VerseReaderSkeleton';
import { LanguageProvider } from '@/context/LanguageContext';

describe('VerseReaderSkeleton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders accessible chapter loading skeleton with aria-busy', () => {
    act(() => {
      root.render(
        <LanguageProvider>
          <VerseReaderSkeleton />
        </LanguageProvider>
      );
    });

    const skeleton = container.querySelector('[aria-busy="true"]');
    expect(skeleton).not.toBeNull();
    expect(skeleton?.getAttribute('aria-label')).toBeTruthy();
  });
});
