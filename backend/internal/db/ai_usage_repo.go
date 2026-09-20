package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// AiUsageRepository manages persistence and analytics for AI token consumption.
type AiUsageRepository interface {
	RecordUsage(ctx context.Context, u *models.AiTokenUsage) error
	GetUserStats(ctx context.Context, userID string, since time.Time) (*models.AiUsageStats, error)
	GetGuestStats(ctx context.Context, since time.Time) (*models.AiUsageStats, error)
	GetGlobalSummary(ctx context.Context, since time.Time) (*models.AiUsageSummary, error)
}

// aiUsageRepositoryImpl implements AiUsageRepository using *sql.DB.
type aiUsageRepositoryImpl struct {
	db *sql.DB
}

// NewAiUsageRepository constructs a new AI usage repository instance.
func NewAiUsageRepository(db *sql.DB) AiUsageRepository {
	return &aiUsageRepositoryImpl{db: db}
}

// RecordUsage inserts an AI token consumption record into the database.
func (r *aiUsageRepositoryImpl) RecordUsage(ctx context.Context, u *models.AiTokenUsage) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}

	var userID sql.NullString
	if u.UserID != nil && *u.UserID != "" {
		userID = sql.NullString{String: *u.UserID, Valid: true}
	}

	var guestID sql.NullString
	if u.GuestID != nil && *u.GuestID != "" {
		guestID = sql.NullString{String: *u.GuestID, Valid: true}
	}

	query := `
		INSERT INTO ai_token_usage (
			id, user_id, guest_id, feature, model,
			prompt_tokens, candidates_tokens, total_tokens, cached_tokens, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.ExecContext(ctx, query,
		u.ID,
		userID,
		guestID,
		u.Feature,
		u.Model,
		u.PromptTokens,
		u.CandidatesTokens,
		u.TotalTokens,
		u.CachedTokens,
		u.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to record AI token usage: %w", err)
	}

	return nil
}

// GetUserStats returns aggregated token consumption metrics for a specific authenticated user.
func (r *aiUsageRepositoryImpl) GetUserStats(ctx context.Context, userID string, since time.Time) (*models.AiUsageStats, error) {
	query := `
		SELECT 
			COUNT(*),
			COALESCE(SUM(prompt_tokens), 0),
			COALESCE(SUM(candidates_tokens), 0),
			COALESCE(SUM(total_tokens), 0),
			COALESCE(SUM(cached_tokens), 0)
		FROM ai_token_usage
		WHERE user_id = $1 AND created_at >= $2
	`

	var stats models.AiUsageStats
	err := r.db.QueryRowContext(ctx, query, userID, since).Scan(
		&stats.TotalCalls,
		&stats.TotalPromptTokens,
		&stats.TotalCandTokens,
		&stats.TotalTokens,
		&stats.CachedTokens,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query user AI usage stats: %w", err)
	}

	return &stats, nil
}

// GetGuestStats returns aggregated token consumption metrics for guest users (user_id IS NULL).
func (r *aiUsageRepositoryImpl) GetGuestStats(ctx context.Context, since time.Time) (*models.AiUsageStats, error) {
	query := `
		SELECT 
			COUNT(*),
			COALESCE(SUM(prompt_tokens), 0),
			COALESCE(SUM(candidates_tokens), 0),
			COALESCE(SUM(total_tokens), 0),
			COALESCE(SUM(cached_tokens), 0)
		FROM ai_token_usage
		WHERE user_id IS NULL AND created_at >= $1
	`

	var stats models.AiUsageStats
	err := r.db.QueryRowContext(ctx, query, since).Scan(
		&stats.TotalCalls,
		&stats.TotalPromptTokens,
		&stats.TotalCandTokens,
		&stats.TotalTokens,
		&stats.CachedTokens,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query guest AI usage stats: %w", err)
	}

	return &stats, nil
}

// GetGlobalSummary returns system-wide token statistics broken down by users, guests, and features.
func (r *aiUsageRepositoryImpl) GetGlobalSummary(ctx context.Context, since time.Time) (*models.AiUsageSummary, error) {
	summary := &models.AiUsageSummary{
		ByFeature: make(map[string]models.AiUsageStats),
	}

	// 1. Authenticated users summary
	userQuery := `
		SELECT 
			COUNT(*),
			COALESCE(SUM(prompt_tokens), 0),
			COALESCE(SUM(candidates_tokens), 0),
			COALESCE(SUM(total_tokens), 0),
			COALESCE(SUM(cached_tokens), 0)
		FROM ai_token_usage
		WHERE user_id IS NOT NULL AND created_at >= $1
	`
	err := r.db.QueryRowContext(ctx, userQuery, since).Scan(
		&summary.UserStats.TotalCalls,
		&summary.UserStats.TotalPromptTokens,
		&summary.UserStats.TotalCandTokens,
		&summary.UserStats.TotalTokens,
		&summary.UserStats.CachedTokens,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query global user stats: %w", err)
	}

	// 2. Guest users summary
	guestStats, err := r.GetGuestStats(ctx, since)
	if err != nil {
		return nil, err
	}
	summary.GuestStats = *guestStats

	// 3. Overall global stats
	globalQuery := `
		SELECT 
			COUNT(*),
			COALESCE(SUM(prompt_tokens), 0),
			COALESCE(SUM(candidates_tokens), 0),
			COALESCE(SUM(total_tokens), 0),
			COALESCE(SUM(cached_tokens), 0)
		FROM ai_token_usage
		WHERE created_at >= $1
	`
	err = r.db.QueryRowContext(ctx, globalQuery, since).Scan(
		&summary.GlobalStats.TotalCalls,
		&summary.GlobalStats.TotalPromptTokens,
		&summary.GlobalStats.TotalCandTokens,
		&summary.GlobalStats.TotalTokens,
		&summary.GlobalStats.CachedTokens,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query global overall stats: %w", err)
	}

	// 4. Breakdown by feature
	featureQuery := `
		SELECT 
			feature,
			COUNT(*),
			COALESCE(SUM(prompt_tokens), 0),
			COALESCE(SUM(candidates_tokens), 0),
			COALESCE(SUM(total_tokens), 0),
			COALESCE(SUM(cached_tokens), 0)
		FROM ai_token_usage
		WHERE created_at >= $1
		GROUP BY feature
	`
	rows, err := r.db.QueryContext(ctx, featureQuery, since)
	if err != nil {
		return nil, fmt.Errorf("failed to query stats by feature: %w", err)
	}
	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var feat string
		var fStats models.AiUsageStats
		if err := rows.Scan(
			&feat,
			&fStats.TotalCalls,
			&fStats.TotalPromptTokens,
			&fStats.TotalCandTokens,
			&fStats.TotalTokens,
			&fStats.CachedTokens,
		); err != nil {
			return nil, fmt.Errorf("failed to scan feature stats row: %w", err)
		}
		summary.ByFeature[feat] = fStats
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during feature stats iteration: %w", err)
	}

	return summary, nil
}
