package models

import "time"

type AiTokenUsage struct {
	ID               string    `json:"id" db:"id"`
	UserID           *string   `json:"userId,omitempty" db:"user_id"`
	GuestID          *string   `json:"guestId,omitempty" db:"guest_id"`
	Feature          string    `json:"feature" db:"feature"`
	Model            string    `json:"model" db:"model"`
	PromptTokens     int       `json:"promptTokens" db:"prompt_tokens"`
	CandidatesTokens int       `json:"candidatesTokens" db:"candidates_tokens"`
	TotalTokens      int       `json:"totalTokens" db:"total_tokens"`
	CachedTokens     int       `json:"cachedTokens" db:"cached_tokens"`
	CreatedAt        time.Time `json:"createdAt" db:"created_at"`
}

type AiUsageStats struct {
	TotalCalls        int `json:"totalCalls"`
	TotalPromptTokens int `json:"totalPromptTokens"`
	TotalCandTokens   int `json:"totalCandidatesTokens"`
	TotalTokens       int `json:"totalTokens"`
	CachedTokens      int `json:"cachedTokens"`
}

type AiUsageSummary struct {
	UserStats   AiUsageStats            `json:"userStats"`
	GuestStats  AiUsageStats            `json:"guestStats"`
	GlobalStats AiUsageStats            `json:"globalStats"`
	ByFeature   map[string]AiUsageStats `json:"byFeature"`
}
