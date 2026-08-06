package services_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func setupTestDB(t *testing.T) *sql.DB {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	return conn
}

func seedUser(t *testing.T, conn *sql.DB, userID string) {
	ctx := context.Background()
	var exists bool
	err := conn.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)", userID).Scan(&exists)
	if err == nil && exists {
		return
	}
	_, err = conn.ExecContext(ctx,
		`INSERT INTO users (id, email, password_hash, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?)`,
		userID, userID+"@example.com", "hash", time.Now().UTC(), time.Now().UTC())
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
}

func seedScope(t *testing.T, conn *sql.DB, userID, scopeID string) {
	if scopeID == "" {
		return
	}
	ctx := context.Background()
	_, err := conn.ExecContext(ctx,
		`INSERT INTO scopes (id, name, user_id, created_at) 
		 VALUES (?, ?, ?, ?)`,
		scopeID, "Scope "+scopeID, userID, time.Now().UTC())
	if err != nil {
		t.Fatalf("failed to seed scope: %v", err)
	}
}

func seedUserAndScope(t *testing.T, conn *sql.DB, userID, scopeID string) {
	seedUser(t, conn, userID)
	seedScope(t, conn, userID, scopeID)
}

func TestNotebookService_CreateNotebook(t *testing.T) {
	conn := setupTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)

	userID := uuid.New().String()
	scopeID := uuid.New().String()
	seedUserAndScope(t, conn, userID, scopeID)

	ctx := context.Background()

	t.Run("successfully creates notebook with title", func(t *testing.T) {
		nb, err := service.CreateNotebook(ctx, "My First Notebook", userID, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if nb.Title != "My First Notebook" {
			t.Errorf("expected title %q, got %q", "My First Notebook", nb.Title)
		}
		if nb.UserID != userID {
			t.Errorf("expected userID %q, got %q", userID, nb.UserID)
		}
		if len(nb.Cells) != 0 {
			t.Errorf("expected 0 cells, got %d", len(nb.Cells))
		}
	})

	t.Run("defaults title when empty", func(t *testing.T) {
		nb, err := service.CreateNotebook(ctx, "", userID, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if nb.Title != "Nimetön muistikirja" {
			t.Errorf("expected default title, got %q", nb.Title)
		}
	})

	t.Run("creates notebook with valid scope", func(t *testing.T) {
		nb, err := service.CreateNotebook(ctx, "Scoped Notebook", userID, scopeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if nb.ScopeID != scopeID {
			t.Errorf("expected scopeID %q, got %q", scopeID, nb.ScopeID)
		}
	})

	t.Run("rejects invalid scope (not owned by user)", func(t *testing.T) {
		otherUserID := uuid.New().String()
		otherScopeID := uuid.New().String()
		seedUserAndScope(t, conn, otherUserID, otherScopeID)

		_, err := service.CreateNotebook(ctx, "Notebook", userID, otherScopeID)
		if err == nil {
			t.Fatal("expected error when scope not owned by user")
		}
		if err.Error() != "scope not found or access denied" {
			t.Errorf("expected 'scope not found or access denied', got %q", err.Error())
		}
	})

	t.Run("rejects missing userID", func(t *testing.T) {
		_, err := service.CreateNotebook(ctx, "Title", "", "")
		if err == nil {
			t.Fatal("expected error when userID is empty")
		}
		if err.Error() != "userID is required" {
			t.Errorf("expected 'userID is required', got %q", err.Error())
		}
	})
}

func TestNotebookService_GetNotebook(t *testing.T) {
	conn := setupTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedUserAndScope(t, conn, userID, "")
	seedUserAndScope(t, conn, otherUserID, "")

	ctx := context.Background()

	// Create a notebook
	nb, err := service.CreateNotebook(ctx, "Test Notebook", userID, "")
	if err != nil {
		t.Fatalf("failed to create notebook: %v", err)
	}

	t.Run("successfully retrieves notebook for owner", func(t *testing.T) {
		retrieved, err := service.GetNotebook(ctx, nb.ID, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if retrieved == nil {
			t.Fatal("expected notebook, got nil")
			return
		}
		if retrieved.ID != nb.ID {
			t.Errorf("expected ID %q, got %q", nb.ID, retrieved.ID)
		}
		if retrieved.Title != nb.Title {
			t.Errorf("expected Title %q, got %q", nb.Title, retrieved.Title)
		}
	})

	t.Run("denies access to unauthorized user", func(t *testing.T) {
		_, err := service.GetNotebook(ctx, nb.ID, otherUserID)
		if err == nil {
			t.Fatal("expected error when accessing other user's notebook")
		}
		if err.Error() != "access denied" {
			t.Errorf("expected 'access denied', got %q", err.Error())
		}
	})

	t.Run("returns error for non-existent notebook", func(t *testing.T) {
		_, err := service.GetNotebook(ctx, "non-existent-id", userID)
		if err == nil {
			t.Fatal("expected error for non-existent notebook")
		}
		if err.Error() != "notebook not found" {
			t.Errorf("expected 'notebook not found', got %q", err.Error())
		}
	})

	t.Run("rejects empty notebook ID", func(t *testing.T) {
		_, err := service.GetNotebook(ctx, "", userID)
		if err == nil {
			t.Fatal("expected error when notebook ID is empty")
		}
		if err.Error() != "notebook id is required" {
			t.Errorf("expected 'notebook id is required', got %q", err.Error())
		}
	})
}

func TestNotebookService_GetNotebooksByUser(t *testing.T) {
	conn := setupTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedUserAndScope(t, conn, userID, "")
	seedUserAndScope(t, conn, otherUserID, "")

	ctx := context.Background()

	// Create notebooks for both users
	nb1, _ := service.CreateNotebook(ctx, "Notebook 1", userID, "")
	nb2, _ := service.CreateNotebook(ctx, "Notebook 2", userID, "")
	_, _ = service.CreateNotebook(ctx, "Other User Notebook", otherUserID, "")

	t.Run("retrieves all notebooks for user", func(t *testing.T) {
		notebooks, err := service.GetNotebooksByUser(ctx, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(notebooks) != 2 {
			t.Errorf("expected 2 notebooks, got %d", len(notebooks))
		}
		ids := make(map[string]bool)
		for _, nb := range notebooks {
			ids[nb.ID] = true
		}
		if !ids[nb1.ID] || !ids[nb2.ID] {
			t.Error("expected both notebooks to be returned")
		}
	})

	t.Run("returns empty list for user with no notebooks", func(t *testing.T) {
		newUserID := uuid.New().String()
		seedUserAndScope(t, conn, newUserID, "")
		notebooks, err := service.GetNotebooksByUser(ctx, newUserID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(notebooks) != 0 {
			t.Errorf("expected 0 notebooks, got %d", len(notebooks))
		}
	})

	t.Run("rejects empty userID", func(t *testing.T) {
		_, err := service.GetNotebooksByUser(ctx, "")
		if err == nil {
			t.Fatal("expected error when userID is empty")
		}
		if err.Error() != "userID is required" {
			t.Errorf("expected 'userID is required', got %q", err.Error())
		}
	})
}

func TestNotebookService_UpdateNotebook(t *testing.T) {
	conn := setupTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)

	userID := uuid.New().String()
	scopeID1 := uuid.New().String()
	scopeID2 := uuid.New().String()
	seedUserAndScope(t, conn, userID, scopeID1)
	seedUserAndScope(t, conn, userID, scopeID2)

	ctx := context.Background()

	nb, _ := service.CreateNotebook(ctx, "Original Title", userID, scopeID1)

	t.Run("successfully updates title", func(t *testing.T) {
		updated, err := service.UpdateNotebook(ctx, nb.ID, "New Title", scopeID1, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if updated.Title != "New Title" {
			t.Errorf("expected title 'New Title', got %q", updated.Title)
		}
	})

	t.Run("successfully updates scope", func(t *testing.T) {
		updated, err := service.UpdateNotebook(ctx, nb.ID, "Title", scopeID2, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if updated.ScopeID != scopeID2 {
			t.Errorf("expected scopeID %q, got %q", scopeID2, updated.ScopeID)
		}
	})

	t.Run("rejects update with unauthorized scope", func(t *testing.T) {
		otherUserID := uuid.New().String()
		otherScopeID := uuid.New().String()
		seedUserAndScope(t, conn, otherUserID, otherScopeID)

		_, err := service.UpdateNotebook(ctx, nb.ID, "Title", otherScopeID, userID)
		if err == nil {
			t.Fatal("expected error when scope not owned by user")
		}
		if err.Error() != "scope not found or access denied" {
			t.Errorf("expected 'scope not found or access denied', got %q", err.Error())
		}
	})

	t.Run("rejects update by unauthorized user", func(t *testing.T) {
		otherUserID := uuid.New().String()
		seedUserAndScope(t, conn, otherUserID, "")

		_, err := service.UpdateNotebook(ctx, nb.ID, "Title", "", otherUserID)
		if err == nil {
			t.Fatal("expected error when user doesn't own notebook")
		}
	})
}

func TestNotebookService_DeleteNotebook(t *testing.T) {
	conn := setupTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedUserAndScope(t, conn, userID, "")
	seedUserAndScope(t, conn, otherUserID, "")

	ctx := context.Background()

	nb, _ := service.CreateNotebook(ctx, "To Delete", userID, "")

	t.Run("successfully deletes owned notebook", func(t *testing.T) {
		err := service.DeleteNotebook(ctx, nb.ID, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Verify it's gone
		_, err = service.GetNotebook(ctx, nb.ID, userID)
		if err == nil || err.Error() != "notebook not found" {
			t.Error("expected notebook to be deleted")
		}
	})

	t.Run("rejects deletion by unauthorized user", func(t *testing.T) {
		nb2, _ := service.CreateNotebook(ctx, "Another Notebook", userID, "")
		err := service.DeleteNotebook(ctx, nb2.ID, otherUserID)
		if err == nil {
			t.Fatal("expected error when user doesn't own notebook")
		}
	})

	t.Run("rejects deletion of non-existent notebook", func(t *testing.T) {
		err := service.DeleteNotebook(ctx, "non-existent-id", userID)
		if err == nil {
			t.Fatal("expected error for non-existent notebook")
		}
	})
}

func TestNotebookService_SaveCells(t *testing.T) {
	conn := setupTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedUserAndScope(t, conn, userID, "")
	seedUserAndScope(t, conn, otherUserID, "")

	ctx := context.Background()

	nb, _ := service.CreateNotebook(ctx, "Notebook with Cells", userID, "")

	t.Run("successfully saves cells in correct order", func(t *testing.T) {
		cells := []models.Cell{
			{
				ID:         uuid.New().String(),
				NotebookID: nb.ID,
				Type:       models.CellTypeMarkdown,
				Content:    "# Title",
				Position:   0,
			},
			{
				ID:         uuid.New().String(),
				NotebookID: nb.ID,
				Type:       models.CellTypeCode,
				Content:    "some_code()",
				Position:   1,
			},
		}

		err := service.SaveCells(ctx, nb.ID, userID, cells)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Verify cells were saved
		retrieved, err := service.GetNotebookCells(ctx, nb.ID, userID)
		if err != nil {
			t.Fatalf("failed to get cells: %v", err)
		}
		if len(retrieved) != 2 {
			t.Errorf("expected 2 cells, got %d", len(retrieved))
		}
		if retrieved[0].Content != "# Title" {
			t.Errorf("expected first cell content '# Title', got %q", retrieved[0].Content)
		}
		if retrieved[1].Content != "some_code()" {
			t.Errorf("expected second cell content 'some_code()', got %q", retrieved[1].Content)
		}
	})

	t.Run("replaces existing cells (not append)", func(t *testing.T) {
		// Save initial cells
		initialCells := []models.Cell{
			{
				ID:         uuid.New().String(),
				NotebookID: nb.ID,
				Type:       models.CellTypeMarkdown,
				Content:    "Initial",
				Position:   0,
			},
		}
		_ = service.SaveCells(ctx, nb.ID, userID, initialCells)

		// Save new cells (should replace)
		newCells := []models.Cell{
			{
				ID:         uuid.New().String(),
				NotebookID: nb.ID,
				Type:       models.CellTypeCode,
				Content:    "New Cell 1",
				Position:   0,
			},
			{
				ID:         uuid.New().String(),
				NotebookID: nb.ID,
				Type:       models.CellTypeCode,
				Content:    "New Cell 2",
				Position:   1,
			},
		}
		err := service.SaveCells(ctx, nb.ID, userID, newCells)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		retrieved, _ := service.GetNotebookCells(ctx, nb.ID, userID)
		if len(retrieved) != 2 {
			t.Errorf("expected 2 cells after replacement, got %d", len(retrieved))
		}
		if retrieved[0].Content == "Initial" {
			t.Error("old cells should have been replaced")
		}
	})

	t.Run("rejects save by unauthorized user", func(t *testing.T) {
		cells := []models.Cell{
			{
				ID:       uuid.New().String(),
				Type:     models.CellTypeMarkdown,
				Content:  "Content",
				Position: 0,
			},
		}

		err := service.SaveCells(ctx, nb.ID, otherUserID, cells)
		if err == nil {
			t.Fatal("expected error when user doesn't own notebook")
		}
	})

	t.Run("saves empty cell list (clears cells)", func(t *testing.T) {
		err := service.SaveCells(ctx, nb.ID, userID, []models.Cell{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		retrieved, _ := service.GetNotebookCells(ctx, nb.ID, userID)
		if len(retrieved) != 0 {
			t.Errorf("expected 0 cells after clearing, got %d", len(retrieved))
		}
	})
}

func TestNotebookService_GetNotebookCells(t *testing.T) {
	conn := setupTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedUserAndScope(t, conn, userID, "")
	seedUserAndScope(t, conn, otherUserID, "")

	ctx := context.Background()

	nb, _ := service.CreateNotebook(ctx, "Notebook with Cells", userID, "")

	// Save some cells
	cells := []models.Cell{
		{
			ID:       uuid.New().String(),
			Type:     models.CellTypeMarkdown,
			Content:  "# Header",
			Position: 0,
		},
	}
	_ = service.SaveCells(ctx, nb.ID, userID, cells)

	t.Run("successfully retrieves cells for owner", func(t *testing.T) {
		retrieved, err := service.GetNotebookCells(ctx, nb.ID, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(retrieved) != 1 {
			t.Errorf("expected 1 cell, got %d", len(retrieved))
		}
	})

	t.Run("denies access to unauthorized user", func(t *testing.T) {
		_, err := service.GetNotebookCells(ctx, nb.ID, otherUserID)
		if err == nil {
			t.Fatal("expected error when user doesn't own notebook")
		}
	})

	t.Run("rejects empty notebook ID", func(t *testing.T) {
		_, err := service.GetNotebookCells(ctx, "", userID)
		if err == nil {
			t.Fatal("expected error when notebook ID is empty")
		}
		if err.Error() != "notebookID and userID are required" {
			t.Errorf("expected 'notebookID and userID are required', got %q", err.Error())
		}
	})
}

func TestParseCellScopeFlags(t *testing.T) {
	tests := []struct {
		name         string
		cmd          *services.CLICommand
		defaultDir   string
		defaultCount int
		expectedDir  string
		expectedCnt  int
	}{
		{
			name:         "backward compatibility with --scope=prev",
			cmd:          &services.CLICommand{Flags: map[string]string{"scope": "prev"}},
			defaultDir:   "up",
			defaultCount: -1,
			expectedDir:  "up",
			expectedCnt:  1,
		},
		{
			name:         "explicit --dir=down and --n=3",
			cmd:          &services.CLICommand{Flags: map[string]string{"dir": "down", "n": "3"}},
			defaultDir:   "up",
			defaultCount: -1,
			expectedDir:  "down",
			expectedCnt:  3,
		},
		{
			name:         "explicit --dir alias 'next' and 'prev'",
			cmd:          &services.CLICommand{Flags: map[string]string{"dir": "next"}},
			defaultDir:   "up",
			defaultCount: -1,
			expectedDir:  "down",
			expectedCnt:  -1,
		},
		{
			name:         "explicit --ref=all",
			cmd:          &services.CLICommand{Flags: map[string]string{"ref": "all"}},
			defaultDir:   "up",
			defaultCount: -1,
			expectedDir:  "all",
			expectedCnt:  -1,
		},
		{
			name:         "flexible --n with suffix 2p (2 prev / up)",
			cmd:          &services.CLICommand{Flags: map[string]string{"n": "2p"}},
			defaultDir:   "down",
			defaultCount: 1,
			expectedDir:  "up",
			expectedCnt:  2,
		},
		{
			name:         "flexible --n with suffix 4d (4 down)",
			cmd:          &services.CLICommand{Flags: map[string]string{"n": "4d"}},
			defaultDir:   "up",
			defaultCount: -1,
			expectedDir:  "down",
			expectedCnt:  4,
		},
		{
			name:         "flexible --n with suffix 3n (3 next / down)",
			cmd:          &services.CLICommand{Flags: map[string]string{"n": "3n"}},
			defaultDir:   "up",
			defaultCount: -1,
			expectedDir:  "down",
			expectedCnt:  3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := services.ParseCellScopeFlags(tt.cmd, tt.defaultDir, tt.defaultCount)
			if opts.Direction != tt.expectedDir {
				t.Errorf("expected Direction %q, got %q", tt.expectedDir, opts.Direction)
			}
			if opts.Count != tt.expectedCnt {
				t.Errorf("expected Count %d, got %d", tt.expectedCnt, opts.Count)
			}
		})
	}
}

func TestResolveCellContext(t *testing.T) {
	cells := []models.Cell{
		{ID: "c1", Type: models.CellTypeMarkdown, Content: "Header 1"},
		{ID: "c2", Type: models.CellTypeMarkdown, Content: "Paragraph 1"},
		{ID: "c3", Type: models.CellTypeCode, Content: "/suggest"},
		{ID: "c4", Type: models.CellTypeMarkdown, Content: "Paragraph 2"},
		{ID: "c5", Type: models.CellTypeMarkdown, Content: "Footer"},
	}

	t.Run("/suggest default fetches all preceding markdown cells", func(t *testing.T) {
		cmd := &services.CLICommand{Name: "/suggest", Flags: map[string]string{}}
		result := services.ResolveCellContext(cells, "c3", cmd)
		expected := "Header 1\n\nParagraph 1"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})

	t.Run("/suggest with --n=1 fetches only previous cell", func(t *testing.T) {
		cmd := &services.CLICommand{Name: "/suggest", Flags: map[string]string{"n": "1"}}
		result := services.ResolveCellContext(cells, "c3", cmd)
		expected := "Paragraph 1"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})

	t.Run("/themes default fetches next markdown cell", func(t *testing.T) {
		cmd := &services.CLICommand{Name: "/themes", Flags: map[string]string{}}
		result := services.ResolveCellContext(cells, "c3", cmd)
		expected := "Paragraph 2"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})

	t.Run("/themes with --n=2d fetches two downward markdown cells", func(t *testing.T) {
		cmd := &services.CLICommand{Name: "/themes", Flags: map[string]string{"n": "2d"}}
		result := services.ResolveCellContext(cells, "c3", cmd)
		expected := "Paragraph 2\n\nFooter"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})

	t.Run("--ref=all fetches all markdown cells except target", func(t *testing.T) {
		cmd := &services.CLICommand{Name: "/suggest", Flags: map[string]string{"ref": "all"}}
		result := services.ResolveCellContext(cells, "c3", cmd)
		expected := "Header 1\n\nParagraph 1\n\nParagraph 2\n\nFooter"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})

	t.Run("returns empty string when target cell not found", func(t *testing.T) {
		cmd := &services.CLICommand{Name: "/suggest", Flags: map[string]string{}}
		result := services.ResolveCellContext(cells, "nonexistent", cmd)
		if result != "" {
			t.Errorf("expected empty string, got %q", result)
		}
	})
}

