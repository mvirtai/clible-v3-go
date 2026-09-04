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
	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('JHN', 'John', 'NT', 43, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)

	ctx := context.Background()
	mockVerse := models.Verse{
		ID:            "web:JHN:3:16",
		TranslationID: "web",
		BookID:        "JHN",
		Chapter:       3,
		Verse:         16,
		Text:          "Joh - Jumala on rakastanut maailmaa...",
	}
	if err := verseRepo.BulkInsert(ctx, []models.Verse{mockVerse}); err != nil {
		t.Fatalf("failed to seed test verses: %v", err)
	}

	svc := NewVerseService(verseRepo, translationRepo)

	results, err := svc.GetVerses(ctx, "Joh 3:16", "web")
	if err != nil {
		t.Fatalf("unexpected service execution failure: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 verse match, got %d", len(results))
	}

	if results[0].BookID != "JHN" || results[0].Verse != 16 {
		t.Errorf("expected JHN 3:16, got %s %d:%d", results[0].BookID, results[0].Chapter, results[0].Verse)
	}
}

func TestVerseService_GetVerses_ParseError(t *testing.T) {
	svc := NewVerseService(nil, nil)
	ctx := context.Background()

	_, err := svc.GetVerses(ctx, "   ", "web")

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

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('JHN', 'John', 'NT', 43, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	// Empty translationID should fall back to 'web' without error
	_, err = svc.GetVerses(context.Background(), "Joh 3:16", "")
	if err != nil {
		t.Errorf("expected no error with empty translationID fallback, got: %v", err)
	}
}

func TestVerseService_GetVerses_ChapterScope(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('JHN', 'John', 'NT', 43, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	ctx := context.Background()
	verses := []models.Verse{
		{ID: "web:JHN:3:1", TranslationID: "web", BookID: "JHN", Chapter: 3, Verse: 1, Text: "Verse 1"},
		{ID: "web:JHN:3:2", TranslationID: "web", BookID: "JHN", Chapter: 3, Verse: 2, Text: "Verse 2"},
		{ID: "web:JHN:4:1", TranslationID: "web", BookID: "JHN", Chapter: 4, Verse: 1, Text: "Verse 4:1"},
	}
	if err := verseRepo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("failed to seed test verses: %v", err)
	}

	results, err := svc.GetVerses(ctx, "Joh 3", "web")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("expected 2 verses from chapter 3, got %d", len(results))
	}
}

func TestVerseService_GetVerses_BookScope(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('JHN', 'John', 'NT', 43, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	ctx := context.Background()
	verses := []models.Verse{
		{ID: "web:JHN:1:1", TranslationID: "web", BookID: "JHN", Chapter: 1, Verse: 1, Text: "Verse 1:1"},
		{ID: "web:JHN:3:16", TranslationID: "web", BookID: "JHN", Chapter: 3, Verse: 16, Text: "Verse 3:16"},
	}
	if err := verseRepo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("failed to seed test verses: %v", err)
	}

	results, err := svc.GetVerses(ctx, "Joh", "web")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("expected 2 verses from book Joh, got %d", len(results))
	}
}

func TestVerseService_SearchVerses_Success(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'Johannes', 'NT', 4, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	ctx := context.Background()
	mockVerse := models.Verse{
		ID:            "web:Joh:3:16",
		TranslationID: "web",
		BookID:        "Joh",
		Chapter:       3,
		Verse:         16,
		Text:          "Jumala on rakastanut maailmaa",
	}
	if err := verseRepo.BulkInsert(ctx, []models.Verse{mockVerse}); err != nil {
		t.Fatalf("failed to seed verses: %v", err)
	}

	results, err := svc.SearchVerses(ctx, "Jumala", false, "web", "", "")
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

	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'Johannes', 'NT', 4, 21)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	ctx := context.Background()
	verses := []models.Verse{
		{ID: "web:Joh:3:16", TranslationID: "web", BookID: "Joh", Chapter: 3, Verse: 16, Text: "Jumala on rakastanut maailmaa"},
		{ID: "web:Joh:1:1", TranslationID: "web", BookID: "Joh", Chapter: 1, Verse: 1, Text: "Alussa oli Sana"},
	}
	if err := verseRepo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("failed to seed verses: %v", err)
	}

	results, err := svc.SearchVerses(ctx, "^Jumala", true, "web", "", "")
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
	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format, is_global) VALUES ('web', 'World English Bible', 'en', 'text', TRUE)`)
	svc := NewVerseService(verseRepo, translationRepo)

	_, err = svc.SearchVerses(context.Background(), "[invalid", true, "web", "", "")
	if err == nil {
		t.Fatal("expected error for invalid regex pattern")
	}
	if !strings.Contains(err.Error(), "invalid regex pattern") {
		t.Errorf("expected regex error message, got: %v", err)
	}
}

func TestVerseService_GuestMode_GlobalTranslation(t *testing.T) {
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize connection: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	// Seed global translation fin-1776 and book 1JN
	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format, is_global) VALUES ('fin-1776', 'Biblia 1776', 'fi', 'text', TRUE)`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('1JN', '1. Johanneksen kirje', 'NT', 62, 5)`)

	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	svc := NewVerseService(verseRepo, translationRepo)

	ctx := context.Background() // unauthenticated (no user in ctx)

	mockVerse := models.Verse{
		ID:            "fin-1776:1JN:1:1",
		TranslationID: "fin-1776",
		BookID:        "1JN",
		Chapter:       1,
		Verse:         1,
		Text:          "Mitä alusta oli, minkä me kuulimme, minkä me silmillämme näimme...",
	}
	if err := verseRepo.BulkInsert(ctx, []models.Verse{mockVerse}); err != nil {
		t.Fatalf("failed to seed test verses: %v", err)
	}

	// 1. Unauthenticated guest should successfully fetch verses with fin-1776
	verses, err := svc.GetVerses(ctx, "1JOH 1:1", "fin-1776")
	if err != nil {
		t.Fatalf("unexpected error for guest fetching global translation: %v", err)
	}
	if len(verses) != 1 {
		t.Fatalf("expected 1 verse, got %d", len(verses))
	}
	if verses[0].Text != mockVerse.Text {
		t.Errorf("expected verse text %q, got %q", mockVerse.Text, verses[0].Text)
	}

	// 2. Unauthenticated guest should successfully search verses with fin-1776
	searchResults, err := svc.SearchVerses(ctx, "kuulimme", false, "fin-1776", "", "")
	if err != nil {
		t.Fatalf("unexpected error for guest searching global translation: %v", err)
	}
	if len(searchResults) != 1 {
		t.Fatalf("expected 1 search result, got %d", len(searchResults))
	}

	// 3. Inaccessible/non-existent translation should still be rejected
	_, err = svc.GetVerses(ctx, "1JOH 1:1", "nonexistent-translation")
	if err == nil {
		t.Fatal("expected error for non-existent translation, got nil")
	}
}
