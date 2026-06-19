package db_test

import (
	"context"
	"testing"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestSearchHistoryRepository_SaveAndGetLatest(t *testing.T) {
	// Initialize a clean, isolated SQLite instance completely inside memory
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()

	// Seed required FK parent row to prevent PRAGMA foreign_key constraint triggers
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('fin-1992', 'Finnish 1992', 'fi', 'text')`)

	// NOTE: This will cause a compilation failure initially because the repository is not yet defined.
	repo := db.NewSearchHistoryRepository(conn)

	t.Run("successfully persist a fresh history record", func(t *testing.T) {
		item := models.SearchHistory{
			ID:            "test-uuid-1",
			QueryText:     "armon liitto",
			SearchScope:   "bible",
			ScopeValue:    "",
			TranslationID: "fin-1992",
			Mode:          "phrase",
			ResultCount:   7,
			SearchedAt:    time.Now().UTC(),
		}

		if err := repo.Save(ctx, &item); err != nil {
			t.Fatalf("Save failed: %v", err)
		}

	})

	t.Run("retrieve latest items honoring limit slices and descending temporal sequence", func(t *testing.T) {
		// Shift baseTime 1 hour into the future to keep test sequences isolated from previous subtest rows
		baseTime := time.Now().UTC().Add(1 * time.Hour)

		items := []models.SearchHistory{
			{ID: "id-old", QueryText: "oldest query", SearchScope: "bible", Mode: "phrase", SearchedAt: baseTime.Add(-10 * time.Minute)},
			{ID: "id-mid", QueryText: "middle query", SearchScope: "bible", Mode: "phrase", SearchedAt: baseTime.Add(-5 * time.Minute)},
			{ID: "id-new", QueryText: "newest query", SearchScope: "bible", Mode: "phrase", SearchedAt: baseTime},
		}

		for _, item := range items {
			if err := repo.Save(ctx, &item); err != nil {
				t.Fatalf("failed to seed structural history item: %v", err)
			}
		}

		results, err := repo.GetLatest(ctx, 2)
		if err != nil {
			t.Fatalf("GetLatest failed: %v", err)
		}

		if len(results) != 2 {
			t.Fatalf("expected bounded array length of 2, got %d", len(results))
		}

		if results[0].ID != "id-new" {
			t.Errorf("expected position [0] to match 'id-new', got %s", results[0].ID)
		}
		if results[1].ID != "id-mid" {
			t.Errorf("expected position [1] to match 'id-mid', got %s", results[1].ID)
		}
	})
}
