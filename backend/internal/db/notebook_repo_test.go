package db_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestNotebookRepository(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()

	// Seed required FK records
	_, _ = conn.ExecContext(ctx, `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ('test-user-id', 'test@example.com', 'hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO scopes (id, name, user_id, created_at) VALUES ('test-scope-id', 'Test Scope', 'test-user-id', CURRENT_TIMESTAMP)`)

	repo := db.NewNotebookRepository(conn)

	t.Run("successfully create, get, update, delete notebook and save cells", func(t *testing.T) {
		nbID := uuid.New().String()
		nb := &models.Notebook{
			ID:        nbID,
			Title:     "My First Notebook",
			UserID:    "test-user-id",
			ScopeID:   "test-scope-id",
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}

		// 1. Create
		if err := repo.Create(ctx, nb); err != nil {
			t.Fatalf("Create failed: %v", err)
		}

		// 2. GetByID
		fetched, err := repo.GetByID(ctx, nbID)
		if err != nil {
			t.Fatalf("GetByID failed: %v", err)
		}
		if fetched == nil {
			t.Fatal("expected notebook to be found, got nil")
			return
		}
		if fetched.Title != nb.Title {
			t.Errorf("expected Title %q, got %q", nb.Title, fetched.Title)
		}
		if fetched.UserID != nb.UserID {
			t.Errorf("expected UserID %q, got %q", nb.UserID, fetched.UserID)
		}

		// 3. GetByUserID
		list, err := repo.GetByUserID(ctx, "test-user-id")
		if err != nil {
			t.Fatalf("GetByUserID failed: %v", err)
		}
		if len(list) != 1 {
			t.Errorf("expected 1 notebook, got %d", len(list))
		}

		// 4. Update
		nb.Title = "Updated Title"
		if err := repo.Update(ctx, nb); err != nil {
			t.Fatalf("Update failed: %v", err)
		}
		fetchedUpdated, err := repo.GetByID(ctx, nbID)
		if err != nil {
			t.Fatalf("GetByID after update failed: %v", err)
		}
		if fetchedUpdated.Title != "Updated Title" {
			t.Errorf("expected updated title %q, got %q", "Updated Title", fetchedUpdated.Title)
		}

		// 5. Save and Get Cells
		cells := []models.Cell{
			{
				ID:         uuid.New().String(),
				NotebookID: nbID,
				Type:       models.CellTypeMarkdown,
				Content:    "# Introduction to study",
				Position:   0,
			},
			{
				ID:         uuid.New().String(),
				NotebookID: nbID,
				Type:       models.CellTypeCode,
				Content:    "find_verse('Gen 1:1')",
				ResultJSON: json.RawMessage(`{"verse": "Genesis 1:1"}`),
				Position:   1,
			},
		}

		if err := repo.SaveCells(ctx, nbID, cells); err != nil {
			t.Fatalf("SaveCells failed: %v", err)
		}

		fetchedCells, err := repo.GetCells(ctx, nbID)
		if err != nil {
			t.Fatalf("GetCells failed: %v", err)
		}
		if len(fetchedCells) != 2 {
			t.Errorf("expected 2 cells, got %d", len(fetchedCells))
		}
		if fetchedCells[0].Content != "# Introduction to study" {
			t.Errorf("expected first cell content %q, got %q", "# Introduction to study", fetchedCells[0].Content)
		}
		if string(fetchedCells[1].ResultJSON) != `{"verse": "Genesis 1:1"}` {
			t.Errorf("expected result json %q, got %q", `{"verse": "Genesis 1:1"}`, string(fetchedCells[1].ResultJSON))
		}

		// Verify CellCounts in GetByUserID
		userList, err := repo.GetByUserID(ctx, "test-user-id")
		if err != nil {
			t.Fatalf("GetByUserID after SaveCells failed: %v", err)
		}
		if len(userList) != 1 {
			t.Fatalf("expected 1 notebook, got %d", len(userList))
		}
		if userList[0].CellCounts == nil {
			t.Fatal("expected CellCounts not to be nil")
		}
		if userList[0].CellCounts.Markdown != 1 || userList[0].CellCounts.Code != 1 {
			t.Errorf("expected CellCounts {Markdown: 1, Code: 1}, got %+v", *userList[0].CellCounts)
		}

		// 6. GetByScopeID
		emptyScopeList, err := repo.GetByScopeID(ctx, "")
		if err != nil {
			t.Fatalf("GetByScopeID with empty string failed: %v", err)
		}
		if len(emptyScopeList) != 0 {
			t.Errorf("expected 0 notebooks for empty scope, got %d", len(emptyScopeList))
		}

		byScopeList, err := repo.GetByScopeID(ctx, "test-scope-id")
		if err != nil {
			t.Fatalf("GetByScopeID failed: %v", err)
		}
		if len(byScopeList) != 1 {
			t.Errorf("expected 1 notebook for test-scope-id, got %d", len(byScopeList))
		}

		// 7. UpdateCellResult
		cellToUpdateID := fetchedCells[1].ID
		newResult := []byte(`{"verse":"Genesis 1:1","updated":true}`)
		if err := repo.UpdateCellResult(ctx, cellToUpdateID, newResult); err != nil {
			t.Fatalf("UpdateCellResult failed: %v", err)
		}
		updatedCells, err := repo.GetCells(ctx, nbID)
		if err != nil {
			t.Fatalf("GetCells after UpdateCellResult failed: %v", err)
		}
		if string(updatedCells[1].ResultJSON) != string(newResult) {
			t.Errorf("expected updated cell result %s, got %s", string(newResult), string(updatedCells[1].ResultJSON))
		}

		// 8. Delete
		if err := repo.Delete(ctx, nbID); err != nil {
			t.Fatalf("Delete failed: %v", err)
		}

		fetchedDeleted, err := repo.GetByID(ctx, nbID)
		if err != nil {
			t.Fatalf("GetByID after delete failed: %v", err)
		}
		if fetchedDeleted != nil {
			t.Errorf("expected notebook to be deleted, but got %+v", fetchedDeleted)
		}
	})
}
