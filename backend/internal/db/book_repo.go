package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// BookRepository handles data access operations for the books table.
type BookRepository struct {
	db *sql.DB
}

// NewBookRepository creates a new BookRepository instance.
func NewBookRepository(db  *sql.DB) *BookRepository {
	return &BookRepository{db: db}
}

// GetAll retrieves all 66 canonical books ordered by their position.
func (r *BookRepository) GetAll(ctx context.Context) ([]models.Book, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, testament, position, chapters
		FROM books
		ORDER BY position ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query all books: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		if err := rows.Scan(&b.ID, &b.Name, &b.Testament, &b.Position, &b.Chapters); err != nil {
			return nil, fmt.Errorf("failed to scan book row: %w", err)
		}
		books = append(books, b)
	}

	return books, rows.Err()
}

// GetByID retrieves a single book by its canonical ID (e.g. "GEN").
func (r *BookRepository) GetByID(ctx context.Context, id string) (*models.Book, error) {
	var b models.Book
	err := r.db.QueryRowContext(ctx, `
		SELECT id, name, testament, position, chapters
		FROM books
		WHERE id = ?
	`, id).Scan(&b.ID, &b.Name, &b.Testament, &b.Position, &b.Chapters)
	
	 if err != nil {
  if err == sql.ErrNoRows {
   return nil, fmt.Errorf("book not found with id: %s", id)
  }
  return nil, fmt.Errorf("failed to query book by id: %w", err)
 }

 return &b, nil
}