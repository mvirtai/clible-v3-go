import type { NextFocusItem } from "./ai";

export type StudyScope = "verse" | "chapter" | "book";

export interface OriginalStudyVerse {
    id: string;
    translationId: string;
    bookId: string;
    chapter: number;
    verse: number;
    text: string;
}

export interface OriginalStudyResult {
    text: string;
    nextFocus: NextFocusItem[];
}
