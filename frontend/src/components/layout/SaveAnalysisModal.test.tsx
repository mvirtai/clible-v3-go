import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { SaveAnalysisModal } from './SaveAnalysisModal';
import { LanguageProvider } from '../../context/LanguageContext';

describe('SaveAnalysisModal', () => {
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

  it('renders nothing when isOpen is false', async () => {
    await act(async () => {
      root.render(
        <LanguageProvider>
          <SaveAnalysisModal
            isOpen={false}
            defaultName="Test"
            onSave={vi.fn()}
            onClose={vi.fn()}
          />
        </LanguageProvider>,
      );
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders dialog with defaultName and validates length (2-40 chars)', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <SaveAnalysisModal
            isOpen={true}
            defaultName="Joh 3:16 analyysi"
            onSave={onSave}
            onClose={onClose}
          />
        </LanguageProvider>,
      );
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Joh 3:16 analyysi');

    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    // Empty or 1 character: disabled
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    await act(async () => {
      nativeInputValueSetter?.call(input, 'a');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      const form = container.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave when submitted with valid name', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <SaveAnalysisModal
            isOpen={true}
            defaultName="Hyväksytty nimi"
            onSave={onSave}
            onClose={onClose}
          />
        </LanguageProvider>,
      );
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSave).toHaveBeenCalledWith('Hyväksytty nimi');
  });

  it('calls onClose when clicking cancel or close button', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <SaveAnalysisModal
            isOpen={true}
            defaultName="Nimi"
            onSave={onSave}
            onClose={onClose}
          />
        </LanguageProvider>,
      );
    });

    const cancelBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Peruuta'),
    );
    expect(cancelBtn).toBeDefined();

    await act(async () => {
      cancelBtn?.click();
    });

    expect(onClose).toHaveBeenCalled();
  });
});
