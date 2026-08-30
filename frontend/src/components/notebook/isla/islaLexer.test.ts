import { describe, it, expect } from 'vitest';
import { isISLALine, tokenizeISLALine, getTokenClassName } from './islaLexer';

describe('islaLexer', () => {
  describe('isISLALine', () => {
    it('identifies valid ISLA directive prefixes', () => {
      expect(isISLALine('!@Joh 3:16')).toBe(true);
      expect(isISLALine('!? "armo"')).toBe(true);
      expect(isISLALine('!# "valkeus" @ut')).toBe(true);
      expect(isISLALine('!~ "rakkaus"')).toBe(true);
      expect(isISLALine('!isla @Room 8:28')).toBe(true);
      expect(isISLALine('!ISLA @Gen 1:1')).toBe(true);
      expect(isISLALine('! @Matt 5:3')).toBe(true);
      expect(isISLALine('!')).toBe(true);
      expect(isISLALine('  !@Joh 3:16')).toBe(true);
    });

    it('rejects non-ISLA markdown lines', () => {
      expect(isISLALine('# Header')).toBe(false);
      expect(isISLALine('Regular paragraph with [Joh 3:16]')).toBe(false);
      expect(isISLALine('![Image](https://example.com/img.png)')).toBe(false);
      expect(isISLALine('')).toBe(false);
    });
  });

  describe('tokenizeISLALine', () => {
    it('tokenizes ternary comparison directive: !@Joh 3:16 ? KR92 : KJV', () => {
      const tokens = tokenizeISLALine('!@Joh 3:16 ? KR92 : KJV');
      expect(tokens).toEqual([
        { type: 'directive', text: '!@' },
        { type: 'reference', text: 'Joh 3:16' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '?' },
        { type: 'plain', text: ' ' },
        { type: 'translation', text: 'KR92' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: ':' },
        { type: 'plain', text: ' ' },
        { type: 'translation', text: 'KJV' },
      ]);
    });

    it('tokenizes search query with count aggregation: !? "armo" @ut => count', () => {
      const tokens = tokenizeISLALine('!? "armo" @ut => count');
      expect(tokens).toEqual([
        { type: 'directive', text: '!?' },
        { type: 'plain', text: ' ' },
        { type: 'string', text: '"armo"' },
        { type: 'plain', text: ' ' },
        { type: 'reference', text: '@ut' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '=>' },
        { type: 'plain', text: ' ' },
        { type: 'function', text: 'count' },
      ]);
    });

    it('tokenizes regex search with limit parameter: !? /righteous.*/ @Rom => limit:5', () => {
      const tokens = tokenizeISLALine('!? /righteous.*/ @Rom => limit:5');
      expect(tokens).toEqual([
        { type: 'directive', text: '!?' },
        { type: 'plain', text: ' ' },
        { type: 'regex', text: '/righteous.*/' },
        { type: 'plain', text: ' ' },
        { type: 'reference', text: '@Rom' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '=>' },
        { type: 'plain', text: ' ' },
        { type: 'param', text: 'limit:5' },
      ]);
    });

    it('tokenizes context themes directive: !^ => #themes', () => {
      const tokens = tokenizeISLALine('!^ => #themes');
      expect(tokens).toEqual([
        { type: 'directive', text: '!' },
        { type: 'operator', text: '^' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '=>' },
        { type: 'plain', text: ' ' },
        { type: 'function', text: '#themes' },
      ]);
    });

    it('tokenizes functional pipeline: ! at(Joh 1:1) => use(KR92)', () => {
      const tokens = tokenizeISLALine('! at(Joh 1:1) => use(KR92)');
      expect(tokens).toEqual([
        { type: 'directive', text: '! ' },
        { type: 'function', text: 'at' },
        { type: 'plain', text: '(' },
        { type: 'plain', text: 'Joh' },
        { type: 'plain', text: ' ' },
        { type: 'plain', text: '1' },
        { type: 'operator', text: ':' },
        { type: 'plain', text: '1' },
        { type: 'plain', text: ')' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '=>' },
        { type: 'plain', text: ' ' },
        { type: 'function', text: 'use' },
        { type: 'plain', text: '(' },
        { type: 'translation', text: 'KR92' },
        { type: 'plain', text: ')' },
      ]);
    });
  });

  describe('getTokenClassName', () => {
    it('returns appropriate Tailwind styling classes for all token types', () => {
      expect(getTokenClassName('directive')).toContain('text-amber-400');
      expect(getTokenClassName('reference')).toContain('text-emerald-400');
      expect(getTokenClassName('string')).toContain('text-cyan-300');
      expect(getTokenClassName('regex')).toContain('text-teal-300');
      expect(getTokenClassName('operator')).toContain('text-purple-400');
      expect(getTokenClassName('translation')).toContain('text-rose-400');
      expect(getTokenClassName('function')).toContain('text-fuchsia-400');
      expect(getTokenClassName('param')).toContain('text-sky-300');
      expect(getTokenClassName('plain')).toContain('text-neutral-200');
    });
  });
});
