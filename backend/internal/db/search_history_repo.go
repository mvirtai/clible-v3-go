package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// SearchHistoryRepository manages domain persistence boundaries for user search tracking.
type SearchHistoryRepository struct {
	db *sql.DB
}

// NewSearchHistoryRepository constructs a decoupled history database accessor.
func NewSearchHistoryRepository(db *sql.DB) *SearchHistoryRepository {
	return &SearchHistoryRepository{db: db}
}

// Save inserts a parameterized search record into the database.
func (r *SearchHistoryRepository) Save(ctx context.Context, h *models.SearchHistory) error {
	query := `
		INSERT INTO search_history (id, query_text, search_scope, scope_value, translation_id, mode, result_count, searched_at, user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	// Convert empty strings to valid SQL NULL parameters to preserve Foreign Key integrity rules
	var scopeValue sql.NullString
	if h.ScopeValue != "" {
		scopeValue = sql.NullString{String: h.ScopeValue, Valid: true}
	}

	var translationID sql.NullString
	if h.TranslationID != "" {
		translationID = sql.NullString{String: h.TranslationID, Valid: true}
	}

	var userID sql.NullString
	if h.UserID != "" {
		userID = sql.NullString{String: h.UserID, Valid: true}
	}

	_, err := r.db.ExecContext(ctx, query,
		h.ID,
		h.QueryText,
		h.SearchScope,
		scopeValue,    // Passes NULL if empty
		translationID, // Passes NULL if empty, bypassing FK triggers safely
		h.Mode,
		h.ResultCount,
		h.SearchedAt,
		userID,        // Passes NULL if empty for backward compatibility
	)
	if err != nil {
		return fmt.Errorf("failed to save search history item: %w", err)
	}

	return nil
}

// GetLatest fetches historical records for a user sorted by time sequence up to the specified limit.
func (r *SearchHistoryRepository) GetLatest(ctx context.Context, userID string, limit int) ([]models.SearchHistory, error) {
	query := `
		SELECT id, query_text, search_scope, scope_value, translation_id, mode, result_count, searched_at, user_id
		FROM search_history
		WHERE user_id = $1
		ORDER BY searched_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query for search history: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var history []models.SearchHistory
	for rows.Next() {
		var h models.SearchHistory
		var scopeValue sql.NullString
		var translationID sql.NullString
		var uID sql.NullString

		// Scan into nullable types to safely intercept SQL NULL tokens without throwing scanning panics
		err := rows.Scan(
			&h.ID,
			&h.QueryText,
			&h.SearchScope,
			&scopeValue,
			&translationID,
			&h.Mode,
			&h.ResultCount,
			&h.SearchedAt,
			&uID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan search history row: %w", err)
		}

		// Re-map back into standard expressive Go strings inside data translation boundaries
		h.ScopeValue = scopeValue.String       // Automatically defaults to "" if NULL
		h.TranslationID = translationID.String // Automatically defaults to "" if NULL
		h.UserID = uID.String                  // Automatically defaults to "" if NULL

		history = append(history, h)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during search history row iteration: %w", err)
	}

	return history, nil
}
