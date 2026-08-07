package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// CellScopeOptions defines options for cell scoping.
type CellScopeOptions struct {
	Direction string // "up", "down", or "all"
	Count     int    // -1 = "unlimited"
}

// NotebookService handles business logic for notebooks.
type NotebookService struct {
	repo       *db.NotebookRepository
	scopeRepo  *db.ScopeRepository
	cliService *CLIService
}

// NewNotebookService constructs an explicitly injected notebook orchestration engine.
func NewNotebookService(nb_repo *db.NotebookRepository, scope_repo *db.ScopeRepository, cliService *CLIService) *NotebookService {
	return &NotebookService{
		repo:       nb_repo,
		scopeRepo:  scope_repo,
		cliService: cliService,
	}
}

var cellScopeFlagRegex = regexp.MustCompile(`^(\*|\d+)([a-z]+)?(\d+)?$`)

// ParseCellScopeFlags parses the flags --ref, --dir, --n and --scope
func ParseCellScopeFlags(cmd *CLICommand, defaultDir string, defaultCount int) CellScopeOptions {
	dir := defaultDir
	count := defaultCount

	// 1. Compatible with old --scope=prev flag
	if cmd.Flags["scope"] == "prev" {
		return CellScopeOptions{Direction: "up", Count: 1}
	}

	// 2. Explicit --dir or --ref flag
	if d, ok := cmd.Flags["dir"]; ok {
		d = strings.ToLower(d)
		switch d {
		case "down", "next", "d", "n":
			dir = "down"
		case "up", "prev", "u", "p":
			dir = "up"
		}
	}

	if r, ok := cmd.Flags["ref"]; ok {
		r = strings.ToLower(r)
		switch r {
		case "down", "next":
			dir = "down"
		case "up", "prev":
			dir = "up"
		case "all":
			dir = "all"
		}
	}

	// 3. Flexible --n flag (e.g. 3n, 2p, 3d, 2u, 5, or combined 3p5 / 3d10)
	if nVal, ok := cmd.Flags["n"]; ok {
		nVal = strings.ToLower(strings.TrimSpace(nVal))
		matches := cellScopeFlagRegex.FindStringSubmatch(nVal)
		if len(matches) >= 2 {
			if parsedCount, err := strconv.Atoi(matches[1]); err == nil && parsedCount > 0 {
				count = parsedCount
			}
			if len(matches) >= 3 && matches[2] != "" {
				suffix := matches[2]
				switch suffix {
				case "n", "d":
					dir = "down"
				case "p", "u":
					dir = "up"
				}
			}
			if len(matches) >= 4 && matches[3] != "" {
				if _, hasLimit := cmd.Flags["limit"]; !hasLimit {
					cmd.Flags["limit"] = matches[3]
				}
			}
		}
	}

	return CellScopeOptions{Direction: dir, Count: count}
}

// ResolveCellContext collects markdown-cell texts in the given direction and count.
func ResolveCellContext(cells []models.Cell, targetCellID string, cmd *CLICommand) string {
	targetIdx := -1
	for i, c := range cells {
		if c.ID == targetCellID {
			targetIdx = i
			break
		}
	}
	if targetIdx == -1 {
		return ""
	}

	defaultDir := "up"
	defaultCount := -1
	if cmd.Name == "/themes" {
		defaultDir = "down"
		defaultCount = 1
	}

	scopeOpts := ParseCellScopeFlags(cmd, defaultDir, defaultCount)
	var selectedTexts []string

	if scopeOpts.Direction == "all" {
		for i, c := range cells {
			if i != targetIdx && c.Type == models.CellTypeMarkdown && strings.TrimSpace(c.Content) != "" {
				selectedTexts = append(selectedTexts, c.Content)
			}
		}
	} else if scopeOpts.Direction == "up" {
		var upCells []string
		for i := targetIdx - 1; i >= 0; i-- {
			c := cells[i]
			if c.Type == models.CellTypeMarkdown && strings.TrimSpace(c.Content) != "" {
				upCells = append(upCells, c.Content)
				if scopeOpts.Count > 0 && len(upCells) >= scopeOpts.Count {
					break
				}
			}
		}
		// Maintain order from top to bottom
		for i := len(upCells) - 1; i >= 0; i-- {
			selectedTexts = append(selectedTexts, upCells[i])
		}
	} else if scopeOpts.Direction == "down" {
		for i := targetIdx + 1; i < len(cells); i++ {
			c := cells[i]
			if c.Type == models.CellTypeMarkdown && strings.TrimSpace(c.Content) != "" {
				selectedTexts = append(selectedTexts, c.Content)
				if scopeOpts.Count > 0 && len(selectedTexts) >= scopeOpts.Count {
					break
				}
			}
		}
	}
	return strings.Join(selectedTexts, "\n\n")
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

// GetNotebookByID retrieves a single notebook by ID and loads its cells, validating user ownership.
func (s *NotebookService) GetNotebookByID(ctx context.Context, id string, userID string) (*models.Notebook, error) {
	if id == "" || userID == "" {
		return nil, errors.New("id and userID are required")
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

	cells, err := s.repo.GetCells(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to load cells: %w", err)
	}
	nb.Cells = cells

	return nb, nil
}

// GetNotebook is an alias for GetNotebookByID to maintain compatibility with older tests.
func (s *NotebookService) GetNotebook(ctx context.Context, id string, userID string) (*models.Notebook, error) {
	if id == "" {
		return nil, errors.New("notebook id is required")
	}
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	return s.GetNotebookByID(ctx, id, userID)
}

// GetNotebooksByUserID retrieves all notebooks for a user.
func (s *NotebookService) GetNotebooksByUserID(ctx context.Context, userID string) ([]models.Notebook, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	return s.repo.GetByUserID(ctx, userID)
}

// GetNotebooksByUser is an alias for GetNotebooksByUserID to maintain compatibility with older tests.
func (s *NotebookService) GetNotebooksByUser(ctx context.Context, userID string) ([]models.Notebook, error) {
	return s.GetNotebooksByUserID(ctx, userID)
}

// UpdateNotebook updates a notebook's title and optional scope.
func (s *NotebookService) UpdateNotebook(ctx context.Context, id string, title string, scopeID string, userID string) (*models.Notebook, error) {
	if id == "" || userID == "" {
		return nil, errors.New("notebook id and userID are required")
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
	nb, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if nb == nil {
		return errors.New("notebook not found")
	}
	if nb.UserID != userID {
		return errors.New("access denied")
	}

	return s.repo.Delete(ctx, id)
}

// SaveNotebookCells atomically saves cells for a notebook (replaces existing cells).
func (s *NotebookService) SaveNotebookCells(ctx context.Context, notebookID string, userID string, cells []models.Cell) error {
	if notebookID == "" || userID == "" {
		return errors.New("notebookID and userID are required")
	}

	// Validate ownership
	nb, err := s.repo.GetByID(ctx, notebookID)
	if err != nil {
		return err
	}
	if nb == nil {
		return errors.New("notebook not found")
	}
	if nb.UserID != userID {
		return errors.New("access denied")
	}

	return s.repo.SaveCells(ctx, notebookID, cells)
}

// SaveCells is an alias for SaveNotebookCells to maintain compatibility with older tests.
func (s *NotebookService) SaveCells(ctx context.Context, notebookID string, userID string, cells []models.Cell) error {
	return s.SaveNotebookCells(ctx, notebookID, userID, cells)
}

// GetNotebookCells retrieves all cells for a notebook in order.
func (s *NotebookService) GetNotebookCells(ctx context.Context, notebookID string, userID string) ([]models.Cell, error) {
	if notebookID == "" || userID == "" {
		return nil, errors.New("notebookID and userID are required")
	}

	// Validate ownership
	nb, err := s.repo.GetByID(ctx, notebookID)
	if err != nil {
		return nil, err
	}
	if nb == nil {
		return nil, errors.New("notebook not found")
	}
	if nb.UserID != userID {
		return nil, errors.New("access denied")
	}

	return s.repo.GetCells(ctx, notebookID)
}

// ExecuteCellCommand retrieves the cell, parses the CLI slash command, executes it,
// saves the result in cell.ResultJSON, and returns the structured CLIResult.
func (s *NotebookService) ExecuteCellCommand(ctx context.Context, notebookID, cellID, userID, translationID string) (*models.CLIResult, error) {
	// 1. Verify notebook ownership and retrieve cells
	notebook, err := s.repo.GetByID(ctx, notebookID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve notebook: %w", err)
	}
	if notebook == nil {
		return nil, errors.New("notebook not found")
	}
	if notebook.UserID != userID {
		return nil, errors.New("access denied")
	}

	cells, err := s.repo.GetCells(ctx, notebookID)
	if err != nil {
		return nil, fmt.Errorf("failed to load cells: %w", err)
	}
	notebook.Cells = cells

	// 2. Find the target cell
	var targetCell *models.Cell
	for i := range notebook.Cells {
		if notebook.Cells[i].ID == cellID {
			targetCell = &notebook.Cells[i]
			break
		}
	}
	if targetCell == nil {
		return nil, errors.New("cell not found in this notebook")
	}
	if targetCell.Type != models.CellTypeCode {
		return nil, errors.New("cannot execute non-code cells")
	}

	// 3. Parse command using custom ParseCLICommand
	cmd := ParseCLICommand(targetCell.Content)
	if cmd == nil {
		return nil, errors.New("invalid CLI command format (must start with '/')")
	}

	// 4. Collect context text for /suggest and /themes using cell scoping engine
	var contextText string
	if cmd.Name == "/suggest" || cmd.Name == "/themes" {
		contextText = ResolveCellContext(notebook.Cells, cellID, cmd)
	}

	// 5. Execute parsed command using CLIService
	cliResult, err := s.cliService.ExecuteCommand(ctx, cmd, translationID, contextText)
	if err != nil {
		cliResult = &models.CLIResult{
			Type: "error",
			Data: map[string]interface{}{
				"message": err.Error(),
			},
		}
	}

	// 6. Serialize result to JSON and save back to the repository
	resultBytes, err := json.Marshal(cliResult)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal result: %w", err)
	}

	targetCell.ResultJSON = json.RawMessage(resultBytes)
	err = s.repo.UpdateCellResult(ctx, cellID, resultBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to save execution result: %w", err)
	}

	return cliResult, nil
}
