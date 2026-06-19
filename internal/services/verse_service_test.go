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
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

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
	svc := NewVerseService(nil, nil)
	ctx := context.Background()

	_, err := svc.GetVerses(ctx, "   ", "fin-1992")

	if err == nil {
		t.Fatal("expected an error due to invalid empty space layout format, got success")
	}

	if !strings.Contains(err.Error(), "failed to parse reference via engine") {
		t.Errorf("expected wrapped parsing context text error, got: '%v'", err)
	}
}

func TestVerseService_GetVerses_FallbackTranslation(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('fin-1992', 'Kirkkoraamattu 1992', 'fi', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'Johannes', 'NT', 4, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	// Empty translationID should fall back to 'fin-1992' without error
	_, err = svc.GetVerses(context.Background(), "Joh 3:16", "")
	if err != nil {
		t.Errorf("expected no error with empty translationID fallback, got: %v", err)
	}
}

func TestVerseService_GetVerses_ChapterScope(t *testing.T) {
	svc := NewVerseService(nil, nil)
	_, err := svc.GetVerses(context.Background(), "Joh 3", "fin-1992")
	if err == nil {
		t.Fatal("expected error for unimplemented chapter scope")
	}
}

func TestVerseService_GetVerses_BookScope(t *testing.T) {
	svc := NewVerseService(nil, nil)
	_, err := svc.GetVerses(context.Background(), "Genesis", "fin-1992")
	if err == nil {
		t.Fatal("expected error for unimplemented book scope")
	}
}

func TestVerseService_SearchVerses_Success(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('fin-1992', 'Kirkkoraamattu 1992', 'fi', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'Johannes', 'NT', 4, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	ctx := context.Background()
	mockVerse := models.Verse{
		ID:            "fin-1992:Joh:3:16",
		TranslationID: "fin-1992",
		BookID:        "Joh",
		Chapter:       3,
		Verse:         16,
		Text:          "Jumala on rakastanut maailmaa",
	}
	if err := verseRepo.BulkInsert(ctx, []models.Verse{mockVerse}); err != nil {
		t.Fatalf("failed to seed verses: %v", err)
	}

	results, err := svc.SearchVerses(ctx, "Jumala", "", "fin-1992")
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].ID != mockVerse.ID {
		t.Errorf("expected verse %s, got %s", mockVerse.ID, results[0].ID)
	}
}

func TestVerseService_SearchVerses_RegexFilter(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('fin-1992', 'Kirkkoraamattu 1992', 'fi', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'Johannes', 'NT', 4, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	ctx := context.Background()
	verses := []models.Verse{
		{ID: "fin-1992:Joh:3:16", TranslationID: "fin-1992", BookID: "Joh", Chapter: 3, Verse: 16, Text: "Jumala on rakastanut maailmaa"},
		{ID: "fin-1992:Joh:1:1", TranslationID: "fin-1992", BookID: "Joh", Chapter: 1, Verse: 1, Text: "Alussa oli Sana"},
	}
	if err := verseRepo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("failed to seed verses: %v", err)
	}

	results, err := svc.SearchVerses(ctx, "Jumala OR Sana", `^Jumala`, "fin-1992")
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result after regex filter, got %d", len(results))
	}
	if results[0].Verse != 16 {
		t.Errorf("expected verse 16, got %d", results[0].Verse)
	}
}

func TestVerseService_SearchVerses_InvalidRegex(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	_, err = svc.SearchVerses(context.Background(), "test", "[invalid", "")
	if err == nil {
		t.Fatal("expected error for invalid regex pattern")
	}
	if !strings.Contains(err.Error(), "invalid regex pattern") {
		t.Errorf("expected regex error message, got: %v", err)
	}
}
