package db

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"

	_ "modernc.org/sqlite"
)

func TestVerseRepository_BulkInsertAndSearch(t *testing.T) {
	// Bootstraps a real in-memory connection and runs your 6 embedded SQL migrations
	db, err := NewConnection(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize operational test cluster: %v", err)
	}
	defer db.Close()

	// Seed required parent records due to FOREIGN KEY constraints
	_, err = db.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('KR38', 'Pyhä Raamattu', 'fi', 'text')`)
	if err != nil {
		t.Fatalf("failed to seed parent translation: %v", err)
	}
	_, err = db.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Gen', 'Genesis', 'OT', 1, 50)`)
	if err != nil {
		t.Fatalf("failed to seed parent book: %v", err)
	}

	repo := NewVerseRepository(db)
	ctx := context.Background()

	verses := []models.Verse{
		{ID: "KR38:Gen:1:1", TranslationID: "KR38", BookID: "Gen", Chapter: 1, Verse: 1, Text: "Alussa loi Jumala taivaan ja maan."},
		{ID: "KR38:Gen:1:2", TranslationID: "KR38", BookID: "Gen", Chapter: 1, Verse: 2, Text: "Ja maa oli autio ja tyhjä."},
		{ID: "KR38:Gen:1:3", TranslationID: "KR38", BookID: "Gen", Chapter: 1, Verse: 3, Text: "Jumala sanoi: 'Tulkoon valkeus'. Ja valkeus tuli."},
	}

	if err := repo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("BulkInsert failed: %v", err)
	}

	// Validate FTS5 token search + regex filter engine integrity
	params := SearchParams{
		FTSQuery:     "Jumala",
		RegexPattern: `valkeus`,
	}

	results, err := repo.Search(ctx, params)
	if err != nil {
		t.Fatalf("Search execution failed: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 final validated match, got %d", len(results))
	}

	if results[0].Verse != 3 {
		t.Errorf("expected verse 3, got %d", results[0].Verse)
	}

	if results[0].ID != "KR38:Gen:1:3" {
		t.Errorf("expected global composite key 'KR38:Gen:1:3', got '%s'", results[0].ID)
	}
}
