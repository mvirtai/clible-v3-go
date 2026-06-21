package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

// NewConnection open a SQLite database, configures it, and executes pending migrations.
func InitializeDB(dbPath string) (*sql.DB, error) {
	// Open the database using the pure-Go modernc driver
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database at %s: %w", dbPath, err)
	}

	// Enforce foreign key constraints, which are disabled by default in SQLite
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to enable foreign key constraints: %w", err)
	}

	// Execute embedded structural migrations sequentally
	if err := RunMigrations(db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	return db, nil
}
