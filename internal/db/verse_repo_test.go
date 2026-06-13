package db

import (
	"context"
	"database/sql"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"

	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}

	schema := `
	PRAGMA foreign_keys = ON;
	CREATE TABLE verses (
		id TEXT PRIMARY KEY,
		translation_id TEXT,
		book_id TEXT,
		chapter INTEGER,
		verse INTEGER,
		text TEXT
	);
	CREATE VIRTUAL TABLE verses_fts USING fts5(text, content='verses', content_rowid='id');
	
	CREATE TRIGGER verses_ai AFTER INSERT ON verses BEGIN
		INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
	END;
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to create test schema: %v", err)
	}

	return db
}

func TestVerseRepository_BulkInsertAndSearch(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewVerseRepository(db)
	ctx := context.Background()

	verses := []models.Verse{
		{ID: "KR38:Gen:1:1", TranslationID: "KR38", BookID: "Gen", Chapter: 1, Verse: 1, Text: "Alussa loi Jumala taivaan ja maan."},
		{ID: "KR38:Gen:1:2", TranslationID: "KR38", BookID: "Gen", Chapter: 1, Verse: 2, Text: "Ja maa oli autio ja tyhjä."},
		{ID: "KR38:Gen:1:3", TranslationID: "KR38", BookID: "Gen", Chapter: 1, Verse: 3, Text: "Jumala sanoi: 'Tulkoon valkeus'. Ja valkeus tuli."},
	}

	err := repo.BulkInsert(ctx, verses)
	if err != nil {
		t.Fatalf("BulkInsert failed: %v", err)
	}

	params := SearchParams{
		FTSQuery:     "Jumala",
		RegexPattern: `valkeus`,
	}

	results, err := repo.Search(ctx, params)
	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}

	if results[0].Verse != 3 {
		t.Errorf("expected verse 3, got %d", results[0].Verse)
	}

	if results[0].ID != "KR38:Gen:1:3" {
		t.Errorf("expected ID 'KR38:Gen:1:3', got '%s'", results[0].ID)
	}
}
