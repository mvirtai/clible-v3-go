package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	parser "github.com/mvirtai/clible-v3-go/internal/parsers"
)

// ReferenceScope defines the semantic boundaries of a Bible reference pattern.
// Go doesn't have an 'enum' keyword. We create enums by defining a custom primitive type
// and using a const block with 'iota' for auto-incrementing integers.
type ReferenceScope int

const (
	ScopeVerse   ReferenceScope = iota // 0: Represents a specific verse or verse range
	ScopeChapter                       // 1: Represents an entire chapter
	ScopeBook                          // 2: Represents an entire book
)

// ParsedReference holds the decomposition structural attributes of a text reference query.
type ParsedReference struct {
	BookName   string
	Chapter    int
	VerseStart int
	VerseEnd   int
	Scope      ReferenceScope
}

// VerseService orchestrates higher-level business rules and aggregates structural data access
type VerseService struct {
	verseRepo       *db.VerseRepository
	translationRepo *db.TranslationRepository
}

// NewVerseService is our idiomatic constructor pattern utilizing dependency injection.
// We pass pointers (*) to the repositories to share the underlying database connection pool.
func NewVerseService(verseRepo *db.VerseRepository, translationRepo *db.TranslationRepository) *VerseService {
	return &VerseService{
		verseRepo:       verseRepo,
		translationRepo: translationRepo,
	}
}

// GetVerses resolves a raw text reference string and fetches matching records from the database.
// This is a web-first replacement for python subprocess wrappers, returning JSON-ready slices instantly.
func (s *VerseService) GetVerses(ctx context.Context, reference string, translationID string) ([]models.Verse, error) {

	// 1. Resolve reference bounds using an internal parsing utility
	parsed, err := parser.ParseReference(reference)
	if err != nil {
		return nil, fmt.Errorf("failed to parse reference via engine: %w", err)
	}

	// 2. Resolve fallback translation id the frontend did not provide an explicit ID.
	tid := translationID
	if tid == "" {
		// In a production build, this would fetch the installed system default from translationRepo.
		// For now, we fall back to a sensible default if empty.
		tid = "fin-1992"
	}

	// 3. Coordinate data retrieval based on the resolved query scope
	switch parsed.Scope {
	case parser.ScopeVerse:
		return s.verseRepo.GetByReference(ctx, tid, parsed.BookName, parsed.Chapter, parsed.VerseStart, parsed.VerseEnd)

	case parser.ScopeChapter:
		// Logic mapping to select all verses matching a single integer chapter boundary
		return nil, errors.New("chapter scope fetch (%d) not yet fully integrated")

	case parser.ScopeBook:
		// Logic mapping to select all verses inside an entire structural book matrix
		return nil, errors.New("book scope fetch (%s) not yet fully integrated")
	}

	return nil, fmt.Errorf("unsupported reference scope triggered")
}

// SearchVerses delegates the search operation to the repository layer.
func (s *VerseService) SearchVerses(ctx context.Context, ftsQuery string, regexPattern string, translationID string) ([]models.Verse, error) {
	params := db.SearchParams{
		FTSQuery:      ftsQuery,
		RegexPattern:  regexPattern,
		TranslationID: translationID,
	}
	return s.verseRepo.Search(ctx, params)
}
