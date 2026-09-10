/**
 * Pure helper module for ISLAEditor typing gestures and auto-closing pairs.
 * Provides Monaco / VS Code-like smart typing behaviors:
 * 1. Smart '@' gesture: automatically creates '@()' and places caret inside '@(|)'.
 * 2. Auto-closing pairs for '(', '"', and '\''.
 * 3. Selection wrapping for '@', '(', '"', and '\''.
 * 4. Leapfrog / Overtype: typing ')', '"', or '\'' when already adjacent skips over the character.
 * 5. Pair deletion on Backspace: removes both opening and closing characters when caret is between them.
 */

export interface GestureResult {
  handled: boolean;
  newCode: string;
  newCursorOffset: number;
}

/**
 * Evaluates a keyboard event against ISLA smart typing gestures.
 *
 * @param key - The KeyboardEvent.key value (e.g. '@', '(', ')', '"', '\'', 'Backspace').
 * @param code - The current editor text value.
 * @param selectionStart - Start offset of active selection or caret.
 * @param selectionEnd - End offset of active selection or caret.
 * @returns A {@link GestureResult} indicating whether the event was handled and the new text/caret offset.
 */
export function handleISLAGesture(
  key: string,
  code: string,
  selectionStart: number,
  selectionEnd: number
): GestureResult {
  // 1. Selection wrapping
  if (selectionStart !== selectionEnd) {
    const selectedText = code.slice(selectionStart, selectionEnd);

    if (key === '@') {
      const newCode = code.slice(0, selectionStart) + `@(${selectedText})` + code.slice(selectionEnd);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart + selectedText.length + 3,
      };
    }

    if (key === '(') {
      const newCode = code.slice(0, selectionStart) + `(${selectedText})` + code.slice(selectionEnd);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart + selectedText.length + 2,
      };
    }

    if (key === '"' || key === "'") {
      const newCode = code.slice(0, selectionStart) + `${key}${selectedText}${key}` + code.slice(selectionEnd);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart + selectedText.length + 2,
      };
    }
  }

  // 2. Overtype / Leapfrog (skipping over existing closing bracket or quote)
  if (selectionStart === selectionEnd) {
    const charAfterCursor = code[selectionStart];
    if ((key === ')' || key === '"' || key === "'") && charAfterCursor === key) {
      return {
        handled: true,
        newCode: code,
        newCursorOffset: selectionStart + 1,
      };
    }
  }

  // 3. Pair deletion on Backspace
  if (key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
    const prevChar = code[selectionStart - 1];
    const nextChar = code[selectionStart];

    // Case A: Caret is inside '@(|)' -> remove both parens and leave '@'
    if (selectionStart >= 2 && code.slice(selectionStart - 2, selectionStart) === '@(' && nextChar === ')') {
      const newCode = code.slice(0, selectionStart - 1) + code.slice(selectionStart + 1);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart - 1,
      };
    }

    // Case B: Caret is inside '(|)', '""', or '\'\'' -> remove both characters
    if (
      (prevChar === '(' && nextChar === ')') ||
      (prevChar === '"' && nextChar === '"') ||
      (prevChar === "'" && nextChar === "'")
    ) {
      const newCode = code.slice(0, selectionStart - 1) + code.slice(selectionStart + 1);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart - 1,
      };
    }
  }

  // 4. Auto-closing pairs when no text is selected
  if (selectionStart === selectionEnd) {
    if (key === '@') {
      // If caret is already immediately before an opening paren, do not duplicate: '@('
      if (code[selectionStart] === '(') {
        const newCode = code.slice(0, selectionStart) + '@' + code.slice(selectionEnd);
        return {
          handled: true,
          newCode,
          newCursorOffset: selectionStart + 1,
        };
      }
      const newCode = code.slice(0, selectionStart) + '@()' + code.slice(selectionEnd);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart + 2,
      };
    }

    if (key === '(') {
      const newCode = code.slice(0, selectionStart) + '()' + code.slice(selectionEnd);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart + 1,
      };
    }

    if (key === '"' || key === "'") {
      const newCode = code.slice(0, selectionStart) + `${key}${key}` + code.slice(selectionEnd);
      return {
        handled: true,
        newCode,
        newCursorOffset: selectionStart + 1,
      };
    }
  }

  return {
    handled: false,
    newCode: code,
    newCursorOffset: selectionStart,
  };
}
