import React, { useRef } from 'react';

/**
 * Creates keydown and focus handlers for smart clear input fields:
 * 1. Pressing Enter when no new text has been typed clears the input.
 * 2. Pressing a printable character key when pristine clears the previous value and replaces it with that key.
 * 3. Selecting all text on focus so user can immediately overwrite.
 *
 * @param value - Current input value string
 * @param setValue - State setter callback
 * @returns Event handlers object to spread onto <input>
 */
export function useSmartClearInput(
  _value: string,
  setValue: (val: string) => void
) {
  const isPristineRef = useRef(true);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isPristineRef.current = true;
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If user presses Enter on an unmodified pristine input, clear it instead of submitting
    if (e.key === 'Enter') {
      if (isPristineRef.current) {
        e.preventDefault();
        setValue('');
        isPristineRef.current = false;
        return;
      }
    }

    // If key is a printable single character without ctrl/alt/meta modifier
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      isPristineRef.current
    ) {
      // First keystroke replaces the prefilled value completely
      e.preventDefault();
      setValue(e.key);
      isPristineRef.current = false;
    } else if (e.key !== 'Tab' && e.key !== 'Shift') {
      isPristineRef.current = false;
    }
  };

  return {
    onFocus: handleFocus,
    onKeyDown: handleKeyDown,
    markDirty: () => {
      isPristineRef.current = false;
    },
  };
}
