// backend/internal/services/auth_service.go
package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/mvirtai/clible-v3-go/internal/db"
)

var (
	ErrInvalidCredentials      = errors.New("invalid email or password")
	ErrEmailNotVerified        = errors.New("email address is not verified")
	ErrInvalidVerificationCode = errors.New("invalid or expired verification code")
	ErrVerificationExpired     = errors.New("verification code has expired")
)

type AuthService struct {
	userRepo      *db.UserRepository
	jwtSecret     []byte
	mailerService MailerService
	baseURL       string
}

func NewAuthService(userRepo *db.UserRepository, jwtSecret string, mailerService MailerService, baseURL string) *AuthService {
	if mailerService == nil {
		mailerService = NewMockMailer()
	}
	if baseURL == "" {
		baseURL = "http://localhost:5173"
	}
	return &AuthService{
		userRepo:      userRepo,
		jwtSecret:     []byte(jwtSecret),
		mailerService: mailerService,
		baseURL:       baseURL,
	}
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateOTP generates a cryptographically secure 6-digit numeric string (e.g., "482910").
func GenerateOTP() (string, error) {
	maxVal := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, maxVal)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// GenerateURLToken generates a 64-character hex-encoded cryptographically secure token.
func GenerateURLToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (s *AuthService) Register(ctx context.Context, email, password, lang string) (*db.User, error) {
	existingUser, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("email is already registered")
	}

	const bcryptCost = 12
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &db.User{
		ID:           uuid.New().String(),
		Email:        email,
		PasswordHash: string(hashedPassword),
		IsVerified:   false,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Create and dispatch email verification
	if err := s.createAndSendVerification(ctx, user, lang); err != nil {
		return user, fmt.Errorf("user created but failed to send verification email: %w", err)
	}

	return user, nil
}

func (s *AuthService) createAndSendVerification(ctx context.Context, user *db.User, lang string) error {
	code, err := GenerateOTP()
	if err != nil {
		return fmt.Errorf("failed to generate verification code: %w", err)
	}

	token, err := GenerateURLToken()
	if err != nil {
		return fmt.Errorf("failed to generate verification token: %w", err)
	}

	verification := &db.EmailVerification{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		Code:      code,
		Token:     token,
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}

	if err := s.userRepo.CreateVerification(ctx, verification); err != nil {
		return fmt.Errorf("failed to store verification record: %w", err)
	}

	return s.mailerService.SendVerificationEmail(ctx, user.Email, code, token, lang, s.baseURL)
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*db.User, string, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", err
	}
	if user == nil {
		return nil, "", ErrInvalidCredentials
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, "", ErrInvalidCredentials
	}

	if !user.IsVerified {
		return user, "", ErrEmailNotVerified
	}

	token, err := s.GenerateToken(user.ID)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *AuthService) VerifyEmail(ctx context.Context, email, code, token string) (*db.User, string, error) {
	var user *db.User
	var verification *db.EmailVerification
	var err error

	if token != "" {
		verification, err = s.userRepo.GetVerificationByToken(ctx, token)
		if err != nil {
			return nil, "", err
		}
		if verification == nil {
			return nil, "", ErrInvalidVerificationCode
		}
		user, err = s.userRepo.GetByID(ctx, verification.UserID)
		if err != nil || user == nil {
			return nil, "", ErrInvalidVerificationCode
		}
	} else if email != "" && code != "" {
		user, err = s.userRepo.GetByEmail(ctx, email)
		if err != nil || user == nil {
			return nil, "", ErrInvalidVerificationCode
		}
		verification, err = s.userRepo.GetVerificationByCode(ctx, user.ID, code)
		if err != nil {
			return nil, "", err
		}
		if verification == nil {
			return nil, "", ErrInvalidVerificationCode
		}
	} else {
		return nil, "", errors.New("either token or email and code must be provided")
	}

	if verification.VerifiedAt != nil {
		if user.IsVerified {
			jwtToken, tokenErr := s.GenerateToken(user.ID)
			return user, jwtToken, tokenErr
		}
	}

	if time.Now().After(verification.ExpiresAt) {
		return nil, "", ErrVerificationExpired
	}

	if err := s.userRepo.MarkUserVerified(ctx, user.ID, verification.ID); err != nil {
		return nil, "", fmt.Errorf("failed to mark user as verified: %w", err)
	}

	user.IsVerified = true
	jwtToken, err := s.GenerateToken(user.ID)
	if err != nil {
		return nil, "", err
	}

	return user, jwtToken, nil
}

func (s *AuthService) ResendVerification(ctx context.Context, email, lang string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil || user == nil {
		return errors.New("user not found")
	}
	if user.IsVerified {
		return errors.New("user is already verified")
	}

	return s.createAndSendVerification(ctx, user, lang)
}

func (s *AuthService) GenerateToken(userID string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "clible-v3-api",
			Audience:  jwt.ClaimStrings{"clible-v3-web"},
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

func (s *AuthService) ValidateToken(tokenString string) (string, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	}, jwt.WithIssuer("clible-v3-api"), jwt.WithAudience("clible-v3-web"))

	if err != nil {
		return "", fmt.Errorf("token validation failed: %w", err)
	}

	if !token.Valid {
		return "", errors.New("invalid token")
	}

	return claims.UserID, nil
}

