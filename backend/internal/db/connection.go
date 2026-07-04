package db

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

// NewConnection open a database, configures it, and executes pending migrations.
func InitializeDB(databaseURL string) (*sql.DB, error) {
	var db *sql.DB
	var err error

	if strings.HasPrefix(databaseURL, "postgres://") || strings.HasPrefix(databaseURL, "postgresql://") {
		db, err = sql.Open("postgres", databaseURL)
		if err != nil {
			return nil, fmt.Errorf("failed to open postgres database: %w", err)
		}
	} else {
		db, err = sql.Open("sqlite", databaseURL)
		if err != nil {
			return nil, fmt.Errorf("failed to open sqlite database: %w", err)
		}

		// Enforce foreign key constraints, which are disabled by default in SQLite
		if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("failed to enable foreign key constraints: %w", err)
		}
	}

	// Execute embedded structural migrations sequentially
	if err := RunMigrations(db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	return db, nil
}
