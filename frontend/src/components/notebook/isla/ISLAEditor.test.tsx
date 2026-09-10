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

  it('does not accidentally overwrite buffer when Enter is pressed on bare pipeline operator', () => {
    const onExecute = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode=""
            translationId="KR92"
            onExecute={onExecute}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    act(() => {
      if (textarea) {
        simulateInput(textarea, '! @Joh 3:16 => ');
      }
    });

    // Autocomplete dropdown is visible with suggestions
    expect(container?.querySelector('[role="listbox"]')).toBeTruthy();

    // User hits Enter directly without navigating
    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true, cancelable: true })
      );
    });

    // onExecute must be called with the intact code, NOT replaced by the first suggestion
    expect(onExecute).toHaveBeenCalledWith('! @Joh 3:16 => ');
    expect(textarea?.value).toBe('! @Joh 3:16 => ');
  });

  it('selects suggestion and appends to existing text when navigated with ArrowDown and Enter', () => {
    const onExecute = vi.fn();
    const onChange = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode=""
            translationId="KR92"
            onExecute={onExecute}
            onChange={onChange}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    act(() => {
      if (textarea) {
        simulateInput(textarea, '! @Joh 3:16 => ');
      }
    });

    // Press ArrowDown to explicitly choose a suggestion
    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
      );
    });

    // Press Enter to confirm the navigated selection
    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );
    });

    // Textarea must contain the pipeline trigger PLUS the inserted suggestion
    expect(textarea?.value).toContain('! @Joh 3:16 => ');
    expect(textarea?.value.length).toBeGreaterThan('! @Joh 3:16 => '.length);
    expect(onExecute).not.toHaveBeenCalled();
  });

  it('selects suggestion when Tab is pressed without wiping preceding text', () => {
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
        simulateInput(textarea, '! @(Joh 3:16).');
      }
    });

    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
      );
    });

    // Must preserve object and dot: '! @(Joh 3:16).use('
    expect(textarea?.value).toBe('! @(Joh 3:16).use(');
  });

  it('triggers smart @ gesture inserting @() and opening autocomplete', () => {
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
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: '@', bubbles: true, cancelable: true })
      );
    });

    expect(textarea?.value).toBe('@()');
    expect(onChange).toHaveBeenCalledWith('@()');
    expect(container?.querySelector('[role="listbox"]')).toBeTruthy();
  });

  it('triggers auto-closing parentheses when typing (', () => {
    const onChange = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="search"
            translationId="KR92"
            onExecute={vi.fn()}
            onChange={onChange}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    if (textarea) {
      textarea.selectionStart = 6;
      textarea.selectionEnd = 6;
    }

    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: '(', bubbles: true, cancelable: true })
      );
    });

    expect(textarea?.value).toBe('search()');
    expect(onChange).toHaveBeenCalledWith('search()');
  });

  it('triggers pair deletion on Backspace inside @(|)', () => {
    const onChange = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="@()"
            translationId="KR92"
            onExecute={vi.fn()}
            onChange={onChange}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    if (textarea) {
      textarea.selectionStart = 2;
      textarea.selectionEnd = 2;
    }

    act(() => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
      );
    });

    expect(textarea?.value).toBe('');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('triggers smart ! gesture inserting "! " and opening autocomplete on empty string', () => {
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
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: '!', bubbles: true, cancelable: true })
      );
    });

    expect(textarea?.value).toBe('! ');
    expect(onChange).toHaveBeenCalledWith('! ');
    expect(container?.querySelector('[role="listbox"]')).toBeTruthy();
  });

  it('normalizes lone "!" initialCode to "! " with open autocomplete and notifies onChange', () => {
    const onChange = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="!"
            translationId="KR92"
            onExecute={vi.fn()}
            onChange={onChange}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    expect(textarea?.value).toBe('! ');
    expect(container?.querySelector('[role="listbox"]')).toBeTruthy();
  });

  it('deletes both ! and trailing space when pressing Backspace immediately after "! "', () => {
    const onChange = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAEditor
            initialCode="! "
            translationId="KR92"
            onExecute={vi.fn()}
            onChange={onChange}
          />
        </LanguageProvider>
      );
    });

    const textarea = container?.querySelector('textarea');
    expect(textarea?.value).toBe('! ');

    act(() => {
      textarea?.setSelectionRange(2, 2);
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
      );
    });

    expect(textarea?.value).toBe('');
    expect(onChange).toHaveBeenCalledWith('');
  });
});