import { describe, it, expect } from 'vitest';
import {
  getISLASuggestions,
  ISLA_MAIN_SNIPPETS,
  applyISLASuggestion,
} from './islaIntellisense';

describe('islaIntellisense', () => {
  describe('Main Snippet suggestions', () => {
    it('returns ISLA_MAIN_SNIPPETS when line is empty', () => {
      const suggestions = getISLASuggestions('', 0);
      expect(suggestions).toEqual(ISLA_MAIN_SNIPPETS);
    });

    it('returns ISLA_MAIN_SNIPPETS when line contains only "!" or "! "', () => {
      expect(getISLASuggestions('!', 1)).toEqual(ISLA_MAIN_SNIPPETS);
      expect(getISLASuggestions('! ', 2)).toEqual(ISLA_MAIN_SNIPPETS);
    });

    it('returns ISLA_MAIN_SNIPPETS when line contains "!isla" or "!ISLA"', () => {
      expect(getISLASuggestions('!isla', 5)).toEqual(ISLA_MAIN_SNIPPETS);
      expect(getISLASuggestions('!ISLA', 5)).toEqual(ISLA_MAIN_SNIPPETS);
      expect(getISLASuggestions('  !isla', 7)).toEqual(ISLA_MAIN_SNIPPETS);
    });

    it('returns search templates when line starts with "!?"', () => {
      const suggestions = getISLASuggestions('!?', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      expect(suggestions.some((s) => s.label.includes('righteous'))).toBe(true);
      expect(suggestions.some((s) => s.label.includes('search'))).toBe(true);
    });

    it('returns cross-reference templates when line starts with "!~"', () => {
      const suggestions = getISLASuggestions('!~', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions[0].label).toContain('refs');
      expect(suggestions[0].detail).toBe('Cross References');
      expect(suggestions[0].documentation.fi).toContain('Ristiinviitehaku');
    });

    it('returns contextual scope templates when line starts with "!^"', () => {
      const suggestions = getISLASuggestions('!^', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      expect(suggestions.some((s) => s.label.includes('suggest'))).toBe(true);
      expect(suggestions.some((s) => s.label.includes('themes'))).toBe(true);
    });

    it('returns variable templates when line starts with "!#"', () => {
      const suggestions = getISLASuggestions('!#', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      expect(suggestions.some((s) => s.label.includes('#muuttuja.count'))).toBe(true);
      expect(suggestions.some((s) => s.label.includes('#muuttuja.top'))).toBe(true);
    });

    it('prioritizes ? and search() in the first 8 visible snippets at editor start', () => {
      const top8 = ISLA_MAIN_SNIPPETS.slice(0, 8);
      // First two are FTS searches with ? and search()
      expect(top8.some((s) => s.label.includes('?('))).toBe(true);
      expect(top8.some((s) => s.label.includes('search('))).toBe(true);
      // Parallel verse references with @() and at()
      expect(top8.some((s) => s.label.includes('@('))).toBe(true);
      expect(top8.some((s) => s.label.includes('at('))).toBe(true);
      // All top 8 have explicit cursor offsets
      top8.forEach((s) => {
        expect(s.cursorOffset).toBeDefined();
        expect(s.cursorOffset).toBeGreaterThan(0);
      });
    });

    it('immediately suggests FTS searches when user types "s", "!s", "search", or "!search"', () => {
      const suggestionsS = getISLASuggestions('!s', 2);
      expect(suggestionsS.length).toBeGreaterThanOrEqual(2);
      expect(suggestionsS.some((s) => s.label.startsWith('search'))).toBe(true);
      expect(suggestionsS.some((s) => s.label.startsWith('?'))).toBe(true);

      const suggestionsSearch = getISLASuggestions('search', 6);
      expect(suggestionsSearch.some((s) => s.label.includes('search'))).toBe(true);
      expect(suggestionsSearch.some((s) => s.label.includes('?'))).toBe(true);
    });

    it('immediately suggests FTS searches when user types bare "?" or "!?"', () => {
      const suggestionsBareQ = getISLASuggestions('?', 1);
      expect(suggestionsBareQ.length).toBeGreaterThanOrEqual(2);
      expect(suggestionsBareQ.some((s) => s.label.startsWith('?'))).toBe(true);
      expect(suggestionsBareQ.some((s) => s.label.includes('search'))).toBe(true);

      const suggestionsBangQ = getISLASuggestions('!?', 2);
      expect(suggestionsBangQ.some((s) => s.label.startsWith('?'))).toBe(true);
    });

    it('immediately suggests at() and @() when user types "at" or "!at"', () => {
      const suggestionsAt = getISLASuggestions('!at', 3);
      expect(suggestionsAt.some((s) => s.label.startsWith('at'))).toBe(true);
      expect(suggestionsAt.some((s) => s.label.startsWith('@'))).toBe(true);

      const suggestionsBareAt = getISLASuggestions('at', 2);
      expect(suggestionsBareAt.some((s) => s.label.startsWith('at'))).toBe(true);
    });
  });

  describe('Book reference and smart group suggestions (@)', () => {
    it('suggests all books, smart groups, and testament scopes when typing bare "@"', () => {
      const suggestions = getISLASuggestions('!@', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(70);
      expect(suggestions.some((s) => s.label === '@Joh')).toBe(true);
      expect(suggestions.some((s) => s.label === '@evankeliumit')).toBe(true);
      expect(suggestions.some((s) => s.label === '@epistolat')).toBe(true);
      expect(suggestions.some((s) => s.label === '@kirjeet')).toBe(true);
      expect(suggestions.some((s) => s.label === '@toora')).toBe(true);
      expect(suggestions.some((s) => s.label === '@VT')).toBe(true);
      expect(suggestions.some((s) => s.label === '@UT')).toBe(true);
    });

    it('filters smart book groups by prefix (e.g. "@evan" or "@epis")', () => {
      const suggestions = getISLASuggestions('!@evan', 6);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      const ev = suggestions.find((s) => s.label === '@evankeliumit');
      expect(ev).toBeDefined();
      expect(ev?.insertText).toBe('@evankeliumit ');
      expect(ev?.detail).toContain('Evankeliumit');

      const episSuggestions = getISLASuggestions('!@epis', 6);
      expect(episSuggestions.some((s) => s.label === '@epistolat')).toBe(true);
    });

    it('filters book suggestions by abbreviation prefix (e.g. "@joh")', () => {
      const suggestions = getISLASuggestions('!@joh', 5);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      const joh = suggestions.find((s) => s.label === '@Joh');
      expect(joh).toBeDefined();
      expect(joh?.insertText).toBe('@Joh ');
      expect(joh?.kind).toBe('reference');
      expect(joh?.documentation.fi).toContain('Johanneksen mukaan');
      expect(joh?.documentation.en).toContain('John');
    });

    it('filters book suggestions by Finnish name (e.g. "@1m" or "@1moos")', () => {
      const suggestions = getISLASuggestions('!@1m', 4);
      expect(suggestions.some((s) => s.label === '@1Moos')).toBe(true);
    });

    it('filters book suggestions by testament scope (e.g. "@vt" or "@ut")', () => {
      const vtSuggestions = getISLASuggestions('!? "armo" @vt', 13);
      expect(vtSuggestions.some((s) => s.label === '@VT')).toBe(true);

      const utSuggestions = getISLASuggestions('!? "armo" @ut', 13);
      expect(utSuggestions.some((s) => s.label === '@UT')).toBe(true);
    });

    it('suggests books inside modern @(...) citation', () => {
      const suggestions = getISLASuggestions('! @(', 4);
      expect(suggestions.some((s) => s.label === 'Joh')).toBe(true);
      expect(suggestions.some((s) => s.label === 'Matt')).toBe(true);
      expect(suggestions.some((s) => s.label === 'evankeliumit')).toBe(true);
    });

    it('filters book suggestions inside modern @(...) citation by prefix', () => {
      const suggestions = getISLASuggestions('! @(joh', 7);
      expect(suggestions.some((s) => s.label === 'Joh')).toBe(true);
    });
  });

  describe('Pipeline suggestions (=>)', () => {
    it('suggests functional actions, translations, and limits after "=>"', () => {
      const suggestions = getISLASuggestions('!@Joh 3:16 => ', 14);
      
      expect(suggestions.some((s) => s.label === 'count()' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'use(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'at(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'in(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'vs(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'refs(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'themes(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'suggest(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'limit(...)' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KR92' && s.kind === 'translation')).toBe(true);
    });

    it('filters pipeline actions by prefix (e.g. "=> us" or "=> co")', () => {
      const useSuggestions = getISLASuggestions('!@Joh 3:16 => us', 16);
      expect(useSuggestions.some((s) => s.label === 'use(...)')).toBe(true);

      const countSuggestions = getISLASuggestions('!search("armo") => co', 21);
      expect(countSuggestions.some((s) => s.label === 'count()')).toBe(true);
    });

    it('filters pipeline options for theme cloud (e.g. "=> th")', () => {
      const suggestions = getISLASuggestions('!^ => th', 8);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('themes(...)');
    });

    it('filters pipeline translations by prefix (e.g. "=> KR")', () => {
      const suggestions = getISLASuggestions('!@Joh 3:16 => KR', 16);
      expect(suggestions.every((s) => s.label.startsWith('KR'))).toBe(true);
      expect(suggestions.some((s) => s.label === 'KR92')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KR38')).toBe(true);
    });

    it('respects caller-provided availableTranslations filter', () => {
      const suggestions = getISLASuggestions('!@Joh 3:16 => ', 14, ['fin-1992', 'eng-web']);
      const translations = suggestions.filter((s) => s.kind === 'translation');
      expect(translations).toHaveLength(2);
      expect(translations.some((s) => s.label === 'KR92')).toBe(true);
      expect(translations.some((s) => s.label === 'WEB')).toBe(true);
      expect(translations.some((s) => s.label === 'KJV')).toBe(false);
    });
  });

  describe('Comparative translation suggestions (? and :)', () => {
    it('suggests translations after ternary comparison "?"', () => {
      const suggestions = getISLASuggestions('!@Joh 3:16 ? ', 13);
      expect(suggestions.length).toBeGreaterThanOrEqual(5);
      expect(suggestions.some((s) => s.label === 'KR92')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KR38')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KJV')).toBe(true);
    });

    it('suggests translations after second comparison branch ":"', () => {
      const suggestions = getISLASuggestions('!@Joh 3:16 ? KR92 : ', 20);
      expect(suggestions.length).toBeGreaterThanOrEqual(5);
      expect(suggestions.some((s) => s.label === 'KJV')).toBe(true);
      expect(suggestions.some((s) => s.label === 'WEB')).toBe(true);
    });

    it('filters comparative translations by prefix (e.g. "? kj")', () => {
      const suggestions = getISLASuggestions('!@Joh 3:16 ? kj', 15);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('KJV');
      expect(suggestions[0].insertText).toBe('KJV ');
    });
  });

  describe('Count unit suggestions inside count(...)', () => {
    it('suggests count units when typing inside count(', () => {
      const suggestions = getISLASuggestions('!search("armo") => count(', 25);
      expect(suggestions.some((s) => s.label === 'verses')).toBe(true);
      expect(suggestions.some((s) => s.label === 'chapters')).toBe(true);
      expect(suggestions.some((s) => s.label === 'books')).toBe(true);
      expect(suggestions.some((s) => s.label === 'words')).toBe(true);
      expect(suggestions.some((s) => s.label === 'sanat')).toBe(true);
      expect(suggestions.some((s) => s.label === 'kirjat')).toBe(true);
      expect(suggestions.some((s) => s.label === 'unique_words')).toBe(true);
      expect(suggestions.some((s) => s.label === 'uw')).toBe(true);
      expect(suggestions.some((s) => s.label === 'uniques')).toBe(true);
      expect(suggestions.some((s) => s.label === 'uniq')).toBe(true);
      expect(suggestions.some((s) => s.label === 'uniikit')).toBe(true);
      expect(suggestions.some((s) => s.label === 'uniikit_sanat')).toBe(true);
      expect(suggestions.some((s) => s.label === 'us')).toBe(true);
    });

    it('filters count units by prefix inside count(', () => {
      const suggestions = getISLASuggestions('!search("armo") => count(bo', 27);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('books');
      expect(suggestions[0].insertText).toBe('books)');

      const uwSuggestions = getISLASuggestions('!search("armo") => count(uw', 27);
      expect(uwSuggestions).toHaveLength(1);
      expect(uwSuggestions[0].label).toBe('uw');
      expect(uwSuggestions[0].insertText).toBe('uw)');

      const uniikitSanatSuggestions = getISLASuggestions('!search("armo") => count(uniikit_', 33);
      expect(uniikitSanatSuggestions).toHaveLength(1);
      expect(uniikitSanatSuggestions[0].label).toBe('uniikit_sanat');
      expect(uniikitSanatSuggestions[0].insertText).toBe('uniikit_sanat)');
    });
  });

  describe('Dot method chaining suggestions (.)', () => {
    it('suggests verse-appropriate methods after typing dot on verse reference', () => {
      const suggestions = getISLASuggestions('! @(Joh 3:16).', 14);
      expect(suggestions.some((s) => s.label === 'use(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'vs(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'refs(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'stats()')).toBe(true);
      expect(suggestions.some((s) => s.label === 'top(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'count(...)')).toBe(true);
      // at and limit are only for search
      expect(suggestions.some((s) => s.label === 'at(...)')).toBe(false);
      expect(suggestions.some((s) => s.label === 'limit(...)')).toBe(false);
    });

    it('suggests search-appropriate methods after typing dot on search query', () => {
      const suggestions = getISLASuggestions('! search("armo").', 17);
      expect(suggestions.some((s) => s.label === 'at(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'limit(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'count(...)')).toBe(true);
      // vs and refs are only for verse references
      expect(suggestions.some((s) => s.label === 'vs(...)')).toBe(false);
      expect(suggestions.some((s) => s.label === 'refs(...)')).toBe(false);
    });

    it('suggests cell-context appropriate methods after typing dot on caret (^)', () => {
      const suggestions = getISLASuggestions('! ^.', 4);
      expect(suggestions.some((s) => s.label === 'suggest(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'themes(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'count(...)')).toBe(true);
      expect(suggestions.some((s) => s.label === 'use(...)')).toBe(false);
      expect(suggestions.some((s) => s.label === 'at(...)')).toBe(false);
    });

    it('filters dot methods by prefix (e.g. ".us" or ".st")', () => {
      const suggestions = getISLASuggestions('! @(Joh 3:16).us', 16);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('use(...)');

      const statsSuggestions = getISLASuggestions('! @(Joh 3:16).st', 16);
      expect(statsSuggestions).toHaveLength(1);
      expect(statsSuggestions[0].label).toBe('stats()');
    });
  });

  describe('Call parameter completions inside use(...) and at(...)', () => {
    it('suggests translations inside use(', () => {
      const suggestions = getISLASuggestions('! @(Joh 3:16).use(', 18);
      expect(suggestions.some((s) => s.label === 'KR92')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KR38')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KJV')).toBe(true);
    });

    it('suggests smart groups and books inside at(', () => {
      const suggestions = getISLASuggestions('! search("armo").at(', 20);
      expect(suggestions.some((s) => s.label === 'kirjeet')).toBe(true);
      expect(suggestions.some((s) => s.label === 'evankeliumit')).toBe(true);
      expect(suggestions.some((s) => s.label === 'Joh')).toBe(true);
    });
  });

  describe('applyISLASuggestion helper', () => {
    it('applies dot method insertion without wiping preceding code', () => {
      const { newCode, newCursorOffset } = applyISLASuggestion(
        '! @(Joh 3:16).',
        14,
        {
          label: 'use(...)',
          insertText: 'use(',
          detail: 'Valitse käännös',
          documentation: { fi: '', en: '' },
          kind: 'function',
        }
      );
      expect(newCode).toBe('! @(Joh 3:16).use(');
      expect(newCursorOffset).toBe(18);
    });

    it('replaces prefix when completing dot method', () => {
      const { newCode, newCursorOffset } = applyISLASuggestion(
        '! @(Joh 3:16).us',
        16,
        {
          label: 'use(...)',
          insertText: 'use(',
          detail: 'Valitse käännös',
          documentation: { fi: '', en: '' },
          kind: 'function',
        }
      );
      expect(newCode).toBe('! @(Joh 3:16).use(');
      expect(newCursorOffset).toBe(18);
    });

    it('applies pipeline operator suggestion without wiping preceding code', () => {
      const { newCode, newCursorOffset } = applyISLASuggestion(
        '! @Joh 3:16 => ',
        15,
        {
          label: 'use(...)',
          insertText: 'use(',
          detail: 'Valitse käännös',
          documentation: { fi: '', en: '' },
          kind: 'function',
        }
      );
      expect(newCode).toBe('! @Joh 3:16 => use(');
      expect(newCursorOffset).toBe(19);
    });

    it('applies translation inside use( and automatically appends closing paren', () => {
      const { newCode, newCursorOffset } = applyISLASuggestion(
        '! @(Joh 3:16).use(',
        18,
        {
          label: 'KR92',
          insertText: 'KR92 ',
          detail: 'Pyhä Raamattu 1992',
          documentation: { fi: '', en: '' },
          kind: 'translation',
        }
      );
      expect(newCode).toBe('! @(Joh 3:16).use(KR92)');
      expect(newCursorOffset).toBe(23);
    });

    it('does not duplicate closing paren if already present in buffer', () => {
      const { newCode, newCursorOffset } = applyISLASuggestion(
        '! @(Joh 3:16).use()',
        18,
        {
          label: 'KR92',
          insertText: 'KR92 ',
          detail: 'Pyhä Raamattu 1992',
          documentation: { fi: '', en: '' },
          kind: 'translation',
        }
      );
      expect(newCode).toBe('! @(Joh 3:16).use(KR92)');
      expect(newCursorOffset).toBe(22);
    });

    it('applies book suggestion inside modern @(...) without wiping preceding code and without trailing space', () => {
      const { newCode, newCursorOffset } = applyISLASuggestion(
        '! @()',
        4,
        {
          label: 'Joh',
          insertText: 'Joh ',
          detail: 'Johanneksen evankeliumi',
          documentation: { fi: '', en: '' },
          kind: 'reference',
        }
      );
      expect(newCode).toBe('! @(Joh)');
      expect(newCursorOffset).toBe(7);
    });

    it('applies smart group evankeliumit inside chained @() without trailing whitespace', () => {
      const { newCode, newCursorOffset } = applyISLASuggestion(
        '! ?("Herra").@()',
        15,
        {
          label: 'evankeliumit',
          insertText: 'evankeliumit',
          detail: 'Evankeliumit (Gospels)',
          documentation: { fi: '', en: '' },
          kind: 'reference',
        }
      );
      expect(newCode).toBe('! ?("Herra").@(evankeliumit)');
      expect(newCursorOffset).toBe(27);
    });

    it('positions cursor strictly inside quotes for ? and search suggestions', () => {
      // 1. Snippet with ?
      const qSnippet = ISLA_MAIN_SNIPPETS[0];
      const { newCode: codeQ, newCursorOffset: offsetQ } = applyISLASuggestion('! ', 2, qSnippet);
      expect(codeQ).toBe('! ?("armo") => at(UT)');
      expect(offsetQ).toBe(5); // right inside quotes: '! ?("|armo") => at(UT)'

      // 2. Snippet with search()
      const searchSnippet = ISLA_MAIN_SNIPPETS[1];
      const { newCode: codeS, newCursorOffset: offsetS } = applyISLASuggestion('! ', 2, searchSnippet);
      expect(codeS).toBe('! search("armo") => at(evankeliumit) => count()');
      expect(offsetS).toBe(10); // right inside quotes: '! search("|armo") => ...'

      // 3. Functional search("") from prefix replacement
      const { newCode: codeFuncS, newCursorOffset: offsetFuncS } = applyISLASuggestion(
        '! search',
        8,
        {
          label: 'search("...")',
          insertText: '! search("")',
          cursorOffset: 10,
          detail: 'Search',
          documentation: { fi: '', en: '' },
          kind: 'function',
        }
      );
      expect(codeFuncS).toBe('! search("")');
      expect(offsetFuncS).toBe(10); // exactly between quotes: '! search("|")'

      // 4. Functional ?("") from prefix replacement
      const { newCode: codeFuncQ, newCursorOffset: offsetFuncQ } = applyISLASuggestion(
        '?',
        1,
        {
          label: '?("...")',
          insertText: '?("")',
          cursorOffset: 3,
          detail: 'Search (?)',
          documentation: { fi: '', en: '' },
          kind: 'function',
        }
      );
      expect(codeFuncQ).toBe('?("")');
      expect(offsetFuncQ).toBe(3); // exactly between quotes: '?("|")'

      // 5. Functional at() with empty parens
      const { newCode: codeAt, newCursorOffset: offsetAt } = applyISLASuggestion(
        'at',
        2,
        {
          label: 'at(...)',
          insertText: 'at()',
          cursorOffset: 3,
          detail: 'Verse',
          documentation: { fi: '', en: '' },
          kind: 'function',
        }
      );
      expect(codeAt).toBe('at()');
      expect(offsetAt).toBe(3); // exactly between parentheses: 'at(|)'
    });
  });

  describe('Fallback behavior', () => {
    it('returns empty array when text does not trigger any IntelliSense rules', () => {
      expect(getISLASuggestions('Regular text in a markdown cell', 15)).toEqual([]);
      expect(getISLASuggestions('!@Joh 3:16 random words without pipe', 30)).toEqual([]);
    });
  });
});

