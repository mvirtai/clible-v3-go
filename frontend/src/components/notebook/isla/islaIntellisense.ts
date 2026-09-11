import {
  BIBLE_BOOKS,
  APP_TRANSLATIONS,
  SMART_BOOK_GROUPS,
  COMMAND_REGISTRY,
  getCommandMeta,
} from '@/components/notebook/isla/islaUtils';

export type SuggestionKind =
  | 'snippet'
  | 'reference'
  | 'operator'
  | 'translation'
  | 'function'
  | 'keyword';

export interface ISLASuggestion {
  /** Main title e.g. "! @Joh 3:16 => in(KR92)" */
  label: string;
  /** Text that will be inserted upon selection e.g. "! @Joh 3:16 => in(KR92) " */
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
  /** Explicit caret offset inside insertText after insertion */
  cursorOffset?: number;
}

/**
 * Resolves the optimal cursor position inside an inserted text.
 * Prioritizes empty quotes `""` or `''`, then empty parentheses `()`,
 * regex slashes `//`, and first quote `"` for prefilled query templates.
 */
export function resolveDefaultCursorOffset(insertText: string): number {
  // 1. Empty double quotes: `search("")` or `?("")` -> inside quotes
  const emptyDoubleQuoteIdx = insertText.indexOf('""');
  if (emptyDoubleQuoteIdx !== -1) {
    return emptyDoubleQuoteIdx + 1;
  }

  // 2. Empty single quotes: `search('')` -> inside quotes
  const emptySingleQuoteIdx = insertText.indexOf("''");
  if (emptySingleQuoteIdx !== -1) {
    return emptySingleQuoteIdx + 1;
  }

  // 3. Regex slashes: `? //` -> inside slashes
  const regexSlashIdx = insertText.indexOf('//');
  if (regexSlashIdx !== -1) {
    return regexSlashIdx + 1;
  }

  // 4. Empty parentheses: `at()` or `@()` or `count()` -> inside parentheses
  const emptyParenIdx = insertText.indexOf('()');
  if (emptyParenIdx !== -1) {
    return emptyParenIdx + 1;
  }

  // 5. Open paren at end: `search(` or `?(` or `at(` -> inside
  if (insertText.endsWith('(')) {
    return insertText.length;
  }

  // 6. Prefilled search query or reference quotes: e.g. `! ?("armo")` or `! search("armo")`
  // Place cursor right inside the opening quote so user can immediately type or replace
  const firstQuoteIdx = insertText.indexOf('"');
  if (firstQuoteIdx !== -1) {
    return firstQuoteIdx + 1;
  }

  // 7. Fallback to end of inserted text
  return insertText.length;
}

export const ISLA_MAIN_SNIPPETS: ISLASuggestion[] = [
  // 1. Full-text search with ? operator (preferred & fast)
  {
    label: '! ?("armo") => at(UT)',
    insertText: '! ?("armo") => at(UT)',
    cursorOffset: 5,
    detail: 'Full-text Search (?)',
    documentation: {
      fi: 'FTS-tekstihaku ?-operaattorilla rajattuna Uuteen testamenttiin. ?() on nopea ja looginen hakuoperaattori.',
      en: 'Full-text search using ? operator restricted to the New Testament.',
    },
    example: '! ?("armo") => at(UT)',
    kind: 'snippet',
  },
  // 2. Full-text search with search() function (parallel syntax)
  {
    label: '! search("armo") => at(evankeliumit) => count()',
    insertText: '! search("armo") => at(evankeliumit) => count()',
    cursorOffset: 10,
    detail: 'Full-text Search (search)',
    documentation: {
      fi: 'FTS-tekstihaku search()-funktiolla rajattuna evankeliumeihin ja laskettuna tulosmäärä.',
      en: 'Full-text search using search() function restricted to Gospels with count metric.',
    },
    example: '! search("armo") => at(evankeliumit) => count()',
    kind: 'snippet',
  },
  // 3. Passage Lookup with @() operator
  {
    label: '! @(Joh 3:16) => use(KR92)',
    insertText: '! @(Joh 3:16) => use(KR92)',
    cursorOffset: 5,
    detail: 'Passage Lookup (@)',
    documentation: {
      fi: 'Yksittäinen jaekortti valitulla käännöksellä @()-operaattorilla.',
      en: 'Single scripture passage card projected into a specified translation using @().',
    },
    example: '! @(Joh 3:16) => use(KR92)',
    kind: 'snippet',
  },
  // 4. Passage Lookup with at() function (parallel syntax)
  {
    label: '! at(Joh 3:16) => vs(KR92, KR38)',
    insertText: '! at(Joh 3:16) => vs(KR92, KR38)',
    cursorOffset: 5,
    detail: 'Parallel Comparison (at)',
    documentation: {
      fi: 'Rinnakkaisvertailu kahdella käännöksellä at()-funktiolla (rinnakkain @-operaattorin kanssa).',
      en: 'Side-by-side comparative matrix in two translations using at() function.',
    },
    example: '! at(Joh 3:16) => vs(KR92, KR38)',
    kind: 'snippet',
  },
  // 5. Store ? search result to variable
  {
    label: '! ?("armo").at(UT) => #armo',
    insertText: '! ?("armo").at(UT) => #armo',
    cursorOffset: 5,
    detail: 'Store Search to Variable (?)',
    documentation: {
      fi: 'Tallentaa ?-haun tuloksen nimettyyn muuttujaan (#armo) myöhempää analyysiä varten.',
      en: 'Stores ? search result in a named variable (#variable) for subsequent analysis.',
    },
    example: '! ?("armo").at(UT) => #armo',
    kind: 'snippet',
  },
  // 6. Store search() result to variable
  {
    label: '! search("armo").at(UT) => #armo',
    insertText: '! search("armo").at(UT) => #armo',
    cursorOffset: 10,
    detail: 'Store Search to Variable (search)',
    documentation: {
      fi: 'Tallentaa search()-haun tuloksen nimettyyn muuttujaan (#armo) myöhempää analyysiä varten.',
      en: 'Stores search() result in a named variable (#variable) for subsequent analysis.',
    },
    example: '! search("armo").at(UT) => #armo',
    kind: 'snippet',
  },
  // 7. Passage cross-references with at()
  {
    label: '! at(Joh 3:16) => refs(3)',
    insertText: '! at(Joh 3:16) => refs(3)',
    cursorOffset: 5,
    detail: 'Cross References',
    documentation: {
      fi: 'Ristiinviitehaku: etsii jakeen avainsanojen perusteella rinnakkaiset raamatunjakeet.',
      en: 'Cross-reference lookup: discovers parallel scriptures and thematic cross-references.',
    },
    example: '! at(Joh 3:16) => refs(3)',
    kind: 'snippet',
  },
  // 8. Context suggestions from preceding notebook cells
  {
    label: '! ^ => suggest(3)',
    insertText: '! ^ => suggest(3)',
    cursorOffset: 15,
    detail: 'Context Suggestions',
    documentation: {
      fi: 'Älykäs jakesuositus: ehdottaa muistiinpanon kontekstiin sopivia jakeita.',
      en: 'Smart verse suggestions matching the contextual themes of your notebook.',
    },
    example: '! ^ => suggest(3)',
    kind: 'snippet',
  },
  // 9. Regex query with ? operator
  {
    label: '!? /righteous.*/ @Rom => limit(5)',
    insertText: '!? /righteous.*/ @Rom => limit(5)',
    cursorOffset: 5,
    detail: 'Regex Query (?)',
    documentation: {
      fi: 'Säännöllisen lausekkeen (Regex) haku rajattuna kirjaan ?-operaattorilla.',
      en: 'Regular expression pattern search restricted to a book using ? operator.',
    },
    example: '!? /righteous.*/ @Rom => limit(5)',
    kind: 'snippet',
  },
  // 10. Boolean AND search
  {
    label: '! search("armo" AND "rauha") => at(evankeliumit) => count()',
    insertText: '! search("armo" AND "rauha") => at(evankeliumit) => count()',
    cursorOffset: 10,
    detail: 'Boolean AND Search',
    documentation: {
      fi: 'Boolean AND -haku: löytää jakeet, joissa molemmat sanat esiintyvät.',
      en: 'Boolean AND search: finds verses containing both terms simultaneously.',
    },
    example: '! search("armo" AND "usko") => at(UT) => count()',
    kind: 'snippet',
  },
  // 11. Boolean OR search
  {
    label: '! search("kuolema" OR "elämä") => at(Joh)',
    insertText: '! search("kuolema" OR "elämä") => at(Joh)',
    cursorOffset: 10,
    detail: 'Boolean OR Search',
    documentation: {
      fi: 'Boolean OR -haku: löytää jakeet, joissa vähintään yksi termeistä esiintyy.',
      en: 'Boolean OR search: finds verses containing at least one of the given terms.',
    },
    example: '! search("valo" OR "pimeys") => at(Joh) => limit(5)',
    kind: 'snippet',
  },
  // 12. Scoped search with limit
  {
    label: '! search("valkeus") => at(Joh) => limit(5)',
    insertText: '! search("valkeus") => at(Joh) => limit(5)',
    cursorOffset: 10,
    detail: 'Scoped Search',
    documentation: {
      fi: 'Tekstihaku rajattuna tiettyyn kirjaan enimmäismäärällä.',
      en: 'Full-text search restricted to a specific book with a maximum result limit.',
    },
    example: '! search("valkeus") => at(Joh) => limit(5)',
    kind: 'snippet',
  },
  // 13. Variable word count
  {
    label: '! #muuttuja.count(words)',
    insertText: '! #muuttuja.count(words)',
    cursorOffset: 3,
    detail: 'Variable Word Count',
    documentation: {
      fi: 'Laskee aiemmin tallennetun muuttujan (#muuttuja) sanamäärän.',
      en: 'Counts the number of words in a previously stored variable result (#variable).',
    },
    example: '! #muuttuja.count(words)',
    kind: 'snippet',
  },
  // 14. Variable top words
  {
    label: '! #muuttuja.top(10)',
    insertText: '! #muuttuja.top(10)',
    cursorOffset: 3,
    detail: 'Variable Top Words',
    documentation: {
      fi: 'Listaa aiemmin tallennetun muuttujan (#muuttuja) yleisimmät sanat.',
      en: 'Lists top frequent words from a previously stored variable result (#variable).',
    },
    example: '! #muuttuja.top(10)',
    kind: 'snippet',
  },
  // 15. Passage range with top words
  {
    label: '! range(Joh 1:1, Joh 1:18) => top(10)',
    insertText: '! range(Joh 1:1, Joh 1:18) => top(10)',
    cursorOffset: 9,
    detail: 'Top Word Frequencies',
    documentation: {
      fi: 'Yleisimmät sanat: laskee ja visualisoi tekstin useimmin esiintyvät sanat vaakapalkeilla.',
      en: 'Top word frequencies: calculates and visualizes most frequent words as a bar chart.',
    },
    example: '! range(Joh 1:1, Joh 1:18) => top(10)',
    kind: 'snippet',
  },
  // 16. Passage range with themes
  {
    label: '! range(Joh 1:1, Joh 3:36) => themes(5)',
    insertText: '! range(Joh 1:1, Joh 3:36) => themes(5)',
    cursorOffset: 9,
    detail: 'Passage Range + Themes',
    documentation: {
      fi: 'Tekstijakso: hakee kaikki jakeet alusta loppuun ja poimii niiden tärkeimmät teemat.',
      en: 'Passage range: fetches all verses from start to end reference and extracts key themes.',
    },
    example: '! range(Gen 1:1, Gen 2:3) => count()',
    kind: 'snippet',
  },
  // 17. Book-level range with '..' operator
  {
    label: '! range(GEN .. DEU) => count()',
    insertText: '! range(GEN .. DEU) => count()',
    cursorOffset: 9,
    detail: 'Book-level Range',
    documentation: {
      fi: 'Kirjatason tekstijakso: hakee kaikki jakeet Genesiksen alusta Deuteronomiumin loppuun ..-operaattorilla.',
      en: 'Book-level range: fetches all verses from Genesis through Deuteronomy using .. operator.',
    },
    example: '! range(MAT .. JHN) => count()',
    kind: 'snippet',
  },
  // 18. Multi-book range shorthand with book count
  {
    label: '! (MAT .. JOH).count(books) =>',
    insertText: '! (MAT .. JOH).count(books) => ',
    cursorOffset: 3,
    detail: 'Multi-book Span & Count',
    documentation: {
      fi: 'Monikirjaväli (MAT .. JOH) ..-operaattorilla ja kirjojen määrän laskennalla.',
      en: 'Multi-book span (MAT .. JOH) using .. operator chained with book count.',
    },
    example: '! (MAT .. JOH).count(books) =>',
    kind: 'snippet',
  },
  // 18. Text statistics & TTR
  {
    label: '! @Room 8:1-39 => stats()',
    insertText: '! @Room 8:1-39 => stats()',
    cursorOffset: 3,
    detail: 'Text Statistics & TTR',
    documentation: {
      fi: 'Tekstitilastot ja sanaston rikkaus (Type-Token Ratio TTR, uniikit sanat ja keskipituus).',
      en: 'Text statistics and lexical diversity (Type-Token Ratio TTR, unique words and average length).',
    },
    example: '! @Room 8:1-39 => stats()',
    kind: 'snippet',
  },
  // 19. Context themes
  {
    label: '! ^ => themes(5)',
    insertText: '! ^ => themes(5)',
    cursorOffset: 14,
    detail: 'Notebook Themes',
    documentation: {
      fi: 'Poimii edellisten solujen raamatunteksteistä keskeiset teemat ja avainsanat.',
      en: 'Extracts prominent keyword themes from preceding notebook cells.',
    },
    example: '! ^ => themes(5)',
    kind: 'snippet',
  },
  // 20. Context word count
  {
    label: '! ^ => count(words)',
    insertText: '! ^ => count(words)',
    cursorOffset: 13,
    detail: 'Context Word Count',
    documentation: {
      fi: 'Muistiinpanon sanalaskenta: laskee edellisten solujen sanamäärän.',
      en: 'Note context word count: counts words from preceding notebook cells.',
    },
    example: '! ^ => count(words)',
    kind: 'snippet',
  },
  // 21. Quick count prefix
  {
    label: '!# "armo"',
    insertText: '!# "armo"',
    cursorOffset: 4,
    detail: 'Quick Count Prefix',
    documentation: {
      fi: 'Pikalaskuri (#): laskee hakutulokset tai jakeet välittömästi ilman putkikomentoa.',
      en: 'Quick count prefix (#): immediately counts search results or verses without pipeline suffix.',
    },
    example: '!# "armo" @Joh',
    kind: 'snippet',
  },
];

export const ISLA_METHOD_SUGGESTIONS: ISLASuggestion[] = [
  {
    label: 'use(...)',
    insertText: 'use(',
    detail: 'Valitse käännös / Use translation',
    documentation: {
      fi: 'Asettaa käytettävän raamatunkäännöksen (esim. KR92, KR38, KJV, WEB).',
      en: 'Specifies the Bible translation to use for text rendering (e.g. KR92, KR38, KJV, WEB).',
    },
    example: '@(Joh 3:16).use(KR92)',
    kind: 'function',
  },
  {
    label: 'vs(...)',
    insertText: 'vs(',
    detail: 'Rinnakkaisvertailu / Parallel comparison',
    documentation: {
      fi: 'Rinnakkaisvertailu kahden eri käännöksen välillä rinnakkaisnäkymässä.',
      en: 'Side-by-side parallel comparison between two translations.',
    },
    example: '@(Joh 3:16).vs(KR92, KR38)',
    kind: 'function',
  },
  {
    label: 'at(...)',
    insertText: 'at(',
    detail: 'Rajaus / Target scope',
    documentation: {
      fi: 'Rajaa haun tiettyyn kirjaan tai kirjaryhmään (esim. at(kirjeet), at(evankeliumit), at(Joh)).',
      en: 'Restricts search scope to a specific book or book group (e.g. at(kirjeet), at(evankeliumit), at(Joh)).',
    },
    example: 'search("armo").at(kirjeet)',
    kind: 'function',
  },
  {
    label: 'count(...)',
    insertText: 'count(',
    detail: 'Laskuri / Count metric',
    documentation: {
      fi: 'Laskee jakeet, luvut, kirjat tai sanat (esim. count(verses), count(words)).',
      en: 'Counts verses, chapters, books, or words (e.g. count(verses), count(words)).',
    },
    example: 'search("armo").count(verses)',
    kind: 'function',
  },
  {
    label: 'top(...)',
    insertText: 'top(',
    detail: 'Yleisimmät sanat / Top word frequencies',
    documentation: {
      fi: 'Laskee ja visualisoi useimmin esiintyvät sanat vaakapylväillä.',
      en: 'Calculates and visualizes most frequent words as a horizontal bar chart.',
    },
    example: '@(Joh 1:1-18).top(10)',
    kind: 'function',
  },
  {
    label: 'stats()',
    insertText: 'stats()',
    detail: 'Tekstitilastot / Text statistics & TTR',
    documentation: {
      fi: 'Laskee sanaston rikkauden (Type-Token Ratio TTR), uniikit sanat ja keskipituuden.',
      en: 'Calculates lexical diversity (Type-Token Ratio TTR), unique word counts, and average length.',
    },
    example: '@(Room 8:1-39).stats()',
    kind: 'function',
  },
  {
    label: 'themes(...)',
    insertText: 'themes(',
    detail: 'Teemat / Extracted themes',
    documentation: {
      fi: 'Poimii jakeesta tai kontekstista keskeiset teemat ja avainsanat.',
      en: 'Extracts prominent thematic keywords and topics.',
    },
    example: '@(Joh 3:16).themes(5)',
    kind: 'function',
  },
  {
    label: 'refs(...)',
    insertText: 'refs(',
    detail: 'Ristiinviitteet / Cross references',
    documentation: {
      fi: 'Etsii ristiinviitteet ja rinnakkaiset raamatunjakeet.',
      en: 'Finds cross-references and parallel biblical passages.',
    },
    example: '@(Joh 3:16).refs(3)',
    kind: 'function',
  },
  {
    label: 'suggest(...)',
    insertText: 'suggest(',
    detail: 'Jakesuositukset / Verse suggestions',
    documentation: {
      fi: 'Ehdottaa kontekstiin tai jakeeseen sopivia jakeita.',
      en: 'Recommends contextually relevant scripture verses.',
    },
    example: '^.suggest(3)',
    kind: 'function',
  },
  {
    label: 'limit(...)',
    insertText: 'limit(',
    detail: 'Rajoitus / Limit result count',
    documentation: {
      fi: 'Rajoittaa hakutulosten enimmäismäärää.',
      en: 'Limits the maximum number of search results.',
    },
    example: 'search("valo").limit(5)',
    kind: 'function',
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
      example: `! @Joh 3:16 => in(${tr.code})`,
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

  // 1. Primary command position & line-start triggers (before method '.' or pipeline '=>')
  const isTypingScopeOrArg = /["']|@[A-Za-z0-9äöåÄÖÅ]/.test(textBeforeCursor);
  const isBeforeChainOrPipe = !textBeforeCursor.includes('.') && !textBeforeCursor.includes('=>') && !isTypingScopeOrArg;
  if (isBeforeChainOrPipe) {
    if (
      trimmed === '!' ||
      trimmed === '! ' ||
      trimmed === '' ||
      trimmed === '!isla' ||
      trimmed === '!ISLA'
    ) {
      return ISLA_MAIN_SNIPPETS;
    }

    const hasBang = trimmed.startsWith('!');
    const cleanPrefix = (hasBang ? trimmed.slice(1) : trimmed).trimStart().toLowerCase();

    // Primary function builders
    const buildPrimaryFunctions = (): ISLASuggestion[] => {
      const p = hasBang ? '! ' : '';
      const bOffset = hasBang ? 2 : 0;
      return [
        {
          label: '?("...")',
          insertText: `${p}?("")`,
          cursorOffset: bOffset + 3,
          detail: 'FTS-haku (?) / Search (?)',
          documentation: {
            fi: 'Nopea kysely- ja FTS-tekstihakuoperaattori (?). Kohdistin asettuu lainausmerkkien sisään.',
            en: 'Fast query & full-text search operator (?). Caret is placed inside quotes.',
          },
          example: `${p}?("armo")`,
          kind: 'function',
        },
        {
          label: 'search("...")',
          insertText: `${p}search("")`,
          cursorOffset: bOffset + 8,
          detail: 'FTS-haku (search) / Search',
          documentation: {
            fi: 'FTS-tekstihaku search()-komennolla. Kohdistin asettuu lainausmerkkien sisään.',
            en: 'Full-text search using search() command. Caret is placed inside quotes.',
          },
          example: `${p}search("armo")`,
          kind: 'function',
        },
        {
          label: '!? /pattern/',
          insertText: `${p}? //`,
          cursorOffset: bOffset + 4,
          detail: 'Regex-kysely / Pattern query',
          documentation: {
            fi: 'Säännöllisen lausekkeen (Regex) tekstihaku raamatunteksteistä.',
            en: 'Regular expression pattern search across scripture text.',
          },
          example: `${p}? /righteous.*/`,
          kind: 'function',
        },
        {
          label: '@(...)',
          insertText: `${p}@()`,
          cursorOffset: bOffset + 2,
          detail: 'Jaeviittaus / Verse lookup (@)',
          documentation: {
            fi: 'Jaeviittaus @()-operaattorilla (rinnakkain at()-funktion kanssa).',
            en: 'Verse reference using @() operator (parallel with at() function).',
          },
          example: `${p}@(Joh 3:16)`,
          kind: 'function',
        },
        {
          label: 'at(...)',
          insertText: `${p}at()`,
          cursorOffset: bOffset + 3,
          detail: 'Jaeviittaus / Verse lookup (at)',
          documentation: {
            fi: 'Jaeviittaus at()-funktiolla (rinnakkain @()-operaattorin kanssa).',
            en: 'Verse reference using at() function (parallel with @() operator).',
          },
          example: `${p}at(Joh 3:16)`,
          kind: 'function',
        },
        {
          label: 'range(...)',
          insertText: `${p}range()`,
          cursorOffset: bOffset + 6,
          detail: 'Tekstijakso / Passage range',
          documentation: {
            fi: 'Hakee yhtenäisen tekstijakson alku- ja loppuviitteen väliltä (.. operaattorilla).',
            en: 'Fetches a contiguous passage between start and end references (using .. operator).',
          },
          example: `${p}range(Joh 1:1 .. Joh 1:18)`,
          kind: 'function',
        },
      ];
    };

    const primaryFunctions = buildPrimaryFunctions();

    // 1.1 Question mark trigger '?' or '!?' -> Prioritize ? and search FTS
    if (cleanPrefix.startsWith('?')) {
      const qFuncs = primaryFunctions.filter((f) => f.label.startsWith('?') || f.label.startsWith('!?') || f.label.startsWith('search'));
      const qSnippets = ISLA_MAIN_SNIPPETS.filter((s) => s.label.includes('?') || s.label.includes('search('));
      return [...qFuncs, ...qSnippets];
    }

    // 1.2 Search query typing: 's', 'se', 'sea', 'search'
    if (cleanPrefix.startsWith('s')) {
      const sFuncs = primaryFunctions.filter((f) => f.label.startsWith('search') || f.label.startsWith('?'));
      const sSnippets = ISLA_MAIN_SNIPPETS.filter(
        (s) => s.label.toLowerCase().includes('search') || s.label.includes('?') || s.label.toLowerCase().includes('stats') || s.label.toLowerCase().includes('suggest')
      );
      return [...sFuncs, ...sSnippets];
    }

    // 1.3 Verse references: 'at' or 'a' -> at() and @()
    if (cleanPrefix === 'a' || cleanPrefix.startsWith('at')) {
      const atFuncs = primaryFunctions.filter((f) => f.label.startsWith('at') || f.label.startsWith('@'));
      const atSnippets = ISLA_MAIN_SNIPPETS.filter((s) => s.label.includes('at(') || s.label.includes('@('));
      return [...atFuncs, ...atSnippets];
    }

    // 1.4 Passage range: 'r' or 'range'
    if (cleanPrefix === 'r' || cleanPrefix.startsWith('range')) {
      const rFuncs = primaryFunctions.filter((f) => f.label.startsWith('range'));
      const rSnippets = ISLA_MAIN_SNIPPETS.filter((s) => s.label.includes('range('));
      return [...rFuncs, ...rSnippets];
    }

    // 1.6 Context triggers: '^' or '!^'
    if (cleanPrefix.startsWith('^')) {
      return ISLA_MAIN_SNIPPETS.filter((s) => s.label.includes('^'));
    }

    // 1.7 Variable triggers: '#' or '!#'
    if (cleanPrefix.startsWith('#')) {
      return ISLA_MAIN_SNIPPETS.filter((s) => s.label.includes('#'));
    }

    // 1.8 Cross-references trigger '~' or '!~'
    if (cleanPrefix.startsWith('~')) {
      return ISLA_MAIN_SNIPPETS.filter((s) => s.label.includes('refs'));
    }
  }

  // 2. Method call chaining after '.' (e.g. '@(Joh 3:16).', 'search("armo").', '^.')
  const dotMatch = textBeforeCursor.match(/\.\s*([a-zA-Z0-9_]*)$/);
  if (dotMatch) {
    const prefix = dotMatch[1].toLowerCase();
    const textBeforeDot = textBeforeCursor.slice(0, dotMatch.index);
    const isSearch = /(?:search|\?)\s*\(/i.test(textBeforeDot);
    const isCellCtx = /\^\s*$/.test(textBeforeDot);
    const isVerseRef = /@/.test(textBeforeDot) || /range\s*\(/i.test(textBeforeDot) || /\.\./.test(textBeforeDot);

    let methods = ISLA_METHOD_SUGGESTIONS;
    if (isCellCtx) {
      methods = methods.filter(
        (m) => !['use(', 'vs(', 'refs(', 'at(', 'limit('].includes(m.insertText)
      );
    } else if (isSearch) {
      methods = methods.filter((m) => !['vs(', 'refs('].includes(m.insertText));
    } else if (isVerseRef) {
      methods = methods.filter((m) => !['at(', 'limit('].includes(m.insertText));
    }

    return methods.filter(
      (m) =>
        !prefix ||
        m.label.toLowerCase().startsWith(prefix) ||
        m.insertText.toLowerCase().startsWith(prefix)
    );
  }

  // 3. Count unit suggestions when typing inside count(...)
  const countParenMatch = textBeforeCursor.match(/count\(\s*["']?([A-Za-z0-9äöåÄÖÅ_]*)$/i);
  if (countParenMatch) {
    const prefix = countParenMatch[1].toLowerCase();
    const countUnits: ISLASuggestion[] = [
      {
        label: 'verses',
        insertText: 'verses)',
        detail: 'Jakeet / Verses (oletus)',
        documentation: {
          fi: 'Laskee jakeiden kokonaismäärän tulosjoukossa.',
          en: 'Calculates the total number of verses in the result set.',
        },
        example: '! search("armo") => count(verses)',
        kind: 'function' as const,
      },
      {
        label: 'chapters',
        insertText: 'chapters)',
        detail: 'Luvut / Chapters',
        documentation: {
          fi: 'Laskee uniikkien lukujen määrän tulosjoukossa.',
          en: 'Calculates the number of unique chapters in the result set.',
        },
        example: '! search("armo") => count(chapters)',
        kind: 'function' as const,
      },
      {
        label: 'books',
        insertText: 'books)',
        detail: 'Kirjat / Books',
        documentation: {
          fi: 'Laskee uniikkien kirjojen määrän tulosjoukossa.',
          en: 'Calculates the number of unique books in the result set.',
        },
        example: '! search("armo") => count(books)',
        kind: 'function' as const,
      },
      {
        label: 'words',
        insertText: 'words)',
        detail: 'Sanat / Words',
        documentation: {
          fi: 'Laskee sanojen kokonaismäärän tulosjoukon jakeissa.',
          en: 'Calculates the total number of words across all result verses.',
        },
        example: '! search("armo") => count(words)',
        kind: 'function' as const,
      },
      {
        label: 'sanat',
        insertText: 'sanat)',
        detail: 'Sanat (fi)',
        documentation: {
          fi: 'Laskee sanojen kokonaismäärän tulosjoukon jakeissa.',
          en: 'Calculates total word count across result verses.',
        },
        example: '! search("armo") => count(sanat)',
        kind: 'function' as const,
      },
      {
        label: 'kirjat',
        insertText: 'kirjat)',
        detail: 'Kirjat (fi)',
        documentation: {
          fi: 'Laskee uniikkien kirjojen määrän tulosjoukossa.',
          en: 'Calculates unique book count.',
        },
        example: '! search("armo") => count(kirjat)',
        kind: 'function' as const,
      },
      {
        label: 'luvut',
        insertText: 'luvut)',
        detail: 'Luvut (fi)',
        documentation: {
          fi: 'Laskee uniikkien lukujen määrän tulosjoukossa.',
          en: 'Calculates unique chapter count.',
        },
        example: '! search("armo") => count(luvut)',
        kind: 'function' as const,
      },
      {
        label: 'jakeet',
        insertText: 'jakeet)',
        detail: 'Jakeet (fi)',
        documentation: {
          fi: 'Laskee jakeiden määrän tulosjoukossa.',
          en: 'Calculates verse count.',
        },
        example: '! search("armo") => count(jakeet)',
        kind: 'function' as const,
      },
      {
        label: 'unique_words',
        insertText: 'unique_words)',
        detail: 'Uniikit sanat / Unique Words',
        documentation: {
          fi: 'Laskee eri (uniikkien) sanojen määrän tulosjoukossa.',
          en: 'Calculates the number of unique distinct words in the result set.',
        },
        example: '! search("armo") => count(unique_words)',
        kind: 'function' as const,
      },
      {
        label: 'uw',
        insertText: 'uw)',
        detail: 'Uniikit sanat (alias: uw)',
        documentation: {
          fi: 'Alias yksikölle unique_words (uniikit sanat).',
          en: 'Alias for unique_words.',
        },
        example: '! search("armo") => count(uw)',
        kind: 'function' as const,
      },
      {
        label: 'uniques',
        insertText: 'uniques)',
        detail: 'Uniikit sanat (alias: uniques)',
        documentation: {
          fi: 'Alias yksikölle unique_words (uniikit sanat).',
          en: 'Alias for unique_words.',
        },
        example: '! search("armo") => count(uniques)',
        kind: 'function' as const,
      },
      {
        label: 'uniq',
        insertText: 'uniq)',
        detail: 'Uniikit sanat (alias: uniq)',
        documentation: {
          fi: 'Alias yksikölle unique_words (uniikit sanat).',
          en: 'Alias for unique_words.',
        },
        example: '! search("armo") => count(uniq)',
        kind: 'function' as const,
      },
      {
        label: 'uniikit',
        insertText: 'uniikit)',
        detail: 'Uniikit sanat (fi: uniikit)',
        documentation: {
          fi: 'Laskee eri (uniikkien) sanojen määrän tulosjoukossa.',
          en: 'Calculates unique distinct words in the result set.',
        },
        example: '! search("armo") => count(uniikit)',
        kind: 'function' as const,
      },
      {
        label: 'uniikit_sanat',
        insertText: 'uniikit_sanat)',
        detail: 'Uniikit sanat (fi: uniikit_sanat)',
        documentation: {
          fi: 'Laskee eri (uniikkien) sanojen määrän tulosjoukossa.',
          en: 'Calculates unique distinct words in the result set.',
        },
        example: '! search("armo") => count(uniikit_sanat)',
        kind: 'function' as const,
      },
      {
        label: 'us',
        insertText: 'us)',
        detail: 'Uniikit sanat (alias: us)',
        documentation: {
          fi: 'Alias yksikölle unique_words (uniikit sanat).',
          en: 'Alias for unique_words.',
        },
        example: '! search("armo") => count(us)',
        kind: 'function' as const,
      },
    ];

    return countUnits.filter((u) => !prefix || u.label.toLowerCase().startsWith(prefix));
  }

  // 4. Scope and book suggestions inside at(...)
  const atParenMatch = textBeforeCursor.match(/at\(\s*@?([A-Za-z0-9äöåÄÖÅ_]*)$/i);
  if (atParenMatch) {
    const prefix = atParenMatch[1].toLowerCase();
    const groupOptions: ISLASuggestion[] = SMART_BOOK_GROUPS
      .filter(
        (g) =>
          g.id.toLowerCase().startsWith(prefix) ||
          g.nameFi.toLowerCase().startsWith(prefix) ||
          g.nameEn.toLowerCase().startsWith(prefix)
      )
      .map((g) => ({
        label: g.id,
        insertText: `${g.id})`,
        detail: `${g.nameFi} (${g.nameEn})`,
        documentation: {
          fi: `Älykäs kirjakokonaisuus: ${g.nameFi}. Rajaa haun automaattisesti tähän kirjaryhmään.`,
          en: `Smart book group: ${g.nameEn}. Restricts search scope to this group.`,
        },
        example: `search("armo").at(${g.id})`,
        kind: 'reference' as const,
      }));

    const bookOptions: ISLASuggestion[] = BIBLE_BOOKS
      .filter(
        (b) =>
          b.abbr.toLowerCase().startsWith(prefix) ||
          b.abbrFi.toLowerCase().startsWith(prefix) ||
          b.nameFi.toLowerCase().startsWith(prefix) ||
          b.nameEn.toLowerCase().startsWith(prefix) ||
          b.id.toLowerCase().startsWith(prefix)
      )
      .map((b) => ({
        label: b.abbr,
        insertText: `${b.abbr})`,
        detail: b.nameFi,
        documentation: {
          fi: `Raamatun kirja: ${b.nameFi} (${b.testament === 'OT' ? 'Vanha testamentti' : 'Uusi testamentti'})`,
          en: `Biblical book: ${b.nameEn} (${b.testament === 'OT' ? 'Old Testament' : 'New Testament'})`,
        },
        example: `search("valo").at(${b.abbr})`,
        kind: 'reference' as const,
      }));

    return [...groupOptions, ...bookOptions];
  }

  // 5. Translation suggestions inside use(...), in(...), vs(...)
  const trCallMatch = textBeforeCursor.match(/(?:use|in|vs)\(\s*([^)]*)$/i);
  if (trCallMatch) {
    const inside = trCallMatch[1];
    const commaMatch = inside.match(/,\s*["']?([A-Za-z0-9_-]*)$/);
    if (commaMatch) {
      return buildTranslationSuggestions(commaMatch[1], availableTranslations);
    }
    const singleMatch = inside.match(/^["']?([A-Za-z0-9_-]*)$/);
    if (singleMatch) {
      return buildTranslationSuggestions(singleMatch[1], availableTranslations);
    }
  }

  // 6. Typing book reference or smart group inside `@(...)` or after classical `@`
  const atCitationParenMatch = textBeforeCursor.match(/@\(\s*([A-Za-z0-9äöåÄÖÅ]*)$/);
  const atClassicalMatch = !atCitationParenMatch ? textBeforeCursor.match(/@([A-Za-z0-9äöåÄÖÅ]*)$/) : null;
  const atMatch = atCitationParenMatch || atClassicalMatch;
  if (atMatch) {
    const isParen = Boolean(atCitationParenMatch);
    const prefix = atMatch[1].toLowerCase();

    // 6.1 Smart book groups (@evankeliumit, @gospels, @toora, @kirjeet, @epistolat jne.)
    const groupOptions: ISLASuggestion[] = SMART_BOOK_GROUPS
      .filter(
        (g) =>
          g.id.toLowerCase().startsWith(prefix) ||
          g.nameFi.toLowerCase().startsWith(prefix) ||
          g.nameEn.toLowerCase().startsWith(prefix) ||
          g.aliasEn.toLowerCase().startsWith(prefix) ||
          ((g as { aliasFi?: string }).aliasFi && (g as { aliasFi?: string }).aliasFi!.toLowerCase().startsWith(prefix))
      )
      .map((g) => ({
        label: isParen ? g.id : `@${g.id}`,
        insertText: isParen ? g.id : `@${g.id} `,
        detail: `${g.nameFi} (${g.nameEn})`,
        documentation: {
          fi: `Älykäs kirjakokonaisuus: ${g.nameFi}. Rajaa haun automaattisesti tähän kirjaryhmään.`,
          en: `Smart book group: ${g.nameEn}. Restricts the search scope to these biblical books.`,
        },
        example: isParen ? `! @(${g.id}) => count()` : `! search("armo") => @${g.id} => count()`,
        kind: 'reference' as const,
      }));

    // 6.2 Individual biblical books
    const bookOptions: ISLASuggestion[] = BIBLE_BOOKS
      .filter(
        (b) =>
          b.abbr.toLowerCase().startsWith(prefix) ||
          b.abbrFi.toLowerCase().startsWith(prefix) ||
          b.nameFi.toLowerCase().startsWith(prefix) ||
          b.nameEn.toLowerCase().startsWith(prefix) ||
          b.id.toLowerCase().startsWith(prefix)
      )
      .map((b) => ({
        label: isParen ? b.abbr : `@${b.abbr}`,
        insertText: isParen ? b.abbr : `@${b.abbr} `,
        detail: b.nameFi,
        documentation: {
          fi: `Raamatun kirja: ${b.nameFi} (${b.testament === 'OT' ? 'Vanha testamentti' : 'Uusi testamentti'})`,
          en: `Biblical book: ${b.nameEn} (${b.testament === 'OT' ? 'Old Testament' : 'New Testament'})`,
        },
        example: isParen ? `@(${b.abbr} 1:1)` : `@${b.abbr} 1:1`,
        kind: 'reference' as const,
      }));

    return [...groupOptions, ...bookOptions];
  }

  // 7. Pipeline operators after `=>` — driven by COMMAND_REGISTRY for maintainability
  const pipeMatch = textBeforeCursor.match(/=>\s*([A-Za-z0-9_#()-]*)$/);
  if (pipeMatch) {
    const prefix = pipeMatch[1].toLowerCase();

    const translationOptions = buildTranslationSuggestions(prefix, availableTranslations);

    // Build pipe suggestions from COMMAND_REGISTRY (pipeline commands only, not primary-only)
    const registryOptions: ISLASuggestion[] = COMMAND_REGISTRY
      .filter((cmd) => !cmd.isPrimary || cmd.keyword === 'search') // search can appear after pipe via at()
      .filter((cmd) => {
        const kw = cmd.keyword.toLowerCase();
        return !prefix || kw.startsWith(prefix);
      })
      .map((cmd) => ({
        label: cmd.hasArgs ? `${cmd.keyword}(...)` : `${cmd.keyword}()`,
        insertText: cmd.hasArgs ? `${cmd.keyword}(` : `${cmd.keyword}()`,
        detail: cmd.label.fi,
        documentation: cmd.description,
        example: cmd.example,
        kind: 'function' as const,
      }));

    return [...registryOptions, ...translationOptions];
  }

  // 8. Comparative translation after `?` or `:` (e.g. `! @Joh 3:16 ? KR92 : KJV`)
  const compareMatch = textBeforeCursor.match(/[?:]\s*([A-Za-z0-9_-]*)$/);
  if (compareMatch) {
    const prefix = compareMatch[1];
    return buildTranslationSuggestions(prefix, availableTranslations);
  }

  return [];
}

/**
 * Applies a selected ISLASuggestion to the current code buffer without replacing
 * the entire line, replacing only the active token, prefix, or trigger context.
 *
 * @param currentCode - Full current editor code.
 * @param cursorOffset - Current caret position index.
 * @param suggestion - The chosen suggestion to apply.
 * @returns Object containing the updated code and new cursor offset.
 */
export function applyISLASuggestion(
  currentCode: string,
  cursorOffset: number,
  suggestion: ISLASuggestion
): { newCode: string; newCursorOffset: number } {
  const textBeforeCursor = currentCode.slice(0, cursorOffset);
  const textAfterCursor = currentCode.slice(cursorOffset);
  const hasClosingParen = textAfterCursor.trimStart().startsWith(')');
  const cleanedAfterClosingParen = hasClosingParen
    ? textAfterCursor.replace(/^\s*\)/, ')')
    : textAfterCursor;

  // 1. Full-line snippets: replace entire trigger or line before cursor
  if (suggestion.kind === 'snippet') {
    const offset = suggestion.cursorOffset !== undefined
      ? suggestion.cursorOffset
      : resolveDefaultCursorOffset(suggestion.insertText);
    return {
      newCode: suggestion.insertText + textAfterCursor,
      newCursorOffset: offset,
    };
  }

  // Helper to adjust closing paren if suggestion ends with ')' and after cursor already has ')'
  const sanitizeInsertText = (text: string): string => {
    if (hasClosingParen && text.endsWith(')')) {
      return text.slice(0, -1);
    }
    return text;
  };

  // 2. Inside count(...)
  const countMatch = textBeforeCursor.match(/count\(\s*["']?([A-Za-z0-9äöåÄÖÅ_]*)$/i);
  if (countMatch) {
    const prefix = countMatch[1];
    const prefixStart = cursorOffset - prefix.length;
    const insert = sanitizeInsertText(suggestion.insertText.trim());
    return {
      newCode: currentCode.slice(0, prefixStart) + insert + cleanedAfterClosingParen,
      newCursorOffset: prefixStart + insert.length,
    };
  }

  // 3. Inside at(...)
  const atParenMatch = textBeforeCursor.match(/at\(\s*@?([A-Za-z0-9äöåÄÖÅ_]*)$/i);
  if (atParenMatch) {
    const prefix = atParenMatch[1];
    const prefixStart = cursorOffset - prefix.length;
    let insert = suggestion.insertText.trim();
    if (!insert.endsWith(')') && !hasClosingParen) {
      insert += ')';
    } else if (insert.endsWith(')') && hasClosingParen) {
      insert = insert.slice(0, -1);
    }
    return {
      newCode: currentCode.slice(0, prefixStart) + insert + cleanedAfterClosingParen,
      newCursorOffset: prefixStart + insert.length,
    };
  }

  // 4. Inside use(...), in(...), vs(...)
  const trCallMatch = textBeforeCursor.match(/(?:use|in|vs)\(\s*([^)]*)$/i);
  if (trCallMatch) {
    const inside = trCallMatch[1];
    const commaMatch = inside.match(/,\s*["']?([A-Za-z0-9_-]*)$/);
    if (commaMatch) {
      const prefix = commaMatch[1];
      const prefixStart = cursorOffset - prefix.length;
      let insert = suggestion.insertText.trim();
      if (!hasClosingParen) {
        insert += ')';
      }
      return {
        newCode: currentCode.slice(0, prefixStart) + insert + cleanedAfterClosingParen,
        newCursorOffset: prefixStart + insert.length,
      };
    }
    const isVs = /(?:vs)\(\s*["']?([A-Za-z0-9_-]*)$/i.test(textBeforeCursor);
    const prefix = inside.trim();
    const prefixStart = cursorOffset - prefix.length;
    let insert = suggestion.insertText.trim();
    if (isVs) {
      insert += ', ';
    } else if (!hasClosingParen) {
      insert += ')';
    }
    return {
      newCode: currentCode.slice(0, prefixStart) + insert + cleanedAfterClosingParen,
      newCursorOffset: prefixStart + insert.length,
    };
  }

  // 5. Method call after dot: e.g. . or .us
  const dotMatch = textBeforeCursor.match(/\.\s*([a-zA-Z0-9_]*)$/);
  if (dotMatch) {
    const prefix = dotMatch[1];
    const prefixStart = cursorOffset - prefix.length;
    return {
      newCode: currentCode.slice(0, prefixStart) + suggestion.insertText + textAfterCursor,
      newCursorOffset: prefixStart + suggestion.insertText.length,
    };
  }

  // 6. Pipe operator after =>
  const pipeMatch = textBeforeCursor.match(/=>\s*([A-Za-z0-9_#()-]*)$/);
  if (pipeMatch) {
    const prefix = pipeMatch[1];
    const prefixStart = cursorOffset - prefix.length;
    return {
      newCode: currentCode.slice(0, prefixStart) + suggestion.insertText + textAfterCursor,
      newCursorOffset: prefixStart + suggestion.insertText.length,
    };
  }

  // 7. Book reference inside @(...) or after classical @
  const atCitationParenMatch = textBeforeCursor.match(/@\(\s*([A-Za-z0-9äöåÄÖÅ]*)$/);
  if (atCitationParenMatch) {
    const prefix = atCitationParenMatch[1];
    const prefixStart = cursorOffset - prefix.length;
    let insert = suggestion.insertText.trim();
    if (!hasClosingParen && !insert.endsWith(')')) {
      insert += ')';
    }
    return {
      newCode: currentCode.slice(0, prefixStart) + insert + cleanedAfterClosingParen,
      newCursorOffset: prefixStart + insert.length,
    };
  }

  const atMatch = textBeforeCursor.match(/@([A-Za-z0-9äöåÄÖÅ]*)$/);
  if (atMatch) {
    const prefixWithAt = atMatch[0];
    const prefixStart = cursorOffset - prefixWithAt.length;
    return {
      newCode: currentCode.slice(0, prefixStart) + suggestion.insertText + textAfterCursor,
      newCursorOffset: prefixStart + suggestion.insertText.length,
    };
  }

  // 8. Comparative translation after ? or :
  if (suggestion.kind === 'translation') {
    const compareMatch = textBeforeCursor.match(/[?:]\s*([A-Za-z0-9_-]*)$/);
    if (compareMatch) {
      const prefix = compareMatch[1];
      const prefixStart = cursorOffset - prefix.length;
      return {
        newCode: currentCode.slice(0, prefixStart) + suggestion.insertText + textAfterCursor,
        newCursorOffset: prefixStart + suggestion.insertText.length,
      };
    }
  }

  // 9. Generic word prefix replacement
  const wordMatch = textBeforeCursor.match(/([A-Za-z0-9äöåÄÖÅ_?@]+)$/);
  if (wordMatch) {
    const prefix = wordMatch[1];
    let prefixStart = cursorOffset - prefix.length;
    const insert = suggestion.insertText;

    // If suggestion already contains leading '!' and editor line had leading '!',
    // replace from the initial '!' so we don't end up with duplicate '! !'
    if (insert.startsWith('!')) {
      const bangIdx = textBeforeCursor.lastIndexOf('!');
      if (bangIdx !== -1 && /^\s*$/.test(textBeforeCursor.slice(bangIdx + 1, prefixStart))) {
        prefixStart = bangIdx;
      }
    }

    const offsetInInsert = suggestion.cursorOffset !== undefined
      ? suggestion.cursorOffset
      : resolveDefaultCursorOffset(insert);

    return {
      newCode: currentCode.slice(0, prefixStart) + insert + textAfterCursor,
      newCursorOffset: prefixStart + offsetInInsert,
    };
  }

  // 10. Fallback: simple insertion at cursor
  const offsetInInsert = suggestion.cursorOffset !== undefined
    ? suggestion.cursorOffset
    : resolveDefaultCursorOffset(suggestion.insertText);
  return {
    newCode: textBeforeCursor + suggestion.insertText + textAfterCursor,
    newCursorOffset: cursorOffset + offsetInInsert,
  };
}

/**
 * Returns bilingual hover documentation for a given ISLA keyword or command name.
 * Used by the ISLA cell editor to render inline documentation when the user
 * hovers over a known command token.
 *
 * @param keyword - The ISLA command keyword to look up (e.g. 'search', 'range', 'count').
 * @param lang - Preferred display language ('fi' | 'en'). Defaults to 'fi'.
 * @returns A formatted documentation string, or undefined if the keyword is unknown.
 */
export function getHoverDocumentation(
  keyword: string,
  lang: 'fi' | 'en' = 'fi'
): { label: string; syntax: string; description: string; example: string } | undefined {
  const meta = getCommandMeta(keyword);
  if (!meta) return undefined;

  return {
    label: meta.label[lang],
    syntax: meta.syntax,
    description: meta.description[lang],
    example: meta.example,
  };
}