package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

type NotebookRepository struct {
	db *sql.DB
}

func NewNotebookRepository(db *sql.DB) *NotebookRepository {
	return &NotebookRepository{db: db}
}

func (r *NotebookRepository) Create(ctx context.Context, nb *models.Notebook) error {
	query := `
		INSERT INTO notebooks (id, title, user_id, scope_id, created_at, updated_at)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query, nb.ID, nb.Title, nb.UserID, nb.ScopeID, nb.CreatedAt, nb.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create notebook: %w", err)
	}
	return nil
}

func (r *NotebookRepository) GetByID(ctx context.Context, id string) (*models.Notebook, error) {
	query := `
		SELECT id, title, user_id, COALESCE(scope_id, ''), created_at, updated_at
		FROM notebooks
		WHERE id = $1
	`
	var nb models.Notebook
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&nb.ID,
		&nb.Title,
		&nb.UserID,
		&nb.ScopeID,
		&nb.CreatedAt,
		&nb.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get notebook by id: %w", err)
	}
	nb.Cells = []models.Cell{}
	return &nb, nil
}

func (r *NotebookRepository) GetByUserID(ctx context.Context, userID string) ([]models.Notebook, error) {
	query := `
		SELECT id, title, user_id, COALESCE(scope_id, ''), created_at, updated_at
		FROM notebooks
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query notebooks by user id: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var notebooks []models.Notebook
	for rows.Next() {
		var nb models.Notebook
		err := rows.Scan(
			&nb.ID,
			&nb.Title,
			&nb.UserID,
			&nb.ScopeID,
			&nb.CreatedAt,
			&nb.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notebook: %w", err)
		}
		nb.Cells = []models.Cell{}
		notebooks = append(notebooks, nb)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error in notebook rows: %w", err)
	}
	return notebooks, nil
}

func (r *NotebookRepository) GetByScopeID(ctx context.Context, scopeID string) ([]models.Notebook, error) {
	if scopeID == "" {
		return []models.Notebook{}, nil
	}
	query := `
		SELECT id, title, user_id, COALESCE(scope_id, ''), created_at, updated_at
		FROM notebooks
		WHERE scope_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, scopeID)
	if err != nil {
		return nil, fmt.Errorf("failed to query notebooks by scope: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var notebooks []models.Notebook
	for rows.Next() {
		var nb models.Notebook
		err := rows.Scan(
			&nb.ID,
			&nb.Title,
			&nb.UserID,
			&nb.ScopeID,
			&nb.CreatedAt,
			&nb.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notebook: %w", err)
		}
		nb.Cells = []models.Cell{}
		notebooks = append(notebooks, nb)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error in notebook rows: %w", err)
	}
	return notebooks, nil
}

func (r *NotebookRepository) Update(ctx context.Context, nb *models.Notebook) error {
	query := `
		UPDATE notebooks
		SET title = $1, scope_id = NULLIF($2, ''), updated_at = $3
		WHERE id = $4
	`
	_, err := r.db.ExecContext(ctx, query, nb.Title, nb.ScopeID, nb.UpdatedAt, nb.ID)
	if err != nil {
		return fmt.Errorf("failed to update notebook: %w", err)
	}
	return nil
}

func (r *NotebookRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM notebooks WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete notebook: %w", err)
	}
	return nil
}

func (r *NotebookRepository) SaveCells(ctx context.Context, notebookID string, cells []models.Cell) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start transaction to save cells: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.ExecContext(ctx, "DELETE FROM notebook_cells WHERE notebook_id = $1", notebookID)
	if err != nil {
		return fmt.Errorf("failed to delete old cells: %w", err)
	}

	query := `
		INSERT INTO notebook_cells (id, notebook_id, content, cell_type, result_json, position, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	now := time.Now()
	for i, cell := range cells {
		if cell.ID == "" {
			cell.ID = uuid.New().String()
		}
		cAt := cell.CreatedAt
		if cAt.IsZero() {
			cAt = now
		}
		uAt := cell.UpdatedAt
		if uAt.IsZero() {
			uAt = now
		}

		var resultJSON []byte
		if cell.ResultJSON != nil {
			resultJSON = cell.ResultJSON
		}

		_, err = tx.ExecContext(ctx, query,
			cell.ID,
			notebookID,
			cell.Content,
			cell.Type,
			resultJSON,
			i,
			cAt,
			uAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert cell at position %d: %w", i, err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit save cells transaction: %w", err)
	}
	return nil
}

func (r *NotebookRepository) GetCells(ctx context.Context, notebookID string) ([]models.Cell, error) {
	query := `
		SELECT id, notebook_id, content, cell_type, result_json, position, created_at, updated_at
		FROM notebook_cells
		WHERE notebook_id = $1
		ORDER BY position ASC
	`
	rows, err := r.db.QueryContext(ctx, query, notebookID)
	if err != nil {
		return nil, fmt.Errorf("failed to query cells: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var cells []models.Cell
	for rows.Next() {
		var cell models.Cell
		var resultJSON []byte
		err := rows.Scan(
			&cell.ID,
			&cell.NotebookID,
			&cell.Content,
			&cell.Type,
			&resultJSON,
			&cell.Position,
			&cell.CreatedAt,
			&cell.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan cell: %w", err)
		}
		if resultJSON != nil {
			cell.ResultJSON = json.RawMessage(resultJSON)
		}
		cells = append(cells, cell)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error in cell rows: %w", err)
	}
	return cells, nil
}

func (r *NotebookRepository) UpdateCellResult(ctx context.Context, cellID string, resultJSON []byte) error {
	query := `
		UPDATE notebook_cells
		SET result_json = $1, updated_at = $2
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, resultJSON, time.Now(), cellID)
	if err != nil {
		return fmt.Errorf("failed to update cell result: %w", err)
	}
	return nil
}
