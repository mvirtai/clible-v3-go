export interface GeminiUsageMetadata {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
}

export interface NextFocusItem {
    label: string;
    kind: "word" | "theme" | "question" | "phrase";
    reason: string;
}

export interface AiTextResponse {
    text: string;
    nextFocus: NextFocusItem[];
    geminiUsageMetadata?: GeminiUsageMetadata;
}
