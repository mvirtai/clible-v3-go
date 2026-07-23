// frontend/src/utils/readerNavigation.test.ts
import { describe, it, expect } from 'vitest';
import { getNextChapterRef, getPreviousChapterRef, getChapterCount } from './readerNavigation';

describe('getNextChapterRef', () => {
  it('should return the next chapter ref', () => {
    expect(getNextChapterRef('JHN', 3)).toEqual({ bookId: 'JHN', chapter: 4 });
  });

  it('over-exceeds the chapter count', () => {
    // In 'JOH' there are 21 chapters -> next chapter should be 1
    expect(getNextChapterRef('JHN', 21)).toEqual({ bookId: 'ACT', chapter: 1 });
  });

  it('return null after the last chapter of the Bible', () => {
    expect(getNextChapterRef('REV', 22)).toBeNull();
  });

  it('return null to unknown book', () => {
    expect(getNextChapterRef('XYZ', 1)).toBeNull();
  });
});

describe('getPreviousChapterRef', () => {
  it('should return the previous chapter ref', () => {
    expect(getPreviousChapterRef('JHN', 4)).toEqual({ bookId: 'JHN', chapter: 3 });
  });

  it('over-exceeds the chapter count', () => {
    // In 'ACT' there are 20 chapters -> previous chapter should be 21
    expect(getPreviousChapterRef('ACT', 1)).toEqual({ bookId: 'JHN', chapter: 21 });
  });

  it('return null before the first chapter of the Bible', () => {
    expect(getPreviousChapterRef('GEN', 1)).toBeNull();
  });

  it('return null to unknown book', () => {
    expect(getPreviousChapterRef('XYZ', 1)).toBeNull();
  });
});

describe('getChapterCount', () => {
  it('return the number of chapters for a given book', () => {
    expect(getChapterCount('PSA')).toBe(150);
  });

  it('return null to unknown book', () => {
    expect(getChapterCount('XYZ')).toBeNull();
  });
})
