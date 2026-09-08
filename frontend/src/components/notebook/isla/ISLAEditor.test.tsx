import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ISLAEditor } from './ISLAEditor';
import { LanguageProvider } from '../../../context/LanguageContext';

function simulateInput(textarea: HTMLTextAreaElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;
  nativeSetter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('ISLAEditor', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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
  });

  it('renders textarea with initial code', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="! @Joh 3:16"
            translationId="KR92"
            onExecute={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    expect(textarea?.value).toBe('! @Joh 3:16');
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode=""
            translationId="KR92"
            onExecute={vi.fn()}
            onChange={onChange}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    expect(textarea).toBeTruthy();
    act(() => {
      if (textarea) {
        simulateInput(textarea, '! search("armo")');
      }
    });

    expect(onChange).toHaveBeenCalledWith('! search("armo")');
  });

  it('calls onExecute when Enter key is pressed without Shift', () => {
    const onExecute = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="! @Joh 3:16"
            translationId="KR92"
            onExecute={onExecute}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true, cancelable: true })
      );
    });

    expect(onExecute).toHaveBeenCalledWith('! @Joh 3:16');
  });

  it('does not call onExecute on Shift+Enter', () => {
    const onExecute = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="! @Joh 3:16"
            translationId="KR92"
            onExecute={onExecute}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
      );
    });

    expect(onExecute).not.toHaveBeenCalled();
  });

  it('renders and triggers execute button', () => {
    const onExecute = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="! @Joh 3:16"
            translationId="KR92"
            onExecute={onExecute}
          />
        </LanguageProvider>
      );
    });

    const btn = container?.querySelector('button[aria-label]');
    act(() => {
      (btn as HTMLButtonElement)?.click();
    });

    expect(onExecute).toHaveBeenCalledWith('! @Joh 3:16');
  });

  it('shows autocomplete when typing an ISLA trigger and closes on Escape', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode=""
            translationId="KR92"
            onExecute={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    act(() => {
      if (textarea) {
        simulateInput(textarea, '!');
      }
    });

    expect(container?.querySelector('[role="listbox"]')).toBeTruthy();

    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
    });

    expect(container?.querySelector('[role="listbox"]')).toBeNull();
  });
});
