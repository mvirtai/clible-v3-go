import { bookCitationAbbrevFi } from './bookNames';

export interface CLIResultData {
  source?: string;
  query?: string;
  reference?: string;
  verses?: Array<{ id: string; translationId: string; bookId: string; chapter: number; verse: number; text: string }>;
  references?: Array<{ id: string; translationId: string; bookId: string; chapter: number; verse: number; text: string }>;
  suggestions?: Array<{ id: string; translationId: string; bookId: string; chapter: number; verse: number; text: string }>;
  keywords?: string[];
  themes?: Array<{ word: string; count: number }>;
}

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

  return markdown;
}