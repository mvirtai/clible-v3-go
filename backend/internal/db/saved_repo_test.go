package db_test

import (
	"context"
	"testing"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestSavedRepository_SaveAndGet(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()

	// Seed required FK records
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('fin-1992', 'Finnish 1992', 'fi', 'text')`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ('test-user-id', 'test@example.com', 'hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO scopes (id, name, user_id, created_at) VALUES ('test-scope-id', 'Test Scope', 'test-user-id', CURRENT_TIMESTAMP)`)

	repo := db.NewSavedRepository(conn)

	t.Run("successfully save and retrieve saved searches with cached result json", func(t *testing.T) {
		item := models.SavedSearch{
			ID:            "search-1",
			ScopeID:       "test-scope-id",
			Name:          "Nuoli haku UT",
			QueryText:     "nuoli",
			SearchScope:   "nt",
			ScopeValue:    "",
			TranslationID: "fin-1992",
			ResultJSON:    `[{"text":"Jeesus nuoli jotain","verse":1}]`,
			CreatedAt:     time.Now().UTC(),
		}

		if err := repo.SaveSearch(ctx, &item); err != nil {
			t.Fatalf("SaveSearch failed: %v", err)
		}

		list, err := repo.GetSearchesByScope(ctx, "test-scope-id")
		if err != nil {
			t.Fatalf("GetSearchesByScope failed: %v", err)
		}

		if len(list) != 1 {
			t.Errorf("expected 1 saved search, got %d", len(list))
		}

		retrieved := list[0]
		if retrieved.ID != item.ID {
			t.Errorf("expected ID %s, got %s", item.ID, retrieved.ID)
		}
		if retrieved.ResultJSON != item.ResultJSON {
			t.Errorf("expected ResultJSON %s, got %s", item.ResultJSON, retrieved.ResultJSON)
		}
	})

	t.Run("successfully save and retrieve saved analyses with cached result json", func(t *testing.T) {
		item := models.SavedAnalysis{
			ID:            "analysis-1",
			ScopeID:       "test-scope-id",
			Name:          "Johanneksen analyysi",
			Reference:     "Joh 3",
			AnalysisType:  "single_stats",
			TranslationID: "fin-1992",
			ParamsJSON:    "{}",
			ResultJSON:    `{"totalVerses":36,"averageSimilarity":0.95}`,
			CreatedAt:     time.Now().UTC(),
		}

		if err := repo.SaveAnalysis(ctx, &item); err != nil {
			t.Fatalf("SaveAnalysis failed: %v", err)
		}

		list, err := repo.GetAnalysesByScope(ctx, "test-scope-id")
		if err != nil {
			t.Fatalf("GetAnalysesByScope failed: %v", err)
		}

		if len(list) != 1 {
			t.Errorf("expected 1 saved analysis, got %d", len(list))
		}

		retrieved := list[0]
		if retrieved.ID != item.ID {
			t.Errorf("expected ID %s, got %s", item.ID, retrieved.ID)
		}
		if retrieved.ResultJSON != item.ResultJSON {
			t.Errorf("expected ResultJSON %s, got %s", item.ResultJSON, retrieved.ResultJSON)
		}
	})

	t.Run("successfully rename and delete saved search", func(t *testing.T) {
		err := repo.RenameSearch(ctx, "search-1", "Uusi Nimi", "test-user-id")
		if err != nil {
			t.Fatalf("RenameSearch failed: %v", err)
		}

		list, _ := repo.GetSearchesByScope(ctx, "test-scope-id")
		if len(list) != 1 || list[0].Name != "Uusi Nimi" {
			t.Errorf("expected updated name, got %v", list)
		}

		err = repo.DeleteSearch(ctx, "search-1", "test-user-id")
		if err != nil {
			t.Fatalf("DeleteSearch failed: %v", err)
		}

		listAfter, _ := repo.GetSearchesByScope(ctx, "test-scope-id")
		if len(listAfter) != 0 {
			t.Errorf("expected 0 saved searches after delete, got %d", len(listAfter))
		}
	})

	t.Run("successfully rename and delete saved analysis", func(t *testing.T) {
		err := repo.RenameAnalysis(ctx, "analysis-1", "Uusi Analyysi", "test-user-id")
		if err != nil {
			t.Fatalf("RenameAnalysis failed: %v", err)
		}

		list, _ := repo.GetAnalysesByScope(ctx, "test-scope-id")
		if len(list) != 1 || list[0].Name != "Uusi Analyysi" {
			t.Errorf("expected updated name, got %v", list)
		}

		err = repo.DeleteAnalysis(ctx, "analysis-1", "test-user-id")
		if err != nil {
			t.Fatalf("DeleteAnalysis failed: %v", err)
		}

		listAfter, _ := repo.GetAnalysesByScope(ctx, "test-scope-id")
		if len(listAfter) != 0 {
			t.Errorf("expected 0 saved analyses after delete, got %d", len(listAfter))
		}
	})
}

