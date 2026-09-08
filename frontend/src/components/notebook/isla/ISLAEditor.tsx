import { useRef, useState } from 'react';
import type { JSX } from 'react/jsx-runtime';
import { ISLASyntaxLayer } from './ISLASyntaxLayer';
import { ISLAAutocomplete } from './ISLAAutocomplete';
import { ISLAHoverCard } from './ISLAHoverCard';
import {
  type ISLASuggestion,
  getHoverDocumentation,
  getISLASuggestions,
} from './islaIntellisense';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * Props for the {@link ISLAEditor} component.
 */
export interface ISLAEditorProps {
  /**
   * The initial ISLA source code displayed when the editor mounts.
   * Typically the cell's current content (e.g. `"! @Joh 3:16 =>"`).
   */
  initialCode: string;

  /**
   * Active Bible translation identifier passed to IntelliSense for
   * context-aware suggestions and forwarded for execution.
   * Example: `"KR92"`, `"KJV"`, `"WEB"`.
   */
  translationId: string;

  /**
   * Optional preceding notebook text used to resolve the caret (`^`) object.
   * Concatenation of all cell texts before this cell.
   */
  contextText?: string;

  /**
   * Called when the user confirms the ISLA command (Enter key or ▶ button).
   *
   * @param code - The finalized ISLA source code to execute.
   */
  onExecute: (code: string) => void;

  /**
   * Called on every keystroke to persist the draft code in the notebook store.
   *
   * @param code - The current code text after each change.
   */
  onChange?: (code: string) => void;

  /**
   * Called when the user cancels editing (e.g. by pressing Escape when autocomplete is closed).
   */
  onCancel?: () => void;

  /**
   * Called when focus moves outside of the editor component.
   */
  onBlur?: () => void;
}

/**
 * Extracts a candidate ISLA keyword token surrounding a specific character offset.
 */
function getKeywordAtOffset(text: string, offset: number): string | null {
  if (!text || offset < 0 || offset > text.length) return null;

  let start = offset;
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) {
    start--;
  }

  let end = offset;
  while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) {
    end++;
  }

  const word = text.slice(start, end).trim();
  return word.length > 0 ? word : null;
}

/**
 * Interactive ISLA DSL editor with real-time syntax highlighting and IntelliSense.
 *
 * Architecture: Overlay pattern
 * - A transparent `<textarea>` handles keyboard input, selection, and cursor tracking.
 * - An `aria-hidden` {@link ISLASyntaxLayer} sits on top, rendering coloured spans.
 * - An accessible {@link ISLAAutocomplete} dropdown suggests commands, books, and operators.
 * - A floating {@link ISLAHoverCard} renders documentation for known methods.
 *
 * React 19.2 & React Compiler compliance:
 * - Direct function component without `React.FC`.
 * - Zero `useEffect` hooks: all interactions and derivations are purely event-driven or render-computed.
 * - Zero manual `useCallback`/`useMemo`: React Compiler handles fine-grained memoization automatically.
 * - Single source of truth for `code`; suggestions and hover cards are computed dynamically.
 *
 * @param props - See {@link ISLAEditorProps}.
 * @returns An inline ISLA code editor with syntax highlighting.
 */
export function ISLAEditor({
  initialCode,
  translationId,
  onExecute,
  onChange,
  onCancel,
  onBlur,
}: ISLAEditorProps): JSX.Element {
  const { strings } = useLanguage();

  // Lazy state initialization for initial code and caret position
  const [code, setCode] = useState(() => initialCode);
  const [cursorOffset, setCursorOffset] = useState(() => initialCode.length);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);

  // Sync state if initialCode prop changes from parent without useEffect
  const [prevInitialCode, setPrevInitialCode] = useState(initialCode);
  if (prevInitialCode !== initialCode) {
    setPrevInitialCode(initialCode);
    setCode(initialCode);
    setCursorOffset(initialCode.length);
  }

  // Single DOM ref strictly used for imperative element focus
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pure derived suggestions calculated during render (React Compiler handles memoization)
  const availableTranslations = translationId ? [translationId] : undefined;
  const rawSuggestions = showAutocomplete
    ? getISLASuggestions(code, cursorOffset, availableTranslations)
    : [];
  const visibleSuggestions = rawSuggestions.slice(0, 8);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const offset = e.target.selectionStart ?? value.length;
    setCode(value);
    setCursorOffset(offset);
    setShowAutocomplete(true);
    setActiveIndex(0);

    const word = getKeywordAtOffset(value, offset);
    if (word && getHoverDocumentation(word)) {
      setHoveredKeyword(word);
    } else {
      setHoveredKeyword(null);
    }

    onChange?.(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Autocomplete keyboard navigation
    if (showAutocomplete && visibleSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, visibleSuggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = visibleSuggestions[activeIndex];
        if (selected) {
          handleSelectSuggestion(selected);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        setHoveredKeyword(null);
        return;
      }
    }

    // Normal execution on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowAutocomplete(false);
      onExecute(code);
      return;
    }

    if (e.key === 'Escape') {
      setShowAutocomplete(false);
      setHoveredKeyword(null);
      onCancel?.();
    }
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const offset = e.currentTarget.selectionStart ?? code.length;
    setCursorOffset(offset);

    const word = getKeywordAtOffset(code, offset);
    if (word && getHoverDocumentation(word)) {
      setHoveredKeyword(word);
    } else {
      setHoveredKeyword(null);
    }
  }

  function handleSelectSuggestion(suggestion: ISLASuggestion) {
    setCode(suggestion.insertText);
    setCursorOffset(suggestion.insertText.length);
    setShowAutocomplete(false);
    onChange?.(suggestion.insertText);

    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = suggestion.insertText.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    setShowAutocomplete(false);
    setHoveredKeyword(null);
    if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
      onBlur?.();
    }
  }

  return (
    <div className="relative w-full group/isla-editor">
      {/* Floating HoverCard documentation */}
      <ISLAHoverCard keyword={hoveredKeyword} />

      {/* Colour-coded syntax overlay */}
      <ISLASyntaxLayer code={code} />

      {/* Transparent textarea underneath overlay */}
      <textarea
        ref={(node) => {
          textareaRef.current = node;
          if (node && !node.dataset.focused) {
            node.dataset.focused = 'true';
            node.focus();
            const len = node.value.length;
            node.setSelectionRange(len, len);
          }
        }}
        autoFocus
        value={code}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        onClick={(e) => {
          const offset = e.currentTarget.selectionStart ?? code.length;
          setCursorOffset(offset);
          const word = getKeywordAtOffset(code, offset);
          if (word && getHoverDocumentation(word)) {
            setHoveredKeyword(word);
          } else {
            setHoveredKeyword(null);
          }
        }}
        rows={1}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className={[
          'relative z-0 w-full resize-none bg-transparent',
          'font-mono text-sm leading-relaxed',
          'px-3 py-2 pr-9',
          'text-transparent caret-amber-400 dark:caret-amber-300',
          'placeholder:text-[var(--muted)]/50',
          'border border-amber-500/30 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50',
          'whitespace-pre-wrap overflow-hidden transition-all',
        ].join(' ')}
        aria-label={strings.islaEditorPlaceholder}
        placeholder={strings.islaEditorPlaceholder}
      />

      {/* Inline run button */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setShowAutocomplete(false);
          onExecute(code);
        }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-400 active:scale-95 transition-all text-xs font-mono font-bold z-20 cursor-pointer p-1"
        aria-label={strings.islaExecuteAriaLabel}
        title={strings.islaExecuteAriaLabel}
      >
        ▶
      </button>

      {/* Autocomplete dropdown popover */}
      {showAutocomplete && (
        <ISLAAutocomplete
          lineText={code}
          cursorOffset={cursorOffset}
          availableTranslations={availableTranslations}
          activeIndex={activeIndex}
          onSelect={handleSelectSuggestion}
          onClose={() => setShowAutocomplete(false)}
          onHighlight={(idx) => setActiveIndex(idx)}
        />
      )}
    </div>
  );
}
