import bibleStructure from '@/data/bible_structure.json';
import {
  bookCitationAbbrevFi,
  bookNameLocalized,
  bookName,
} from '@/utils/bookNames';

export interface BibleBookSuggestionItem {
  /** Canonical 3-letter ID in DB (e.g. 'GEN', 'JHN') or testament scope ('OT', 'NT') */
  id: string;
  /** Clean abbreviation used in ISLA references (e.g. 'Joh', '1Moos', 'VT', 'UT') */
  abbr: string;
  /** Formal Finnish citation abbreviation with periods (e.g. 'Joh.', '1. Moos.') */
  abbrFi: string;
  /** Full localized name in Finnish */
  nameFi: string;
  /** Full canonical name in English */
  nameEn: string;
  /** Testament division ('OT' = Vanha testamentti, 'NT' = Uusi testamentti) */
  testament: 'OT' | 'NT';
}

export const BIBLE_BOOKS: BibleBookSuggestionItem[] = [
  // 1. Testament-wide special scopes
  {
    id: 'OT',
    abbr: 'VT',
    abbrFi: 'VT',
    nameFi: 'Vanha testamentti',
    nameEn: 'Old Testament',
    testament: 'OT',
  },
  {
    id: 'OT',
    abbr: 'OT',
    abbrFi: 'OT',
    nameFi: 'Vanha testamentti',
    nameEn: 'Old Testament',
    testament: 'OT',
  },
  {
    id: 'NT',
    abbr: 'UT',
    abbrFi: 'UT',
    nameFi: 'Uusi testamentti',
    nameEn: 'New Testament',
    testament: 'NT',
  },
  {
    id: 'NT',
    abbr: 'NT',
    abbrFi: 'NT',
    nameFi: 'Uusi testamentti',
    nameEn: 'New Testament',
    testament: 'NT',
  },

  // 2. All 66 books dynamically mapped from bible_structure and bookNames
  ...(bibleStructure.books as Array<{ id: string; name: string; testament: 'OT' | 'NT' }>).map((b) => {
    const rawAbbr = bookCitationAbbrevFi(b.id);
    const cleanAbbr = rawAbbr.replace(/\./g, '').replace(/\s+/g, '');

    return {
      id: b.id,
      abbr: cleanAbbr,
      abbrFi: rawAbbr,
      nameFi: bookNameLocalized(b.id, 'fi'),
      nameEn: bookName(b.id),
      testament: b.testament,
    };
  }),
];

/**
 * Metadata definition for actual translations supported and installed in Clible-v3.
 */
export interface TranslationSuggestionItem {
  /** Database ID (e.g. 'fin-1992', 'fin-biblia-33-38', 'eng-web', 'kjv', 'fin-1776') */
  id: string;
  /** ISLA code alias (e.g. 'KR92', 'KR38', '1776', 'WEB', 'KJV') */
  code: string;
  /** Human-readable title */
  name: string;
  /** Language tag */
  language: 'fi' | 'en' | 'grc' | 'he';
  /** Localized descriptions */
  description: {
    fi: string;
    en: string;
  };
}

/**
 * Application's actual catalog of Bible translations.
 */
export const APP_TRANSLATIONS: TranslationSuggestionItem[] = [
  {
    id: 'fin-1992',
    code: 'KR92',
    name: 'Kirkkoraamattu (1992)',
    language: 'fi',
    description: {
      fi: 'Suomen evankelis-luterilaisen kirkon virallinen kirkkoraamattu 1992.',
      en: 'Official Finnish Church Bible translation from 1992.',
    },
  },
  {
    id: 'fin-biblia-33-38',
    code: 'KR38',
    name: 'Kirkkoraamattu (1933/38)',
    language: 'fi',
    description: {
      fi: 'Perinteinen ja tarkka suomalainen kirkkoraamattu (VT 1933 / UT 1938).',
      en: 'Traditional Finnish Bible translation (OT 1933 / NT 1938).',
    },
  },
  {
    id: 'fin-1776',
    code: '1776',
    name: 'Biblia (1776)',
    language: 'fi',
    description: {
      fi: 'Vanha suomalainen Biblia (1776).',
      en: 'Historical Finnish Biblia translation (1776).',
    },
  },
  {
    id: 'eng-web',
    code: 'WEB',
    name: 'World English Bible',
    language: 'en',
    description: {
      fi: 'Nykyaikainen englanninkielinen Public Domain -raamatunkäännös.',
      en: 'Modern public domain English translation based on the ASV.',
    },
  },
  {
    id: 'kjv',
    code: 'KJV',
    name: 'King James Version',
    language: 'en',
    description: {
      fi: 'Klassinen englanninkielinen Kuningas Jaakon käännös (1611/1769).',
      en: 'Classic English King James Version (Authorized Version).',
    },
  },
];

/**
 * Canonical smart book group identifiers and their bilingual labels.
 */
export const SMART_BOOK_GROUPS = [
  { id: 'epistolat', nameFi: 'Epistolat (Kirjeet)', nameEn: 'Epistles (Letters)', aliasEn: 'epistles', aliasFi: 'kirjeet' },
  { id: 'kirjeet', nameFi: 'Kirjeet (Epistolat)', nameEn: 'Epistles (Letters)', aliasEn: 'epistles', aliasFi: 'epistolat' },
  { id: 'evankeliumit', nameFi: 'Evankeliumit', nameEn: 'Gospels', aliasEn: 'gospels' },
  { id: 'toora', nameFi: 'Toora (Laki)', nameEn: 'Torah (Law)', aliasEn: 'torah' },
  { id: 'viisaus', nameFi: 'Viisauskirjallisuus', nameEn: 'Wisdom Literature', aliasEn: 'wisdom' },
  { id: 'profeetat', nameFi: 'Profeetat', nameEn: 'Prophets', aliasEn: 'prophets' },
  { id: 'historia', nameFi: 'Historiakirjat', nameEn: 'Historical Books', aliasEn: 'history' },
  { id: 'VT', nameFi: 'Vanha testamentti', nameEn: 'Old Testament', aliasEn: 'OT' },
  { id: 'UT', nameFi: 'Uusi testamentti', nameEn: 'New Testament', aliasEn: 'NT' },
] as const;

/**
 * ISLACommandMeta describes a single pipeline action keyword and its usage.
 * Used by the IntelliSense engine, hover tooltips, and the command palette.
 */
export interface ISLACommandMeta {
  /** The canonical keyword used in ISLA expressions. */
  keyword: string;
  /** A concise bilingual label shown in autocomplete lists. */
  label: { fi: string; en: string };
  /** Full bilingual description for hover tooltips and documentation panels. */
  description: { fi: string; en: string };
  /** Canonical syntax signature, e.g. "use(TRANSLATION_ID)". */
  syntax: string;
  /** Concrete usage example. */
  example: string;
  /** Whether this command accepts arguments. */
  hasArgs: boolean;
  /** Whether this command can appear in source / primary position. */
  isPrimary?: boolean;
}

/**
 * COMMAND_REGISTRY is the single source of truth for all ISLA DSL keywords.
 * Each entry drives autocomplete snippets, hover documentation, and
 * future language-server style diagnostics on the frontend.
 *
 * @since feat/isla-dsl-extensions
 */
export const COMMAND_REGISTRY: readonly ISLACommandMeta[] = [
  // ── Source / Primary Commands ────────────────────────────────────────────
  {
    keyword: 'search',
    label: { fi: 'Tekstihaku', en: 'Full-text Search' },
    description: {
      fi: 'Hakee raamatunteksteistä hakulausekkeella. Tukee boolean-operaatoreita AND ja OR sekä named param -muotoa: `search("armo", scope: evankeliumit)`.',
      en: 'Searches scripture by query string. Supports boolean AND/OR operators and named params: `search("grace", scope: gospels)`.',
    },
    syntax: 'search("QUERY") | search("TERM1" AND "TERM2") | search("Q", scope: GROUP)',
    example: '! search("armo" AND "rauha") => at(evankeliumit) => count()',
    hasArgs: true,
    isPrimary: true,
  },
  {
    keyword: 'range',
    label: { fi: 'Tekstijakso', en: 'Passage Range' },
    description: {
      fi: 'Hakee yhtenäisen tekstijakson alku- ja loppuviitteen väliltä, esim. `range(Joh 1:1, Joh 3:36)` tai kirjatasolla `range(GEN, DEU)`.',
      en: 'Fetches a contiguous passage between a start and end reference, e.g. `range(Joh 1:1, Joh 3:36)` or book-level `range(GEN, DEU)`.',
    },
    syntax: 'range(START_REF, END_REF)',
    example: '! range(Joh 1:1, Joh 3:36) => themes(5)',
    hasArgs: true,
    isPrimary: true,
  },
  {
    keyword: 'from',
    label: { fi: 'Jaeviittaus (alias)', en: 'Verse Reference (alias)' },
    description: {
      fi: '`from(viite)` on alias `@viite`-muodolle. Selkeämpi vaihtoehto markdown-upotuksissa, joissa `@` sekoittuu markdown-syntaksiin.',
      en: '`from(ref)` is an alias for `@ref`. A cleaner alternative in markdown embeds where `@` conflicts with Markdown syntax.',
    },
    syntax: 'from(VERSE_REF)',
    example: '![from(Joh 3:16) => use(KR92)]',
    hasArgs: true,
    isPrimary: true,
  },
  {
    keyword: 'read',
    label: { fi: 'Jaeviittaus (alias)', en: 'Verse Reference (alias)' },
    description: {
      fi: '`read(viite)` on funktioaliastyyppi jakeen tai jaejakson lukemiseen.',
      en: '`read(ref)` is a function alias for reading a verse or passage.',
    },
    syntax: 'read(VERSE_REF)',
    example: '! read(Joh 3:16) => use(KR92)',
    hasArgs: true,
    isPrimary: true,
  },

  // ── Pipeline / Modifier Commands ─────────────────────────────────────────
  {
    keyword: 'use',
    label: { fi: 'Käännösvalinta', en: 'Translation Selector' },
    description: {
      fi: 'Projisoi jakeen tai haun halutulle raamatunkäännökselle.',
      en: 'Projects the scripture passage or search into the specified Bible translation.',
    },
    syntax: 'use(TRANSLATION_ID)',
    example: '! at(Joh 3:16) => use(KR92)',
    hasArgs: true,
  },
  {
    keyword: 'in',
    label: { fi: 'Käännösvalinta (alias)', en: 'Translation Selector (alias)' },
    description: {
      fi: 'Alias komennolle `use(...)`. Säilytetty taaksepäinyhteensopivuuden vuoksi.',
      en: 'Alias for `use(...)`. Retained for backwards compatibility.',
    },
    syntax: 'in(TRANSLATION_ID)',
    example: '! at(Joh 3:16) => in(KR92)',
    hasArgs: true,
  },
  {
    keyword: 'at',
    label: { fi: 'Laajuusrajoitin', en: 'Scope Constraint' },
    description: {
      fi: 'Rajaa haun tai analyysin tiettyyn kirjaan tai bilinguaaliseen kirjaryhmään. Putkessa: `=> at(evankeliumit)`. Lähteenä: `at(Joh 3:16) => ...`.',
      en: 'Restricts search or analysis to a specific book or smart bilingual book group. Pipeline: `=> at(gospels)`. Source: `at(Joh 3:16) => ...`.',
    },
    syntax: 'at(BOOK_OR_GROUP)',
    example: '! search("armo") => at(evankeliumit) => count()',
    hasArgs: true,
  },
  {
    keyword: 'vs',
    label: { fi: 'Rinnakkaisvertailu', en: 'Parallel Comparison' },
    description: {
      fi: 'Näyttää jakeen rinnakkain kahdella käännöksellä.',
      en: 'Renders the verse side-by-side in two translations.',
    },
    syntax: 'vs(TRANS_A, TRANS_B)',
    example: '! at(Joh 3:16) => vs(KR92, KR38)',
    hasArgs: true,
  },
  {
    keyword: 'compare',
    label: { fi: 'Rinnakkaisvertailu (alias)', en: 'Parallel Comparison (alias)' },
    description: {
      fi: 'Alias komennolle `vs(...)`. Näyttää jakeen tai jaksorajan rinnakkain kahdella käännöksellä.',
      en: 'Alias for `vs(...)`. Renders the verse or passage side-by-side in two translations.',
    },
    syntax: 'compare(TRANS_A, TRANS_B)',
    example: '! at(Joh 3:16) => compare(KR92, KJV)',
    hasArgs: true,
  },
  {
    keyword: 'refs',
    label: { fi: 'Ristiinviitteet', en: 'Cross References' },
    description: {
      fi: 'Hakee jakeen avainsanojen perusteella rinnakkaiset raamatunjakeet. Valinnainen lukumäärä: `refs(5)`.',
      en: 'Discovers parallel scriptures based on verse keywords. Optional count: `refs(5)`.',
    },
    syntax: 'refs(N?)',
    example: '! at(Joh 3:16) => refs(5)',
    hasArgs: true,
  },
  {
    keyword: 'themes',
    label: { fi: 'Teemat', en: 'Thematic Keywords' },
    description: {
      fi: 'Poimii jakeen tai muistiinpanon tärkeimmät teemat interaktiivisiksi merkeiksi. Valinnainen lukumäärä: `themes(5)`.',
      en: 'Extracts the most prominent themes as interactive badges. Optional count: `themes(5)`.',
    },
    syntax: 'themes(N?)',
    example: '! range(Joh 1:1, Joh 3:36) => themes(8)',
    hasArgs: true,
  },
  {
    keyword: 'suggest',
    label: { fi: 'Kontekstisuositukset', en: 'Context Suggestions' },
    description: {
      fi: 'Ehdottaa muistiinpanon kontekstiin sopivia jakeita. Valinnainen lukumäärä: `suggest(3)`.',
      en: 'Recommends contextually relevant verses. Optional count: `suggest(3)`.',
    },
    syntax: 'suggest(N?)',
    example: '! ^ => suggest(5)',
    hasArgs: true,
  },
  {
    keyword: 'count',
    label: { fi: 'Laskuri', en: 'Result Counter' },
    description: {
      fi: 'Laskee tulosten määrän (jakeet, luvut, kirjat, sanat tai uniikit sanat) mittarikortilla. Valinnainen yksikkö: count(verses), count(chapters), count(books), count(words), count(unique_words) [aliakset: uw, uniques, uniq, uniikit, uniikit_sanat, us].',
      en: 'Aggregates result count (verses, chapters, books, words, or unique words) on a metric card. Optional unit: count(verses), count(chapters), count(books), count(words), count(unique_words) [aliases: uw, uniques, uniq, uniikit, uniikit_sanat, us].',
    },
    syntax: 'count([unit])',
    example: '! search("armo") => at(kirjeet) => count(uw)',
    hasArgs: false,
  },
  {
    keyword: 'top',
    label: { fi: 'Yleisimmät sanat', en: 'Top Word Frequencies' },
    description: {
      fi: 'Laskee ja visualisoi tekstin yleisimmät sanat pylväskaaviona. Oletus top(10), valinnainen määrä esim. top(20).',
      en: 'Calculates and visualizes most frequent words as a horizontal bar chart. Default top(10), optional count e.g. top(20).',
    },
    syntax: 'top(N?) | words(N?)',
    example: '! range(Joh 1:1, Joh 1:18) => top(10)',
    hasArgs: true,
  },
  {
    keyword: 'words',
    label: { fi: 'Yleisimmät sanat (alias)', en: 'Word Frequencies (alias)' },
    description: {
      fi: 'Alias komennolle `top(...)`. Näyttää yleisimpien sanojen frekvenssit.',
      en: 'Alias for `top(...)`. Displays top word frequencies.',
    },
    syntax: 'words(N?)',
    example: '! search("valo") => words(5)',
    hasArgs: true,
  },
  {
    keyword: 'stats',
    label: { fi: 'Tekstitilastot & TTR', en: 'Text Statistics & TTR' },
    description: {
      fi: 'Laskee tekstin leksikaaliset metriikat: Type-Token Ratio (TTR), sanaston rikkauden, kokonaissanamäärän ja keskipituuden.',
      en: 'Calculates lexical metrics: Type-Token Ratio (TTR), vocabulary richness, word counts, and average length.',
    },
    syntax: 'stats() | ttr()',
    example: '! @Room 8:1-39 => stats()',
    hasArgs: false,
  },
  {
    keyword: 'ttr',
    label: { fi: 'Sanaston rikkaus (TTR)', en: 'Type-Token Ratio (TTR)' },
    description: {
      fi: 'Alias komennolle `stats()`. Laskee sanaston rikkaussuhteen (Type-Token Ratio).',
      en: 'Alias for `stats()`. Calculates lexical diversity ratio (Type-Token Ratio).',
    },
    syntax: 'ttr()',
    example: '! ^ => ttr()',
    hasArgs: false,
  },
  {
    keyword: 'limit',
    label: { fi: 'Tulosrajoitin', en: 'Result Limiter' },
    description: {
      fi: 'Rajoittaa näytettävien jakeiden tai hakutulosten enimmäismäärän.',
      en: 'Limits the maximum number of displayed verses or search results.',
    },
    syntax: 'limit(N)',
    example: '! search("valkeus") => at(Joh) => limit(5)',
    hasArgs: true,
  },
] as const;

/**
 * Look up an {@link ISLACommandMeta} entry by its keyword (case-insensitive).
 * Returns `undefined` if the keyword is not registered.
 */
export function getCommandMeta(keyword: string): ISLACommandMeta | undefined {
  return COMMAND_REGISTRY.find(
    (c) => c.keyword.toLowerCase() === keyword.toLowerCase()
  );
}

/**
 * Strips all ISLA code blocks, embed widgets, inline directives, and command lines from markdown text.
 * Leaves only user narrative notes, headings, and natural language prose.
 */
export function stripISLAFromText(text: string): string {
  if (!text) return '';
  return text
    // 1. Triple-backtick ISLA code blocks: ```isla ... ``` or ```ISLA ... ```
    .replace(/```(?:isla|ISLA)[\s\S]*?```/gi, '')
    // 2. Inline backtick directives: `!isla ...` or `!@...`
    .replace(/`!(?:isla\s+|ISLA\s+|i\s+)?[^`\n]+`/gi, '')
    // 3. Bracket embeds: ![[...]] or ![...]
    .replace(/!\[(?:\[)?[\s\S]*?\](?:\])?/g, '')
    // 4. Line-level directives starting with `!` or dangling directive triggers
    .replace(/(?:^|\n)\s*![^\n]*/g, '')
    // 5. Standalone ISLA command lines (e.g. ^ => ..., @Joh ..., search(...), top(...), stats())
    .replace(/(?:^|\n)\s*(?:\^\s*=>|@\w+|\?\s*["'/]|(?:search|range|read|stats|top|count|ttr|themes|suggest)\s*\()[^\n]*/gi, '')
    .trim();
}

