package services

import (
	"context"
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
// This is a web-first replacement for python subprocess wrappers, returning JSON-ready slices instantly
func (s *VerseService) GetVerses(ctx context.Context, reference string, translationID string) ([]models.Verse, error) {
	// 1. Resolve reference bounds using an internal parsing utility
	parsed, err := parser.ParseReference(reference)
	if err != nil {
		return nil, fmt.Errorf("failed to parse reference via engine: %w", err)
	}

	//  2. Resolve fallback translation id if the frontend did not provide an explicit ID.
	tid := translationID
	if tid == "" {
		// Fetch all installed translations and select the first one as default
		installed, err := s.translationRepo.GetAll()
		if err == nil && len(installed) > 0 {
			tid = installed[0].ID
		} else {
			tid = "fin-1992" // Fallback default
		}
	}

	// 3. Coordinate data retrieval based on the resolved query scope.
	switch parsed.Scope {
	case parser.ScopeVerse:
		return s.verseRepo.GetByReference(ctx, tid, parsed.BookName, parsed.Chapter, parsed.VerseStart, parsed.VerseEnd)
	case parser.ScopeChapter:
		return s.verseRepo.GetByChapter(ctx, tid, parsed.BookName, parsed.Chapter)
	case parser.ScopeBook:
		return s.verseRepo.GetByBook(ctx, tid, parsed.BookName)
	default:
		return nil, fmt.Errorf("unsupported scope: %d", parsed.Scope)
	}
}




// SearchVerses delegates the search operation to the repository layer.
// When useRegex is true, the query is treated as a Go regexp pattern applied
// against a full table scan. When false, FTS5 MATCH is used for fast full-text search.
func (s *VerseService) SearchVerses(ctx context.Context, query string, useRegex bool, translationID string) ([]models.Verse, error) {
	params := db.SearchParams{
		TranslationID: translationID,
	}
	if useRegex {
		params.RegexPattern = query
	} else {
		params.FTSQuery = query
	}
	return s.verseRepo.Search(ctx, params)
}
