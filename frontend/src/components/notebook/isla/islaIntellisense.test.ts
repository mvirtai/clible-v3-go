import { describe, it, expect } from 'vitest';
import {
  getISLASuggestions,
  ISLA_MAIN_SNIPPETS,
} from './islaIntellisense';

describe('islaIntellisense', () => {
  describe('Main Snippet suggestions', () => {
    it('returns ISLA_MAIN_SNIPPETS when line is empty', () => {
      const suggestions = getISLASuggestions('', 0);
      expect(suggestions).toEqual(ISLA_MAIN_SNIPPETS);
    });

    it('returns ISLA_MAIN_SNIPPETS when line contains only "!"', () => {
      const suggestions = getISLASuggestions('!', 1);
      expect(suggestions).toEqual(ISLA_MAIN_SNIPPETS);
    });

    it('returns ISLA_MAIN_SNIPPETS when line contains "!isla" or "!ISLA"', () => {
      expect(getISLASuggestions('!isla', 5)).toEqual(ISLA_MAIN_SNIPPETS);
      expect(getISLASuggestions('!ISLA', 5)).toEqual(ISLA_MAIN_SNIPPETS);
      expect(getISLASuggestions('  !isla', 7)).toEqual(ISLA_MAIN_SNIPPETS);
    });

    it('returns search templates when line starts with "!?"', () => {
      const suggestions = getISLASuggestions('!?', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      expect(suggestions.every((s) => s.label.startsWith('!?'))).toBe(true);
      expect(suggestions.some((s) => s.label.includes('righteous'))).toBe(true);
    });

    it('returns cross-reference templates when line starts with "!~"', () => {
      const suggestions = getISLASuggestions('!~', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions[0].label).toBe('!~ @Joh 3:16');
      expect(suggestions[0].detail).toBe('Cross References');
      expect(suggestions[0].documentation.fi).toContain('Ristiinviitehaku');
    });

    it('returns contextual scope templates when line starts with "!^"', () => {
      const suggestions = getISLASuggestions('!^', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions[0].label).toBe('!^ => #themes');
    });
  });

  describe('Book reference suggestions (@)', () => {
    it('suggests all books and testament scopes when typing bare "@"', () => {
      const suggestions = getISLASuggestions('!@', 2);
      expect(suggestions.length).toBeGreaterThanOrEqual(66);
      expect(suggestions.some((s) => s.label === '@Joh')).toBe(true);
      expect(suggestions.some((s) => s.label === '@VT')).toBe(true);
      expect(suggestions.some((s) => s.label === '@UT')).toBe(true);
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
  });

  describe('Pipeline suggestions (=>)', () => {
    it('suggests functions, translations, and limits after "=>"', () => {
      const suggestions = getISLASuggestions('!@Joh 3:16 => ', 14);
      
      expect(suggestions.some((s) => s.label === 'count' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === '#themes' && s.kind === 'function')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KR92' && s.kind === 'translation')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KR38' && s.kind === 'translation')).toBe(true);
      expect(suggestions.some((s) => s.label === '1776' && s.kind === 'translation')).toBe(true);
      expect(suggestions.some((s) => s.label === 'WEB' && s.kind === 'translation')).toBe(true);
      expect(suggestions.some((s) => s.label === 'KJV' && s.kind === 'translation')).toBe(true);
      expect(suggestions.some((s) => s.label === 'limit:3' && s.kind === 'keyword')).toBe(true);
      expect(suggestions.some((s) => s.label === 'limit:5' && s.kind === 'keyword')).toBe(true);
      expect(suggestions.some((s) => s.label === 'limit:10' && s.kind === 'keyword')).toBe(true);
    });

    it('filters pipeline options by prefix (e.g. "=> co" -> "count")', () => {
      const suggestions = getISLASuggestions('!? "rakkaus" => co', 19);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('count');
      expect(suggestions[0].kind).toBe('function');
    });

    it('filters pipeline options for theme badge cloud (e.g. "=> #th")', () => {
      const suggestions = getISLASuggestions('!^ => #th', 9);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('#themes');
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

  describe('Fallback behavior', () => {
    it('returns empty array when text does not trigger any IntelliSense rules', () => {
      expect(getISLASuggestions('Regular text in a markdown cell', 15)).toEqual([]);
      expect(getISLASuggestions('!@Joh 3:16 random words without pipe', 30)).toEqual([]);
    });
  });
});
