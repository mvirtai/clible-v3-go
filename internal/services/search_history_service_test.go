package services_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestSearchHistoryService_AddAndGetHistory(t *testing.T) {
	// Establish an in-memory execution instance to assert state validation
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()

	// Seed required translation parent rows to keep integrity boundaries clean
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)

	repo := db.NewSearchHistoryRepository(conn)
	service := services.NewSearchHistoryService(repo)

	t.Run("successfully append history and verify structural property generation", func(t *testing.T) {
		item := &models.SearchHistory{
			QueryText:     "grace",
			SearchScope:   "bible",
			TranslationID: "web",
			Mode:          "phrase",
		}

		if err := service.AddSearch(ctx, item); err != nil {
			t.Fatalf("AddSearch execution failed: %v", err)
		}

		// Assert that UUID generation triggered correctly inside service scope
		if item.ID == "" {
			t.Error("expected auto-generated string identifier, got empty value")
		}

		// Assert that timestamp fallback was applied cleanly
		if item.SearchedAt.IsZero() {
			t.Error("expected valid non-zero UTC searched_at timestamp field allocation")
		}
	})

	t.Run("retrieve historical logs enforcing cap limit criteria", func(t *testing.T) {
		history, err := service.GetRecentHistory(ctx, 10)
		if err != nil {
			t.Fatalf("GetRecentHistory query failed: %v", err)
		}

		if len(history) != 1 {
			t.Errorf("expected exactly 1 populated history record slice entry, got %d", len(history))
		}
	})
}
