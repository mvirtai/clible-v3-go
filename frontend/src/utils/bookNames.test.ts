import { describe, it, expect } from 'vitest';
import {
  bookCitationAbbrevFi,
  formatReferenceForDisplay,
  bookAbbrevOrId,
  bookName,
  bookNameLocalized,
} from './bookNames';

describe('bookNames utilities', () => {
  describe('bookCitationAbbrevFi', () => {
    it('returns Finnish citation abbreviations correctly', () => {
      expect(bookCitationAbbrevFi('JHN')).toBe('Joh.');
      expect(bookCitationAbbrevFi('ACT')).toBe('Ap. t.');
      expect(bookCitationAbbrevFi('ROM')).toBe('Room.');
    });

    it('falls back to the book ID if no abbreviation is defined', () => {
      expect(bookCitationAbbrevFi('XYZ')).toBe('XYZ');
    });
  });

  describe('formatReferenceForDisplay', () => {
    it('keeps the original reference format unchanged for English', () => {
      expect(formatReferenceForDisplay('JHN 3:16', 'en')).toBe('JHN 3:16');
      expect(formatReferenceForDisplay('ACT 1:8', 'en')).toBe('ACT 1:8');
    });

    it('formats reference labels correctly for Finnish', () => {
      // "Evankeliumi Johanneksen mukaan (Joh. 3:16)"
      expect(formatReferenceForDisplay('JHN 3:16', 'fi')).toBe('Evankeliumi Johanneksen mukaan (Joh. 3:16)');
      // "Apostolien teot (Ap. t. 1:8)"
      expect(formatReferenceForDisplay('ACT 1:8', 'fi')).toBe('Apostolien teot (Ap. t. 1:8)');
    });
  });

  describe('bookAbbrevOrId', () => {
    it('returns the ID itself for English', () => {
      expect(bookAbbrevOrId('JHN', 'en')).toBe('JHN');
    });

    it('returns the Finnish abbreviation if available', () => {
      expect(bookAbbrevOrId('JHN', 'fi')).toBe('joh');
      expect(bookAbbrevOrId('ACT', 'fi')).toBe('ap');
    });
  });

  describe('bookName & bookNameLocalized', () => {
    it('resolves English book names correctly', () => {
      expect(bookName('GEN')).toBe('Genesis');
      expect(bookName('JHN')).toBe('John');
    });

    it('resolves localized book names correctly', () => {
      expect(bookNameLocalized('GEN', 'fi')).toBe('1. Mooseksen kirja');
      expect(bookNameLocalized('GEN', 'en')).toBe('Genesis');
    });
  });
});
