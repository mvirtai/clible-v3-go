package db

import (
	"strings"
	"testing"

	"github.com/mvirtai/clible-v3-go/migrations"
)

func TestNewConnection_InMemory(t *testing.T) {
	// Initialize an in-memory database to test bootstrapping and migrations
	db, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to initialize database connection: %v", err)
	}
	defer func() { _ = db.Close() }()

	// Count actual SQL migrations on disk dynamically
	entries, err := migrations.Files.ReadDir(".")
	if err != nil {
		t.Fatalf("Failed to read migrations directory: %v", err)
	}
	expectedMigrations := 0
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			expectedMigrations++
		}
	}

	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM _migrations").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query executed migrations tracking table: %v", err)
	}

	if count != expectedMigrations {
		t.Errorf("Expected %d applied migrations in tracking table, got %d", expectedMigrations, count)
	}
}
