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
      expect(isISLALine('! ')).toBe(true);
      expect(isISLALine('!s')).toBe(true);
      expect(isISLALine('!search("armo")')).toBe(true);
      expect(isISLALine('!range(GEN, DEU)')).toBe(true);
      expect(isISLALine('!at(Joh 1:1)')).toBe(true);
      expect(isISLALine('!#muuttuja.count')).toBe(true);
      expect(isISLALine('  !@Joh 3:16')).toBe(true);
      expect(isISLALine('@Joh 3:16 => count')).toBe(true);
      expect(isISLALine('^ => #themes')).toBe(true);
      expect(isISLALine('search("armo") =>')).toBe(true);
      expect(isISLALine('#myvar.count')).toBe(true);
    });

    it('rejects non-ISLA markdown lines', () => {
      expect(isISLALine('# Header')).toBe(false);
      expect(isISLALine('## Secondary Header')).toBe(false);
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

    it('tokenizes ISLA v2 verse ref with dot chaining and inline output: ! @(Joh 3:16).use(KR92) =>', () => {
      const tokens = tokenizeISLALine('! @(Joh 3:16).use(KR92) =>');
      expect(tokens).toEqual([
        { type: 'directive', text: '! ' },
        { type: 'reference', text: '@(Joh 3:16)' },
        { type: 'operator', text: '.' },
        { type: 'function', text: 'use' },
        { type: 'plain', text: '(' },
        { type: 'translation', text: 'KR92' },
        { type: 'plain', text: ')' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '=>' },
      ]);
    });

    it('tokenizes ISLA v2 range with dot chaining and cell below output: ! range(GEN, DEU).themes(5) >> #tooran-teemat', () => {
      const tokens = tokenizeISLALine('! range(GEN, DEU).themes(5) >> #tooran-teemat');
      expect(tokens).toEqual([
        { type: 'directive', text: '! ' },
        { type: 'function', text: 'range' },
        { type: 'plain', text: '(' },
        { type: 'plain', text: 'GEN' },
        { type: 'plain', text: ',' },
        { type: 'plain', text: ' ' },
        { type: 'plain', text: 'DEU' },
        { type: 'plain', text: ')' },
        { type: 'operator', text: '.' },
        { type: 'function', text: 'themes' },
        { type: 'plain', text: '(' },
        { type: 'plain', text: '5' },
        { type: 'plain', text: ')' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '>>' },
        { type: 'plain', text: ' ' },
        { type: 'function', text: '#tooran-teemat' },
      ]);
    });

    it('tokenizes ISLA v2 search with count and cell above output: ! search("armo").at(UT).count() >', () => {
      const tokens = tokenizeISLALine('! search("armo").at(UT).count() >');
      expect(tokens).toEqual([
        { type: 'directive', text: '! ' },
        { type: 'function', text: 'search' },
        { type: 'plain', text: '(' },
        { type: 'string', text: '"armo"' },
        { type: 'plain', text: ')' },
        { type: 'operator', text: '.' },
        { type: 'function', text: 'at' },
        { type: 'plain', text: '(' },
        { type: 'plain', text: 'UT' },
        { type: 'plain', text: ')' },
        { type: 'operator', text: '.' },
        { type: 'function', text: 'count' },
        { type: 'plain', text: '(' },
        { type: 'plain', text: ')' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '>' },
      ]);
    });

    it('tokenizes .. range operator in ! (MAT .. JOH).count(books)', () => {
      const tokens = tokenizeISLALine('! (MAT .. JOH).count(books)');
      expect(tokens).toEqual([
        { type: 'directive', text: '! ' },
        { type: 'plain', text: '(' },
        { type: 'plain', text: 'MAT' },
        { type: 'plain', text: ' ' },
        { type: 'operator', text: '..' },
        { type: 'plain', text: ' ' },
        { type: 'plain', text: 'JOH' },
        { type: 'plain', text: ')' },
        { type: 'operator', text: '.' },
        { type: 'function', text: 'count' },
        { type: 'plain', text: '(' },
        { type: 'plain', text: 'books' },
        { type: 'plain', text: ')' },
      ]);
    });
  });


  describe('getTokenClassName', () => {
    it('returns appropriate Tailwind styling classes for all token types across light and dark modes', () => {
      // Light theme classes
      expect(getTokenClassName('directive')).toContain('text-amber-600');
      expect(getTokenClassName('reference')).toContain('text-emerald-600');
      expect(getTokenClassName('string')).toContain('text-cyan-700');
      expect(getTokenClassName('regex')).toContain('text-teal-700');
      expect(getTokenClassName('operator')).toContain('text-purple-600');
      expect(getTokenClassName('translation')).toContain('text-rose-600');
      expect(getTokenClassName('function')).toContain('text-fuchsia-600');
      expect(getTokenClassName('param')).toContain('text-sky-700');
      expect(getTokenClassName('plain')).toContain('text-neutral-800');

      // Dark theme classes
      expect(getTokenClassName('directive')).toContain('dark:text-amber-400');
      expect(getTokenClassName('reference')).toContain('dark:text-emerald-400');
      expect(getTokenClassName('string')).toContain('dark:text-cyan-300');
      expect(getTokenClassName('regex')).toContain('dark:text-teal-300');
      expect(getTokenClassName('operator')).toContain('dark:text-purple-400');
      expect(getTokenClassName('translation')).toContain('dark:text-rose-400');
      expect(getTokenClassName('function')).toContain('dark:text-fuchsia-400');
      expect(getTokenClassName('param')).toContain('dark:text-sky-300');
      expect(getTokenClassName('plain')).toContain('dark:text-neutral-200');
    });
  });
});
