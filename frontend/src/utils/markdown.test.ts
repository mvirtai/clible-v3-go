import { describe, it, expect } from 'vitest';
import { formatResultToMarkdown, type CLIResultData } from './markdown';

describe('formatResultToMarkdown', () => {
  it('formats compare type into a side-by-side markdown table', () => {
    const data: CLIResultData = {
      reference: 'Joh 3:16',
      left: {
        translation: 'KR92',
        verses: [
          {
            id: 'joh-3-16-kr92',
            translationId: 'fin-1992',
            bookId: 'JHN',
            chapter: 3,
            verse: 16,
            text: 'Sillä niin on Jumala maailmaa rakastanut...',
          },
        ],
      },
      right: {
        translation: 'KJV',
        verses: [
          {
            id: 'joh-3-16-kjv',
            translationId: 'kjv',
            bookId: 'JHN',
            chapter: 3,
            verse: 16,
            text: 'For God so loved the world...',
          },
        ],
      },
    };

    const result = formatResultToMarkdown('compare', data, 'KR92');
    expect(result).toContain('### Käännösvertailu: Joh 3:16 (KR92 vs. KJV)');
    expect(result).toContain('| Jae | KR92 | KJV |');
    expect(result).toContain('| **16** | Sillä niin on Jumala maailmaa rakastanut... | For God so loved the world... |');
  });

  it('handles pipes in verse text by escaping them', () => {
    const data: CLIResultData = {
      reference: 'Ps 1:1',
      left: {
        translation: 'KR92',
        verses: [
          {
            id: '1',
            translationId: 'fin-1992',
            bookId: 'PSA',
            chapter: 1,
            verse: 1,
            text: 'Autuas se | mies',
          },
        ],
      },
      right: {
        translation: 'KJV',
        verses: [
          {
            id: '2',
            translationId: 'kjv',
            bookId: 'PSA',
            chapter: 1,
            verse: 1,
            text: 'Blessed is the | man',
          },
        ],
      },
    };

    const result = formatResultToMarkdown('compare', data, 'KR92');
    expect(result).toContain('Autuas se \\| mies');
    expect(result).toContain('Blessed is the \\| man');
  });

  it('formats read verses correctly', () => {
    const data: CLIResultData = {
      verses: [
        { id: '1', translationId: 'fin-1992', bookId: 'JHN', chapter: 3, verse: 16, text: 'Jae 16' },
        { id: '2', translationId: 'fin-1992', bookId: 'JHN', chapter: 3, verse: 17, text: 'Jae 17' },
      ],
    };
    const result = formatResultToMarkdown('read', data, 'KR92');
    expect(result).toContain('> **Joh. 3:16-17 (KR92)**');
    expect(result).toContain('> **16** Jae 16');
  });

  it('formats count results correctly', () => {
    const data: CLIResultData = {
      count: 5,
      target_type: 'search',
      query: 'valo',
    };
    const result = formatResultToMarkdown('count', data, 'KR92');
    expect(result).toBe('> **Hakutulokset haulle "valo" (KR92)**: 5 osumaa\n');
  });

  it('formats unit-aware count results correctly', () => {
    const bookData: CLIResultData = {
      count: 2,
      unit: 'books',
      target_type: 'search',
      query: 'armo',
    };
    expect(formatResultToMarkdown('count', bookData, 'KR92')).toBe('> **Hakutulokset haulle "armo" (KR92)**: 2 kirjaa\n');

    const wordData: CLIResultData = {
      count: 1,
      unit: 'words',
      target_type: 'reference',
      reference: 'Joh 1:1',
    };
    expect(formatResultToMarkdown('count', wordData, 'KR92')).toBe('> **Jakeet viitteelle Joh 1:1 (KR92)**: 1 sana\n');

    const wordPluralData: CLIResultData = {
      count: 35,
      unit: 'words',
      target_type: 'reference',
      reference: 'Joh 1:1-5',
    };
    expect(formatResultToMarkdown('count', wordPluralData, 'KR92')).toBe('> **Jakeet viitteelle Joh 1:1-5 (KR92)**: 35 sanaa\n');

    const uniqueWordData: CLIResultData = {
      count: 12,
      unit: 'unique_words',
      target_type: 'context',
    };
    expect(formatResultToMarkdown('count', uniqueWordData, 'KR92')).toBe('> **Muistiinpanon konteksti**: 12 uniikkia sanaa\n');
  });

  it('formats words results as a table', () => {
    const data: CLIResultData = {
      words: [
        { word: 'armo', count: 10 },
        { word: 'totuus', count: 5 },
      ],
    };
    const result = formatResultToMarkdown('words', data, 'KR92');
    expect(result).toContain('### Sanatiheydet');
    expect(result).toContain('| 1 | **armo** | 10 |');
    expect(result).toContain('| 2 | **totuus** | 5 |');
  });

  it('formats stats results with TTR and counts', () => {
    const data: CLIResultData = {
      type_token_ratio: 0.654,
      unique_tokens: 65,
      token_count: 100,
      avg_word_length: 5.2,
      character_count: 520,
    };
    const result = formatResultToMarkdown('stats', data, 'KR92');
    expect(result).toContain('### Tekstitilastot');
    expect(result).toContain('- **Sanaston rikkaus (TTR)**: 65.4 %');
    expect(result).toContain('- **Uniikkeja sanoja**: 65');
    expect(result).toContain('- **Sanoja yhteensä**: 100');
    expect(result).toContain('- **Sanan keskipituus**: 5.2');
    expect(result).toContain('- **Merkkejä**: 520');
  });
});
