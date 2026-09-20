package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type User struct {
	ID                   string    `json:"id"`
	Email                string    `json:"email"`
	DisplayName          string    `json:"displayName"`
	PreferredLang        string    `json:"preferredLang"`
	ThemePreference      string    `json:"themePreference"`
	DefaultTranslationID string    `json:"defaultTranslationId"`
	SubscriptionTier     string    `json:"subscriptionTier"`
	SubscriptionStatus   string    `json:"subscriptionStatus"`
	PasswordHash         string    `json:"-"`
	IsVerified           bool      `json:"isVerified"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type EmailVerification struct {
	ID         string     `json:"id"`
	UserID     string     `json:"userId"`
	Code       string     `json:"code"`
	Token      string     `json:"token"`
	CreatedAt  time.Time  `json:"createdAt"`
	ExpiresAt  time.Time  `json:"expiresAt"`
	VerifiedAt *time.Time `json:"verifiedAt"`
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (id, email, password_hash, is_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, query, user.ID, user.Email, user.PasswordHash, user.IsVerified, user.CreatedAt, user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// Automatically link default translations for the new user
	defaultLinkQuery := `
		INSERT INTO user_translations (user_id, translation_id)
		SELECT $1, id FROM translations
		WHERE id IN ('web', 'kjv', 'fin-1992', 'fin-biblia-33-38', 'fin-1776', 'sblgnt', 'heb-leningrad')
		ON CONFLICT (user_id, translation_id) DO NOTHING
	`
	_, _ = r.db.ExecContext(ctx, defaultLinkQuery, user.ID)

	return nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT id, email, password_hash, is_verified, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	var user User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil // Käyttäjää ei löydy
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*User, error) {
	query := `
		SELECT id, email, password_hash, is_verified, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}

	return &user, nil
}

func (r *UserRepository) CreateVerification(ctx context.Context, v *EmailVerification) error {
	query := `
		INSERT INTO email_verifications (id, user_id, code, token, created_at, expires_at, verified_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	now := time.Now()
	v.CreatedAt = now

	_, err := r.db.ExecContext(ctx, query, v.ID, v.UserID, v.Code, v.Token, v.CreatedAt, v.ExpiresAt, v.VerifiedAt)
	if err != nil {
		return fmt.Errorf("failed to create email verification: %w", err)
	}
	return nil
}

func (r *UserRepository) GetVerificationByCode(ctx context.Context, userID, code string) (*EmailVerification, error) {
	query := `
		SELECT id, user_id, code, token, created_at, expires_at, verified_at
		FROM email_verifications
		WHERE user_id = $1 AND code = $2
		ORDER BY created_at DESC
		LIMIT 1
	`
	var v EmailVerification
	err := r.db.QueryRowContext(ctx, query, userID, code).Scan(
		&v.ID,
		&v.UserID,
		&v.Code,
		&v.Token,
		&v.CreatedAt,
		&v.ExpiresAt,
		&v.VerifiedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get verification by code: %w", err)
	}
	return &v, nil
}

func (r *UserRepository) GetVerificationByToken(ctx context.Context, token string) (*EmailVerification, error) {
	query := `
		SELECT id, user_id, code, token, created_at, expires_at, verified_at
		FROM email_verifications
		WHERE token = $1
		LIMIT 1
	`
	var v EmailVerification
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&v.ID,
		&v.UserID,
		&v.Code,
		&v.Token,
		&v.CreatedAt,
		&v.ExpiresAt,
		&v.VerifiedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get verification by token: %w", err)
	}
	return &v, nil
}

func (r *UserRepository) MarkUserVerified(ctx context.Context, userID string, verificationID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now()

	updateUserQuery := `UPDATE users SET is_verified = TRUE, updated_at = $1 WHERE id = $2`
	if _, err := tx.ExecContext(ctx, updateUserQuery, now, userID); err != nil {
		return fmt.Errorf("failed to update user verification status: %w", err)
	}

	if verificationID != "" {
		updateVerQuery := `UPDATE email_verifications SET verified_at = $1 WHERE id = $2`
		if _, err := tx.ExecContext(ctx, updateVerQuery, now, verificationID); err != nil {
			return fmt.Errorf("failed to mark verification as verified: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	return nil
}

// USER SETTINGS CRUD

// GetSettings retrieves the profile and preference settings for specified user.
func (r *UserRepository) GetSettings(ctx context.Context, userID string) (*User, error) {
	query := `
		SELECT id, email, display_name, preferred_lang, theme_preference,
			   default_translation_id, subscription_tier, subscription_status,
			   is_verified, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u User
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&u.ID,
		&u.Email,
		&u.DisplayName,
		&u.PreferredLang,
		&u.ThemePreference,
		&u.DefaultTranslationID,
		&u.SubscriptionTier,
		&u.SubscriptionStatus,
		&u.IsVerified,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user settings: %w", err)
	}

	return &u, nil
}

// UpdateSettings uodates user display name and workspace preferences
func (r *UserRepository) UpdateSettings(ctx context.Context, userID, displayName, preferredLang, theme, defaultTransID string) error {
	query := `
		UPDATE users
		SET display_name = $1, preferred_lang = $2, theme_preference = $3,
			default_translation_id = $4, updated_at = $5
		WHERE id = $6
	`
	now := time.Now()
	res, err := r.db.ExecContext(ctx, query, displayName, preferredLang, theme, defaultTransID, now, userID)
	if err != nil {
		return fmt.Errorf("failed to update user settings: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to inspect rows affected: %w", err)
	}
	if rows == 0 {
		return errors.New("user not found")
	}

	return nil
}

// UpdatePasswordHash updates the password hash for the specified user.
func (r *UserRepository) UpdatePasswordHash(ctx context.Context, userID, newHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, newHash, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("faoled to update password hash: %w", err)
	}

	return nil
}
