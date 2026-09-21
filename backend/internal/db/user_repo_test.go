package db_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
)

func TestUserRepository(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test db: %v", err)
	}
	defer func() { _ = conn.Close() }()

	repo := db.NewUserRepository(conn)
	ctx := context.Background()

	t.Run("Create and GetByEmail success", func(t *testing.T) {
		userID := uuid.New().String()
		user := &db.User{
			ID:           userID,
			Email:        "user@example.com",
			PasswordHash: "$2a$12$somehashedpasswordstring",
		}

		err := repo.Create(ctx, user)
		if err != nil {
			t.Fatalf("failed to create user: %v", err)
		}

		if user.CreatedAt.IsZero() || user.UpdatedAt.IsZero() {
			t.Errorf("expected timestamps to be populated, got CreatedAt: %v, UpdatedAt: %v", user.CreatedAt, user.UpdatedAt)
		}

		fetched, err := repo.GetByEmail(ctx, "user@example.com")
		if err != nil {
			t.Fatalf("failed to get user by email: %v", err)
		}
		if fetched == nil {
			t.Fatalf("expected user to be found, got nil")
			return
		}
		if fetched.ID != userID || fetched.Email != "user@example.com" {
			t.Errorf("user properties mismatch: got %+v", fetched)
		}
	})

	t.Run("GetByID success", func(t *testing.T) {
		userID := uuid.New().String()
		user := &db.User{
			ID:           userID,
			Email:        "user2@example.com",
			PasswordHash: "$2a$12$anotherhash",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("failed to create user: %v", err)
		}

		fetched, err := repo.GetByID(ctx, userID)
		if err != nil {
			t.Fatalf("failed to get user by ID: %v", err)
		}
		if fetched == nil {
			t.Fatalf("expected user2 to be found, got nil")
			return
		}
		if fetched.Email != "user2@example.com" {
			t.Errorf("expected user2, got %+v", fetched)
		}
	})

	t.Run("GetByEmail and GetByID non-existent returns nil without error", func(t *testing.T) {
		fetchedEmail, err := repo.GetByEmail(ctx, "nonexistent@example.com")
		if err != nil {
			t.Fatalf("unexpected error for non-existent email: %v", err)
		}
		if fetchedEmail != nil {
			t.Errorf("expected nil user for non-existent email, got %+v", fetchedEmail)
		}

		fetchedID, err := repo.GetByID(ctx, "nonexistent-id")
		if err != nil {
			t.Fatalf("unexpected error for non-existent ID: %v", err)
		}
		if fetchedID != nil {
			t.Errorf("expected nil user for non-existent ID, got %+v", fetchedID)
		}
	})

	t.Run("Create duplicate email returns error", func(t *testing.T) {
		dupUser := &db.User{
			ID:           uuid.New().String(),
			Email:        "user@example.com", // already inserted in first test
			PasswordHash: "somehash",
		}
		err := repo.Create(ctx, dupUser)
		if err == nil {
			t.Errorf("expected error on duplicate email, got nil")
		}
	})

	t.Run("EmailVerification workflow success", func(t *testing.T) {
		userID := uuid.New().String()
		user := &db.User{
			ID:           userID,
			Email:        "verify@example.com",
			PasswordHash: "hash123",
			IsVerified:   false,
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("failed to create user: %v", err)
		}

		verID := uuid.New().String()
		ver := &db.EmailVerification{
			ID:        verID,
			UserID:    userID,
			Code:      "123456",
			Token:     "test-token-64-bytes-long-string-for-email-verification-testing",
			ExpiresAt: time.Now().Add(15 * time.Minute),
		}

		if err := repo.CreateVerification(ctx, ver); err != nil {
			t.Fatalf("failed to create verification: %v", err)
		}

		// Lookup by code
		byCode, err := repo.GetVerificationByCode(ctx, userID, "123456")
		if err != nil {
			t.Fatalf("failed to get verification by code: %v", err)
		}
		if byCode == nil || byCode.ID != verID {
			t.Errorf("expected verification %s, got %+v", verID, byCode)
		}

		// Lookup by token
		byToken, err := repo.GetVerificationByToken(ctx, ver.Token)
		if err != nil {
			t.Fatalf("failed to get verification by token: %v", err)
		}
		if byToken == nil || byToken.ID != verID {
			t.Errorf("expected verification %s, got %+v", verID, byToken)
		}

		// Mark user verified
		if err := repo.MarkUserVerified(ctx, userID, verID); err != nil {
			t.Fatalf("failed to mark user as verified: %v", err)
		}

		// Verify user status
		verifiedUser, err := repo.GetByID(ctx, userID)
		if err != nil {
			t.Fatalf("failed to fetch user after verification: %v", err)
		}
		if !verifiedUser.IsVerified {
			t.Errorf("expected user to be verified, got false")
		}

		// Verify email_verifications verified_at timestamp
		updatedVer, err := repo.GetVerificationByToken(ctx, ver.Token)
		if err != nil {
			t.Fatalf("failed to fetch updated verification: %v", err)
		}
		if updatedVer.VerifiedAt == nil {
			t.Errorf("expected verified_at to be populated")
		}
	})

	t.Run("GetSettings and UpdateSettings workflow success", func(t *testing.T) {
		userID := uuid.New().String()
		user := &db.User{
			ID:           userID,
			Email:        "settings@example.com",
			PasswordHash: "secret-hash",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("failed to create user: %v", err)
		}

		// Initial settings check
		settings, err := repo.GetSettings(ctx, userID)
		if err != nil {
			t.Fatalf("failed to get initial user settings: %v", err)
		}
		if settings == nil {
			t.Fatalf("expected settings to exist, got nil")
		}
		if settings.Email != "settings@example.com" {
			t.Errorf("expected email settings@example.com, got %s", settings.Email)
		}
		if settings.AvatarID != "initials" {
			t.Errorf("expected default avatar_id 'initials', got %s", settings.AvatarID)
		}
		if settings.PreferredLang != "en" {
			t.Errorf("expected default lang 'en', got %s", settings.PreferredLang)
		}
		if settings.ThemePreference != "system" {
			t.Errorf("expected default theme 'system', got %s", settings.ThemePreference)
		}
		if settings.DefaultTranslationID != "web" {
			t.Errorf("expected default translation 'web', got %s", settings.DefaultTranslationID)
		}

		// Update settings
		err = repo.UpdateSettings(ctx, userID, "Grace Hopper", "quill", "fi", "fi", "dark", "fin-1992")
		if err != nil {
			t.Fatalf("failed to update user settings: %v", err)
		}

		// Verify updated settings
		updated, err := repo.GetSettings(ctx, userID)
		if err != nil {
			t.Fatalf("failed to get updated user settings: %v", err)
		}
		if updated.DisplayName != "Grace Hopper" {
			t.Errorf("expected display_name 'Grace Hopper', got %s", updated.DisplayName)
		}
		if updated.AvatarID != "quill" {
			t.Errorf("expected avatar_id 'quill', got %s", updated.AvatarID)
		}
		if updated.PreferredLang != "fi" {
			t.Errorf("expected preferred_lang 'fi', got %s", updated.PreferredLang)
		}
		if updated.AiLanguage != "fi" {
			t.Errorf("expected ai_language 'fi', got %s", updated.AiLanguage)
		}
		if updated.ThemePreference != "dark" {
			t.Errorf("expected theme_preference 'dark', got %s", updated.ThemePreference)
		}
		if updated.DefaultTranslationID != "fin-1992" {
			t.Errorf("expected default_translation_id 'fin-1992', got %s", updated.DefaultTranslationID)
		}

		// Non-existent user should return error on update
		err = repo.UpdateSettings(ctx, "non-existent-user-id", "Nobody", "initials", "en", "en", "light", "web")
		if err == nil {
			t.Errorf("expected error when updating non-existent user, got nil")
		}

		// Non-existent user should return nil without error on get
		nonExistent, err := repo.GetSettings(ctx, "non-existent-user-id")
		if err != nil {
			t.Fatalf("unexpected error fetching non-existent user settings: %v", err)
		}
		if nonExistent != nil {
			t.Errorf("expected nil for non-existent user, got %+v", nonExistent)
		}
	})

	t.Run("UpdatePasswordHash success", func(t *testing.T) {
		userID := uuid.New().String()
		user := &db.User{
			ID:           userID,
			Email:        "pwd@example.com",
			PasswordHash: "initial-hash",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("failed to create user: %v", err)
		}

		err := repo.UpdatePasswordHash(ctx, userID, "new-bcrypt-hash-value")
		if err != nil {
			t.Fatalf("failed to update password hash: %v", err)
		}

		refetched, err := repo.GetByID(ctx, userID)
		if err != nil {
			t.Fatalf("failed to get user: %v", err)
		}
		if refetched.PasswordHash != "new-bcrypt-hash-value" {
			t.Errorf("expected updated password hash, got %s", refetched.PasswordHash)
		}
	})
}

