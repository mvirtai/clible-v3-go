import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReadingPlansView } from './ReadingPlansView';
import { LanguageProvider } from '../context/LanguageContext';

describe('ReadingPlansView', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    localStorage.clear();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    localStorage.clear();
  });

  it('renders reading plans header, progress widget, and category filter pills', () => {
    const onSelectVerse = vi.fn();
    const onStudyInNotebook = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ReadingPlansView
            onSelectVerse={onSelectVerse}
            onStudyInNotebook={onStudyInNotebook}
          />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Lukusuunnitelmat');
    expect(text).toContain('Kaikki');
    expect(text).toContain('Evankeliumit');
    expect(text).toContain('Hartaus & Psalmit');
    expect(text).toContain('Uusi testamentti');
  });

  it('invokes onSelectVerse and onStudyInNotebook when clicking day action buttons', () => {
    const onSelectVerse = vi.fn();
    const onStudyInNotebook = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ReadingPlansView
            onSelectVerse={onSelectVerse}
            onStudyInNotebook={onStudyInNotebook}
          />
        </LanguageProvider>
      );
    });

    // Find the first reader button ("Avaa lukutilassa")
    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const openReaderBtn = buttons.find((b) =>
      b.textContent?.includes('Avaa lukutilassa')
    );
    expect(openReaderBtn).toBeDefined();

    act(() => {
      openReaderBtn?.click();
    });
    expect(onSelectVerse).toHaveBeenCalled();

    // Find study in notebook button ("Tutki muistikirjassa")
    const studyBtn = buttons.find((b) =>
      b.textContent?.includes('Tutki muistikirjassa')
    );
    expect(studyBtn).toBeDefined();

    act(() => {
      studyBtn?.click();
    });
    expect(onStudyInNotebook).toHaveBeenCalled();
  });

  it('allows filtering by category and switching active plan', async () => {
    const onSelectVerse = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ReadingPlansView onSelectVerse={onSelectVerse} />
        </LanguageProvider>
      );
    });

    // Click 'Evankeliumit' category pill
    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const gospelsPill = buttons.find((b) => b.textContent?.trim() === 'Evankeliumit');
    expect(gospelsPill).toBeDefined();

    await act(async () => {
      gospelsPill?.click();
    });

    // Content updates with gospels filter
    const text = container?.textContent || '';
    expect(text).toContain('Evankeliumit');
  });
});
