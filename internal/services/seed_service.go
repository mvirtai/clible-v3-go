package services

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
)

// SeedService coordinates heavy data imports cleanly respecting structural boundaries.
type SeedService struct {
	verseRepo *db.VerseRepository
	parser    *parsers.XMLVerseParser
}

// NewSeedService constructs a database streaming population asset manager.
func NewSeedService(vr *db.VerseRepository, p *parsers.XMLVerseParser) *SeedService {
	return &SeedService{
		verseRepo: vr,
		parser:    p,
	}
}

// SeedTranslationFromFile opens a file, streams components, and flushes chunk chunks down.
func (s *SeedService) SeedTranslationFromFile(ctx context.Context, filePath string, translationID string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open targeted seeding file: %w", err)
	}
	defer func() { _ = file.Close() }()

	const chunkSize = 500
	chunk := make([]models.Verse, 0, chunkSize)

	err = s.parser.ParseStream(file, func(v models.Verse) error {
		v.TranslationID = translationID
		v.ID = fmt.Sprintf("%s:%s:%d:%d", translationID, v.BookID, v.Chapter, v.Verse)
		chunk = append(chunk, v)

		if len(chunk) >= chunkSize {
			if err := s.verseRepo.BulkInsert(ctx, chunk); err != nil {
				return fmt.Errorf("failed to flush seed chunk segment to DB: %w", err)
			}
			chunk = chunk[:0]
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("streaming seeding operation collapsed: %w", err)
	}

	if len(chunk) > 0 {
		if err := s.verseRepo.BulkInsert(ctx, chunk); err != nil {
			return fmt.Errorf("failed to flush final seed trailing chunk segment to DB: %w", err)
		}
	}

	return nil
}

// ParseStreamShortcut exposes an option to directly inject a raw stream (useful for tests)
func (s *SeedService) ParseStreamShortcut(ctx context.Context, r io.Reader, translationID string) error {
	const chunkSize = 100
	chunk := make([]models.Verse, 0, chunkSize)

	if err := s.parser.ParseStream(r, func(v models.Verse) error {
		v.TranslationID = translationID
		v.ID = fmt.Sprintf("%s:%s:%d:%d", translationID, v.BookID, v.Chapter, v.Verse)
		chunk = append(chunk, v)

		if len(chunk) >= chunkSize {
			if err := s.verseRepo.BulkInsert(ctx, chunk); err != nil {
				return err
			}
			chunk = chunk[:0]
		}
		return nil
	}); err != nil {
		return err
	}

	if len(chunk) > 0 {
		return s.verseRepo.BulkInsert(ctx, chunk)
	}
	return nil
}