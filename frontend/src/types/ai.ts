export interface NextFocusItem {
    label: string;
    kind: "word" | "theme" | "question" | "phrase";
    reason: string;
}

export interface AiTextResponse {
    text: string;
    nextFocus: NextFocusItem[];
}
