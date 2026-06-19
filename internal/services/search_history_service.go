package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// SearchHistoryService handles orchestration and business validation for user search logs.
type SearchHistoryService struct {
	historyRepo *db.SearchHistoryRepository
}

// NewSearchHistoryService constructs a fresh history orchestration component.
func NewSearchHistoryService(repo *db.SearchHistoryRepository) *SearchHistoryService {
	return &SearchHistoryService{
		historyRepo: repo,
	}
}

// AddSearch validates, populates structural fallbacks, and persists a fresh tracking log.
func (s *SearchHistoryService) AddSearch(ctx context.Context, h *models.SearchHistory) error {
	// Automatically generate a robust string unique identifier if omitted by the frontend
	if h.ID == "" {
		h.ID = uuid.New().String()
	}

	// Capture logical timestamp boundaries safely if not explicitly evaluated downstream
	if h.SearchedAt.IsZero() {
		h.SearchedAt = time.Now().UTC()
	}

	if err := s.historyRepo.Save(ctx, h); err != nil {
		return fmt.Errorf("failed to process search history item addition: %w", err)
	}

	return nil
}

// GetRecentHistory retrieves historical sequences honoring strict upper bound restrictions.
func (s *SearchHistoryService) GetRecentHistory(ctx context.Context, limit int) ([]models.SearchHistory, error) {
	if limit <= 0 {
		limit = 10 // Apply a sensible safe fallback limit if invalid bounds are supplied
	}

	return s.historyRepo.GetLatest(ctx, limit)
}
