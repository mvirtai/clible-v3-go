package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func newTestBookHandler(t *testing.T) *api.BookHandler {
	t.Helper()
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	bookRepo := db.NewBookRepository(conn)
	bookSvc := services.NewBookService(bookRepo)
	return api.NewBookHandler(bookSvc)
}

func TestBookHandler_GetBooks(t *testing.T) {
	handler := newTestBookHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/api/books", nil)
	rr := httptest.NewRecorder()
	
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/books", handler.GetBooks)
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var books []models.Book
	if err := json.NewDecoder(rr.Body).Decode(&books); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	if len(books) != 66 {
		t.Errorf("expected 66 books, got %d", len(books))
	}
}

func TestBookHandler_GetBookByID_Success(t *testing.T) {
	handler := newTestBookHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/api/books/JHN", nil)
	rr := httptest.NewRecorder()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/books/{id}", handler.GetBookByID)
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var book models.Book
	if err := json.NewDecoder(rr.Body).Decode(&book); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	if book.ID != "JHN" || book.Name != "John" {
		t.Errorf("expected JHN (John), got ID: %s, Name: %s", book.ID, book.Name)
	}
}

func TestBookHandler_GetBookByID_NotFound(t *testing.T) {
	handler := newTestBookHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/api/books/INVALID", nil)
	rr := httptest.NewRecorder()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/books/{id}", handler.GetBookByID)
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", rr.Code)
	}
}
