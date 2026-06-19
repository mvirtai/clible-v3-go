package db_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestVerseRepository_GetByReference(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()

	// Seed required FK parents before inserting verses
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'John', 'NT', 4, 21)`)

	repo := db.NewVerseRepository(conn)

	verses := []models.Verse{
		{ID: "web:Joh:3:16", TranslationID: "web", BookID: "Joh", Chapter: 3, Verse: 16, Text: "For God so loved the world..."},
		{ID: "web:Joh:3:17", TranslationID: "web", BookID: "Joh", Chapter: 3, Verse: 17, Text: "For God did not send his Son..."},
	}
	if err := repo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("failed to seed test data: %v", err)
	}

	t.Run("single verse", func(t *testing.T) {
		result, err := repo.GetByReference(ctx, "web", "Joh", 3, 16, 16)
		if err != nil {
			t.Fatalf("GetByReference failed: %v", err)
		}
		if len(result) != 1 {
			t.Fatalf("expected 1 verse, got %d", len(result))
		}
		if result[0].Text != "For God so loved the world..." {
			t.Errorf("unexpected verse text: %s", result[0].Text)
		}
	})

	t.Run("verse range", func(t *testing.T) {
		result, err := repo.GetByReference(ctx, "web", "Joh", 3, 16, 17)
		if err != nil {
			t.Fatalf("GetByReference failed: %v", err)
		}
		if len(result) != 2 {
			t.Fatalf("expected 2 verses, got %d", len(result))
		}
	})

	t.Run("no match returns empty", func(t *testing.T) {
		result, err := repo.GetByReference(ctx, "web", "Joh", 99, 1, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result) != 0 {
			t.Errorf("expected 0 verses, got %d", len(result))
		}
	})
}

func TestVerseRepository_BulkInsert_Empty(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	repo := db.NewVerseRepository(conn)
	if err := repo.BulkInsert(context.Background(), nil); err != nil {
		t.Errorf("BulkInsert with nil slice should be a no-op, got error: %v", err)
	}
}

func TestVerseRepository_Search(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'John', 'NT', 4, 21)`)

	repo := db.NewVerseRepository(conn)
	verses := []models.Verse{
		{ID: "web:Joh:3:16", TranslationID: "web", BookID: "Joh", Chapter: 3, Verse: 16, Text: "For God so loved the world"},
	}
	if err := repo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("failed to seed verses: %v", err)
	}

	t.Run("fts match", func(t *testing.T) {
		results, err := repo.Search(ctx, db.SearchParams{FTSQuery: "loved"})
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if len(results) != 1 {
			t.Errorf("expected 1 result, got %d", len(results))
		}
	})

	t.Run("fts with regex filter", func(t *testing.T) {
		results, err := repo.Search(ctx, db.SearchParams{FTSQuery: "loved", RegexPattern: "God"})
		if err != nil {
			t.Fatalf("Search with regex failed: %v", err)
		}
		if len(results) != 1 {
			t.Errorf("expected 1 result with matching regex, got %d", len(results))
		}
	})

	t.Run("regex filters out all results", func(t *testing.T) {
		results, err := repo.Search(ctx, db.SearchParams{FTSQuery: "loved", RegexPattern: "NOMATCH"})
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if len(results) != 0 {
			t.Errorf("expected 0 results after regex filter, got %d", len(results))
		}
	})

	t.Run("invalid regex returns error", func(t *testing.T) {
		_, err := repo.Search(ctx, db.SearchParams{FTSQuery: "loved", RegexPattern: "["})
		if err == nil {
			t.Error("expected error for invalid regex pattern")
		}
	})
}
