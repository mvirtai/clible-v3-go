import {
  BIBLE_BOOKS,
  APP_TRANSLATIONS,
} from '@/components/notebook/isla/islaUtils';

export type SuggestionKind =
  | 'snippet'
  | 'reference'
  | 'operator'
  | 'translation'
  | 'function'
  | 'keyword';

export interface ISLASuggestion {
  /** Main title e.g. "!@Joh 3:16" */
  label: string;
  /** Text that will be inserted upon selection e.g. "!@Joh 3:16 " */
  insertText: string;
  /** Short description / category detail */
  detail: string;
  /** Bilingual wide documentation */
  documentation: {
    fi: string;
    en: string;
  };
  /** Example or preview syntax */
  example?: string;
  /** Classification for icon and styling */
  kind: SuggestionKind;
}

export const ISLA_MAIN_SNIPPETS: ISLASuggestion[] = [
  {
    label: '!@Joh 3:16 ? KR92 : KR38',
    insertText: '!@Joh 3:16 ? KR92 : KR38',
    detail: 'Ternary Compare',
    documentation: {
      fi: 'Rinnakkaisvertailu: näyttää jakeen vierekkäin kahdella eri käännöksellä.',
      en: 'Side-by-side comparative matrix: renders the scripture passage in two translations.',
    },
    example: '!@Joh 3:16 ? KR92 : KR38',
    kind: 'snippet',
  },
  {
    label: '!@Joh 3:16 => KR92',
    insertText: '!@Joh 3:16 => KR92',
    detail: 'Passage Lookup',
    documentation: {
      fi: 'Yksittäinen jaekortti valitulla käännöksellä.',
      en: 'Single scripture passage card projected into a specified translation.',
    },
    example: '!@Joh 3:16 => KR92',
    kind: 'snippet',
  },
  {
    label: '!? "armo" @ut => count',
    insertText: '!? "armo" @ut => count',
    detail: 'Count Metric',
    documentation: {
      fi: 'Laskee sanan esiintymiskertojen määrän rajatussa testamentissa tai kirjassa.',
      en: 'Counts the occurrences of a search keyword within a testament or book.',
    },
    example: '!? "armo" @ut => count',
    kind: 'snippet',
  },
  {
    label: '!? "valkeus" @Joh => limit:5',
    insertText: '!? "valkeus" @Joh => limit:5',
    detail: 'Scoped Search',
    documentation: {
      fi: 'FTS5-tekstihaku rajattuna tiettyyn kirjaan enimmäismäärällä.',
      en: 'Full-text search restricted to a specific book with a maximum result limit.',
    },
    example: '!? "valkeus" @Joh => limit:5',
    kind: 'snippet',
  },
  {
    label: '!^ => #themes',
    insertText: '!^ => #themes',
    detail: 'Themes Analysis',
    documentation: {
      fi: 'Poimii edellisten solujen raamatunteksteistä keskeiset teemat ja avainsanat.',
      en: 'Extracts prominent keyword themes from preceding notebook cells.',
    },
    example: '!^ => #themes',
    kind: 'snippet',
  },
];

/**
 * Builds translation suggestions based on actual application translations or optional active IDs.
 */
function buildTranslationSuggestions(
  filterPrefix: string,
  availableTranslationIds?: string[]
): ISLASuggestion[] {
  const prefix = filterPrefix.toLowerCase();

  return APP_TRANSLATIONS
    .filter((tr) => {
      // If caller provided a specific filter list of IDs/codes, restrict to it
      if (availableTranslationIds && availableTranslationIds.length > 0) {
        const matchesId = availableTranslationIds.some(
          (a) => a.toLowerCase() === tr.id.toLowerCase() || a.toLowerCase() === tr.code.toLowerCase()
        );
        if (!matchesId) return false;
      }

      if (!prefix) return true;

      return (
        tr.code.toLowerCase().startsWith(prefix) ||
        tr.id.toLowerCase().startsWith(prefix) ||
        tr.name.toLowerCase().startsWith(prefix)
      );
    })
    .map((tr) => ({
      label: tr.code,
      insertText: `${tr.code} `,
      detail: tr.name,
      documentation: tr.description,
      example: `!@Joh 3:16 => ${tr.code}`,
      kind: 'translation' as const,
    }));
}

/**
 * Analyzes the line text up to the cursor offset and returns contextual ISLA suggestions.
 *
 * @param lineText - The current full line being edited.
 * @param cursorOffset - Zero-based index of the cursor position within the line.
 * @param availableTranslations - Optional list of active or installed translation IDs to restrict suggestions.
 * @returns Array of matching ISLASuggestion items.
 */
export function getISLASuggestions(
  lineText: string,
  cursorOffset: number,
  availableTranslations?: string[]
): ISLASuggestion[] {
  const textBeforeCursor = lineText.slice(0, cursorOffset);
  const trimmed = textBeforeCursor.trimStart();

  // 1. Line start or empty: offer primary ISLA templates
  if (trimmed === '!' || trimmed === '' || trimmed === '!isla' || trimmed === '!ISLA') {
    return ISLA_MAIN_SNIPPETS;
  }

  // 2. Typing book reference after `@` (e.g. `@`, `@Joh`, `@1Moos`, `@VT`)
  const atMatch = textBeforeCursor.match(/@([A-Za-z0-9äöåÄÖÅ]*)$/);
  if (atMatch) {
    const prefix = atMatch[1].toLowerCase();
    return BIBLE_BOOKS
      .filter(
        (b) =>
          b.abbr.toLowerCase().startsWith(prefix) ||
          b.abbrFi.toLowerCase().startsWith(prefix) ||
          b.nameFi.toLowerCase().startsWith(prefix) ||
          b.nameEn.toLowerCase().startsWith(prefix) ||
          b.id.toLowerCase().startsWith(prefix)
      )
      .map((b) => ({
        label: `@${b.abbr}`,
        insertText: `@${b.abbr} `,
        detail: b.nameFi,
        documentation: {
          fi: `Raamatun kirja: ${b.nameFi} (${b.testament === 'OT' ? 'Vanha testamentti' : 'Uusi testamentti'})`,
          en: `Biblical book: ${b.nameEn} (${b.testament === 'OT' ? 'Old Testament' : 'New Testament'})`,
        },
        example: `@${b.abbr} 1:1`,
        kind: 'reference' as const,
      }));
  }

  // 3. Pipeline operators after `=>` (e.g. `=> count`, `=> #themes`, `=> KR92`)
  const pipeMatch = textBeforeCursor.match(/=>\s*([A-Za-z0-9_#-]*)$/);
  if (pipeMatch) {
    const prefix = pipeMatch[1].toLowerCase();

    const translationOptions = buildTranslationSuggestions(prefix, availableTranslations);

    const staticOptions: ISLASuggestion[] = [
      {
        label: 'count',
        insertText: 'count',
        detail: 'Metric Aggregator',
        documentation: {
          fi: 'Laskee tulosten kokonaismäärän tyylikkäänä mittarikorttina.',
          en: 'Aggregates total result count into a dedicated metric card.',
        },
        example: '!? "armo" @ut => count',
        kind: 'function',
      },
      {
        label: '#themes',
        insertText: '#themes',
        detail: 'Keyword Cloud',
        documentation: {
          fi: 'Poimii keskeiset teemat ja näyttää ne avainsanapilvenä.',
          en: 'Extracts prominent themes as interactive badges.',
        },
        example: '!^ => #themes',
        kind: 'function',
      },
      {
        label: 'limit:5',
        insertText: 'limit:5',
        detail: 'Result Limit',
        documentation: {
          fi: 'Rajoittaa näytettävien jakeiden määrän viiteen.',
          en: 'Limits the number of rendered verses to 5.',
        },
        example: '!? "valo" @Joh => limit:5',
        kind: 'keyword',
      },
      {
        label: 'limit:10',
        insertText: 'limit:10',
        detail: 'Result Limit',
        documentation: {
          fi: 'Rajoittaa näytettävien jakeiden määrän kymmeneen.',
          en: 'Limits the number of rendered verses to 10.',
        },
        example: '!? "valo" @Joh => limit:10',
        kind: 'keyword',
      },
    ];

    const filteredStatic = staticOptions.filter((opt) =>
      opt.label.toLowerCase().startsWith(prefix)
    );

    return [...filteredStatic, ...translationOptions];
  }

  // 4. Comparative translation after `?` or `:` (e.g. `!@Joh 3:16 ? KR92 : KJV`)
  const compareMatch = textBeforeCursor.match(/[?:]\s*([A-Za-z0-9_-]*)$/);
  if (compareMatch) {
    const prefix = compareMatch[1];
    return buildTranslationSuggestions(prefix, availableTranslations);
  }

  return [];
}