package services

import (
	"context"
	"fmt"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/cache"
	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
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

// VerseCache defines the cache interface for resolved verse queries.
type VerseCache interface {
	Get(key string) ([]models.Verse, bool)
	Set(key string, verses []models.Verse)
}

// VerseService orchestrates higher-level business rules and aggregates structural data access
type VerseService struct {
	verseRepo       *db.VerseRepository
	translationRepo *db.TranslationRepository
	cache           VerseCache
}

// NewVerseService is our idiomatic constructor pattern utilizing dependency injection.
// We pass pointers (*) to the repositories to share the underlying database connection pool.
func NewVerseService(verseRepo *db.VerseRepository, translationRepo *db.TranslationRepository) *VerseService {
	return &VerseService{
		verseRepo:       verseRepo,
		translationRepo: translationRepo,
		cache:           cache.NewVerseLRUCache(1000, 30*time.Minute),
	}
}

// SetCache allows swapping or mocking the verse cache instance (e.g. in unit tests).
func (s *VerseService) SetCache(c VerseCache) {
	s.cache = c
}

// GetVerses resolves a raw text reference string and fetches matching records from the database.
// This is a web-first replacement for python subprocess wrappers, returning JSON-ready slices instantly
func (s *VerseService) GetVerses(ctx context.Context, reference string, translationID string) ([]models.Verse, error) {
	// 1. Resolve reference bounds using an internal parsing utility
	parsed, err := parser.ParseReference(reference)
	if err != nil {
		return nil, fmt.Errorf("failed to parse reference via engine: %w", err)
	}

	// 2. Resolve translation alias (e.g. KR92 -> fin-1992, KJV -> kjv)
	tid := parser.ResolveTranslationID(translationID)

	// 3. Resolve fallback translation id if the frontend did not provide an explicit ID.
	if tid == "" {
		// Fetch all installed translations and select the first one as default
		userID, ok := ctxkeys.GetUserID(ctx)
		var installed []models.Translation
		var err error
		if ok {
			installed, err = s.translationRepo.GetByUser(ctx, userID)
		} else {
			installed, err = s.translationRepo.GetAll()
		}
		if err == nil && len(installed) > 0 {
			tid = installed[0].ID
		} else {
			tid = "web" // Fallback default is web
		}
	}

	// Verify accessibility of the resolved translation ID
	userID, ok := ctxkeys.GetUserID(ctx)
	if ok {
		accessible, err := s.translationRepo.IsAccessible(ctx, userID, tid)
		if err != nil {
			return nil, fmt.Errorf("failed to verify translation accessibility: %w", err)
		}
		if !accessible {
			return nil, fmt.Errorf("translation %q is not accessible", tid)
		}
	} else {
		// In guest mode (unauthenticated), all global preset translations are accessible
		isGlobal, err := s.translationRepo.IsGlobal(ctx, tid)
		if err != nil {
			return nil, fmt.Errorf("failed to verify translation accessibility: %w", err)
		}
		if !isGlobal {
			return nil, fmt.Errorf("translation %q is not accessible", tid)
		}
	}

	// Build cache key based on resolved query parameters
	var cacheKey string
	if s.cache != nil {
		switch parsed.Scope {
		case parser.ScopeVerse:
			cacheKey = fmt.Sprintf("verse:%s:%s:%d:%d-%d", tid, parsed.BookName, parsed.Chapter, parsed.VerseStart, parsed.VerseEnd)
		case parser.ScopeChapter:
			cacheKey = fmt.Sprintf("chapter:%s:%s:%d", tid, parsed.BookName, parsed.Chapter)
		case parser.ScopeChapterRange:
			cacheKey = fmt.Sprintf("chaprange:%s:%s:%d-%d", tid, parsed.BookName, parsed.Chapter, parsed.ChapterEnd)
		case parser.ScopeBook:
			cacheKey = fmt.Sprintf("book:%s:%s", tid, parsed.BookName)
		}

		if cacheKey != "" {
			if cached, hit := s.cache.Get(cacheKey); hit {
				return cached, nil
			}
		}
	}

	// 4. Coordinate data retrieval based on the resolved query scope.
	var verses []models.Verse
	switch parsed.Scope {
	case parser.ScopeVerse:
		verses, err = s.verseRepo.GetByReference(ctx, tid, parsed.BookName, parsed.Chapter, parsed.VerseStart, parsed.VerseEnd)
	case parser.ScopeChapter:
		verses, err = s.verseRepo.GetByChapter(ctx, tid, parsed.BookName, parsed.Chapter)
	case parser.ScopeChapterRange:
		verses, err = s.verseRepo.GetByChapterRange(ctx, tid, parsed.BookName, parsed.Chapter, parsed.ChapterEnd)
	case parser.ScopeBook:
		verses, err = s.verseRepo.GetByBook(ctx, tid, parsed.BookName)
	default:
		return nil, fmt.Errorf("unsupported scope: %d", parsed.Scope)
	}

	if err != nil {
		return nil, err
	}

	if s.cache != nil && cacheKey != "" && len(verses) > 0 {
		s.cache.Set(cacheKey, verses)
	}

	return verses, nil
}

// SearchVerses delegates the search operation to the repository layer.
// When useRegex is true, the query is treated as a Go regexp pattern applied
// against a full table scan. When false, FTS5 MATCH is used for fast full-text search.
func (s *VerseService) SearchVerses(ctx context.Context, query string, useRegex bool, translationID string, searchScope string, scopeValue string) ([]models.Verse, error) {
	tid := parser.ResolveTranslationID(translationID)
	if tid == "" {
		tid = "web"
	}

	// Verify accessibility of the translation ID
	userID, ok := ctxkeys.GetUserID(ctx)
	if ok {
		accessible, err := s.translationRepo.IsAccessible(ctx, userID, tid)
		if err != nil {
			return nil, fmt.Errorf("failed to verify translation accessibility: %w", err)
		}
		if !accessible {
			return nil, fmt.Errorf("translation %q is not accessible", tid)
		}
	} else {
		// In guest mode (unauthenticated), all global preset translations are accessible
		isGlobal, err := s.translationRepo.IsGlobal(ctx, tid)
		if err != nil {
			return nil, fmt.Errorf("failed to verify translation accessibility: %w", err)
		}
		if !isGlobal {
			return nil, fmt.Errorf("translation %q is not accessible", tid)
		}
	}

	params := db.SearchParams{
		TranslationID: tid,
		SearchScope:   searchScope,
		ScopeValue:    scopeValue,
	}
	if useRegex {
		params.RegexPattern = query
	} else {
		params.FTSQuery = query
	}
	return s.verseRepo.Search(ctx, params)
}
