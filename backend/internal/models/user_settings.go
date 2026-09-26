package models

import "time"

// UserSettings represents user profile and UI/UX preferences
type UserSettings struct {
	ID                   string    `json:"id"`
	Email                string    `json:"email"`
	Name                 string    `json:"name"`
	AvatarID             string    `json:"avatarId"`
	PreferredLanguage    string    `json:"preferredLanguage"`
	AiLanguage           string    `json:"aiLanguage"`
	ThemePreference      string    `json:"themePreference"`
	DefaultTranslationID string    `json:"defaultTranslationId"`
	LiturgicalViewMode   string    `json:"liturgicalViewMode"`
	SubscriptionTier     string    `json:"subscriptionTier"`
	SubscriptionStatus   string    `json:"subscriptionStatus"`
	IsVerified           bool      `json:"isVerified"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

// UpdateUserSettingsInput defines the payload for updating user preferences.
type UpdateUserSettingsInput struct {
	DisplayName          string `json:"displayName"`
	AvatarID             string `json:"avatarId"`
	PreferredLang        string `json:"preferredLang"`
	AiLanguage           string `json:"aiLanguage"`
	ThemePreference      string `json:"themePreference"`
	DefaultTranslationID string `json:"defaultTranslationId"`
	LiturgicalViewMode   string `json:"liturgicalViewMode"`
}

// ChangePasswordInput defines the payload for updating the user account password.
type ChangePasswordInput struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}
