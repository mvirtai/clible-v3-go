// src/components/TranslationSelector.tsx
import React from 'react';
import type { InstalledTranslation } from '../types/bible';
import { Globe } from 'lucide-react';

interface Props {
  selectedTranslation: string;
  onSelectTranslation: (id: string) => void;
  translations: InstalledTranslation[];
}

export const TranslationSelector: React.FC<Props> = ({
  selectedTranslation,
  onSelectTranslation,
  translations,
}) => {
  const uiLanguage = 'fi'; // Kehitysfilosofian kieli

  // Jos käyttäjällä on jo asennettuja käännöksiä, näytetään yläpalkissa vain ne.
  // Jos ei ole yhtään asennettua käännöstä, näytetään kaikki tarjolla olevat käännökset,
  // jotta käyttäjä voi valita käännöksen suoraan yläpalkista.
  const hasActive = translations.some(t => t.installed);
  const list = hasActive
    ? translations.filter(t => t.installed)
    : translations;

  if (!list || list.length === 0) {
    return (
      <div className="text-xs px-3 py-1.5 rounded-full"
        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
        {uiLanguage === 'fi' ? 'Ei käännöksiä' : 'No translations'}
      </div>
    );
  }

  // Näytetään placeholder "Valitse käännös..." vain silloin, kun valittua käännöstä ei ole asetettu
  const showPlaceholder = !selectedTranslation || !list.some(t => t.id === selectedTranslation);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <Globe size={13} style={{ color: 'var(--accent)' }} />
      <select
        value={selectedTranslation}
        onChange={(e) => onSelectTranslation(e.target.value)}
        className="text-sm font-medium outline-none cursor-pointer"
        style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}
      >
        {showPlaceholder && (
          <option value="" disabled>
            {uiLanguage === 'fi' ? 'Valitse käännös...' : 'Select translation...'}
          </option>
        )}
        {list.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.id.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
};


