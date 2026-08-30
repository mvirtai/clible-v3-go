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
}

export const ISLA_MAIN_SNIPPETS: ISLASuggestion[] = [
  {
    label: '! at(Joh 3:16) => use(KR92)',
    insertText: '! at(Joh 3:16) => use(KR92)',
    detail: 'Passage Lookup',
    documentation: {
      fi: 'Yksittäinen jaekortti valitulla käännöksellä.',
      en: 'Single scripture passage card projected into a specified translation.',
    },
    example: '! at(Joh 3:16) => use(KR92)',
    kind: 'snippet',
  },
  {
    label: '! at(Joh 3:16) => vs(KR92, KR38)',
    insertText: '! at(Joh 3:16) => vs(KR92, KR38)',
    detail: 'Parallel Comparison',
    documentation: {
      fi: 'Rinnakkaisvertailu: näyttää jakeen vierekkäin kahdella eri käännöksellä.',
      en: 'Side-by-side comparative matrix: renders the scripture passage in two translations.',
    },
    example: '! at(Joh 3:16) => vs(KR92, KR38)',
    kind: 'snippet',
  },
  {
    label: '! at(Joh 3:16) => refs(3)',
    insertText: '! at(Joh 3:16) => refs(3)',
    detail: 'Cross References',
    documentation: {
      fi: 'Ristiinviitehaku: etsii jakeen avainsanojen perusteella rinnakkaiset raamatunjakeet.',
      en: 'Cross-reference lookup: discovers parallel scriptures and thematic cross-references.',
    },
    example: '! at(Joh 3:16) => refs(3)',
    kind: 'snippet',
  },
  {
    label: '! at(Joh 3:16) => themes(5)',
    insertText: '! at(Joh 3:16) => themes(5)',
    detail: 'Passage Themes',
    documentation: {
      fi: 'Poimii jakeesta keskeiset teemat ja avainsanat interaktiivisiksi merkeiksi.',
      en: 'Extracts prominent themes from the verse into interactive badges.',
    },
    example: '! at(Joh 3:16) => themes(5)',
    kind: 'snippet',
  },
  {
    label: '! ^ => suggest(3)',
    insertText: '! ^ => suggest(3)',
    detail: 'Context Suggestions',
    documentation: {
      fi: 'Älykäs jakesuositus: ehdottaa muistiinpanon kontekstiin sopivia jakeita.',
      en: 'Smart verse suggestions matching the contextual themes of your notebook.',
    },
    example: '! ^ => suggest(3)',
    kind: 'snippet',
  },
  {
    label: '! ^ => themes(5)',
    insertText: '! ^ => themes(5)',
    detail: 'Notebook Themes',
    documentation: {
      fi: 'Poimii edellisten solujen raamatunteksteistä keskeiset teemat ja avainsanat.',
      en: 'Extracts prominent keyword themes from preceding notebook cells.',
    },
    example: '! ^ => themes(5)',
    kind: 'snippet',
  },
  {
    label: '! search("armo") => at(evankeliumit) => count()',
    insertText: '! search("armo") => at(evankeliumit) => count()',
    detail: 'Scoped Count Metric',
    documentation: {
      fi: 'Laskee sanan esiintymiskertojen määrän rajatussa kirjakokonaisuudessa.',
      en: 'Counts the occurrences of a search keyword within a smart book group.',
    },
    example: '! search("armo") => at(evankeliumit) => count()',
    kind: 'snippet',
  },
  {
    label: '! search("valkeus") => at(Joh) => limit(5)',
    insertText: '! search("valkeus") => at(Joh) => limit(5)',
    detail: 'Scoped Search',
    documentation: {
      fi: 'Tekstihaku rajattuna tiettyyn kirjaan enimmäismäärällä.',
      en: 'Full-text search restricted to a specific book with a maximum result limit.',
    },
    example: '! search("valkeus") => at(Joh) => limit(5)',
    kind: 'snippet',
  },
  {
    label: '!? /righteous.*/ @Rom => limit(5)',
    insertText: '!? /righteous.*/ @Rom => limit(5)',
    detail: 'Regex Query',
    documentation: {
      fi: 'Säännöllisen lausekkeen (Regex) haku rajattuna kirjaan.',
      en: 'Regular expression pattern search restricted to a book.',
    },
    example: '!? /righteous.*/ @Rom => limit(5)',
    kind: 'snippet',
  },
  {
    label: '! search("armo" AND "rauha") => at(evankeliumit) => count()',
    insertText: '! search("armo" AND "rauha") => at(evankeliumit) => count()',
    detail: 'Boolean AND Search',
    documentation: {
      fi: 'Boolean AND -haku: löytää jakeet, joissa molemmat sanat esiintyvät.',
      en: 'Boolean AND search: finds verses containing both terms simultaneously.',
    },
    example: '! search("armo" AND "usko") => at(UT) => count()',
    kind: 'snippet',
  },
  {
    label: '! search("kuolema" OR "elämä") => at(Joh)',
    insertText: '! search("kuolema" OR "elämä") => at(Joh)',
    detail: 'Boolean OR Search',
    documentation: {
      fi: 'Boolean OR -haku: löytää jakeet, joissa vähintään yksi termeistä esiintyy.',
      en: 'Boolean OR search: finds verses containing at least one of the given terms.',
    },
    example: '! search("valo" OR "pimeys") => at(Joh) => limit(5)',
    kind: 'snippet',
  },
  {
    label: '! range(Joh 1:1, Joh 3:36) => themes(5)',
    insertText: '! range(Joh 1:1, Joh 3:36) => themes(5)',
    detail: 'Passage Range + Themes',
    documentation: {
      fi: 'Tekstijakso: hakee kaikki jakeet alusta loppuun ja poimii niiden tärkeimmät teemat.',
      en: 'Passage range: fetches all verses from start to end reference and extracts key themes.',
    },
    example: '! range(Gen 1:1, Gen 2:3) => count()',
    kind: 'snippet',
  },
  {
    label: '! range(GEN, DEU) => count()',
    insertText: '! range(GEN, DEU) => count()',
    detail: 'Book-level Range',
    documentation: {
      fi: 'Kirjatason tekstijakso: hakee kaikki jakeet Genesiksen alusta Deuteronomiumin loppuun.',
      en: 'Book-level range: fetches all verses from Genesis through Deuteronomy.',
    },
    example: '! range(MAT, JHN) => count()',
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

  // 1. Line start or primary trigger aliases: offer matching ISLA templates
  if (trimmed === '!' || trimmed === '' || trimmed === '!isla' || trimmed === '!ISLA') {
    return ISLA_MAIN_SNIPPETS;
  }

  // Quick prefix templates for '!?', '!~', and '!^'
  if (trimmed === '!?') {
    return ISLA_MAIN_SNIPPETS.filter((s) => s.label.startsWith('!?') || s.label.startsWith('! search('));
  }
  if (trimmed === '!~') {
    return ISLA_MAIN_SNIPPETS.filter((s) => s.label.includes('refs'));
  }
  if (trimmed === '!^') {
    return ISLA_MAIN_SNIPPETS.filter((s) => s.label.startsWith('! ^'));
  }

  // 2. Typing book reference or smart group after `@` (e.g. `@`, `@Joh`, `@1Moos`, `@evankeliumit`, `@toora`)
  const atMatch = textBeforeCursor.match(/@([A-Za-z0-9äöåÄÖÅ]*)$/);
  if (atMatch) {
    const prefix = atMatch[1].toLowerCase();

    // 2.1 Smart book groups (@evankeliumit, @gospels, @toora, @kirjeet, @epistolat jne.)
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
        label: `@${g.id}`,
        insertText: `@${g.id} `,
        detail: `${g.nameFi} (${g.nameEn})`,
        documentation: {
          fi: `Älykäs kirjakokonaisuus: ${g.nameFi}. Rajaa haun automaattisesti tähän kirjaryhmään.`,
          en: `Smart book group: ${g.nameEn}. Restricts the search scope to these biblical books.`,
        },
        example: `! search("armo") => @${g.id} => count()`,
        kind: 'reference' as const,
      }));

    // 2.2 Individual biblical books
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

    return [...groupOptions, ...bookOptions];
  }

  // 3. Pipeline operators after `=>` — driven by COMMAND_REGISTRY for maintainability
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

  // 4. Comparative translation after `?` or `:` (e.g. `! @Joh 3:16 ? KR92 : KJV`)
  const compareMatch = textBeforeCursor.match(/[?:]\s*([A-Za-z0-9_-]*)$/);
  if (compareMatch) {
    const prefix = compareMatch[1];
    return buildTranslationSuggestions(prefix, availableTranslations);
  }

  return [];
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