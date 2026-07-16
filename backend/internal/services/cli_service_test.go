package services_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func setupCLITestDB(t *testing.T) *sql.DB {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test database: %v", err)
	}

	// Seed required schema lookups
	_, _ = conn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = conn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('JHN', 'John', 'NT', 43, 21)`)
	_, _ = conn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('ROM', 'Romans', 'NT', 45, 16)`)

	return conn
}

func TestExtractKeywords(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{
			input:    "Jumalan rakkaus ja armo ovat suuria asioita",
			expected: []string{"armo", "asioita", "jumalan", "ovat", "rakkaus"}, // sorted alphabetically (top 5)
		},
		{
			input:    "God showed his love and grace to us",
			expected: []string{"grace", "love", "showed"}, // sorted alphabetically (his, to, us are <= 3 chars)
		},
		{
			input:    "   armo,   ",
			expected: []string{"armo"},
		},
		{
			input:    "ja on se",
			expected: []string{}, // all are stopwords
		},
	}

	for _, tt := range tests {
		result := services.ExtractKeywords(tt.input)
		if len(result) != len(tt.expected) {
			t.Errorf("ExtractKeywords(%q) length mismatch: got %v, expected %v", tt.input, result, tt.expected)
			continue
		}
		for i, v := range result {
			if v != tt.expected[i] {
				t.Errorf("ExtractKeywords(%q) mismatch at %d: got %s, expected %s", tt.input, i, v, tt.expected[i])
			}
		}
	}
}

func TestParseCLICommand(t *testing.T) {
	tests := []struct {
		input    string
		expected *services.CLICommand
		hasError bool
	}{
		{
			input: "/read John 3:16",
			expected: &services.CLICommand{
				Name:  "/read",
				Args:  []string{"John", "3:16"},
				Flags: map[string]string{},
			},
			hasError: false,
		},
		{
			input: "/read John 3:16 --translation=finpr",
			expected: &services.CLICommand{
				Name:  "/read",
				Args:  []string{"John", "3:16"},
				Flags: map[string]string{"translation": "finpr"},
			},
			hasError: false,
		},
		{
			input: `/search "God so loved the world"`,
			expected: &services.CLICommand{
				Name:  "/search",
				Args:  []string{"God so loved the world"},
				Flags: map[string]string{},
			},
			hasError: false,
		},
		{
			input: `/search "armo" --regex`,
			expected: &services.CLICommand{
				Name:  "/search",
				Args:  []string{"armo"},
				Flags: map[string]string{"regex": "true"},
			},
			hasError: false,
		},
		{
			input: "/refs ROM 5:8",
			expected: &services.CLICommand{
				Name:  "/refs",
				Args:  []string{"ROM", "5:8"},
				Flags: map[string]string{},
			},
			hasError: false,
		},
		{
			input: "/suggest",
			expected: &services.CLICommand{
				Name:  "/suggest",
				Args:  []string{},
				Flags: map[string]string{},
			},
			hasError: false,
		},
		{
			input:    "invalid command",
			expected: nil,
			hasError: true,
		},
		{
			input: "/unknown",
			expected: &services.CLICommand{
				Name:  "/unknown",
				Args:  []string{},
				Flags: map[string]string{},
			},
			hasError: false,
		},
	}

	for _, tt := range tests {
		result := services.ParseCLICommand(tt.input)
		if tt.hasError {
			if result != nil {
				t.Errorf("ParseCLICommand(%q) expected nil, got %v", tt.input, result)
			}
			continue
		}
		if result == nil {
			if !tt.hasError {
				t.Errorf("ParseCLICommand(%q) expected result, got nil", tt.input)
			}
			continue
		}
		if result.Name != tt.expected.Name {
			t.Errorf("ParseCLICommand(%q) name mismatch: got %s, expected %s", tt.input, result.Name, tt.expected.Name)
		}
		if len(result.Args) != len(tt.expected.Args) || (len(result.Args) > 0 && result.Args[0] != tt.expected.Args[0]) {
			t.Errorf("ParseCLICommand(%q) args mismatch: got %v, expected %v", tt.input, result.Args, tt.expected.Args)
		}
		for k, v := range tt.expected.Flags {
			if val, ok := result.Flags[k]; !ok || val != v {
				t.Errorf("ParseCLICommand(%q) flags mismatch: got %v, expected %v", tt.input, result.Flags, tt.expected.Flags)
			}
		}
	}
}

func TestCLIService_ExecuteCommand(t *testing.T) {
	conn := setupCLITestDB(t)
	defer func() { _ = conn.Close() }()

	verseRepo := db.NewVerseRepository(conn)
	translationRepo := db.NewTranslationRepository(conn)
	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)

	ctx := context.Background()

	// Seed test verses
	verses := []models.Verse{
		{
			ID:            "web:JHN:3:16",
			TranslationID: "web",
			BookID:        "JHN",
			Chapter:       3,
			Verse:         16,
			Text:          "For God so loved the world, that he gave his only Son.",
		},
		{
			ID:            "web:ROM:5:8",
			TranslationID: "web",
			BookID:        "ROM",
			Chapter:       5,
			Verse:         8,
			Text:          "But God commends his own love toward the world, in that while we were yet sinners, Christ died for us.",
		},
	}
	if err := verseRepo.BulkInsert(ctx, verses); err != nil {
		t.Fatalf("failed to seed test verses: %v", err)
	}

	verseService := services.NewVerseService(verseRepo, translationRepo)
	cliService := services.NewCLIService(verseRepo, verseService)
	notebookService := services.NewNotebookService(notebookRepo, scopeRepo, cliService)

	userID := uuid.New().String()
	seedUser(t, conn, userID)

	// Create a notebook and seed some Markdown content for suggest command tests
	notebook, err := notebookService.CreateNotebook(ctx, "Test Notebook", userID, "")
	if err != nil {
		t.Fatalf("failed to create notebook: %v", err)
	}

	// Update notebook cells to contain markdown
	cells := []models.Cell{
		{
			ID:         uuid.New().String(),
			NotebookID: notebook.ID,
			Type:       models.CellTypeMarkdown,
			Content:    "We are studying the theme of God's amazing love and grace in the world.",
			Position:   0,
		},
		{
			ID:         uuid.New().String(),
			NotebookID: notebook.ID,
			Type:       models.CellTypeCode,
			Content:    "/suggest",
			Position:   1,
		},
	}
	// Seed cells using the repository helper
	if err := notebookRepo.SaveCells(ctx, notebook.ID, cells); err != nil {
		t.Fatalf("failed to seed cells: %v", err)
	}

	// Test 1: Execute `/read JHN 3:16`
	t.Run("execute /read", func(t *testing.T) {
		cmd := services.ParseCLICommand("/read JHN 3:16")
		res, err := cliService.ExecuteCommand(ctx, cmd, "web", "")
		if err != nil {
			t.Fatalf("execute /read failed: %v", err)
		}
		if res.Type != "read" {
			t.Errorf("expected result type 'read', got %s", res.Type)
		}
		data := res.Data
		if data["reference"] != "JHN 3:16" {
			t.Errorf("expected reference 'JHN 3:16', got %v", data["reference"])
		}
		versesList, ok := data["verses"].([]models.Verse)
		if !ok || len(versesList) != 1 {
			t.Fatalf("expected 1 verse, got %v", data["verses"])
		}
		if versesList[0].Text != verses[0].Text {
			t.Errorf("verse text mismatch: got %q, expected %q", versesList[0].Text, verses[0].Text)
		}
	})

	// Test 2: Execute `/search "sinners"`
	t.Run("execute /search", func(t *testing.T) {
		cmd := services.ParseCLICommand(`/search "sinners"`)
		res, err := cliService.ExecuteCommand(ctx, cmd, "web", "")
		if err != nil {
			t.Fatalf("execute /search failed: %v", err)
		}
		if res.Type != "search" {
			t.Errorf("expected result type 'search', got %s", res.Type)
		}
		data := res.Data
		if data["query"] != "sinners" {
			t.Errorf("expected query 'sinners', got %v", data["query"])
		}
		versesList := data["verses"].([]models.Verse)
		if len(versesList) != 1 {
			t.Fatalf("expected 1 verse, got %d", len(versesList))
		}
		if versesList[0].BookID != "ROM" {
			t.Errorf("expected ROM book, got %s", versesList[0].BookID)
		}
	})

	// Test 3: Execute `/refs JHN 3:16`
	t.Run("execute /refs", func(t *testing.T) {
		cmd := services.ParseCLICommand("/refs JHN 3:16")
		res, err := cliService.ExecuteCommand(ctx, cmd, "web", "")
		if err != nil {
			t.Fatalf("execute /refs failed: %v", err)
		}
		if res.Type != "refs" {
			t.Errorf("expected result type 'refs', got %s", res.Type)
		}
		data := res.Data
		if data["source"] != "JHN 3:16" {
			t.Errorf("expected source 'JHN 3:16', got %v", data["source"])
		}
		references := data["references"].([]models.Verse)
		if len(references) == 0 {
			t.Errorf("expected to find references, got 0")
		}
	})

	// Test 4: Execute `/suggest`
	t.Run("execute /suggest", func(t *testing.T) {
		res, err := notebookService.ExecuteCellCommand(ctx, notebook.ID, cells[1].ID, userID, "web")
		if err != nil {
			t.Fatalf("ExecuteCellCommand for /suggest failed: %v", err)
		}
		if res.Type != "suggest" {
			t.Errorf("expected result type 'suggest', got %s", res.Type)
		}
		data := res.Data
		suggestions := data["suggestions"].([]models.Verse)
		if len(suggestions) == 0 {
			t.Errorf("expected suggestions, got 0")
		}
	})
}
