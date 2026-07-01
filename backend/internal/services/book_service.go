package services

import (
	"context"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// BookService provides domain logic for querying book metadata.
type BookService struct {
	bookRepo *db.BookRepository
}

// NewBookService creates a new BookService instance.
func NewBookService(bookRepo *db.BookRepository) *BookService {
	return &BookService{bookRepo: bookRepo}
}

// GetAllBooks retrieves all books from the database.
func (s *BookService) GetAllBooks(ctx context.Context) ([]models.Book, error) {
	return s.bookRepo.GetAll(ctx)
}

// GetBookByID retrieves a book by its canonical ID.
func (s *BookService) GetBookByID(ctx context.Context, id string) (*models.Book, error) {
	return s.bookRepo.GetByID(ctx, id)
}