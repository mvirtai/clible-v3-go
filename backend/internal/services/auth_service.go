// backend/internal/services/auth_service.go
package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/mvirtai/clible-v3-go/internal/db"
)

var ErrInvalidCredentials = errors.New("invalid email or password")

type AuthService struct {
	userRepo  *db.UserRepository
	jwtSecret []byte
}

func NewAuthService(userRepo *db.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
	}
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func (s *AuthService) Register(ctx context.Context, email, password string) (*db.User, error) {
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
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
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

	token, err := s.GenerateToken(user.ID)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
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
