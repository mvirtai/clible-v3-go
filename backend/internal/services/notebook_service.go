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

type NotebookService struct {
	repo *db.NotebookRepository
}

func NewNotebookService(nb_repo *db.NotebookRepository) *NotebookService {
	return &NotebookService{repo: nb_repo}
}

func (s *NotebookService) CreateNotebook(ctx context.Context, title string, userID string, scopeID string) (*models.Notebook, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	if title == "" {
		title = "Nimetön muistikirja"
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

func (s *NotebookService) GetNotebooksByUserID(ctx context.Context, userID string) ([]models.Notebook, error) {
	if userID == "" {
		return []models.Notebook{}, nil
	}
	return s.repo.GetByUserID(ctx, userID)
}

func (s *NotebookService) GetNotebookByID(ctx context.Context, id string, userID string) (*models.Notebook, error) {
	if id == "" || userID == "" {
		return nil, errors.New("id and userID are required")
	}

	nb, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if nb == nil {
		return nil, nil
	}

	if nb.UserID != userID {
		return nil, errors.New("unauthorized access to notebook")
	}

	cells, err := s.repo.GetCells(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to load cells: %w", err)
	}
	nb.Cells = cells

	return nb, nil
}

func (s *NotebookService) UpdateNotebook(ctx context.Context, id string, title string, scopeID string, userID string) (*models.Notebook, error) {
	nb, err := s.GetNotebookByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if nb == nil {
		return nil, errors.New("notebook not found")
	}

	nb.Title = title
	nb.ScopeID = scopeID
	nb.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, nb); err != nil {
		return nil, err
	}

	return nb, nil
}

func (s *NotebookService) DeleteNotebook(ctx context.Context, id string, userID string) error {
	nb, err := s.GetNotebookByID(ctx, id, userID)
	if err != nil {
		return err
	}
	if nb == nil {
		return errors.New("notebook not found")
	}

	return s.repo.Delete(ctx, id)
}

func (s *NotebookService) SaveNotebookCells(ctx context.Context, notebookID string, userID string, cells []models.Cell) error {
	nb, err := s.GetNotebookByID(ctx, notebookID, userID)
	if err != nil {
		return err
	}
	if nb == nil {
		return errors.New("notebook not found")
	}

	return s.repo.SaveCells(ctx, notebookID, cells)
}
