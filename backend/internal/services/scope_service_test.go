package services_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestScopeService_WorkspaceFlow(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()

	// Seed required parents
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ('test-user-id', 'test@example.com', 'hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)

	scopeRepo := db.NewScopeRepository(conn)
	savedRepo := db.NewSavedRepository(conn)
	notebookRepo := db.NewNotebookRepository(conn)
	service := services.NewScopeService(scopeRepo, savedRepo, notebookRepo)

	var activeScopeID string

	t.Run("successfully create a new workspace scope with UUID validation", func(t *testing.T) {
		scope, err := service.CreateScope(ctx, "Romans Study Group", "test-user-id")
		if err != nil {
			t.Fatalf("CreateScope failed: %v", err)
		}

		if scope.ID == "" {
			t.Error("expected generated string UUID for scope ID, got empty")
		}

		activeScopeID = scope.ID
	})

	t.Run("successfully save search and analysis to scope and retrieve workspace state", func(t *testing.T) {
		searchItem := &models.SavedSearch{
			ScopeID:       activeScopeID,
			Name:          "Grace queries",
			QueryText:     "grace",
			SearchScope:   "ot",
			ScopeValue:    "",
			TranslationID: "web",
			ResultJSON:    `[{"text":"in grace we stand"}]`,
		}

		if err := service.SaveSearch(ctx, searchItem); err != nil {
			t.Fatalf("SaveSearch failed: %v", err)
		}

		analysisItem := &models.SavedAnalysis{
			ScopeID:       activeScopeID,
			Name:          "Romans Frequency Stats",
			Reference:     "Rom 1-5",
			AnalysisType:  "single_stats",
			TranslationID: "web",
			ParamsJSON:    "{}",
			ResultJSON:    `{"frequencies":{"grace":5}}`,
		}

		if err := service.SaveAnalysis(ctx, analysisItem); err != nil {
			t.Fatalf("SaveAnalysis failed: %v", err)
		}

		// Retrieve entire workspace
		workspace, err := service.GetScopeWorkspace(ctx, activeScopeID, "test-user-id")
		if err != nil {
			t.Fatalf("GetScopeWorkspace failed: %v", err)
		}

		if workspace.Scope.Name != "Romans Study Group" {
			t.Errorf("expected scope name 'Romans Study Group', got '%s'", workspace.Scope.Name)
		}

		if len(workspace.Searches) != 1 {
			t.Errorf("expected 1 search in workspace, got %d", len(workspace.Searches))
		}
		if workspace.Searches[0].ResultJSON != searchItem.ResultJSON {
			t.Errorf("expected Search ResultJSON %s, got %s", searchItem.ResultJSON, workspace.Searches[0].ResultJSON)
		}

		if len(workspace.Analyses) != 1 {
			t.Errorf("expected 1 analysis in workspace, got %d", len(workspace.Analyses))
		}
		if workspace.Analyses[0].ResultJSON != analysisItem.ResultJSON {
			t.Errorf("expected Analysis ResultJSON %s, got %s", analysisItem.ResultJSON, workspace.Analyses[0].ResultJSON)
		}
	})

	t.Run("GetScopes, RenameScope and DeleteScope", func(t *testing.T) {
		scopes, err := service.GetScopes(ctx, "test-user-id")
		if err != nil {
			t.Fatalf("GetScopes failed: %v", err)
		}
		if len(scopes) != 1 {
			t.Errorf("expected 1 scope, got %d", len(scopes))
		}

		err = service.RenameScope(ctx, activeScopeID, "Renamed Scope", "test-user-id")
		if err != nil {
			t.Fatalf("RenameScope failed: %v", err)
		}

		err = service.RenameSearch(ctx, "search-1", "Renamed Search", "test-user-id")
		if err != nil {
			t.Fatalf("RenameSearch failed: %v", err)
		}

		err = service.DeleteSearch(ctx, "search-1", "test-user-id")
		if err != nil {
			t.Fatalf("DeleteSearch failed: %v", err)
		}

		err = service.RenameAnalysis(ctx, "analysis-1", "Renamed Analysis", "test-user-id")
		if err != nil {
			t.Fatalf("RenameAnalysis failed: %v", err)
		}

		err = service.DeleteAnalysis(ctx, "analysis-1", "test-user-id")
		if err != nil {
			t.Fatalf("DeleteAnalysis failed: %v", err)
		}

		err = service.DeleteScope(ctx, activeScopeID, "test-user-id")
		if err != nil {
			t.Fatalf("DeleteScope failed: %v", err)
		}

		scopesAfter, _ := service.GetScopes(ctx, "test-user-id")
		if len(scopesAfter) != 0 {
			t.Errorf("expected 0 scopes after delete, got %d", len(scopesAfter))
		}
	})
}

