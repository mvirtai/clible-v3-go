import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LiturgicalViewSkeleton } from './LiturgicalViewSkeleton';
import { LanguageProvider } from '../context/LanguageContext';

describe('LiturgicalViewSkeleton', () => {
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

  it('renders accessible loading skeleton with aria attributes', () => {
    act(() => {
      root.render(
        <LanguageProvider>
          <LiturgicalViewSkeleton />
        </LanguageProvider>
      );
    });

    const skeleton = container.querySelector('[aria-busy="true"]');
    expect(skeleton).not.toBeNull();
    expect(skeleton?.getAttribute('aria-label')).toBeTruthy();
  });
});
