import { describe, expect, it } from 'vitest';
import { getWordCloudFontSize } from './wordCloudUtils';

describe('getWordCloudFontSize', () => {
  it('keeps multi-word n-grams readable in a narrow cloud', () => {
    expect(getWordCloudFontSize('armo'.length, 1)).toBe(49);
    expect(getWordCloudFontSize('ihminen synnyi'.length, 1)).toBe(34);
    expect(getWordCloudFontSize('iankaikkisen elämän lupaus'.length, 1)).toBe(22);
  });
});
