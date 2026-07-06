package db

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

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
		// Legacy / Testing Fallback: SQLite is used exclusively for fast, isolated in-memory unit tests (:memory:)
		db, err = sql.Open("sqlite", databaseURL)
		if err != nil {
			return nil, fmt.Errorf("failed to open sqlite database: %w", err)
		}

		// Enforce foreign key constraints, which are disabled by default in SQLite
		if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("failed to enable foreign key constraints: %w", err)
		}

		// Enable Write-Ahead Logging (WAL) mode for better concurrency (readers don't block writers and vice versa)
		if _, err := db.Exec("PRAGMA journal_mode = WAL"); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("failed to enable WAL journal mode: %w", err)
		}

		// Configure busy timeout (5 seconds) to prevent instant failure when the database is temporarily locked
		if _, err := db.Exec("PRAGMA busy_timeout = 5000"); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("failed to configure SQLite busy timeout: %w", err)
		}
	}

	// Configure reasonable connection pool limits to prevent connection exhaustion 
	// (particularly useful for Neon Postgres free tier limits)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Execute embedded structural migrations sequentially
	if err := RunMigrations(db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	return db, nil
}
