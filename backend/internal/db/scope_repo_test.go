package db_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestScopeRepository(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	repo := db.NewScopeRepository(conn)
	ctx := context.Background()

	userID := uuid.New().String()
	otherUserID := uuid.New().String()

	// Seed users
	_, _ = conn.Exec(`INSERT INTO users (id, email, password_hash) VALUES (?, ?, 'hash')`, userID, userID+"@example.com")
	_, _ = conn.Exec(`INSERT INTO users (id, email, password_hash) VALUES (?, ?, 'hash')`, otherUserID, otherUserID+"@example.com")

	scopeID := uuid.New().String()
	scope := &models.Scope{
		ID:        scopeID,
		Name:      "Romans Study",
		UserID:    userID,
		CreatedAt: time.Now().UTC(),
	}

	t.Run("Create and GetByID", func(t *testing.T) {
		err := repo.Create(ctx, scope)
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}

		retrieved, err := repo.GetByID(ctx, scopeID, userID)
		if err != nil {
			t.Fatalf("GetByID failed: %v", err)
		}
		if retrieved == nil || retrieved.Name != "Romans Study" {
			t.Errorf("expected scope name 'Romans Study', got %v", retrieved)
		}

		// Deny access to other user
		otherRetrieved, err := repo.GetByID(ctx, scopeID, otherUserID)
		if err != nil {
			t.Fatalf("GetByID with other user failed: %v", err)
		}
		if otherRetrieved != nil {
			t.Errorf("expected nil for other user, got %v", otherRetrieved)
		}
	})

	t.Run("GetAll", func(t *testing.T) {
		scopes, err := repo.GetAll(ctx, userID)
		if err != nil {
			t.Fatalf("GetAll failed: %v", err)
		}
		if len(scopes) != 1 {
			t.Errorf("expected 1 scope, got %d", len(scopes))
		}
	})

	t.Run("Rename", func(t *testing.T) {
		err := repo.Rename(ctx, scopeID, "Updated Romans Study", userID)
		if err != nil {
			t.Fatalf("Rename failed: %v", err)
		}

		retrieved, err := repo.GetByID(ctx, scopeID, userID)
		if err != nil {
			t.Fatalf("GetByID failed: %v", err)
		}
		if retrieved == nil || retrieved.Name != "Updated Romans Study" {
			t.Errorf("expected 'Updated Romans Study', got %v", retrieved)
		}
	})

	t.Run("Delete", func(t *testing.T) {
		err := repo.Delete(ctx, scopeID, userID)
		if err != nil {
			t.Fatalf("Delete failed: %v", err)
		}

		retrieved, err := repo.GetByID(ctx, scopeID, userID)
		if err != nil {
			t.Fatalf("GetByID failed: %v", err)
		}
		if retrieved != nil {
			t.Errorf("expected nil after delete, got %v", retrieved)
		}
	})
}
