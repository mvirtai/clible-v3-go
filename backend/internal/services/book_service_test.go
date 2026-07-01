package services_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestBookService_GetAllBooks(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()
	repo := db.NewBookRepository(conn)
	service := services.NewBookService(repo)

	books, err := service.GetAllBooks(ctx)
	if err != nil {
		t.Fatalf("GetAllBooks failed: %v", err)
	}

	if len(books) != 66 {
		t.Errorf("Expected 66 books, got %d", len(books))
	}
}

func TestBookService_GetBookByID(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()
	repo := db.NewBookRepository(conn)
	service := services.NewBookService(repo)

	// Fetch John
	book, err := service.GetBookByID(ctx, "JHN")
	if err != nil {
		t.Fatalf("GetBookByID for JHN failed: %v", err)
	}
	if book.Name != "John" {
		t.Errorf("Expected book name John, got: %s", book.Name)
	}

	// Fetch invalid
	_, err = service.GetBookByID(ctx, "INVALID")
	if err == nil {
		t.Error("Expected error fetching invalid book, got nil")
	}
}
