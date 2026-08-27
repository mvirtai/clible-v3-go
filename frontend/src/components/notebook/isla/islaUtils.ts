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
