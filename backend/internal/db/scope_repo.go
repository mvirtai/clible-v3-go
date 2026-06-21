package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// ScopeRepository manages domain persistence boundaries for study contexts.
type ScopeRepository struct {
	db *sql.DB
}

// NewScopeRepository constructs a fresh scope data-store client.
func NewScopeRepository(db *sql.DB) *ScopeRepository {
	return &ScopeRepository{db: db}
}

// Create inserts a fresh research scope context into the SQLite state.
func (r *ScopeRepository) Create(ctx context.Context, s *models.Scope) error {
	query := `INSERT INTO scopes (id, name, created_at) VALUES (?, ?, ?)`

	_, err := r.db.ExecContext(ctx, query, s.ID, s.Name, s.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert scope: %w", err)
	}
	return nil
}

// GetAll retrieves all registered research scopes sorted by creation time.
func (r *ScopeRepository) GetAll(ctx context.Context) ([]models.Scope, error) {
	query := `SELECT id, name, created_at FROM scopes ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query scopes: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var scopes []models.Scope
	for rows.Next() {
		var s models.Scope
		if err := rows.Scan(&s.ID, &s.Name, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan scope row: %w", err)
		}
		scopes = append(scopes, s)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during scope row iteration: %w", err)
	}

	return scopes, nil
}

// Delete removes a scope record. Downstream saved items are destroyed via cascade constraints.
func (r *ScopeRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM scopes WHERE id = ?`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete scope: %w", err)
	}
	return nil
}
