package services_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestScopeService_WorkspaceExecution(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to boot database instance: %v", err)
	}
	defer func() { _ = conn.Close() }() // Strict compliance checking with errcheck linter rules

	ctx := context.Background()
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)

	scopeRepo := db.NewScopeRepository(conn)
	savedRepo := db.NewSavedRepository(conn)
	service := services.NewScopeService(scopeRepo, savedRepo)

	var activeScopeID string

	t.Run("CreateScope populates validation layers and injects valid UUID properties", func(t *testing.T) {
		scope, err := service.CreateScope(ctx, "Prophets Exploration")
		if err != nil {
			t.Fatalf("unexpected failure on scope creation: %v", err)
		}

		if scope.ID == "" || scope.Name != "Prophets Exploration" {
			t.Errorf("scope struct properties initialized incorrectly: %v", scope)
		}
		if scope.CreatedAt.IsZero() {
			t.Error("expected valid created_at timestamp mapping assignment")
		}

		activeScopeID = scope.ID // Safe storage for downstream workspace inclusion testing
	})

	t.Run("CreateScope returns clear validation errors on empty strings", func(t *testing.T) {
		_, err := service.CreateScope(ctx, "")
		if err == nil {
			t.Error("expected validation boundary trigger failure for empty string input parameter")
		}
	})

	t.Run("SaveSearch and SaveAnalysis correctly store assets into active workspace scope", func(t *testing.T) {
		search := models.SavedSearch{
			ScopeID:       activeScopeID,
			Name:          "Messianic Verses",
			QueryText:     "branch of David",
			SearchScope:   "bible",
			TranslationID: "web",
		}

		if err := service.SaveSearch(ctx, &search); err != nil {
			t.Fatalf("SaveSearch failed: %v", err)
		}

		analysis := models.SavedAnalysis{
			ScopeID:      activeScopeID,
			Name:         "Isaiah Token Counts",
			Reference:    "Isa 11:1",
			AnalysisType: "word_cloud",
			ParamsJSON:   `{}`,
		}

		if err := service.SaveAnalysis(ctx, &analysis); err != nil {
			t.Fatalf("SaveAnalysis failed: %v", err)
		}

		// Verify automatic ID extraction hydration triggers worked flawlessly
		if search.ID == "" || analysis.ID == "" {
			t.Error("expected service boundary asset hydrator to generate structural string identifiers")
		}
	})

	t.Run("GetScopeWorkspace bundles all contextual elements neatly in one transaction response slice", func(t *testing.T) {
		workspace, err := service.GetScopeWorkspace(ctx, activeScopeID)
		if err != nil {
			t.Fatalf("GetScopeWorkspace compilation tracking lookup failed: %v", err)
		}

		if len(workspace.Searches) != 1 || workspace.Searches[0].Name != "Messianic Verses" {
			t.Errorf("failed to query nested saved searches from context frame: %v", workspace.Searches)
		}

		if len(workspace.Analyses) != 1 || workspace.Analyses[0].AnalysisType != "word_cloud" {
			t.Errorf("failed to query nested saved analyses from context frame: %v", workspace.Analyses)
		}
	})
}
