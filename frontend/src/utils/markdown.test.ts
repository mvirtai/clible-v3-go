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
});
