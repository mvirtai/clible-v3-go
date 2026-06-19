package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// SavedRepository manages persistence boundaries for both saved searches and analyses.
type SavedRepository struct {
	db *sql.DB
}

// NewSavedRepository constructs a decoupled result-preservation accessor.
func NewSavedRepository(db *sql.DB) *SavedRepository {
	return &SavedRepository{db: db}
}

// SaveSearch strores a parametrized FTS text search workflow
func (r *SavedRepository) SaveSearch(ctx context.Context, s *models.SavedSearch) error {
	query := `
		INSERT INTO saved_searches (id, scope_id, name, query_text, search_scope, scope_value, translation_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	var scopeValue sql.NullString
	if s.ScopeValue != "" {
		scopeValue = sql.NullString{String: s.ScopeValue, Valid: true}
	}

	var translationID sql.NullString
	if s.TranslationID != "" {
		translationID = sql.NullString{String: s.TranslationID, Valid: true}
	}

	_, err := r.db.ExecContext(ctx, query,
		s.ID, s.ScopeID, s.Name, s.QueryText, s.SearchScope, scopeValue, translationID, s.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to persist saved search item: %w", err)
	}
	return nil
}

// GetSearchesByScope retrieves all search parameters associated with a specific context.
func (r *SavedRepository) GetSearchesByScope(ctx context.Context, scopeID string) ([]models.SavedSearch, error) {
	query := `
			SELECT id, scope_id, name, query_text, search_scope, scope_value, translation_id, created_at
			FROM saved_searches WHERE scope_id = ? ORDER BY created_at DESC
		`
	rows, err := r.db.QueryContext(ctx, query, scopeID)
	if err != nil {
		return nil, fmt.Errorf("failed to query saved searches: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var searches []models.SavedSearch
	for rows.Next() {
		var s models.SavedSearch
		var scopeValue sql.NullString
		var translationID sql.NullString

		err := rows.Scan(&s.ID, &s.ScopeID, &s.Name, &s.QueryText, &s.SearchScope, &scopeValue, &translationID, &s.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan saved search row: %w", err)
		}

		s.ScopeValue = scopeValue.String
		s.TranslationID = translationID.String
		searches = append(searches, s)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during saved search row iteration: %w", err)
	}
	return searches, nil
}

// SaveAnalysis persists text statistics or metric analytical payloads.
func (r *SavedRepository) SaveAnalysis(ctx context.Context, a *models.SavedAnalysis) error {
	query := `
			INSERT INTO saved_analyses (id, scope_id, name, reference, analysis_type, translation_id, params_json, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`

	var translationID sql.NullString
	if a.TranslationID != "" {
		translationID = sql.NullString{String: a.TranslationID, Valid: true}
	}

	var paramsJSON sql.NullString
	if a.ParamsJSON != "" {
		paramsJSON = sql.NullString{String: a.ParamsJSON, Valid: true}
	}

	_, err := r.db.ExecContext(ctx, query,
		a.ID, a.ScopeID, a.Name, a.Reference, a.AnalysisType, translationID, paramsJSON, a.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to persist saved analysis record: %w", err)
	}
	return nil
}

// GetAnalysesByScope maps out preserved structural analyses for a target scope.
func (r *SavedRepository) GetAnalysesByScope(ctx context.Context, scopeID string) ([]models.SavedAnalysis, error) {
	query := `
		SELECT id, scope_id, name, reference, analysis_type, translation_id, params_json, created_at
		FROM saved_analyses WHERE scope_id = ? ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, scopeID)
	if err != nil {
		return nil, fmt.Errorf("failed to query saved analyses: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var analyses []models.SavedAnalysis
	for rows.Next() {
		var a models.SavedAnalysis
		var translationID sql.NullString
		var paramsJSON sql.NullString

		err := rows.Scan(&a.ID, &a.ScopeID, &a.Name, &a.Reference, &a.AnalysisType, &translationID, &paramsJSON, &a.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan saved analysis row: %w", err)
		}

		a.TranslationID = translationID.String
		a.ParamsJSON = paramsJSON.String
		analyses = append(analyses, a)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during saved analysis row iteration: %w", err)
	}
	return analyses, nil
}
