import { describe, it, expect } from 'vitest';
import { serializeChain, parseChain } from './deepDiveSerialization';
import type { DeepDiveEntry } from '@/types/ai';

describe('deepDiveSerialization', () => {
  it('returns empty array for null, undefined, or empty string', () => {
    expect(parseChain(null)).toEqual([]);
    expect(parseChain('')).toEqual([]);
    expect(parseChain('   \n  \t ')).toEqual([]);
  });

  it('parses legacy unmarker text as a single entry', () => {
    const raw = '## Initial Analysis\nThis is some legacy markdown analysis.';
    const result = parseChain(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'legacy',
      parentId: null,
      depth: 0,
      topic: '',
      text: raw,
      nextFocus: [],
    });
  });

  it('serializes and parses roundtrip with multiple entries', () => {
    const entries: DeepDiveEntry[] = [
      {
        id: 'entry-1',
        parentId: null,
        depth: 0,
        topic: 'Covenant',
        text: '## Covenant\nDetailed text about covenant.',
        nextFocus: [],
      },
      {
        id: 'entry-2',
        parentId: 'entry-1',
        depth: 1,
        topic: 'Grace',
        text: '## Grace\nGrace follows covenant.',
        nextFocus: [],
      },
    ];

    const serialized = serializeChain(entries);
    expect(serialized).toContain('<!-- deepdive {"id":"entry-1"');
    expect(serialized).toContain('<!-- deepdive {"id":"entry-2"');

    const parsed = parseChain(serialized);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(entries[0]);
    expect(parsed[1]).toEqual(entries[1]);
  });

  it('escapes closing marker syntax like --> in topics', () => {
    const maliciousEntries: DeepDiveEntry[] = [
      {
        id: 'exploit-1',
        parentId: null,
        depth: 0,
        topic: 'Trying to break --> comment here',
        text: 'Safe text content.',
        nextFocus: [],
      },
    ];

    const serialized = serializeChain(maliciousEntries);
    // Should escape '>'
    expect(serialized).not.toContain('--> comment');
    expect(serialized).toContain('\\u003e');

    const parsed = parseChain(serialized);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].topic).toBe('Trying to break --> comment here');
    expect(parsed[0].text).toBe('Safe text content.');
  });

  it('handles invalid JSON in marker gracefully', () => {
    const corrupted = '<!-- deepdive {invalid json} -->\nSome text content.';
    const parsed = parseChain(corrupted);
    // Because no valid marker was found, treated as legacy text
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('legacy');
    expect(parsed[0].text).toBe(corrupted);
  });
});

