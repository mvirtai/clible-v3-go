package db

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// VerseRepository handles data access operations for the verses table
// and its associated FTS5 virtual tables.
type VerseRepository struct {
	db *sql.DB
}

// NewVerseRepository creates a new instance of VerseRepository with the provided database connection.
func NewVerseRepository(db *sql.DB) *VerseRepository {
	return &VerseRepository{db: db}
}

// BulkInsert inserts a large volume of verses inside a single
// transaction block for optimal performance with the pure-Go SQLite driver.
func (r *VerseRepository) BulkInsert(ctx context.Context, verses []models.Verse) error {
	if len(verses) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	// Defer rollback; it is a no-op if the transaction successfully committed.
	defer func() {
		_ = tx.Rollback()
	}()

	// Prepare the statement inside the transaction for high-throughput execution.
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO verses (translation_id, book_id, chapter, verse_number, text)
		VALUES (?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	for _, v := range verses {
		_, err := stmt.ExecContext(ctx, v.ID, v.TranslationID, v.BookID, v.Chapter, v.Verse, v.Text)
		if err != nil {
			return fmt.Errorf("failed to execute insert for verse %s (%s %d:%d): %w", v.ID, v.BookID, v.Chapter, v.Verse, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// Search Params holds configuration options for advanced lookups.
type SearchParams struct {
	FTSQuery     string // Query syntax passing directly into FTS5 MATCH
	RegexPattern string // Optional legacy regex rule to filter FTS results post-query
}

// Search performs high-performance text lookups leveraging the SQLite FTS5 table
// and subsequently applies Go-level regex filtering to match legacy business rules.
func (r *VerseRepository) Search(ctx context.Context, params SearchParams) ([]models.Verse, error) {
	var regex *regexp.Regexp
	var err error

	if params.RegexPattern != "" {
		regex, err = regexp.Compile(params.RegexPattern)
		if err != nil {
			return nil, fmt.Errorf("invalid regex pattern: %w", err)
		}
	}

	// Query utilizing the FTS5 contentless/external content virtual table index.
	// Adjust table/column names if your migration schema differs slightly.
	query := `
			SELECT v.id, v.translation_id, v.book_id, v.chapter, v.verse, v.text
			FROM verses v
			JOIN verses_fts f ON v.id = f.rowid
			WHERE verses_fts MATCH ?
			ORDER BY v.book_id ASC, v.chapter ASC, v.verse ASC
		`

	rows, err := r.db.QueryContext(ctx, query, params.FTSQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search query: %w", err)
	}
	defer rows.Close()

	var matchedVerses []models.Verse

	for rows.Next() {
		var v models.Verse
		err := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text)
		if err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}

		if regex != nil && !regex.MatchString(v.Text) {
			continue
		}

		matchedVerses = append(matchedVerses, v)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating search results: %w", err)
	}

	return matchedVerses, nil
}
