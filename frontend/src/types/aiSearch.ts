export type AiSearchMode = "phrase" | "words" | "wildcard";
export type AiSearchOperator = "and" | "or" | "not";
export type AiSearchScope = "bible" | "ot" | "nt" | "book";

export interface AiSearchPlan {
    terms: string[];
    mode: AiSearchMode;
    operator: AiSearchOperator;
    scope: AiSearchScope;
    book: string | null;
    rationale: string;
}

export interface AiSearchSummary {
    text: string;
    citedReferences: string[];
}

export interface AiSearchRequest {
    query: string;
    translationId: string;
    uiLanguage?: "fi" | "en";
}

export interface AiSearchResponse {
    plan: AiSearchPlan;
    search: {
        verses: Array<{
            id: string;
            translationId: string;
            bookId: string;
            chapter: number;
            verse: number;
            text: string;
        }>;
    };
    summary: AiSearchSummary | null;
}
