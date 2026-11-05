import { describe, it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { DeepDiveBreadcrumb } from './DeepDiveBreadcrumb';
import { LanguageProvider } from '../../context/LanguageContext';

describe('DeepDiveBreadcrumb', () => {
  it('renders nothing when path is empty', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveBreadcrumb path={[]} />
        </LanguageProvider>,
      );
    });

    expect(container.innerHTML).toBe('');
    act(() => root.unmount());
  });

  it('renders path segments with separator and aria-current on the last item', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveBreadcrumb path={['Covenant', 'Abrahamic Covenant', 'Circumcision']} />
        </LanguageProvider>,
      );
    });

    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();

    const items = container.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('Covenant');
    expect(items[1].textContent).toContain('Abrahamic Covenant');
    expect(items[2].textContent).toContain('Circumcision');

    const current = container.querySelector('[aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current?.textContent).toBe('Circumcision');

    act(() => root.unmount());
  });
});

