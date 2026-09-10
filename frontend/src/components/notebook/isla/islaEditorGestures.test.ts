import { describe, expect, it } from 'vitest';
import { handleISLAGesture } from './islaEditorGestures';

describe('islaEditorGestures', () => {
  describe('! gesture', () => {
    it('inserts "! " and positions caret after space on empty string', () => {
      const res = handleISLAGesture('!', '', 0, 0);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('! ');
      expect(res.newCursorOffset).toBe(2);
    });

    it('inserts "! " when typing at start of line before existing text', () => {
      const res = handleISLAGesture('!', 'search("armo")', 0, 0);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('! search("armo")');
      expect(res.newCursorOffset).toBe(2);
    });

    it('inserts "! " when typing after newline in multiline text', () => {
      const res = handleISLAGesture('!', '# Heading\n', 10, 10);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('# Heading\n! ');
      expect(res.newCursorOffset).toBe(12);
    });

    it('avoids double space when next character is already a space', () => {
      const res = handleISLAGesture('!', ' search', 0, 0);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('! search');
      expect(res.newCursorOffset).toBe(2);
    });

    it('ignores ! when typed within word or string', () => {
      expect(handleISLAGesture('!', 'test', 2, 2).handled).toBe(false);
      expect(handleISLAGesture('!', 'search("hello")', 13, 13).handled).toBe(false);
    });
  });

  describe('@ gesture', () => {
    it('inserts @() and positions caret inside on empty string', () => {
      const res = handleISLAGesture('@', '', 0, 0);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('@()');
      expect(res.newCursorOffset).toBe(2);
    });

    it('inserts @() after command prefix "! "', () => {
      const res = handleISLAGesture('@', '! ', 2, 2);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('! @()');
      expect(res.newCursorOffset).toBe(4);
    });

    it('wraps selected text in @(...)', () => {
      const initial = '! Joh 3:16 => #v';
      const start = 2;
      const end = 10; // 'Joh 3:16'
      const res = handleISLAGesture('@', initial, start, end);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('! @(Joh 3:16) => #v');
      expect(res.newCursorOffset).toBe(start + 'Joh 3:16'.length + 3);
    });

    it('inserts single @ without extra () if immediately preceding an opening paren', () => {
      const initial = '(Joh 3:16)';
      const res = handleISLAGesture('@', initial, 0, 0);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('@(Joh 3:16)');
      expect(res.newCursorOffset).toBe(1);
    });
  });

  describe('auto-closing pairs', () => {
    it('auto-closes parentheses when typing (', () => {
      const res = handleISLAGesture('(', 'search', 6, 6);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('search()');
      expect(res.newCursorOffset).toBe(7);
    });

    it('auto-closes double quotes when typing "', () => {
      const res = handleISLAGesture('"', 'search()', 7, 7);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('search("")');
      expect(res.newCursorOffset).toBe(8);
    });

    it('auto-closes single quotes when typing \'', () => {
      const res = handleISLAGesture("'", 'search()', 7, 7);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe("search('')");
      expect(res.newCursorOffset).toBe(8);
    });

    it('wraps selected text in parentheses', () => {
      const res = handleISLAGesture('(', 'mat 1', 0, 5);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('(mat 1)');
      expect(res.newCursorOffset).toBe(7);
    });

    it('wraps selected text in double quotes', () => {
      const res = handleISLAGesture('"', 'search(armo)', 7, 11);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('search("armo")');
      expect(res.newCursorOffset).toBe(13);
    });

    it('wraps selected text in single quotes', () => {
      const res = handleISLAGesture("'", 'search(armo)', 7, 11);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe("search('armo')");
      expect(res.newCursorOffset).toBe(13);
    });
  });

  describe('overtype / leapfrog', () => {
    it('skips over closing parenthesis when typing )', () => {
      const initial = '@(Joh 3:16)';
      const res = handleISLAGesture(')', initial, 10, 10);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe(initial);
      expect(res.newCursorOffset).toBe(11);
    });

    it('skips over closing double quote when typing "', () => {
      const initial = 'search("armo")';
      const res = handleISLAGesture('"', initial, 12, 12);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe(initial);
      expect(res.newCursorOffset).toBe(13);
    });

    it('skips over closing single quote when typing \'', () => {
      const initial = "search('armo')";
      const res = handleISLAGesture("'", initial, 12, 12);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe(initial);
      expect(res.newCursorOffset).toBe(13);
    });

    it('does not leapfrog if next character does not match', () => {
      const initial = 'search("armo")';
      const res = handleISLAGesture(')', initial, 12, 12); // char at 12 is "
      expect(res.handled).toBe(false);
      expect(res.newCode).toBe(initial);
      expect(res.newCursorOffset).toBe(12);
    });
  });

  describe('pair deletion with Backspace', () => {
    it('deletes @() completely when caret is inside @(|)', () => {
      const initial = '@()';
      const res = handleISLAGesture('Backspace', initial, 2, 2);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('');
      expect(res.newCursorOffset).toBe(0);
    });

    it('deletes @() completely preserving prefix when caret is inside ! @(|)', () => {
      const initial = '! @()';
      const res = handleISLAGesture('Backspace', initial, 4, 4);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('! ');
      expect(res.newCursorOffset).toBe(2);
    });

    it('deletes both parentheses when caret is inside (|)', () => {
      const initial = '()';
      const res = handleISLAGesture('Backspace', initial, 1, 1);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('');
      expect(res.newCursorOffset).toBe(0);
    });

    it('deletes both quotes when caret is inside double quotes ""', () => {
      const initial = 'search("")';
      const res = handleISLAGesture('Backspace', initial, 8, 8);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('search()');
      expect(res.newCursorOffset).toBe(7);
    });

    it('deletes both quotes when caret is inside single quotes \'\'', () => {
      const initial = "search('')";
      const res = handleISLAGesture('Backspace', initial, 8, 8);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('search()');
      expect(res.newCursorOffset).toBe(7);
    });

    it('deletes both ! and trailing space when caret is after smart "! " at start of line', () => {
      const initial = '! ';
      const res = handleISLAGesture('Backspace', initial, 2, 2);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('');
      expect(res.newCursorOffset).toBe(0);
    });

    it('deletes both ! and trailing space after newline in multiline text', () => {
      const initial = '# Title\n! ';
      const res = handleISLAGesture('Backspace', initial, 10, 10);
      expect(res.handled).toBe(true);
      expect(res.newCode).toBe('# Title\n');
      expect(res.newCursorOffset).toBe(8);
    });

    it('does not intercept regular backspace when caret is not between empty pair', () => {
      const initial = 'abc';
      const res = handleISLAGesture('Backspace', initial, 3, 3);
      expect(res.handled).toBe(false);
      expect(res.newCode).toBe(initial);
      expect(res.newCursorOffset).toBe(3);
    });
  });

  describe('unhandled keys', () => {
    it('ignores normal alphanumeric and navigation keys', () => {
      expect(handleISLAGesture('a', 'test', 4, 4).handled).toBe(false);
      expect(handleISLAGesture('Enter', 'test', 4, 4).handled).toBe(false);
      expect(handleISLAGesture('ArrowDown', 'test', 4, 4).handled).toBe(false);
      expect(handleISLAGesture('Tab', 'test', 4, 4).handled).toBe(false);
    });
  });
});
