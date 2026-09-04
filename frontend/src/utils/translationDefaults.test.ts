import { describe, it, expect } from 'vitest';
import { getDefaultTranslationForLanguage } from './translationDefaults';
import type { InstalledTranslation } from '../types/bible';

describe('getDefaultTranslationForLanguage', () => {
  const mockTranslations: InstalledTranslation[] = [
    {
      id: 'fin-1776', name: 'Biblia 1776', language: 'fi', format: 'xml', sourceUrl: '', installedAt: '', installed: true,
      isGlobal: false
    },
    {
      id: 'fin-1992', name: 'Kirkkoraamattu 1992', language: 'fi', format: 'xml', sourceUrl: '', installedAt: '', installed: true,
      isGlobal: false
    },
    {
      id: 'web', name: 'World English Bible', language: 'en', format: 'xml', sourceUrl: '', installedAt: '', installed: true,
      isGlobal: false
    },
    {
      id: 'kjv', name: 'King James Version', language: 'en', format: 'xml', sourceUrl: '', installedAt: '', installed: true,
      isGlobal: false
    },
  ];

  it('selects fin-1992 for fi language when fin-1992 is available even if fin-1776 is first in list', () => {
    const selected = getDefaultTranslationForLanguage(mockTranslations, 'fi');
    expect(selected).toBe('fin-1992');
  });

  it('selects web for en language when web is available', () => {
    const selected = getDefaultTranslationForLanguage(mockTranslations, 'en');
    expect(selected).toBe('web');
  });

  it('falls back to second priority if primary translation is missing', () => {
    const enWithoutWeb = mockTranslations.filter(t => t.id !== 'web');
    const selected = getDefaultTranslationForLanguage(enWithoutWeb, 'en');
    expect(selected).toBe('kjv');

    const fiWithout1992 = mockTranslations.filter(t => t.id !== 'fin-1992');
    const selectedFi = getDefaultTranslationForLanguage(fiWithout1992, 'fi');
    expect(selectedFi).toBe('fin-1776');
  });

  it('returns empty string if translations list is empty', () => {
    expect(getDefaultTranslationForLanguage([], 'fi')).toBe('');
    expect(getDefaultTranslationForLanguage([], 'en')).toBe('');
  });

  it('falls back to first available if no language matches', () => {
    const foreignOnly: InstalledTranslation[] = [
      {
        id: 'heb-leningrad', name: 'Hebrew', language: 'he', format: 'xml', sourceUrl: '', installedAt: '', installed: true,
        isGlobal: false
      },
      {
        id: 'sblgnt', name: 'Greek', language: 'el', format: 'xml', sourceUrl: '', installedAt: '', installed: true,
        isGlobal: false
      },
    ];
    expect(getDefaultTranslationForLanguage(foreignOnly, 'fi')).toBe('heb-leningrad');
  });
});
