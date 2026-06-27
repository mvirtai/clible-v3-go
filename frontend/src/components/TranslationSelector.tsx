// src/components/TranslationSelector.tsx
import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import type { InstalledTranslation } from '../types/bible';
import { Globe } from 'lucide-react';

interface Props {
  selectedTranslation: string;
  onSelectTranslation: (id: string) => void;
  refreshTrigger: boolean;
}

export const TranslationSelector: React.FC<Props> = ({
  selectedTranslation,
  onSelectTranslation,
  refreshTrigger,
}) => {
  const [translations, setTranslations] = useState<InstalledTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    apiService
      .getTranslations()
      .then((data) => {
        if (!active) return;
        setTranslations(data);
        const exists = data.some((t) => t.id === selectedTranslation);
        if (data.length > 0 && (!selectedTranslation || !exists)) {
          onSelectTranslation(data[0].id);
        } else if (data.length === 0) {
          onSelectTranslation('');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Failed to load');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshTrigger, selectedTranslation, onSelectTranslation]);

  if (loading && translations.length === 0) {
    return (
      <div className="text-xs animate-pulse" style={{ color: 'var(--muted)' }}>Loading...</div>
    );
  }

  if (error || translations.length === 0) {
    return (
      <div className="text-xs px-3 py-1.5 rounded-full"
        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
        No translations
      </div>
    );
  }

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
        {translations.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.id.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
};

