package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type UserSettingsHandler struct {
	userRepo *db.UserRepository
}

func NewUserSettingsHandler(userRepo *db.UserRepository) *UserSettingsHandler {
	return &UserSettingsHandler{userRepo: userRepo}
}

// GetSettings handles GET /api/user/settings and returns authenticated user settings.
func (h *UserSettingsHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := ctxkeys.GetUserID(r.Context())
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized: invalid or missing authentication token")
		return
	}

	settings, err := h.userRepo.GetSettings(r.Context(), userID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to load settings: "+err.Error())
		return
	}
	if settings == nil {
		writeJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	_ = json.NewEncoder(w).Encode(settings)
}

// UpdateSettings handles PUT /api/user/settings and updates profile preferences
func (h *UserSettingsHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := ctxkeys.GetUserID(r.Context())
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var input models.UpdateUserSettingsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Sanitize and validate input
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.AvatarID = strings.TrimSpace(input.AvatarID)
	switch input.AvatarID {
	case "scroll", "dove", "olive", "codex", "quill", "menorah", "alpha-omega", "flame", "anchor", "cornerstone":
		// valid theme avatar
	default:
		input.AvatarID = "initials"
	}

	if input.PreferredLang != "en" && input.PreferredLang != "fi" {
		input.PreferredLang = "en"
	}
	if input.ThemePreference != "light" && input.ThemePreference != "dark" {
		input.ThemePreference = "system"
	}
	if input.DefaultTranslationID == "" {
		input.DefaultTranslationID = "web"
	}

	err := h.userRepo.UpdateSettings(
		r.Context(), userID, input.DisplayName, input.AvatarID, input.PreferredLang,
		input.ThemePreference, input.DefaultTranslationID,
	)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to update settings")
		return
	}

	updated, _ := h.userRepo.GetSettings(r.Context(), userID)
	_ = json.NewEncoder(w).Encode(updated)
}

// UpdatePassword handles PUT /api/user/password and updates user password with current password verification
func (h *UserSettingsHandler) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := ctxkeys.GetUserID(r.Context())
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var input models.ChangePasswordInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	// Verify current password against stored hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.CurrentPassword)); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid_current_password")
		return
	}

	// Validate new password complexity
	if err := validatePassword(input.NewPassword); err != nil {
		writeJSONError(w, http.StatusBadRequest, "new password does not meet requirements")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), 12)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	if err := h.userRepo.UpdatePasswordHash(r.Context(), userID, string(newHash)); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{"message": "password_updated"})
}
