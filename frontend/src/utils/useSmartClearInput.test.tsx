import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { useSmartClearInput } from './useSmartClearInput';

function TestInputComponent({
  initialValue,
  onValueChange,
}: {
  initialValue: string;
  onValueChange: (val: string) => void;
}) {
  const smartClear = useSmartClearInput(initialValue, onValueChange);

  return (
    <input
      id="test-input"
      value={initialValue}
      onChange={() => {}}
      onFocus={smartClear.onFocus}
      onKeyDown={smartClear.onKeyDown}
    />
  );
}

describe('useSmartClearInput', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
  });

  it('clears input when pressing Enter on pristine field', () => {
    let currentValue = 'John 3:16';
    const setValue = (newVal: string) => {
      currentValue = newVal;
    };

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestInputComponent
          initialValue={currentValue}
          onValueChange={setValue}
        />
      );
    });

    const input = container?.querySelector('#test-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Focus on pristine input
    act(() => {
      input.focus();
    });

    // Press Enter
    act(() => {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(enterEvent);
    });

    expect(currentValue).toBe('');
  });

  it('replaces full input with first typed character when pristine', () => {
    let currentValue = 'John 3:16';
    const setValue = (newVal: string) => {
      currentValue = newVal;
    };

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestInputComponent
          initialValue={currentValue}
          onValueChange={setValue}
        />
      );
    });

    const input = container?.querySelector('#test-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Focus on pristine input
    act(() => {
      input.focus();
    });

    // User types 'm'
    act(() => {
      const charEvent = new KeyboardEvent('keydown', {
        key: 'm',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(charEvent);
    });

    expect(currentValue).toBe('m');
  });
});
