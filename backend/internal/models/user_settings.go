package models

import "time"

// UserSettings represents user profile and UI/UX preferences
type UserSettings struct {
	ID                   string    `json:"id"`
	Email                string    `json:"email"`
	Name                 string    `json:"name"`
	PreferredLanguage    string    `json:"preferredLanguage"`
	ThemePreference      string    `json:"themePreference"`
	DefaultTranslationID string    `json:"defaultTranslationId"`
	SubscriptionTier     string    `json:"subscriptionTier"`
	SubscriptionStatus   string    `json:"subscriptionStatus"`
	IsVerified           bool      `json:"isVerified"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

// UpdateUserSettingsInput defines the payload for updating user preferences.
type UpdateUserSettingsInput struct {
	DisplayName          string `json:"displayName"`
	PreferredLang        string `json:"preferredLang"`
	ThemePreference      string `json:"themePreference"`
	DefaultTranslationID string `json:"defaultTranslationId"`
}

// ChangePasswordInput defines the payload for updating the user account password.
type ChangePasswordInput struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}
