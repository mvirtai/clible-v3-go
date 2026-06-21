package db

import (
	"database/sql"
	"fmt"
	"sort"
	"strings"

	"github.com/mvirtai/clible-v3-go/migrations"
)

// RunMigrations reads all embedded SQL scripts and executes them sequentially
func RunMigrations(db *sql.DB) error {
	// Ensure the internal migrations tracking table exists
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS _migrations (
			version INTEGER PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create migrations tracking table: %w", err)
	}

	// Read all files embedded in the migrations root package
	entries, err := migrations.Files.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read embedded migrations directory: %w", err)
	}

	// Sort migration files by name to guarantee chronological execution order
	var sqlFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			sqlFiles = append(sqlFiles, entry.Name())
		}
	}
	sort.Strings(sqlFiles)

	// Execute each unapplied migration within a safe isolated transaction
	for _, filename := range sqlFiles {
		var version int
		_, err := fmt.Sscanf(filename, "%d_", &version)
		if err != nil {
			return fmt.Errorf("invalid migration filename format '%s': %w", filename, err)
		}

		// Check if this specific version version has already been executed previously
		var alreadyApplied bool
		err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM _migrations WHERE version = ?)", version).Scan(&alreadyApplied)
		if err != nil {
			return fmt.Errorf("failed to check migration state for version %d: %w", version, err)
		}

		if alreadyApplied {
			continue
		}

		// Read the raw SQL statements from the embedded file bundle
		content, err := migrations.Files.ReadFile(filename)
		if err != nil {
			return fmt.Errorf("failed to read migration file content '%s': %w", filename, err)
		}

		// Execute migration logic wrapped in a database transaction block
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction for migration %d: %w", version, err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			// Explicitly ignore the rollback error to satisfy errcheck since we return the root cause
			_ = tx.Rollback()
			return fmt.Errorf("migration script execution failed for version %d (%s): %w", version, filename, err)
		}

		if _, err := tx.Exec("INSERT INTO _migrations (version) VALUES (?)", version); err != nil {
			// Explicitly ignore the rollback error to satisfy errcheck since we return the root cause
			_ = tx.Rollback()
			return fmt.Errorf("failed to record migration application state for version %d: %w", version, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration transaction for version %d: %w", version, err)
		}
	}

	return nil
}
