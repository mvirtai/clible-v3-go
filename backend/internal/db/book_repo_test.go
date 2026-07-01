package db

import (
	"context"
	"testing"
)

func TestBookRepository_GetAll(t *testing.T) {
	// Setup in-memory SQLite database
	dbConn, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to initialize in-memory DB: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	repo := NewBookRepository(dbConn)
	ctx := context.Background()

	books, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("Failed to GetAll books: %v", err)
	}

	// Verify we got the standard 66 canonical books seeded by migration 007
	if len(books) != 66 {
		t.Errorf("Expected 66 books, got %d", len(books))
	}

	// Verify ordering by checking the first and last books
	if len(books) > 0 {
		if books[0].ID != "GEN" || books[0].Name != "Genesis" {
			t.Errorf("Expected first book to be Genesis (GEN), got ID: %s, Name: %s", books[0].ID, books[0].Name)
		}
		if books[65].ID != "REV" || books[65].Name != "Revelation" {
			t.Errorf("Expected last book to be Revelation (REV), got ID: %s, Name: %s", books[65].ID, books[65].Name)
		}
	}
}

func TestBookRepository_GetByID(t *testing.T) {
	// Setup in-memory SQLite database
	dbConn, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to initialize in-memory DB: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	repo := NewBookRepository(dbConn)
	ctx := context.Background()

	// Test 1: Fetch existing book
	book, err := repo.GetByID(ctx, "JHN")
	if err != nil {
		t.Fatalf("Expected no error fetching John (JHN), got: %v", err)
	}
	if book.Name != "John" || book.Testament != "NT" || book.Chapters != 21 {
		t.Errorf("Book metadata mismatch for JHN: %+v", book)
	}

	// Test 2: Fetch non-existent book
	_, err = repo.GetByID(ctx, "INVALID")
	if err == nil {
		t.Error("Expected error fetching non-existent book, got nil")
	}
}
