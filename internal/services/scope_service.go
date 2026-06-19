package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// ScopeService orchestrates business boundaries for study projects and saved operations.
type ScopeService struct {
	scopeRepo *db.ScopeRepository
	savedRepo *db.SavedRepository
}

// NewScopeService constructs an explicitly injected context orchestration engine.
func NewScopeService(scopeRepo *db.ScopeRepository, savedRepo *db.SavedRepository) *ScopeService {
	return &ScopeService{
		scopeRepo: scopeRepo,
		savedRepo: savedRepo,
	}
}

// CreateScope initializes and inserts a brand new research window boundary.
func (s *ScopeService) CreateScope(ctx context.Context, name string) (*models.Scope, error) {
	if name == "" {
		return nil, fmt.Errorf("scope name parameter cannot be empty")
	}

	scope := &models.Scope{
		ID:        uuid.New().String(),
		Name:      name,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.scopeRepo.Create(ctx, scope); err != nil {
		return nil, fmt.Errorf("failed to create study scope: %w", err)
	}

	return scope, nil
}

// GetScopes retrieves all existing workspace scopes sorted chronologically.
func (s *ScopeService) GetScopes(ctx context.Context) ([]models.Scope, error) {
	return s.scopeRepo.GetAll(ctx)
}

// DeleteScope removes a root scope boundary (cascading into children automatically).
func (s *ScopeService) DeleteScope(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("invalid scope id targeting deletion path")
	}

	return s.scopeRepo.Delete(ctx, id)
}

// SaveSearch initializes tracking metrics and preserves an FTS bible search layout.
func (s *ScopeService) SaveSearch(ctx context.Context, search *models.SavedSearch) error {
	if search.ScopeID == "" || search.Name == "" || search.QueryText == "" {
		return fmt.Errorf("missing critical fields required for saved search persistence")
	}

	if search.ID == "" {
		search.ID = uuid.New().String()
	}
	if search.CreatedAt.IsZero() {
		search.CreatedAt = time.Now().UTC()
	}

	return s.savedRepo.SaveSearch(ctx, search)
}

// SaveAnalysis initializes operational profiles and preserves an text analytic plot record.
func (s *ScopeService) SaveAnalysis(ctx context.Context, analysis *models.SavedAnalysis) error {
	if analysis.ScopeID == "" || analysis.Name == "" || analysis.Reference == "" || analysis.AnalysisType == "" {
		return fmt.Errorf("missing critical fields required for saved analysis persistence")
	}

	if analysis.ID == "" {
		analysis.ID = uuid.New().String()
	}
	if analysis.CreatedAt.IsZero() {
		analysis.CreatedAt = time.Now().UTC()
	}

	return s.savedRepo.SaveAnalysis(ctx, analysis)
}

// GetScopeWorkspace aggregates a single scope entity alongside all its structural nested results.
func (s *ScopeService) GetScopeWorkspace(ctx context.Context, scopeID string) (*models.ScopeWorkspace, error) {
	if scopeID == "" {
		return nil, fmt.Errorf("target workspace scope id cannot be blank")
	}

	// Fetch cascading assets asynchronously/sequentially from data storage grids
	searches, err := s.savedRepo.GetSearchesByScope(ctx, scopeID)
	if err != nil {
		return nil, fmt.Errorf("failed to gather workspace searches: %w", err)
	}

	analyses, err := s.savedRepo.GetAnalysesByScope(ctx, scopeID)
	if err != nil {
		return nil, fmt.Errorf("failed to gather workspace analyses: %w", err)
	}

	// Build workspace output block shell mapping
	return &models.ScopeWorkspace{
		Scope:    models.Scope{ID: scopeID}, // Metadata population handled downstream by API layout if needed
		Searches: searches,
		Analyses: analyses,
	}, nil
}
