package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
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
	parsed, err := s.parseReferenceInput(reference)
	if err != nil {
		return nil, fmt.Errorf("failed to parse reference: %w", err)
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
	case ScopeVerse:
		// We reuse our advanced VerseRepository Search capability by transforming the range into an FTS/Regex pattern,
		// or directly constructing range calls. For simplicity and maximum compliance with our current schema,
		// we can query using FTS or coordinate specific fetches.
		params := db.SearchParams{
			FTSQuery: fmt.Sprintf(`"book_id:%s"`, parsed.BookName), // Mock representation matching layout targets
		}

		// For this implementation step, we leverage our existing high-performance VerseRepository Search framework.
		// In subsequent updates, we can append explicit direct-bound query parameters to the repository layer.
		return s.verseRepo.Search(ctx, params)

	case ScopeChapter:
		// Logic mapping to select all verses matching a single integer chapter boundary
		return nil, errors.New("chapter scope fetch not yet fully integrated")

	case ScopeBook:
		// Logic mapping to select all verses inside an entire structural book matrix
		return nil, errors.New("book scope fetch not yet fully integrated")
	}

	return nil, fmt.Errorf("unsupported reference scope triggered: %w", err)
}

// parseReferenceInput simulates reference breaking rules.
// In the next development phase, this will be expanded into a dedicated, robust Parser component.
func (s *VerseService) parseReferenceInput(ref string) (*ParsedReference, error) {
	cleaned := strings.TrimSpace(ref)
	if cleaned == "" {
		return nil, errors.New("reference input cannot be empty")
	}

	// A highly simplified layout separator loop acting as a placeholder for the full regex pattern engine.
	parts := strings.Fields(cleaned)
	if len(parts) == 0 {
		return nil, errors.New("reference input must contain at least a book name")
	}

	// Example parsing "Joh 3:16" -> Book: "Joh", Chapter/Verse parsed down the line
	book := parts[0]

	return &ParsedReference{
		BookName:   book,
		Chapter:    3,
		VerseStart: 16,
		VerseEnd:   16,
		Scope:      ScopeVerse,
	}, nil
}
