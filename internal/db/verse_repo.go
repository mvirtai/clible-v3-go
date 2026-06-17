package db

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// VerseRepository handles data access operations for the verses table
// using the explicit domain models and FTS5 triggers.
type VerseRepository struct {
	db *sql.DB
}

// NewVerseRepository creates a new instance of VerseRepository.
func NewVerseRepository(db *sql.DB) *VerseRepository {
	return &VerseRepository{db: db}
}

// BulkInsert inserts a large volume of verses inside a single transaction
// ensuring precise column mapping against migration rules.
func (r *VerseRepository) BulkInsert(ctx context.Context, verses []models.Verse) error {
	if len(verses) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin bulk insert transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	// Adjusted columns to match 'verse' from 002_seed_architecture.sql exactly
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO verses (id, translation_id, book_id, chapter, verse, text)
		VALUES (?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	for _, v := range verses {
		_, err := stmt.ExecContext(ctx, v.ID, v.TranslationID, v.BookID, v.Chapter, v.Verse, v.Text)
		if err != nil {
			return fmt.Errorf("failed to execute insert for verse %s: %w", v.ID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit bulk insert transaction: %w", err)
	}

	return nil
}

// GetByReference fetches verses matching exact book/chapter/verse range and translation.
func (r *VerseRepository) GetByReference(ctx context.Context, translationID, bookID string, chapter, verseStart, verseEnd int) ([]models.Verse, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, translation_id, book_id, chapter, verse, text
		FROM verses
		WHERE translation_id = ? AND book_id = ? AND chapter = ? AND verse >= ? AND verse <= ?
		ORDER BY verse ASC
	`, translationID, bookID, chapter, verseStart, verseEnd)
	if err != nil {
		return nil, fmt.Errorf("reference lookup failed: %w", err)
	}
	defer rows.Close()

	var verses []models.Verse
	for rows.Next() {
		var v models.Verse
		if err := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text); err != nil {
			return nil, fmt.Errorf("failed to scan verse row: %w", err)
		}
		verses = append(verses, v)
	}
	return verses, rows.Err()
}

// SearchParams holds configuration options for advanced lookups.
type SearchParams struct {
	FTSQuery      string
	RegexPattern  string
	TranslationID string
}

// Search performs high-performance text lookups leveraging the SQLite FTS5 table
// joined via internal rowid and filters matches via Go's regexp package.
func (r *VerseRepository) Search(ctx context.Context, params SearchParams) ([]models.Verse, error) {
	var regex *regexp.Regexp
	var err error

	if params.RegexPattern != "" {
		regex, err = regexp.Compile(params.RegexPattern)
		if err != nil {
			return nil, fmt.Errorf("invalid regex pattern: %w", err)
		}
	}

	// Cleaned up: Removed the 'f' alias to prevent SQLite from misinterpreting
	// the MATCH operand as a standard column identifier.
	args := []any{params.FTSQuery}
	query := `
		SELECT v.id, v.translation_id, v.book_id, v.chapter, v.verse, v.text
		FROM verses v
		JOIN verses_fts ON v.rowid = verses_fts.rowid
		WHERE verses_fts MATCH ?
	`
	if params.TranslationID != "" {
		query += " AND v.translation_id = ?"
		args = append(args, params.TranslationID)
	}
	query += " ORDER BY v.book_id ASC, v.chapter ASC, v.verse ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("fts5 search query failed: %w", err)
	}
	defer rows.Close()

	var matchedVerses []models.Verse

	for rows.Next() {
		var v models.Verse
		err := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text)
		if err != nil {
			return nil, fmt.Errorf("failed to scan search row: %w", err)
		}

		if regex != nil && !regex.MatchString(v.Text) {
			continue
		}

		matchedVerses = append(matchedVerses, v)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error encountered during row iteration: %w", err)
	}

	return matchedVerses, nil
}
