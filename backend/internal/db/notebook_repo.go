package db

import (
	"context"
	"fmt"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// NotebookRepository handles database operations for notebooks and cells.
type NotebookRepository struct {
	db *Database
}

// NewNotebookRepository constructs a notebook repository with database context.
func NewNotebookRepository(db *Database) *NotebookRepository {
	return &NotebookRepository{db: db}
}

// Create inserts a new notebook into the database.
func (r *NotebookRepository) Create(ctx context.Context, nb *models.Notebook) error {
	query := `
		INSERT INTO notebooks (id, title, user_id, scope_id, create_at, update_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query, nb.ID, nb.Title, nb.UserID, nb.ScopeID, nb.CreatedAt, nb.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create notebook: %w", err)
	}
	return nil
}

// GetByID retrieves a notebook by its ID.
func (r *NotebookRepository) GetByID(ctx context.Context, id string) (*models.Notebook, error) {
	query := `
		SELECT id, title, user_id, COALESCE(scope_id, ''), create_at, update_at
		FROM notebooks
		WHERE id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)
	var nb models.Notebook
	err := row.Scan(&nb.ID, &nb.Title, &nb.UserID, &nb.ScopeID, &nb.CreatedAt, &nb.UpdatedAt)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get notebook: %w", err)
	}
	nb.Cells = []models.Cell{}
	return &nb, nil
}

// GetByUserID retrieves all notebooks for a user.
func (r *NotebookRepository) GetByUserID(ctx context.Context, userID string) ([]models.Notebook, error) {
	query := `
		SELECT id, title, user_id, COALESCE(scope_id, ''), create_at, update_at
		FROM notebooks
		WHERE user_id = $1
		ORDER BY create_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query notebooks by user: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var notebooks []models.Notebook
	for rows.Next() {
		var nb models.Notebook
		err := rows.Scan(&nb.ID, &nb.Title, &nb.UserID, &nb.ScopeID, &nb.CreatedAt, &nb.UpdatedAt)
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

// GetByScopeID retrieves all notebooks scoped to a specific workspace.
// FIX #3: New method to support ScopeWorkspace aggregation.
func (r *NotebookRepository) GetByScopeID(ctx context.Context, scopeID string) ([]models.Notebook, error) {
	if scopeID == "" {
		return []models.Notebook{}, nil
	}
	query := `
		SELECT id, title, user_id, COALESCE(scope_id, ''), create_at, update_at
		FROM notebooks
		WHERE scope_id = $1
		ORDER BY create_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, scopeID)
	if err != nil {
		return nil, fmt.Errorf("failed to query notebooks by scope: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var notebooks []models.Notebook
	for rows.Next() {
		var nb models.Notebook
		err := rows.Scan(&nb.ID, &nb.Title, &nb.UserID, &nb.ScopeID, &nb.CreatedAt, &nb.UpdatedAt)
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

// Update modifies an existing notebook's title and scope.
func (r *NotebookRepository) Update(ctx context.Context, nb *models.Notebook) error {
	query := `
		UPDATE notebooks
		SET title = $1, scope_id = NULLIF($2, ''), update_at = $3
		WHERE id = $4
	`
	_, err := r.db.ExecContext(ctx, query, nb.Title, nb.ScopeID, nb.UpdatedAt, nb.ID)
	if err != nil {
		return fmt.Errorf("failed to update notebook: %w", err)
	}
	return nil
}

// Delete removes a notebook and its cells.
func (r *NotebookRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM notebooks WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete notebook: %w", err)
	}
	return nil
}

// SaveCells atomically replaces all cells for a notebook.
func (r *NotebookRepository) SaveCells(ctx context.Context, notebookID string, cells []models.Cell) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// Delete existing cells
	deleteQuery := `DELETE FROM notebook_cells WHERE notebook_id = $1`
	_, err = tx.ExecContext(ctx, deleteQuery, notebookID)
	if err != nil {
		return fmt.Errorf("failed to delete existing cells: %w", err)
	}

	// Insert new cells in order
	insertQuery := `
		INSERT INTO notebook_cells (id, notebook_id, content, cell_type, position, create_at, update_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	for idx, cell := range cells {
		_, err := tx.ExecContext(ctx, insertQuery, cell.ID, notebookID, cell.Content, cell.Type, idx, cell.CreatedAt, cell.UpdatedAt)
		if err != nil {
			return fmt.Errorf("failed to insert cell at position %d: %w", idx, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	return nil
}

// GetCells retrieves all cells for a notebook in order.
func (r *NotebookRepository) GetCells(ctx context.Context, notebookID string) ([]models.Cell, error) {
	query := `
		SELECT id, content, cell_type, create_at, update_at
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
		err := rows.Scan(&cell.ID, &cell.Content, &cell.Type, &cell.CreatedAt, &cell.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan cell: %w", err)
		}
		cells = append(cells, cell)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error in cell rows: %w", err)
	}
	return cells, nil
}
