package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func setupUserSettingsHandler(t *testing.T) (*api.UserSettingsHandler, *db.UserRepository, string, string) {
	t.Helper()
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test database: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	userRepo := db.NewUserRepository(conn)
	handler := api.NewUserSettingsHandler(userRepo)

	userID := uuid.New().String()
	initialPassword := "CurrentPassword123!"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(initialPassword), 12)
	if err != nil {
		t.Fatalf("failed to hash test password: %v", err)
	}

	testUser := &db.User{
		ID:           userID,
		Email:        "settings_test@example.com",
		PasswordHash: string(hashedPassword),
		IsVerified:   true,
	}

	if err := userRepo.Create(context.Background(), testUser); err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	return handler, userRepo, userID, initialPassword
}

func TestUserSettingsHandler_GetSettings(t *testing.T) {
	handler, _, userID, _ := setupUserSettingsHandler(t)

	t.Run("unauthenticated request returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/user/settings", nil)
		rec := httptest.NewRecorder()

		handler.GetSettings(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized, got %d", rec.Code)
		}
	})

	t.Run("non-existent user returns 404", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/user/settings", nil)
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, "non-existent-user-id")
		rec := httptest.NewRecorder()

		handler.GetSettings(rec, req.WithContext(ctx))
		if rec.Code != http.StatusNotFound {
			t.Errorf("expected 404 Not Found, got %d", rec.Code)
		}
	})

	t.Run("authenticated user returns 200 with settings JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/user/settings", nil)
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
		rec := httptest.NewRecorder()

		handler.GetSettings(rec, req.WithContext(ctx))
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}

		var settings db.User
		if err := json.NewDecoder(rec.Body).Decode(&settings); err != nil {
			t.Fatalf("failed to decode response JSON: %v", err)
		}

		if settings.ID != userID {
			t.Errorf("expected user ID %s, got %s", userID, settings.ID)
		}
		if settings.Email != "settings_test@example.com" {
			t.Errorf("expected email settings_test@example.com, got %s", settings.Email)
		}
		if settings.PreferredLang != "en" {
			t.Errorf("expected default lang 'en', got %s", settings.PreferredLang)
		}
		if settings.DefaultTranslationID != "web" {
			t.Errorf("expected default translation 'web', got %s", settings.DefaultTranslationID)
		}
	})
}

func TestUserSettingsHandler_UpdateSettings(t *testing.T) {
	handler, _, userID, _ := setupUserSettingsHandler(t)

	t.Run("unauthenticated request returns 401", func(t *testing.T) {
		body, _ := json.Marshal(models.UpdateUserSettingsInput{
			DisplayName:   "Alice",
			PreferredLang: "fi",
		})
		req := httptest.NewRequest(http.MethodPut, "/api/user/settings", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.UpdateSettings(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized, got %d", rec.Code)
		}
	})

	t.Run("invalid JSON body returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/user/settings", bytes.NewReader([]byte("{invalid-json")))
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
		rec := httptest.NewRecorder()

		handler.UpdateSettings(rec, req.WithContext(ctx))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	})

	t.Run("valid payload updates settings and returns 200", func(t *testing.T) {
		payload := models.UpdateUserSettingsInput{
			DisplayName:          "Linus Torvalds",
			PreferredLang:        "fi",
			ThemePreference:      "dark",
			DefaultTranslationID: "fin-1992",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPut, "/api/user/settings", bytes.NewReader(body))
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
		rec := httptest.NewRecorder()

		handler.UpdateSettings(rec, req.WithContext(ctx))
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}

		var updated db.User
		if err := json.NewDecoder(rec.Body).Decode(&updated); err != nil {
			t.Fatalf("failed to decode updated settings: %v", err)
		}

		if updated.DisplayName != "Linus Torvalds" {
			t.Errorf("expected display name 'Linus Torvalds', got %s", updated.DisplayName)
		}
		if updated.PreferredLang != "fi" {
			t.Errorf("expected preferred lang 'fi', got %s", updated.PreferredLang)
		}
		if updated.ThemePreference != "dark" {
			t.Errorf("expected theme 'dark', got %s", updated.ThemePreference)
		}
		if updated.DefaultTranslationID != "fin-1992" {
			t.Errorf("expected translation 'fin-1992', got %s", updated.DefaultTranslationID)
		}
	})

	t.Run("normalizes default language, theme, and translation values", func(t *testing.T) {
		payload := models.UpdateUserSettingsInput{
			DisplayName:          "  Trimmed Name  ",
			PreferredLang:        "invalid-lang",
			ThemePreference:      "unsupported-theme",
			DefaultTranslationID: "",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPut, "/api/user/settings", bytes.NewReader(body))
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
		rec := httptest.NewRecorder()

		handler.UpdateSettings(rec, req.WithContext(ctx))
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}

		var updated db.User
		if err := json.NewDecoder(rec.Body).Decode(&updated); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if updated.DisplayName != "Trimmed Name" {
			t.Errorf("expected trimmed display name, got %q", updated.DisplayName)
		}
		if updated.PreferredLang != "en" {
			t.Errorf("expected fallback lang 'en', got %s", updated.PreferredLang)
		}
		if updated.ThemePreference != "system" {
			t.Errorf("expected fallback theme 'system', got %s", updated.ThemePreference)
		}
		if updated.DefaultTranslationID != "web" {
			t.Errorf("expected fallback translation 'web', got %s", updated.DefaultTranslationID)
		}
	})
}

func TestUserSettingsHandler_UpdatePassword(t *testing.T) {
	handler, userRepo, userID, currentPassword := setupUserSettingsHandler(t)

	t.Run("unauthenticated request returns 401", func(t *testing.T) {
		body, _ := json.Marshal(models.ChangePasswordInput{
			CurrentPassword: currentPassword,
			NewPassword:     "NewSecretPassword123!",
		})
		req := httptest.NewRequest(http.MethodPut, "/api/user/password", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.UpdatePassword(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized, got %d", rec.Code)
		}
	})

	t.Run("invalid JSON body returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/user/password", bytes.NewReader([]byte("{bad-json")))
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
		rec := httptest.NewRecorder()

		handler.UpdatePassword(rec, req.WithContext(ctx))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	})

	t.Run("incorrect current password returns 400", func(t *testing.T) {
		body, _ := json.Marshal(models.ChangePasswordInput{
			CurrentPassword: "WrongPassword123!",
			NewPassword:     "ValidNewPassword123!",
		})
		req := httptest.NewRequest(http.MethodPut, "/api/user/password", bytes.NewReader(body))
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
		rec := httptest.NewRecorder()

		handler.UpdatePassword(rec, req.WithContext(ctx))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	})

	t.Run("weak new password returns 400", func(t *testing.T) {
		weakPasswords := []string{
			"short",
			"nouppercase1!",
			"NoNumber!",
			"NoSpecialChar1",
		}

		for _, weak := range weakPasswords {
			body, _ := json.Marshal(models.ChangePasswordInput{
				CurrentPassword: currentPassword,
				NewPassword:     weak,
			})
			req := httptest.NewRequest(http.MethodPut, "/api/user/password", bytes.NewReader(body))
			ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
			rec := httptest.NewRecorder()

			handler.UpdatePassword(rec, req.WithContext(ctx))
			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected 400 Bad Request for weak password %q, got %d", weak, rec.Code)
			}
		}
	})

	t.Run("valid password change returns 200 and updates password hash", func(t *testing.T) {
		newPassword := "BrandNewPassword123!"
		body, _ := json.Marshal(models.ChangePasswordInput{
			CurrentPassword: currentPassword,
			NewPassword:     newPassword,
		})
		req := httptest.NewRequest(http.MethodPut, "/api/user/password", bytes.NewReader(body))
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, userID)
		rec := httptest.NewRecorder()

		handler.UpdatePassword(rec, req.WithContext(ctx))
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}

		// Verify that the new password works with bcrypt and the old one fails
		user, err := userRepo.GetByID(context.Background(), userID)
		if err != nil {
			t.Fatalf("failed to load user: %v", err)
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(newPassword)); err != nil {
			t.Errorf("expected new password to match updated hash: %v", err)
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err == nil {
			t.Errorf("expected old password to fail against updated hash")
		}
	})
}
