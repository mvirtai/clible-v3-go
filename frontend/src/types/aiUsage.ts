export interface AiUsageStats {
  totalCalls: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  totalTokens: number;
  cachedTokens: number;
}

export interface AiUsageSummary {
  userStats: AiUsageStats;
  guestStats: AiUsageStats;
  globalStats: AiUsageStats;
  byFeature: Record<string, AiUsageStats>;
}
