import React from 'react';
import type { InstalledTranslation } from '../../types/bible';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Properties for {@link TranslationSelector}.
 */
export interface TranslationSelectorProps {
  /** The unique identifier of the currently selected translation (e.g. "kjv" or "fin-1992"). */
  selectedTranslation: string;
  /** Callback fired when user selects a different Bible translation from the dropdown. */
  onSelectTranslation: (id: string) => void;
  /** Available translations list with active installation flags. */
  translations: InstalledTranslation[];
}

/**
 * Header dropdown selector enabling instant switching between active Bible translations.
 *
 * Automatically filters to active installed translations when available, or shows full catalogue.
 *
 * @param props - Component properties conforming to {@link TranslationSelectorProps}.
 * @returns Accessible translation picker dropdown.
 */
export const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  selectedTranslation,
  onSelectTranslation,
  translations,
}) => {
  const { strings } = useLanguage();

  // If user has active translations, show only those. Otherwise show full catalogue for initial discovery.
  const hasActive = translations.some(t => t.installed);
  const list = hasActive
    ? translations.filter(t => t.installed)
    : translations;

  if (!list || list.length === 0) {
    return (
      <div className="text-xs px-3 py-1.5 rounded-full"
        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
        {strings.noTranslations}
      </div>
    );
  }

  // Show placeholder only when no valid translation is selected
  const showPlaceholder = !selectedTranslation || !list.some(t => t.id === selectedTranslation);

  return (
    <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full max-w-[125px] sm:max-w-xs shrink"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <Globe size={13} className="shrink-0" style={{ color: 'var(--accent)' }} />
      <label htmlFor="translation-select" className="sr-only" style={{ display: 'none' }}>{strings.chooseTranslation}</label>
      <select
        id="translation-select"
        aria-label={strings.chooseTranslation}
        value={selectedTranslation}
        onChange={(e) => onSelectTranslation(e.target.value)}
        className="text-xs sm:text-sm font-medium outline-none cursor-pointer truncate w-full bg-transparent text-[var(--text)]"
        style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}
      >
        {showPlaceholder && (
          <option value="" disabled style={{ background: 'var(--surface)', color: 'var(--text)' }}>
            {strings.translationPlaceholder}
          </option>
        )}
        {list.map((t) => (
          <option key={t.id} value={t.id} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
            {t.name} ({t.id.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
};



