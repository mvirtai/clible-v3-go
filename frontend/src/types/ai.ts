export interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface NextFocusItem {
  label: string;
  kind: 'word' | 'theme' | 'question' | 'phrase';
  reason: string;
}

export interface AiTextResponse {
  text: string;
  nextFocus: NextFocusItem[];
  geminiUsageMetadata?: GeminiUsageMetadata;
}

/**
 * One deep dive result in a chain. `parentId` links it to the entry whose
 * follow-up topic produced it (null = produced from the main analysis).
 */
export interface DeepDiveEntry {
  id: string;
  parentId: string | null;
  /** 0 = deep dive from the analysis */
  depth: number;
  topic: string;
  text: string;
  nextFocus: NextFocusItem[];
  usage?: GeminiUsageMetadata;
}
