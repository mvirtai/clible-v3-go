import type { DeepDiveEntry } from '@/types/ai';

const MARKER_PREFIX = '<!-- deepdive ';
const MARKER_SUFFIX = ' -->';
const MARKER_RE = /^<!-- deepdive (\{.*}) -->$/;

type EntryMeta = Pick<DeepDiveEntry, 'id' | 'parentId' | 'depth' | 'topic'>;

/** Escape characters that could close the HTML comment early (`-->`). */
function encodeMeta(meta: EntryMeta): string {
  return JSON.stringify(meta).replace(/>/g, '\\u003e').replace(/</g, '\\u003c');
}

export function serializeChain(entries: DeepDiveEntry[]): string {
  return entries
    .map((e) => `${MARKER_PREFIX}${encodeMeta(e)}${MARKER_SUFFIX}\n${e.text}`)
    .join('\n\n');
}

export function parseChain(saved: string | null): DeepDiveEntry[] {
  if (!saved || saved.trim() === '') {
    return [];
  }

  const lines = saved.split('\n');
  const parsed: { meta: EntryMeta; lines: string[] }[] = [];
  let current: { meta: EntryMeta; lines: string[] } | null = null;
  let hasValidMarker = false;

  for (const line of lines) {
    const match = line.match(MARKER_RE);
    if (match) {
      try {
        const rawJson = match[1];
        const parsedJson = JSON.parse(rawJson) as Partial<EntryMeta>;
        if (
          typeof parsedJson === 'object' &&
          parsedJson !== null &&
          typeof parsedJson.id === 'string' &&
          (parsedJson.parentId === null || typeof parsedJson.parentId === 'string') &&
          typeof parsedJson.depth === 'number' &&
          typeof parsedJson.topic === 'string'
        ) {
          hasValidMarker = true;
          if (current) {
            parsed.push(current);
          }
          current = {
            meta: {
              id: parsedJson.id,
              parentId: parsedJson.parentId,
              depth: parsedJson.depth,
              topic: parsedJson.topic,
            },
            lines: [],
          };
          continue;
        }
      } catch {
        // Invalid JSON inside marker - treat as plain text line
      }
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    parsed.push(current);
  }

  if (!hasValidMarker) {
    return [
      {
        id: 'legacy',
        parentId: null,
        depth: 0,
        topic: '',
        text: saved.trim(),
        nextFocus: [],
      },
    ];
  }

  return parsed.map((item) => ({
    id: item.meta.id,
    parentId: item.meta.parentId,
    depth: item.meta.depth,
    topic: item.meta.topic,
    text: item.lines.join('\n').trim(),
    nextFocus: [],
  }));
}
