package api

import (
	"encoding/json"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

// BookHandler handles presenteation controller boundaries for book metadata.
type BookHandler struct {
	bookService *services.BookService
}

func NewBookHandler(bookService *services.BookService) *BookHandler {
	return &BookHandler{bookService: bookService}
}

// GetBooks handles GET /api/books to return a list of all canonical books.
func (h *BookHandler) GetBooks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	books, err := h.bookService.GetAllBooks(ctx)
	if err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(books)
}

// GetBookByID handles GET /api/books/{id} to return details of a single book.
func (h *BookHandler) GetBookByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Read path parameter natively using Go 1.22+ PathValue support
	id := r.PathValue("id")
	if id == "" {
		WriteError(w, "invalid query parameter", http.StatusBadRequest, nil)
		return
	}

	book, err := h.bookService.GetBookByID(ctx, id)
	if err != nil {
		WriteError(w, "not found", http.StatusNotFound, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(book)
}
