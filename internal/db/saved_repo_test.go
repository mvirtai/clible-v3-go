package db_test

import (
	"context"
	"testing"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestScopeAndSavedRepositories_Integration(t *testing.T) {
	// Initialize an isolated memory database instance to perform integration checks
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test database: %v", err)
	}
	defer func() { _ = conn.Close() }() // Safe clean execution complying with errcheck linter

	ctx := context.Background()

	// Seed required translation parent rows to avoid FK violations on saved items
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)

	scopeRepo := db.NewScopeRepository(conn)
	savedRepo := db.NewSavedRepository(conn)

	t.Run("assert scope lifecycle creation and descending chronological ordering", func(t *testing.T) {
		baseTime := time.Now().UTC()

		s1 := models.Scope{ID: "scope-1", Name: "First Study Context", CreatedAt: baseTime.Add(-5 * time.Minute)}
		s2 := models.Scope{ID: "scope-2", Name: "Second Study Context", CreatedAt: baseTime}

		if err := scopeRepo.Create(ctx, &s1); err != nil {
			t.Fatalf("failed to create scope 1: %v", err)
		}
		if err := scopeRepo.Create(ctx, &s2); err != nil {
			t.Fatalf("failed to create scope 2: %v", err)
		}

		scopes, err := scopeRepo.GetAll(ctx)
		if err != nil {
			t.Fatalf("GetAll failed: %v", err)
		}

		if len(scopes) != 2 {
			t.Fatalf("expected 2 scopes, got %d", len(scopes))
		}

		// Assert chronological order (Newest first)
		if scopes[0].ID != "scope-2" {
			t.Errorf("expected position [0] to be scope-2, got %s", scopes[0].ID)
		}
		if scopes[1].ID != "scope-1" {
			t.Errorf("expected position [1] to be scope-1, got %s", scopes[1].ID)
		}
	})

	t.Run("assert saved searches lifecycle and safe NULL/empty string translation handling", func(t *testing.T) {
		searchItem := models.SavedSearch{
			ID:            "search-1",
			ScopeID:       "scope-1",
			Name:          "Grace Search",
			QueryText:     "grace",
			SearchScope:   "bible",
			ScopeValue:    "", // Triggers sql.NullString NULL write conversion path
			TranslationID: "web",
			CreatedAt:     time.Now().UTC(),
		}

		if err := savedRepo.SaveSearch(ctx, &searchItem); err != nil {
			t.Fatalf("SaveSearch failed: %v", err)
		}

		results, err := savedRepo.GetSearchesByScope(ctx, "scope-1")
		if err != nil {
			t.Fatalf("GetSearchesByScope failed: %v", err)
		}

		if len(results) != 1 {
			t.Fatalf("expected 1 saved search item, got %d", len(results))
		}

		if results[0].QueryText != "grace" {
			t.Errorf("expected query text 'grace', got %s", results[0].QueryText)
		}

		// Verify that SQL NULL was cleanly unmapped back into empty Go strings without panic
		if results[0].ScopeValue != "" {
			t.Errorf("expected empty string fallback restoration for NULL field, got %q", results[0].ScopeValue)
		}
	})

	t.Run("assert saved analyses lifecycle storage with detailed json parameter blocks", func(t *testing.T) {
		analysisItem := models.SavedAnalysis{
			ID:            "analysis-1",
			ScopeID:       "scope-1",
			Name:          "Word Count Analytics",
			Reference:     "Joh 3:16",
			AnalysisType:  "word_cloud",
			TranslationID: "", // Triggers NULL mapping sequence safely
			ParamsJSON:    `{"excludeStopwords":true}`,
			CreatedAt:     time.Now().UTC(),
		}

		if err := savedRepo.SaveAnalysis(ctx, &analysisItem); err != nil {
			t.Fatalf("SaveAnalysis failed: %v", err)
		}

		results, err := savedRepo.GetAnalysesByScope(ctx, "scope-1")
		if err != nil {
			t.Fatalf("GetAnalysesByScope failed: %v", err)
		}

		if len(results) != 1 {
			t.Fatalf("expected 1 saved analysis, got %d", len(results))
		}

		if results[0].ParamsJSON != `{"excludeStopwords":true}` {
			t.Errorf("expected params json to match input, got %s", results[0].ParamsJSON)
		}
		if results[0].TranslationID != "" {
			t.Errorf("expected empty translation string from NULL field scan, got %s", results[0].TranslationID)
		}
	})

	t.Run("assert cascade deletion removes nested records when parent scope is destroyed", func(t *testing.T) {
		// Verify data exists before scope deletion execution
		searchesBefore, _ := savedRepo.GetSearchesByScope(ctx, "scope-1")
		analysesBefore, _ := savedRepo.GetAnalysesByScope(ctx, "scope-1")
		if len(searchesBefore) == 0 || len(analysesBefore) == 0 {
			t.Fatalf("precondition failed: target scope data was not seeded properly")
		}

		// Perform parent deletion branch cascade wipe execution hook
		if err := scopeRepo.Delete(ctx, "scope-1"); err != nil {
			t.Fatalf("scope Delete failed: %v", err)
		}

		// Assert scope itself is cleanly unmapped from the global context
		scopes, _ := scopeRepo.GetAll(ctx)
		for _, s := range scopes {
			if s.ID == "scope-1" {
				t.Errorf("scope-1 was found after explicit delete operation execution")
			}
		}

		// Assert ON DELETE CASCADE triggers completely cleared nested tables automatically
		searchesAfter, err := savedRepo.GetSearchesByScope(ctx, "scope-1")
		if err != nil {
			t.Fatalf("failed to query searches after delete branch hook: %v", err)
		}
		if len(searchesAfter) != 0 {
			t.Errorf("expected 0 cascading saved searches remaining, got %d", len(searchesAfter))
		}

		analysesAfter, err := savedRepo.GetAnalysesByScope(ctx, "scope-1")
		if err != nil {
			t.Fatalf("failed to query analyses after delete branch hook: %v", err)
		}
		if len(analysesAfter) != 0 {
			t.Errorf("expected 0 cascading saved analyses remaining, got %d", len(analysesAfter))
		}
	})
}
