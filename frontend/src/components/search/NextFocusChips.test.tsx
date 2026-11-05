import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { NextFocusChips } from './NextFocusChips';
import { LanguageProvider } from '../../context/LanguageContext';
import type { NextFocusItem } from '../../types/ai';

describe('NextFocusChips', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockItems: NextFocusItem[] = [
    { label: 'Covenant', kind: 'theme', reason: 'Explores biblical covenant' },
    { label: 'Grace', kind: 'theme', reason: 'Grace in context' },
  ];

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

  it('renders chips and handles pick', async () => {
    const onPick = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <NextFocusChips
            title="Jatkoaiheet"
            items={mockItems}
            onPick={onPick}
          />
        </LanguageProvider>,
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain('Covenant');

    await act(async () => {
      buttons[0].click();
    });

    expect(onPick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('sets aria-busy and highlights only the pending chip', async () => {
    const onPick = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <NextFocusChips
            title="Jatkoaiheet"
            items={mockItems}
            onPick={onPick}
            pendingLabel="Grace"
            disabled={true}
          />
        </LanguageProvider>,
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons[0].getAttribute('aria-busy')).toBe('false');
    expect(buttons[0].disabled).toBe(true);

    expect(buttons[1].getAttribute('aria-busy')).toBe('true');
    expect(buttons[1].disabled).toBe(true);
    // Should render spinning icon inside pending chip
    expect(buttons[1].querySelector('svg')).not.toBeNull();
  });

  it('visually differentiates Bible reference chips from topic chips and renders legend', async () => {
    const mixedItems: NextFocusItem[] = [
      { label: 'Jes. 7:14', kind: 'phrase', reason: 'Katso profetian luku' },
      { label: 'Immanuel-profetia', kind: 'theme', reason: 'Syvenny teemaan' },
    ];

    await act(async () => {
      root.render(
        <LanguageProvider>
          <NextFocusChips
            title="Seuraava painopiste"
            items={mixedItems}
            onPick={vi.fn()}
          />
        </LanguageProvider>,
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);

    // First button is a Bible reference: should have sky/blue theme and navigation aria label
    expect(buttons[0].textContent).toContain('Jes. 7:14');
    expect(buttons[0].className).toContain('text-sky-900');
    expect(buttons[0].getAttribute('aria-label')).toContain('Avaa raamatunkohta lukunäkymässä');

    // Second button is a deep dive topic: should have default theme and deep dive aria label
    expect(buttons[1].textContent).toContain('Immanuel-profetia');
    expect(buttons[1].getAttribute('aria-label')).toContain('Syvenny aiheeseen tekoälyllä');

    // Header should contain the micro-legend explaining the distinction
    expect(container.textContent).toContain('Raamatunpaikka');
    expect(container.textContent).toContain('Aihe');
  });
});

