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

// Save inserts a parameterized search record into the SQLite database.
func (r *SearchHistoryRepository) Save(ctx context.Context, h *models.SearchHistory) error {
	query := `
		INSERT INTO search_history (id, query_text, search_scope, scope_value, translation_id, mode, result_count, searched_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

	_, err := r.db.ExecContext(ctx, query,
		h.ID,
		h.QueryText,
		h.SearchScope,
		scopeValue,    // Passes NULL if empty
		translationID, // Passes NULL if empty, bypassing FK triggers safely
		h.Mode,
		h.ResultCount,
		h.SearchedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to save search history item: %w", err)
	}

	return nil
}

// GetLatest fetches historical records sorted by time sequence up to the specified limit.
func (r *SearchHistoryRepository) GetLatest(ctx context.Context, limit int) ([]models.SearchHistory, error) {
	query := `
		SELECT id, query_text, search_scope, scope_value, translation_id, mode, result_count, searched_at
		FROM search_history
		ORDER BY searched_at DESC
		LIMIT ?
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query for search history: %w", err)
	}
	defer rows.Close()

	var history []models.SearchHistory
	for rows.Next() {
		var h models.SearchHistory
		var scopeValue sql.NullString
		var translationID sql.NullString

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
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan search history row: %w", err)
		}

		// Re-map back into standard expressive Go strings inside data translation boundaries
		h.ScopeValue = scopeValue.String       // Automatically defaults to "" if NULL
		h.TranslationID = translationID.String // Automatically defaults to "" if NULL

		history = append(history, h)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during search history row iteration: %w", err)
	}

	return history, nil
}
