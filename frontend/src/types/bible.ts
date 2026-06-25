// src/types/bible.ts

/**
 * Represents a single verse, matching the backend's FrontendVerse struct.
 */
export interface Verse {
    bookName: string;
    chapter: number;
    verse: number;
    text: string;
}

/**
 * Represents a chapter lookup or verse range query result, matching the backend's FrontendBibleResponse struct.
 */
export interface BibleResponse {
    reference: string;
    text: string;
    translationName: string;
    verses: Verse[];
}

/**
 * Represents a translation installed in the database, matching the backend's Translation struct.
 */
export interface InstalledTranslation {
    id: string;
    name: string;
    language: string;
    format: string;
    sourceUrl: string;
    installedAt: string; // ISO 8601 date string
}

/**
 * Represents a translation available online that might not be installed yet.
 * Extends InstalledTranslation.
 */
export interface AvailableTranslation extends InstalledTranslation {
    sizeMb?: number;
}

/**
 * Represents the frequency of a single word or n-gram,
 * structured to be compatible with Recharts (name: word, value: count).
 */
export interface WordFrequency {
    name: string;
    value: number;
}

/**
 * Represents the text analysis results for a single translation, matching the backend's AnalysisResult struct.
 */
export interface TextStats {
    tokenCount: number;
    uniqueTokenCount: number;
    typeTokenRatio: number;
    characterCount: number;
    avgWordLength: number;
    topWords: WordFrequency[];
    topBigrams: WordFrequency[];
    topTrigrams: WordFrequency[];
}

/**
 * Represents an aligned verse comparing two translations.
 */
export interface AlignedVerse {
    bookId: string;
    chapter: number;
    verse: number;
    textA: string;
    textB: string;
    similarity: number;
    exactMatch: boolean;
}

/**
 * Represents the summary of a translation comparison.
 */
export interface ComparisonSummary {
    totalVerses: number;
    fullyAlignedVerses: number;
    exactMatches: number;
    exactMatchRatio: number;
    averageSimilarity: number;
    topSharedWords: WordFrequency[];
    mostSimilarVerseRef?: string;
}

/**
 * Represents the comparison results between two translations, matching the backend's ComparisonResult struct.
 */
export interface ComparisonResult {
    reference: string;
    translationA: string;
    translationB: string;
    alignedVerses: AlignedVerse[];
    summary: ComparisonSummary;
}
