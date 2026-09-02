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
	mailer := services.NewMockMailer()
	authSvc := services.NewAuthService(userRepo, "test-jwt-secret-32-chars-long!", mailer, "http://localhost:5173")
	return authSvc, userRepo
}

func TestAuthService_Generators(t *testing.T) {
	t.Run("GenerateOTP produces 6 digits", func(t *testing.T) {
		otp, err := services.GenerateOTP()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(otp) != 6 {
			t.Errorf("expected 6-digit OTP, got '%s'", otp)
		}
	})

	t.Run("GenerateURLToken produces 64 chars", func(t *testing.T) {
		token, err := services.GenerateURLToken()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(token) != 64 {
			t.Errorf("expected 64-char token, got len %d", len(token))
		}
	})
}

func TestAuthService_Register(t *testing.T) {
	authSvc, userRepo := setupAuthService(t)
	ctx := context.Background()

	t.Run("successfully registers a new unverified user", func(t *testing.T) {
		user, err := authSvc.Register(ctx, "test@example.com", "Password123!", "fi")
		if err != nil {
			t.Fatalf("unexpected error registering user: %v", err)
		}
		if user == nil || user.ID == "" {
			t.Fatalf("expected valid user struct with ID, got %+v", user)
		}
		if user.Email != "test@example.com" {
			t.Errorf("expected email 'test@example.com', got %s", user.Email)
		}
		if user.IsVerified {
			t.Errorf("expected new user to be unverified, got true")
		}

		// Verify that a verification code was created
		storedUser, err := userRepo.GetByEmail(ctx, "test@example.com")
		if err != nil || storedUser == nil {
			t.Fatalf("failed to fetch user from repo: %v", err)
		}
	})

	t.Run("rejects registration with duplicate email", func(t *testing.T) {
		_, err := authSvc.Register(ctx, "test@example.com", "Password123!", "fi")
		if err == nil {
			t.Errorf("expected error when registering duplicate email, got nil")
		}
	})
}

func TestAuthService_LoginAndVerify(t *testing.T) {
	authSvc, userRepo := setupAuthService(t)
	ctx := context.Background()

	user, err := authSvc.Register(ctx, "login@example.com", "SecretPass123!", "fi")
	if err != nil {
		t.Fatalf("failed to register user: %v", err)
	}

	t.Run("rejects login for unverified user", func(t *testing.T) {
		_, _, err := authSvc.Login(ctx, "login@example.com", "SecretPass123!")
		if err != services.ErrEmailNotVerified {
			t.Errorf("expected ErrEmailNotVerified, got %v", err)
		}
	})

	t.Run("rejects login with wrong password", func(t *testing.T) {
		_, _, err := authSvc.Login(ctx, "login@example.com", "WrongPassword123!")
		if err != services.ErrInvalidCredentials {
			t.Errorf("expected ErrInvalidCredentials, got %v", err)
		}
	})

	t.Run("verifies user with OTP code and allows login", func(t *testing.T) {
		verCode := "654321"
		verToken := "token1234567890123456789012345678901234567890123456789012345678901234"
		_ = userRepo.CreateVerification(ctx, &db.EmailVerification{
			ID:        "ver-id-1",
			UserID:    user.ID,
			Code:      verCode,
			Token:     verToken,
			ExpiresAt: time.Now().Add(15 * time.Minute),
		})

		verifiedUser, token, err := authSvc.VerifyEmail(ctx, "login@example.com", verCode, "")
		if err != nil {
			t.Fatalf("VerifyEmail failed: %v", err)
		}
		if !verifiedUser.IsVerified {
			t.Errorf("expected user to be verified, got false")
		}
		if token == "" {
			t.Errorf("expected valid jwt token")
		}

		// Now login should succeed
		loggedInUser, loginToken, err := authSvc.Login(ctx, "login@example.com", "SecretPass123!")
		if err != nil {
			t.Fatalf("Login failed after verification: %v", err)
		}
		if loggedInUser.ID != user.ID || loginToken == "" {
			t.Errorf("login failed to return valid user and token")
		}
	})

	t.Run("verifies user with link token", func(t *testing.T) {
		user2, err := authSvc.Register(ctx, "user2@example.com", "SecretPass123!", "en")
		if err != nil {
			t.Fatalf("failed to register user2: %v", err)
		}

		verToken := "user2-token-64-bytes-long-string-for-email-verification-testing-12"
		_ = userRepo.CreateVerification(ctx, &db.EmailVerification{
			ID:        "ver-id-2",
			UserID:    user2.ID,
			Code:      "999888",
			Token:     verToken,
			ExpiresAt: time.Now().Add(15 * time.Minute),
		})

		verifiedUser, token, err := authSvc.VerifyEmail(ctx, "", "", verToken)
		if err != nil {
			t.Fatalf("VerifyEmail by token failed: %v", err)
		}
		if !verifiedUser.IsVerified {
			t.Errorf("expected user2 to be verified")
		}
		if token == "" {
			t.Errorf("expected token to be returned")
		}
	})

	t.Run("rejects expired verification code", func(t *testing.T) {
		user3, err := authSvc.Register(ctx, "user3@example.com", "SecretPass123!", "fi")
		if err != nil {
			t.Fatalf("failed to register user3: %v", err)
		}

		verToken := "expired-token-64-bytes-long-string-for-email-verification-testing"
		_ = userRepo.CreateVerification(ctx, &db.EmailVerification{
			ID:        "ver-id-3",
			UserID:    user3.ID,
			Code:      "111222",
			Token:     verToken,
			ExpiresAt: time.Now().Add(-5 * time.Minute), // expired
		})

		_, _, err = authSvc.VerifyEmail(ctx, "", "", verToken)
		if err != services.ErrVerificationExpired {
			t.Errorf("expected ErrVerificationExpired, got %v", err)
		}
	})

	t.Run("resend verification code works for unverified user", func(t *testing.T) {
		user4, err := authSvc.Register(ctx, "user4@example.com", "SecretPass123!", "fi")
		if err != nil {
			t.Fatalf("failed to register user4: %v", err)
		}

		err = authSvc.ResendVerification(ctx, user4.Email, "fi")
		if err != nil {
			t.Fatalf("unexpected error resending verification: %v", err)
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
		otherSvc := services.NewAuthService(nil, "completely-different-secret-key!", nil, "")
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

