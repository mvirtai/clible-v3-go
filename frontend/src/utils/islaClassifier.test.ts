import { describe, it, expect } from 'vitest';
import {
  classifyISLAQuery,
  classifyCell,
  classifyNotebookContent,
  stripMarkdown,
} from './islaClassifier';
import type { Cell } from '../components/notebook/types';

describe('islaClassifier', () => {
  describe('classifyISLAQuery', () => {
    it('classifies search queries', () => {
      expect(classifyISLAQuery('? "valo" gjoh --limit:5')).toBe('search');
      expect(classifyISLAQuery('!? "rakkaus"')).toBe('search');
      expect(classifyISLAQuery('/search armo')).toBe('search');
    });

    it('classifies verse lookups', () => {
      expect(classifyISLAQuery('@Joh 3:16')).toBe('verse');
      expect(classifyISLAQuery('!@Matt 5:1-12')).toBe('verse');
      expect(classifyISLAQuery('/read Room 8:28')).toBe('verse');
    });

    it('classifies comparisons', () => {
      expect(classifyISLAQuery('@Joh 3:16 ? KR92 : KJV')).toBe('compare');
      expect(classifyISLAQuery('@Joh 3:16 + web + kjv')).toBe('compare');
      expect(classifyISLAQuery('joh 3:16 ? web + kjv')).toBe('compare');
      expect(classifyISLAQuery('/compare Joh 3:16')).toBe('compare');
    });

    it('classifies count metrics', () => {
      expect(classifyISLAQuery('? "valo" => count')).toBe('count');
      expect(classifyISLAQuery('# "armo" @ut')).toBe('count');
      expect(classifyISLAQuery('!# "armo"')).toBe('count');
    });

    it('classifies cross-references', () => {
      expect(classifyISLAQuery('~ @Joh 3:16')).toBe('refs');
      expect(classifyISLAQuery('!~ @Room 8:28')).toBe('refs');
      expect(classifyISLAQuery('/refs Joh 3:16')).toBe('refs');
      expect(classifyISLAQuery('refs @Matt 5:1')).toBe('refs');
    });
  });

  describe('classifyCell', () => {
    it('classifies plain text markdown cell', () => {
      const cell: Cell = {
        id: '1',
        notebookId: 'nb-1',
        type: 'markdown',
        content: '# Huomioita Johanneksen evankeliumista\n\nTämä on tavallinen muistiinpano ilman ISLA-komentoja.',
      };

      const result = classifyCell(cell);
      expect(result.isISLA).toBe(false);
      expect(result.primaryCategory).toBe('text');
      expect(result.categories).toEqual(['text']);
    });

    it('classifies fenced isla code block', () => {
      const cell: Cell = {
        id: '2',
        notebookId: 'nb-1',
        type: 'markdown',
        content: '```isla\n? "valo" gjoh --limit:5\n```',
      };

      const result = classifyCell(cell);
      expect(result.isISLA).toBe(true);
      expect(result.primaryCategory).toBe('search');
      expect(result.categories).toContain('search');
    });

    it('classifies wikilink embed and text in the same cell', () => {
      const cell: Cell = {
        id: '3',
        notebookId: 'nb-1',
        type: 'markdown',
        content: 'Katso tärkeä jae:\n![[@Joh 3:16]]\nMuista tutkia tarkemmin.',
      };

      const result = classifyCell(cell);
      expect(result.isISLA).toBe(true);
      expect(result.categories).toContain('verse');
      expect(result.categories).toContain('text');
    });

    it('classifies line directive !isla', () => {
      const cell: Cell = {
        id: '4',
        notebookId: 'nb-1',
        type: 'markdown',
        content: '!isla @Joh 3:16 ? KR92 : KJV',
      };

      const result = classifyCell(cell);
      expect(result.isISLA).toBe(true);
      expect(result.primaryCategory).toBe('compare');
      expect(result.categories).toContain('compare');
    });

    it('classifies ISLA line directive with search quotes', () => {
      const cell: Cell = {
        id: '5',
        notebookId: 'nb-1',
        type: 'markdown',
        content: '! ?"valo"',
      };

      const result = classifyCell(cell);
      expect(result.isISLA).toBe(true);
      expect(result.primaryCategory).toBe('search');
      expect(result.categories).toEqual(['search']);
    });
  });

  describe('classifyNotebookContent', () => {
    it('aggregates counts across all cells', () => {
      const cells: Cell[] = [
        { id: '1', notebookId: 'nb', type: 'markdown', content: 'Pelkkä muistiinpano' },
        { id: '2', notebookId: 'nb', type: 'markdown', content: '```isla\n? "valo"\n```' },
        { id: '3', notebookId: 'nb', type: 'markdown', content: '!@Joh 3:16' },
        { id: '4', notebookId: 'nb', type: 'markdown', content: '!isla @Joh 3:16 ? KR92 : KJV' },
        { id: '5', notebookId: 'nb', type: 'markdown', content: '# "valo" @ut' },
        { id: '6', notebookId: 'nb', type: 'markdown', content: '~ @Joh 3:16' },
      ];

      const counts = classifyNotebookContent(cells);
      expect(counts.text).toBe(1);
      expect(counts.search).toBe(1);
      expect(counts.verse).toBe(1);
      expect(counts.compare).toBe(1);
      expect(counts.count).toBe(1);
      expect(counts.refs).toBe(1);
    });

    it('falls back to cellCounts when cells array is not provided', () => {
      const counts = classifyNotebookContent(undefined, { markdown: 5, code: 2 });
      expect(counts.text).toBe(5);
      expect(counts.search).toBe(2);
      expect(counts.verse).toBe(0);
    });
  });

  describe('stripMarkdown', () => {
    it('strips headers, code fences, and wikilinks', () => {
      const raw = '### Otsikko\n\n```isla\n? "valo"\n```\n![[@Joh 3:16]]\n**Tärkeää** tekstiä [linkki](http://example.com)';
      const stripped = stripMarkdown(raw);
      expect(stripped).toContain('Otsikko');
      expect(stripped).toContain('@Joh 3:16');
      expect(stripped).toContain('Tärkeää tekstiä linkki');
    });
  });
});
