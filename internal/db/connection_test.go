package db

import (
	"testing"
)

func TestNewConnection_InMemory(t *testing.T) {
	// Initialize an in-memory database to test bootstrapping and migrations
	db, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to initialize database connection: %v", err)
	}
	defer func() { _ = db.Close() }()

	// Verify that the migrations tracking table has recorded exactly 6 migrations (001 -> 006)
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM _migrations").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query executed migrations tracking table: %v", err)
	}

	expectedMigrations := 6
	if count != expectedMigrations {
		t.Errorf("Expected %d applied migrations in tracking table, got %d", expectedMigrations, count)
	}
}
