import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CuratedVerseCard } from './CuratedVerseCard';
import { strings } from '../../utils/i18n';
import type { AiVerseMatch } from '../../types/aiSearch';

const mockVerse: AiVerseMatch = {
  id: 'v123',
  translationId: 'web',
  bookId: 'MAT',
  chapter: 8,
  verse: 26,
  text: 'Why are you fearful, O you of little faith?',
};

const createTouchEvent = (type: string, clientX: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: [{ clientX }],
  });
  return event;
};

describe('CuratedVerseCard', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  it('renders verse reference and text content', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <CuratedVerseCard
          verse={mockVerse}
          status="unreviewed"
          strings={strings.en}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          onRestore={vi.fn()}
        />
      );
    });

    expect(container!.textContent).toContain('MAT 8:26');
    expect(container!.textContent).toContain('Why are you fearful, O you of little faith?');
  });

  it('triggers onAccept when desktop accept button is clicked', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <CuratedVerseCard
          verse={mockVerse}
          status="unreviewed"
          strings={strings.en}
          onAccept={onAccept}
          onReject={onReject}
          onRestore={vi.fn()}
        />
      );
    });

    const acceptBtn = container!.querySelector(`button[aria-label="${strings.en.curateAccept}"]`) as HTMLButtonElement;
    expect(acceptBtn).not.toBeNull();

    act(() => {
      acceptBtn.click();
    });

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith('v123');
    expect(onReject).not.toHaveBeenCalled();
  });

  it('triggers onReject when desktop reject button is clicked', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <CuratedVerseCard
          verse={mockVerse}
          status="unreviewed"
          strings={strings.en}
          onAccept={onAccept}
          onReject={onReject}
          onRestore={vi.fn()}
        />
      );
    });

    const rejectBtn = container!.querySelector(`button[aria-label="${strings.en.curateReject}"]`) as HTMLButtonElement;
    expect(rejectBtn).not.toBeNull();

    act(() => {
      rejectBtn.click();
    });

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith('v123');
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('shows accepted badge and clicking accept button again triggers onRestore', () => {
    const onRestore = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <CuratedVerseCard
          verse={mockVerse}
          status="accepted"
          strings={strings.en}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          onRestore={onRestore}
        />
      );
    });

    expect(container!.textContent).toContain(strings.en.curateAccepted);

    const acceptBtn = container!.querySelector(`button[aria-label="${strings.en.curateAccept}"]`) as HTMLButtonElement;
    expect(acceptBtn.getAttribute('aria-pressed')).toBe('true');

    act(() => {
      acceptBtn.click();
    });

    expect(onRestore).toHaveBeenCalledWith('v123');
  });

  it('shows rejected styling, line-through text and restore button in rejected state', () => {
    const onRestore = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <CuratedVerseCard
          verse={mockVerse}
          status="rejected"
          strings={strings.en}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          onRestore={onRestore}
        />
      );
    });

    expect(container!.textContent).toContain(strings.en.curateRejected);
    const p = container!.querySelector('p');
    expect(p?.className).toContain('line-through');

    const restoreBtn = container!.querySelector(`button[aria-label="${strings.en.curateRestore}"]`) as HTMLButtonElement;
    expect(restoreBtn).not.toBeNull();

    act(() => {
      restoreBtn.click();
    });

    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith('v123');
  });

  it('triggers onSelectVerse when verse reference or text is clicked or Enter is pressed', () => {
    const onSelectVerse = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <CuratedVerseCard
          verse={mockVerse}
          status="unreviewed"
          strings={strings.en}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          onRestore={vi.fn()}
          onSelectVerse={onSelectVerse}
        />
      );
    });

    const clickableDiv = container!.querySelector('[role="button"]') as HTMLElement;
    expect(clickableDiv).not.toBeNull();

    act(() => {
      clickableDiv.click();
    });
    expect(onSelectVerse).toHaveBeenCalledWith('MAT 8:26');

    act(() => {
      clickableDiv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSelectVerse).toHaveBeenCalledTimes(2);

    act(() => {
      clickableDiv.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(onSelectVerse).toHaveBeenCalledTimes(3);
  });

  describe('touch gesture swipe-triage', () => {
    it('swipe right (+100px) triggers onAccept', () => {
      const onAccept = vi.fn();
      const onReject = vi.fn();

      act(() => {
        root = createRoot(container!);
        root.render(
          <CuratedVerseCard
            verse={mockVerse}
            status="unreviewed"
            strings={strings.en}
            onAccept={onAccept}
            onReject={onReject}
            onRestore={vi.fn()}
          />
        );
      });

      const cardInner = container!.querySelector('[data-testid="curated-verse-card-inner-v123"]') as HTMLElement;

      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchstart', 100));
      });
      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchmove', 200));
      });
      act(() => {
        cardInner.dispatchEvent(new Event('touchend', { bubbles: true }));
      });

      expect(onAccept).toHaveBeenCalledWith('v123');
      expect(onReject).not.toHaveBeenCalled();
    });

    it('swipe left (-100px) triggers onReject', () => {
      const onAccept = vi.fn();
      const onReject = vi.fn();

      act(() => {
        root = createRoot(container!);
        root.render(
          <CuratedVerseCard
            verse={mockVerse}
            status="unreviewed"
            strings={strings.en}
            onAccept={onAccept}
            onReject={onReject}
            onRestore={vi.fn()}
          />
        );
      });

      const cardInner = container!.querySelector('[data-testid="curated-verse-card-inner-v123"]') as HTMLElement;

      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchstart', 200));
      });
      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchmove', 100));
      });
      act(() => {
        cardInner.dispatchEvent(new Event('touchend', { bubbles: true }));
      });

      expect(onReject).toHaveBeenCalledWith('v123');
      expect(onAccept).not.toHaveBeenCalled();
    });

    it('small swipe (< 75px) does not trigger triage callbacks', () => {
      const onAccept = vi.fn();
      const onReject = vi.fn();

      act(() => {
        root = createRoot(container!);
        root.render(
          <CuratedVerseCard
            verse={mockVerse}
            status="unreviewed"
            strings={strings.en}
            onAccept={onAccept}
            onReject={onReject}
            onRestore={vi.fn()}
          />
        );
      });

      const cardInner = container!.querySelector('[data-testid="curated-verse-card-inner-v123"]') as HTMLElement;

      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchstart', 100));
      });
      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchmove', 150)); // 50px delta
      });
      act(() => {
        cardInner.dispatchEvent(new Event('touchend', { bubbles: true }));
      });

      expect(onAccept).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
    });

    it('touchcancel aborts swiping without firing actions', () => {
      const onAccept = vi.fn();
      const onReject = vi.fn();

      act(() => {
        root = createRoot(container!);
        root.render(
          <CuratedVerseCard
            verse={mockVerse}
            status="unreviewed"
            strings={strings.en}
            onAccept={onAccept}
            onReject={onReject}
            onRestore={vi.fn()}
          />
        );
      });

      const cardInner = container!.querySelector('[data-testid="curated-verse-card-inner-v123"]') as HTMLElement;

      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchstart', 100));
      });
      act(() => {
        cardInner.dispatchEvent(createTouchEvent('touchmove', 200));
      });
      act(() => {
        cardInner.dispatchEvent(new Event('touchcancel', { bubbles: true }));
      });
      act(() => {
        cardInner.dispatchEvent(new Event('touchend', { bubbles: true }));
      });

      expect(onAccept).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
    });
  });
});
