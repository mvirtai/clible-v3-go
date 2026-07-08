package db

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// VerseRepository handles data access operations for the verses table
// using the explicit domain models and FTS5 triggers.
type VerseRepository struct {
	db         *sql.DB
	isPostgres bool
}

// NewVerseRepository creates a new instance of VerseRepository.
func NewVerseRepository(db *sql.DB) *VerseRepository {
	var temp string
	isPostgres := db.QueryRow("SELECT version()").Scan(&temp) == nil
	return &VerseRepository{db: db, isPostgres: isPostgres}
}

// BulkInsert inserts a large volume of verses inside a single transaction using batching.
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

	const batchSize = 500
	for i := 0; i < len(verses); i += batchSize {
		end := i + batchSize
		if end > len(verses) {
			end = len(verses)
		}
		batch := verses[i:end]

		queryStr := "INSERT INTO verses (id, translation_id, book_id, chapter, verse, text) VALUES "
		vals := []any{}
		for idx, v := range batch {
			if idx > 0 {
				queryStr += ", "
			}
			p := idx * 6
			queryStr += fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d)", p+1, p+2, p+3, p+4, p+5, p+6)
			vals = append(vals, v.ID, v.TranslationID, v.BookID, v.Chapter, v.Verse, v.Text)
		}

		_, err := tx.ExecContext(ctx, queryStr, vals...)
		if err != nil {
			return fmt.Errorf("failed to execute batch insert at offset %d: %w", i, err)
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
		WHERE translation_id = $1 AND book_id = $2 AND chapter = $3 AND verse >= $4 AND verse <= $5
		ORDER BY verse ASC
	`, translationID, bookID, chapter, verseStart, verseEnd)
	if err != nil {
		return nil, fmt.Errorf("reference lookup failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

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
	SearchScope   string // NEW: "all", "ot", "nt", "book"
	ScopeValue    string // NEW: book_id (e.g. "gen", "exo")
}

func (r *VerseRepository) Search(ctx context.Context, params SearchParams) ([]models.Verse, error) {
	var (
		rows *sql.Rows
		err  error
	)

	if params.RegexPattern != "" {
		// --- Regex mode: full table scan + Go regexp filter ---
		regex, compileErr := regexp.Compile(params.RegexPattern)
		if compileErr != nil {
			return nil, fmt.Errorf("invalid regex pattern: %w", compileErr)
		}

		baseQuery := `
			SELECT id, translation_id, book_id, chapter, verse, text
			FROM verses
		`
		args := []any{}
		var whereClauses []string

		if params.TranslationID != "" {
			whereClauses = append(whereClauses, fmt.Sprintf("translation_id = $%d", len(args)+1))
			args = append(args, params.TranslationID)
		}

		if params.SearchScope == "ot" {
			whereClauses = append(whereClauses, "book_id IN (SELECT id FROM books WHERE testament = 'OT')")
		} else if params.SearchScope == "nt" {
			whereClauses = append(whereClauses, "book_id IN (SELECT id FROM books WHERE testament = 'NT')")
		} else if params.SearchScope == "book" && params.ScopeValue != "" {
			whereClauses = append(whereClauses, fmt.Sprintf("book_id = $%d", len(args)+1))
			args = append(args, params.ScopeValue)
		}

		if len(whereClauses) > 0 {
			baseQuery += " WHERE " + strings.Join(whereClauses, " AND ")
		}
		baseQuery += " ORDER BY book_id ASC, chapter ASC, verse ASC"

		rows, err = r.db.QueryContext(ctx, baseQuery, args...)
		if err != nil {
			return nil, fmt.Errorf("regex table scan query failed: %w", err)
		}
		defer func() { _ = rows.Close() }()

		var matched []models.Verse
		for rows.Next() {
			var v models.Verse
			if scanErr := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text); scanErr != nil {
				return nil, fmt.Errorf("failed to scan verse row: %w", scanErr)
			}
			if regex.MatchString(v.Text) {
				matched = append(matched, v)
			}
		}
		return matched, rows.Err()
	}

	// --- FTS mode: fast full-text search ---
	args := []any{params.FTSQuery}
	var ftsQuery string

	if r.isPostgres {
		ftsQuery = `
			SELECT id, translation_id, book_id, chapter, verse, text
			FROM verses
			WHERE to_tsvector('simple', text) @@ to_tsquery('simple', $1)
		`
		if params.TranslationID != "" {
			ftsQuery += " AND translation_id = $2"
			args = append(args, params.TranslationID)
		}

		if params.SearchScope == "ot" {
			ftsQuery += " AND book_id IN (SELECT id FROM books WHERE testament = 'OT')"
		} else if params.SearchScope == "nt" {
			ftsQuery += " AND book_id IN (SELECT id FROM books WHERE testament = 'NT')"
		} else if params.SearchScope == "book" && params.ScopeValue != "" {
			ftsQuery += fmt.Sprintf(" AND book_id = $%d", len(args)+1)
			args = append(args, params.ScopeValue)
		}

		ftsQuery += " ORDER BY book_id ASC, chapter ASC, verse ASC"
	} else {
		ftsQuery = `
			SELECT v.id, v.translation_id, v.book_id, v.chapter, v.verse, v.text
			FROM verses v
			JOIN verses_fts ON v.rowid = verses_fts.rowid
			WHERE verses_fts MATCH $1
		`
		if params.TranslationID != "" {
			ftsQuery += " AND v.translation_id = $2"
			args = append(args, params.TranslationID)
		}

		if params.SearchScope == "ot" {
			ftsQuery += " AND v.book_id IN (SELECT id FROM books WHERE testament = 'OT')"
		} else if params.SearchScope == "nt" {
			ftsQuery += " AND v.book_id IN (SELECT id FROM books WHERE testament = 'NT')"
		} else if params.SearchScope == "book" && params.ScopeValue != "" {
			ftsQuery += fmt.Sprintf(" AND v.book_id = $%d", len(args)+1)
			args = append(args, params.ScopeValue)
		}

		ftsQuery += " ORDER BY v.book_id ASC, v.chapter ASC, v.verse ASC"
	}

	rows, err = r.db.QueryContext(ctx, ftsQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("fts search query failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var matchedVerses []models.Verse
	for rows.Next() {
		var v models.Verse
		if scanErr := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text); scanErr != nil {
			return nil, fmt.Errorf("failed to scan search row: %w", scanErr)
		}
		matchedVerses = append(matchedVerses, v)
	}

	return matchedVerses, rows.Err()
}

// GetByChapter fetches all verses for a given chapter, translation, and book.
func (r *VerseRepository) GetByChapter(ctx context.Context, translationID string, bookId string, chapter int) ([]models.Verse, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, translation_id, book_id, chapter, verse, text
		FROM verses
		WHERE translation_id = $1 AND book_id = $2 AND chapter = $3
		ORDER BY verse ASC
	`, translationID, bookId, chapter)
	if err != nil {
		return nil, fmt.Errorf("chapter lookup failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

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

// GetByBook fetches all verses for an entire book and translation, ordered by chapter and verse.
func (r *VerseRepository) GetByBook(ctx context.Context, translationID string, bookID string) ([]models.Verse, error) {
	rows, err := r.db.QueryContext(ctx, `
	SELECT id, translation_id, book_id, chapter, verse, text
	FROM verses
	WHERE translation_id = $1 AND book_id = $2
	ORDER BY chapter ASC, verse ASC
	`, translationID, bookID)
	if err != nil {
		return nil, fmt.Errorf("book lookup failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

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

// DB returns the underlying sql.DB connection.
func (r *VerseRepository) DB() *sql.DB {
	return r.db
}
