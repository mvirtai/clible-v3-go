package services_test

import (
	"context"
	"strings"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestSeedService_PipelineIntegration(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to boot in-memory sqlite instance: %v", err)
	}
	defer func() { _ = conn.Close() }() // Complies with errcheck linter rules cleanly

	ctx := context.Background()
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('test-trans', 'Test translation', 'en', 'text')`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO books (id, name, testament, position, chapters) VALUES ('GEN', 'Genesis', 'OT', 1, 50)`)

	verseRepo := db.NewVerseRepository(conn)
	xmlParser := parsers.NewXMLVerseParser()
	seedService := services.NewSeedService(verseRepo, xmlParser)

	usfxStream := `
	<usfx>
		<book id="GEN">
			<c id="1">
				<v id="1">Light emerged out of the dark void.</v>
			</c>
		</book>
	</usfx>`

	err = seedService.ParseStreamShortcut(ctx, strings.NewReader(usfxStream), "test-trans")
	if err != nil {
		t.Fatalf("Seed pipeline shortcut run crashed: %v", err)
	}

	// Request the data directly via our pre-existing VerseRepository to verify integration success
	verses, err := verseRepo.GetByReference(ctx, "test-trans", "GEN", 1, 1, 1)
	if err != nil {
		t.Fatalf("failed to query verse records after seeding: %v", err)
	}

	if len(verses) != 1 {
		t.Fatalf("expected exactly 1 verse to be persisted in DB, got %d", len(verses))
	}

	if verses[0].Text != "Light emerged out of the dark void." {
		t.Errorf("unexpected database verse text sequence content: %q", verses[0].Text)
	}
}
