package services

import (
	"context"
	"strings"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestVerseService_GetVerses_Success(t *testing.T) {
	// 1. Setup real in-memory connection using embedded migrations
	dbConn, err := db.NewConnection(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer dbConn.Close()

	// 2. Seed required structural schema lookup relations
	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('fin-1992', 'Kirkkoraamattu 1992', 'fi', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'Johannes', 'NT', 4, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)

	// Seed target verse to prove our search matching works down the line
	ctx := context.Background()
	mockVerse := models.Verse{
		ID:            "fin-1992:Joh:3:16",
		TranslationID: "fin-1992",
		BookID:        "Joh",
		Chapter:       3,
		Verse:         16,
		Text:          "Joh - Jumala on rakastanut maailmaa...",
	}
	if err := verseRepo.BulkInsert(ctx, []models.Verse{mockVerse}); err != nil {
		t.Fatalf("failed to seed test verses: %v", err)
	}

	// 3. Initialize VerseService
	svc := NewVerseService(verseRepo, translationRepo)

	// 4. Execute standard query reference
	results, err := svc.GetVerses(ctx, "Joh 3:16", "fin-1992")
	if err != nil {
		t.Fatalf("unexpected service execution failure: %v", err)
	}

	// 5. Assertions
	if len(results) != 1 {
		t.Fatalf("expected 1 verse match, got %d", len(results))
	}

	if results[0].BookID != "Joh" || results[0].Verse != 16 {
		t.Errorf("expected Joh 3:16, got %s %d:%d", results[0].BookID, results[0].Chapter, results[0].Verse)
	}
}

func TestVerseService_GetVerses_ParseError(t *testing.T) {
	// Initialize service with nil inputs since a syntax parse failure
	// should terminate execution before touching any database boundary.
	svc := NewVerseService(nil, nil)
	ctx := context.Background()

	// Run execution with a completely blank reference query string
	_, err := svc.GetVerses(ctx, "   ", "fin-1992")

	if err == nil {
		t.Fatal("expected an error due to invalid empty space layout format, got success")
	}

	// Verify that our wrapped error message contains the underlying structural failure text
	if !strings.Contains(err.Error(), "failed to parse reference via engine") {
		t.Errorf("expected wrapped parsing context text error, got: '%v'", err)
	}
}
