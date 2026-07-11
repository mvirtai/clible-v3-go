package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// NotebookService handles business logic for notebooks.
type NotebookService struct {
	repo      *db.NotebookRepository
	scopeRepo *db.ScopeRepository
}

// NewNotebookService constructs an explicitly injected notebook orchestration engine.
func NewNotebookService(nb_repo *db.NotebookRepository, scope_repo *db.ScopeRepository) *NotebookService {
	return &NotebookService{
		repo:      nb_repo,
		scopeRepo: scope_repo,
	}
}

// CreateNotebook initializes and inserts a brand new notebook for a user.
// Validates that the provided scopeID (if any) belongs to the requesting user.
func (s *NotebookService) CreateNotebook(ctx context.Context, title string, userID string, scopeID string) (*models.Notebook, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	if title == "" {
		title = "Nimetön muistikirja"
	}

	// CRITICAL FIX: Validate scope ownership if scopeID provided
	if scopeID != "" {
		scope, err := s.scopeRepo.GetByID(ctx, scopeID, userID)
		if err != nil {
			return nil, fmt.Errorf("invalid scope: %w", err)
		}
		if scope == nil {
			return nil, errors.New("scope not found or access denied")
		}
	}

	nb := &models.Notebook{
		ID:        uuid.New().String(),
		Title:     title,
		UserID:    userID,
		ScopeID:   scopeID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Cells:     []models.Cell{},
	}

	if err := s.repo.Create(ctx, nb); err != nil {
		return nil, err
	}

	return nb, nil
}

// GetNotebook retrieves a single notebook by ID, validating user ownership.
func (s *NotebookService) GetNotebook(ctx context.Context, id string, userID string) (*models.Notebook, error) {
	if id == "" {
		return nil, errors.New("notebook id is required")
	}
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	nb, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if nb == nil {
		return nil, errors.New("notebook not found")
	}

	// Validate ownership
	if nb.UserID != userID {
		return nil, errors.New("access denied")
	}

	return nb, nil
}

// GetNotebooksByUser retrieves all notebooks for a user.
func (s *NotebookService) GetNotebooksByUser(ctx context.Context, userID string) ([]models.Notebook, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	return s.repo.GetByUserID(ctx, userID)
}

// UpdateNotebook updates a notebook's title and optional scope.
func (s *NotebookService) UpdateNotebook(ctx context.Context, id string, userID string, title string, scopeID string) (*models.Notebook, error) {
	if id == "" || userID == "" {
		return nil, errors.New("notebook id and userID are required")
	}

	nb, err := s.GetNotebook(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	// Validate new scope ownership if changing scope
	if scopeID != "" && scopeID != nb.ScopeID {
		scope, err := s.scopeRepo.GetByID(ctx, scopeID, userID)
		if err != nil {
			return nil, fmt.Errorf("invalid scope: %w", err)
		}
		if scope == nil {
			return nil, errors.New("scope not found or access denied")
		}
	}

	if title != "" {
		nb.Title = title
	}
	nb.ScopeID = scopeID
	nb.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, nb); err != nil {
		return nil, err
	}

	return nb, nil
}

// DeleteNotebook deletes a notebook after validating ownership.
func (s *NotebookService) DeleteNotebook(ctx context.Context, id string, userID string) error {
	if id == "" || userID == "" {
		return errors.New("notebook id and userID are required")
	}

	// Validate ownership
	if _, err := s.GetNotebook(ctx, id, userID); err != nil {
		return err
	}

	return s.repo.Delete(ctx, id)
}

// SaveCells atomically saves cells for a notebook (replaces existing cells).
func (s *NotebookService) SaveCells(ctx context.Context, notebookID string, userID string, cells []models.Cell) error {
	if notebookID == "" || userID == "" {
		return errors.New("notebookID and userID are required")
	}

	// Validate ownership
	if _, err := s.GetNotebook(ctx, notebookID, userID); err != nil {
		return err
	}

	return s.repo.SaveCells(ctx, notebookID, cells)
}

// GetNotebookCells retrieves all cells for a notebook in order.
func (s *NotebookService) GetNotebookCells(ctx context.Context, notebookID string, userID string) ([]models.Cell, error) {
	if notebookID == "" || userID == "" {
		return nil, errors.New("notebookID and userID are required")
	}

	// Validate ownership
	if _, err := s.GetNotebook(ctx, notebookID, userID); err != nil {
		return nil, err
	}

	return s.repo.GetCells(ctx, notebookID)
}
