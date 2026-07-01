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
	w.Header().Set("Content-Type", "application/json")

	books, err := h.bookService.GetAllBooks(ctx)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to retrieve books: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(books)
}

// GetBookByID handles GET /api/books/{id} to return details of a single book.
func (h *BookHandler) GetBookByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	// Read path parameter natively using Go 1.22+ PathValue support
	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing book id path parameter"})
		return
	}

	book, err := h.bookService.GetBookByID(ctx, id)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(book)
}
