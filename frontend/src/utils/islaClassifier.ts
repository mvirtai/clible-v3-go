import type { Cell, CellCounts } from '../components/notebook/types';

export type ContentCategory = 'text' | 'search' | 'verse' | 'compare' | 'count' | 'refs';

export interface ContentCounts {
  text: number;
  search: number;
  verse: number;
  compare: number;
  count: number;
  refs: number;
}

/**
 * Classifies an isolated ISLA query string into its primary functional category.
 */
export function classifyISLAQuery(rawQuery: string): 'search' | 'verse' | 'compare' | 'count' | 'refs' {
  const q = rawQuery.trim();

  // 1. Cross-references (~ @Joh 3:16 or refs @Joh 3:16)
  if (q.startsWith('~') || q.startsWith('!~') || q.toLowerCase().startsWith('/refs') || q.toLowerCase().startsWith('refs ')) {
    return 'refs';
  }

  // 2. Count metrics
  if (q.includes('=> count') || q.startsWith('#') || q.startsWith('!#')) {
    return 'count';
  }

  // 3. Comparison
  if (
    (q.includes(' ? ') && q.includes(' : ')) ||
    /\s\+\s/.test(q) ||
    /\b(?:vs\.?|cmp)\b/i.test(q) ||
    q.toLowerCase().startsWith('/compare')
  ) {
    return 'compare';
  }

  // 4. Search query
  if (q.startsWith('?') || q.startsWith('!?') || q.toLowerCase().startsWith('/search')) {
    return 'search';
  }

  // 5. Verse lookup
  if (q.startsWith('@') || q.startsWith('!@') || q.toLowerCase().startsWith('/read') || /^[a-zA-Z0-9åäöÅÄÖ\s]+\s+\d+:\d+/i.test(q)) {
    return 'verse';
  }

  // Fallback heuristics: if it contains quotes it's likely search, otherwise verse
  if (q.includes('"') || q.includes("'")) {
    return 'search';
  }

  return 'verse';
}

export interface CellClassification {
  isISLA: boolean;
  categories: ContentCategory[];
  primaryCategory: ContentCategory;
  cleanPreview: string;
}

/**
 * Strips markdown formatting for concise text preview.
 */
export function stripMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[\[(.*?)\]\]/g, '$1')
    .replace(/\[\[(.*?)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classifies a single notebook cell and extracts detected content categories and preview info.
 */
export function classifyCell(cell: Cell): CellClassification {
  const content = cell.content || '';
  const detected: ContentCategory[] = [];
  let remaining = content;

  // 1. Extract fenced code blocks (```isla or ```magic)
  remaining = remaining.replace(/```(?:isla|magic)\s*\n([\s\S]*?)```/gi, (_, query) => {
    const q = query.trim();
    if (q) detected.push(classifyISLAQuery(q));
    return ' ';
  });

  // 2. Extract wikilink embeds ![[...]]
  remaining = remaining.replace(/!\[\[(?:isla\s+|ISLA\s+|i\s+)?([\s\S]*?)\]\]/gi, (_, query) => {
    const q = query.trim();
    if (q) detected.push(classifyISLAQuery(q));
    return ' ';
  });

  // 3. Extract inline backtick shortcuts `!isla ...` or `!@...`
  remaining = remaining.replace(/`!(?:isla\s+|ISLA\s+|i\s+)?([^`]+)`/gi, (_, query) => {
    const q = query.trim();
    if (q) detected.push(classifyISLAQuery(q));
    return ' ';
  });

  // 4. Extract line-level directives & shorthands (!isla, !@, !?, !#, !~, @..., ?..., ~..., # "...")
  remaining = remaining.replace(/(?:^|\n)[ \t]*(?:!(?:isla\b|ISLA\b|i[@?#~]|[@?#~]|\s+@|\s+\?|\s+#|\s+~)|[@?~]|#(?:[ \t]*["'@?]))[^\n`]*/gm, (match) => {
    const q = match.trim();
    if (q) detected.push(classifyISLAQuery(q));
    return ' ';
  });

  // 5. Clean remaining text to see if substantive markdown text exists
  const textChars = remaining.replace(/[#*_~`>\-=+\s]/g, '').trim();
  if (textChars.length > 0 || detected.length === 0) {
    if (content.trim().length > 0) {
      detected.unshift('text');
    }
  }

  const isISLA = detected.some((c) => c !== 'text');
  const primaryCategory = detected.find((c) => c !== 'text') || 'text';
  const cleanPreview = stripMarkdown(content);

  return {
    isISLA,
    categories: detected.length > 0 ? detected : ['text'],
    primaryCategory,
    cleanPreview,
  };
}

/**
 * Aggregates all content categories across a collection of notebook cells.
 * If cells array is empty/undefined, falls back cleanly to legacy cellCounts (markdown/code).
 */
export function classifyNotebookContent(
  cells?: Cell[],
  fallbackCellCounts?: CellCounts
): ContentCounts {
  const counts: ContentCounts = {
    text: 0,
    search: 0,
    verse: 0,
    compare: 0,
    count: 0,
    refs: 0,
  };

  if (!cells || cells.length === 0) {
    if (fallbackCellCounts) {
      counts.text = fallbackCellCounts.markdown ?? 0;
      counts.search = fallbackCellCounts.code ?? 0;
    }
    return counts;
  }

  for (const cell of cells) {
    const { categories } = classifyCell(cell);
    for (const cat of categories) {
      counts[cat]++;
    }
  }

  return counts;
}
