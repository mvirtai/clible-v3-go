package services_test

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func setupAuthService(t *testing.T) (*services.AuthService, *db.UserRepository) {
	t.Helper()
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test db: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	userRepo := db.NewUserRepository(conn)
	authSvc := services.NewAuthService(userRepo, "test-jwt-secret-32-chars-long!")
	return authSvc, userRepo
}

func TestAuthService_Register(t *testing.T) {
	authSvc, _ := setupAuthService(t)
	ctx := context.Background()

	t.Run("successfully registers a new user", func(t *testing.T) {
		user, err := authSvc.Register(ctx, "test@example.com", "Password123!")
		if err != nil {
			t.Fatalf("unexpected error registering user: %v", err)
		}
		if user == nil || user.ID == "" {
			t.Fatalf("expected valid user struct with ID, got %+v", user)
			return
		}
		if user.Email != "test@example.com" {
			t.Errorf("expected email 'test@example.com', got %s", user.Email)
		}
		if user.PasswordHash == "" || user.PasswordHash == "Password123!" {
			t.Errorf("expected password to be hashed, got %s", user.PasswordHash)
		}
	})

	t.Run("rejects registration with duplicate email", func(t *testing.T) {
		_, err := authSvc.Register(ctx, "test@example.com", "Password123!")
		if err == nil {
			t.Errorf("expected error when registering duplicate email, got nil")
		}
	})
}

func TestAuthService_Login(t *testing.T) {
	authSvc, _ := setupAuthService(t)
	ctx := context.Background()

	_, err := authSvc.Register(ctx, "login@example.com", "SecretPass123!")
	if err != nil {
		t.Fatalf("failed to register user for login test: %v", err)
	}

	t.Run("successfully logs in with valid credentials", func(t *testing.T) {
		user, token, err := authSvc.Login(ctx, "login@example.com", "SecretPass123!")
		if err != nil {
			t.Fatalf("unexpected error during login: %v", err)
		}
		if user == nil {
			t.Fatalf("expected logged in user struct, got nil")
			return
		}
		if user.Email != "login@example.com" {
			t.Errorf("expected logged in user struct, got %+v", user)
		}
		if token == "" {
			t.Errorf("expected non-empty JWT token string")
		}

		// Validate the issued token
		validatedUserID, err := authSvc.ValidateToken(token)
		if err != nil {
			t.Fatalf("failed to validate newly issued token: %v", err)
		}
		if validatedUserID != user.ID {
			t.Errorf("expected token user ID %s, got %s", user.ID, validatedUserID)
		}
	})

	t.Run("rejects login with non-existent email", func(t *testing.T) {
		_, _, err := authSvc.Login(ctx, "unknown@example.com", "SecretPass123!")
		if err != services.ErrInvalidCredentials {
			t.Errorf("expected ErrInvalidCredentials, got %v", err)
		}
	})

	t.Run("rejects login with wrong password", func(t *testing.T) {
		_, _, err := authSvc.Login(ctx, "login@example.com", "WrongPassword123!")
		if err != services.ErrInvalidCredentials {
			t.Errorf("expected ErrInvalidCredentials, got %v", err)
		}
	})
}

func TestAuthService_Tokens(t *testing.T) {
	authSvc, _ := setupAuthService(t)

	t.Run("validates genuine token correctly", func(t *testing.T) {
		token, err := authSvc.GenerateToken("user-id-999")
		if err != nil {
			t.Fatalf("GenerateToken failed: %v", err)
		}

		userID, err := authSvc.ValidateToken(token)
		if err != nil {
			t.Fatalf("ValidateToken failed: %v", err)
		}
		if userID != "user-id-999" {
			t.Errorf("expected user ID 'user-id-999', got %s", userID)
		}
	})

	t.Run("rejects tampered token", func(t *testing.T) {
		token, err := authSvc.GenerateToken("user-id-999")
		if err != nil {
			t.Fatalf("GenerateToken failed: %v", err)
		}

		tamperedToken := token + "tampered"
		_, err = authSvc.ValidateToken(tamperedToken)
		if err == nil {
			t.Errorf("expected error for tampered token, got nil")
		}
	})

	t.Run("rejects token signed with different secret", func(t *testing.T) {
		otherSvc := services.NewAuthService(nil, "completely-different-secret-key!")
		foreignToken, err := otherSvc.GenerateToken("user-id-999")
		if err != nil {
			t.Fatalf("foreign GenerateToken failed: %v", err)
		}

		_, err = authSvc.ValidateToken(foreignToken)
		if err == nil {
			t.Errorf("expected error for foreign-signed token, got nil")
		}
	})

	t.Run("rejects token with unexpected signing method", func(t *testing.T) {
		// Create an unsigned or None-algorithm token
		token := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{
			"user_id": "fake-user",
		})
		tokenString, _ := token.SignedString(jwt.UnsafeAllowNoneSignatureType)

		_, err := authSvc.ValidateToken(tokenString)
		if err == nil {
			t.Errorf("expected error for token with None algorithm, got nil")
		}
	})

	t.Run("rejects expired token", func(t *testing.T) {
		claims := &services.Claims{
			UserID: "expired-user",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				Issuer:    "clible-v3-api",
				Audience:  jwt.ClaimStrings{"clible-v3-web"},
				Subject:   "expired-user",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		expiredToken, err := token.SignedString([]byte("test-jwt-secret-32-chars-long!"))
		if err != nil {
			t.Fatalf("failed to sign expired token: %v", err)
		}

		_, err = authSvc.ValidateToken(expiredToken)
		if err == nil {
			t.Errorf("expected error for expired token, got nil")
		}
	})
}
