import { describe, it, expect } from 'vitest';
import { getBookGenre } from './bookGenre';

describe('getBookGenre', () => {
  it('luokittelee Psalmit runoudeksi', () => {
    expect(getBookGenre('PSA')).toBe('poetry');
  });

  it('luokittelee Genesiksen proosaksi', () => {
    expect(getBookGenre('GEN')).toBe('prose');
  });

  it('luokittelee tunnistamattoman kirjan proosaksi (turvallinen oletus)', () => {
    expect(getBookGenre('XXX')).toBe('prose');
  });
});
