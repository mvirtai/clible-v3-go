package services

import (
	"context"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// AiUsageService provides analytics orchestration for AI token consumption.
type AiUsageService interface {
	GetUserStats(ctx context.Context, userID string, since time.Time) (*models.AiUsageStats, error)
	GetGuestStats(ctx context.Context, since time.Time) (*models.AiUsageStats, error)
	GetGlobalSummary(ctx context.Context, since time.Time) (*models.AiUsageSummary, error)
}

type aiUsageServiceImpl struct {
	repo db.AiUsageRepository
}

// NewAiUsageService constructs an AiUsageService backed by the usage repository.
func NewAiUsageService(repo db.AiUsageRepository) AiUsageService {
	return &aiUsageServiceImpl{repo: repo}
}

func (s *aiUsageServiceImpl) GetUserStats(ctx context.Context, userID string, since time.Time) (*models.AiUsageStats, error) {
	if since.IsZero() {
		since = time.Now().UTC().AddDate(0, 0, -30)
	}
	return s.repo.GetUserStats(ctx, userID, since)
}

func (s *aiUsageServiceImpl) GetGuestStats(ctx context.Context, since time.Time) (*models.AiUsageStats, error) {
	if since.IsZero() {
		since = time.Now().UTC().AddDate(0, 0, -30)
	}
	return s.repo.GetGuestStats(ctx, since)
}

func (s *aiUsageServiceImpl) GetGlobalSummary(ctx context.Context, since time.Time) (*models.AiUsageSummary, error) {
	if since.IsZero() {
		since = time.Now().UTC().AddDate(0, 0, -30)
	}
	return s.repo.GetGlobalSummary(ctx, since)
}
