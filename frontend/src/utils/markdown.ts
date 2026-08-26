import { bookCitationAbbrevFi } from './bookNames';

/**
 * Result data payload structure returned by backend CLI commands and ISLA queries.
 */
export interface CLIResultData {
  /** Source reference string */
  source?: string;
  /** Search query string */
  query?: string;
  /** Bible reference */
  reference?: string;
  /** Target query type (e.g. 'search', 'reference') */
  target_type?: string;
  /** Whether the query was a regular expression */
  is_regex?: boolean;
  /** Total count metric */
  count?: number;
  /** Translation identifier */
  translation?: string;
  /** Verses list */
  verses?: Array<{ id: string; translationId: string; bookId: string; chapter: number; verse: number; text: string }>;
  /** Cross-references list */
  references?: Array<{ id: string; translationId: string; bookId: string; chapter: number; verse: number; text: string }>;
  /** Suggestion items */
  suggestions?: Array<{ id: string; translationId: string; bookId: string; chapter: number; verse: number; text: string }>;
  /** Search keywords */
  keywords?: string[];
  /** Themes list */
  themes?: Array<{ word: string; count: number }>;
  /** Left translation dataset for comparison */
  left?: { translation?: string; verses?: Array<{ id: string; translationId?: string; bookId: string; chapter: number; verse: number; text: string }> };
  /** Right translation dataset for comparison */
  right?: { translation?: string; verses?: Array<{ id: string; translationId?: string; bookId: string; chapter: number; verse: number; text: string }> };
}

/**
 * Converts raw CLI / ISLA execution result data into formatted Markdown text for freezing into notebook cells.
 *
 * @param type - Result type identifier ('read', 'search', 'refs', 'suggest', 'themes', 'count', 'compare').
 * @param data - The structured result payload conforming to {@link CLIResultData}.
 * @param translation - Translation identifier string.
 * @returns Formatted Markdown string.
 */
export function formatResultToMarkdown(type: string, data: CLIResultData, translation: string): string {
  let markdown = "";
  const tr = translation.toUpperCase();

  if ((type === "read" || type === "search") && data.verses && data.verses.length > 0) {
    const first = data.verses[0];
    const last = data.verses[data.verses.length - 1];
    const firstBook = bookCitationAbbrevFi(first.bookId);
    const lastBook = bookCitationAbbrevFi(last.bookId);
    
    let ref = `${firstBook} ${first.chapter}:${first.verse}`;
    if (data.verses.length > 1) {
      if (first.bookId === last.bookId && first.chapter === last.chapter) {
        ref += `-${last.verse}`;
      } else {
        ref += ` - ${lastBook} ${last.chapter}:${last.verse}`;
      }
    }

    markdown = `> **${ref} (${tr})**\n>\n`;
    data.verses.forEach(v => {
      markdown += `> **${v.verse}** ${v.text}\n`;
    });
  } 
  
  else if (type === "refs" && data.references && data.references.length > 0) {
    const source = data.source || "";
    markdown = `### Ristiinviitteet: ${source} (${tr})\n\n`;
    data.references.forEach(v => {
      const book = bookCitationAbbrevFi(v.bookId);
      markdown += `*   **${book} ${v.chapter}:${v.verse}** — *"${v.text}"*\n`;
    });
  } 
  
  else if (type === "suggest" && data.suggestions && data.suggestions.length > 0) {
    const kws = data.keywords ? data.keywords.join(", ") : "";
    markdown = `## Ehdotetut jakeet teemalle [${kws}] (${tr})\n\n`;
    data.suggestions.forEach(v => {
      const book = bookCitationAbbrevFi(v.bookId);
      markdown += `*   **${book} ${v.chapter}:${v.verse}** — *"${v.text}"*\n`;
    });
  }

  else if (type === 'themes') {
    const themes = data.themes || [];
    if (themes.length === 0) return 'Ei tunnistettuja teemoja.';

    let md = `### Tunnistetut teemat\n\n`;
    themes.forEach(t => {
      md += `- **${t.word}** (${t.count})\n`;
    });
    markdown = md;
  }

  else if (type === 'count') {
    const count = data.count ?? 0;
    const matchLabel = count === 1 ? 'osuma' : 'osumaa';
    const target = data.target_type === 'search'
      ? `Hakutulokset haulle ${data.is_regex ? `/${data.query}/` : `"${data.query}"`}`
      : `Jakeet viitteelle ${data.reference}`;
    markdown = `> **${target} (${tr})**: ${count} ${matchLabel}\n`;
  }

  else if (type === 'compare') {
    const leftTrans = data.left?.translation?.toUpperCase() || 'L';
    const rightTrans = data.right?.translation?.toUpperCase() || 'R';
    const ref = data.reference || '';

    const leftVerses = data.left?.verses || [];
    const rightVerses = data.right?.verses || [];
    const maxRows = Math.max(leftVerses.length, rightVerses.length);

    let md = `### Käännösvertailu: ${ref} (${leftTrans} vs. ${rightTrans})\n\n`;
    md += `| Jae | ${leftTrans} | ${rightTrans} |\n`;
    md += `| :--- | :--- | :--- |\n`;

    for (let i = 0; i < maxRows; i++) {
      const l = leftVerses[i];
      const r = rightVerses[i];
      const verseNum = l?.verse || r?.verse || i + 1;
      const lText = l?.text ? l.text.replace(/\|/g, '\\|') : '—';
      const rText = r?.text ? r.text.replace(/\|/g, '\\|') : '—';
      md += `| **${verseNum}** | ${lText} | ${rText} |\n`;
    }

    markdown = md;
  }

  return markdown;
}