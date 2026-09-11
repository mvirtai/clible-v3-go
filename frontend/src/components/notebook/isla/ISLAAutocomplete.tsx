import { useState } from 'react';
import type { JSX } from 'react/jsx-runtime';
import {
  getISLASuggestions,
  type ISLASuggestion,
} from './islaIntellisense';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * Props for {@link ISLAAutocomplete}.
 */
export interface ISLAAutocompleteProps {
  /**
   * The full current line text used to compute suggestions.
   */
  lineText: string;

  /**
   * Zero-based cursor offset within `lineText`.
   * Determines which context (e.g. after `=>`, `@`, `?`) is active.
   */
  cursorOffset: number;

  /**
   * Optional list of installed translation IDs to filter suggestions.
   * When omitted, all registered translations are offered.
   */
  availableTranslations?: string[];

  /**
   * Controlled active option index (when driven by parent editor).
   */
  activeIndex?: number;

  /**
   * Called when the user selects a suggestion.
   * The parent replaces the current line text with the suggestion's `insertText`.
   *
   * @param suggestion - The chosen {@link ISLASuggestion}.
   */
  onSelect: (suggestion: ISLASuggestion) => void;

  /**
   * Called when the user closes the popover without selecting (e.g. via Escape key).
   */
  onClose?: () => void;

  /**
   * Optional callback when an option is hovered or focused.
   */
  onHighlight?: (index: number) => void;
}

/**
 * Autocomplete dropdown popover for ISLA DSL commands.
 *
 * Displays up to 8 contextual suggestions from {@link getISLASuggestions}.
 *
 * React 19.2 & React Compiler compliance:
 * - Direct function component (no `React.FC`).
 * - Zero `useEffect` hooks: suggestions are purely derived on render.
 * - Render-time state adjustment ensures `internalIndex` resets when line/offset changes.
 * - Keyboard navigation is natively driven by the active input without global window listeners.
 *
 * @param props - See {@link ISLAAutocompleteProps}.
 * @returns An accessible autocomplete dropdown, or null if no suggestions exist.
 */
export function ISLAAutocomplete({
  lineText,
  cursorOffset,
  availableTranslations,
  activeIndex: controlledIndex,
  onSelect,
  onHighlight,
}: ISLAAutocompleteProps): JSX.Element | null {
  const { strings } = useLanguage();

  // Pure derived state computed during render
  const suggestions = getISLASuggestions(lineText, cursorOffset, availableTranslations);
  const visible = suggestions.slice(0, 8);

  // Uncontrolled fallback index with render-time adjustment (React 19 idiom, no useEffect)
  const [internalIndex, setInternalIndex] = useState(0);
  const [prevOffset, setPrevOffset] = useState(cursorOffset);
  const [prevLine, setPrevLine] = useState(lineText);

  if (prevOffset !== cursorOffset || prevLine !== lineText) {
    setPrevOffset(cursorOffset);
    setPrevLine(lineText);
    setInternalIndex(0);
  }

  const activeIndex = controlledIndex ?? internalIndex;

  if (visible.length === 0) {
    return null;
  }

  const handleMouseEnter = (index: number) => {
    setInternalIndex(index);
    onHighlight?.(index);
  };

  return (
    <div
      role="listbox"
      aria-label={strings.islaAutocompleteLabel}
      className={[
        'absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] max-w-lg',
        'rounded-xl border border-amber-500/20 bg-[var(--surface-2)]',
        'shadow-xl backdrop-blur-sm overflow-auto max-h-64',
        'text-sm font-mono',
      ].join(' ')}
    >
      {visible.map((suggestion, index) => {
        const isSelected = index === activeIndex;
        return (
          <button
            key={`${suggestion.label}-${index}`}
            role="option"
            aria-selected={isSelected}
            type="button"
            onMouseDown={(e) => {
              // Prevent textarea blur so focus stays seamlessly on input
              e.preventDefault();
            }}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseOver={() => handleMouseEnter(index)}
            className={[
              'w-full text-left px-3 py-2 flex items-center gap-3 transition-colors cursor-pointer',
              isSelected
                ? 'bg-amber-500/15 text-amber-300'
                : 'text-neutral-300 hover:bg-amber-500/10',
            ].join(' ')}
          >
            <span className="text-[10px] shrink-0 w-16 text-neutral-500 font-sans uppercase font-semibold">
              {suggestion.kind}
            </span>
            <span className="font-semibold truncate text-amber-200">
              {suggestion.label}
            </span>
            <span className="ml-auto text-[11px] text-neutral-400 font-sans truncate shrink-0">
              {suggestion.detail}
            </span>
          </button>
        );
      })}

      {/* Keyboard navigation helper footer */}
      <div className="px-3 py-1.5 border-t border-amber-500/10 text-[10px] text-neutral-400 font-sans flex gap-3 select-none">
        <span>↑↓ {strings.islaKeyNavigate}</span>
        <span>↵ {strings.islaKeySelect}</span>
        <span>Esc {strings.islaKeyClose}</span>
      </div>
    </div>
  );
}
