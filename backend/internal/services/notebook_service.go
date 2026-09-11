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
	"unicode"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/dsl"
	"github.com/mvirtai/clible-v3-go/internal/models"
	newdsl "github.com/mvirtai/clible-v3-go/new_dsl"
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
			if i != targetIdx && c.Type == models.CellTypeMarkdown {
				if cleaned := dsl.StripISLAFromText(c.Content); cleaned != "" {
					selectedTexts = append(selectedTexts, cleaned)
				}
			}
		}
	} else if scopeOpts.Direction == "up" {
		var upCells []string
		for i := targetIdx - 1; i >= 0; i-- {
			c := cells[i]
			if c.Type == models.CellTypeMarkdown {
				if cleaned := dsl.StripISLAFromText(c.Content); cleaned != "" {
					upCells = append(upCells, cleaned)
					if scopeOpts.Count > 0 && len(upCells) >= scopeOpts.Count {
						break
					}
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
			if c.Type == models.CellTypeMarkdown {
				if cleaned := dsl.StripISLAFromText(c.Content); cleaned != "" {
					selectedTexts = append(selectedTexts, cleaned)
					if scopeOpts.Count > 0 && len(selectedTexts) >= scopeOpts.Count {
						break
					}
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

// UpdateNotebook updates a notebook's title, scope, colSpan, and colHeight.
func (s *NotebookService) UpdateNotebook(ctx context.Context, id string, title string, scopeID string, colSpan int, colHeight *int, userID string) (*models.Notebook, error) {
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
	if colSpan >= 6 && colSpan <= 24 {
		nb.ColSpan = colSpan
	} else if colSpan != 0 && nb.ColSpan == 0 {
		nb.ColSpan = 12
	}
	if colHeight != nil {
		nb.ColHeight = colHeight
	}
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

	// 3. Parse and execute either Clible Magic DSL or traditional slash command
	trimmedContent := strings.TrimSpace(targetCell.Content)
	if strings.HasPrefix(trimmedContent, "!") {
		trimmedContent = strings.TrimSpace(strings.TrimPrefix(trimmedContent, "!"))
	}
	if strings.HasPrefix(strings.ToLower(trimmedContent), "isla ") {
		trimmedContent = strings.TrimSpace(trimmedContent[5:])
	}
	var cliResult *models.CLIResult

	isDSL := strings.HasPrefix(trimmedContent, "@") ||
		strings.HasPrefix(trimmedContent, "?") ||
		strings.HasPrefix(trimmedContent, "^") ||
		strings.HasPrefix(trimmedContent, "~") ||
		strings.HasPrefix(trimmedContent, "#") ||
		strings.HasPrefix(trimmedContent, "search(") ||
		strings.HasPrefix(trimmedContent, "range(") ||
		strings.HasPrefix(trimmedContent, "read(") ||
		strings.HasPrefix(trimmedContent, "from(") ||
		strings.HasPrefix(trimmedContent, "at(") ||
		strings.HasPrefix(trimmedContent, "top(") ||
		strings.HasPrefix(trimmedContent, "words(") ||
		strings.HasPrefix(trimmedContent, "stats(") ||
		strings.HasPrefix(trimmedContent, "ttr(")

	if isDSL {
		// 1. Clible Magic DSL execution
		var contextText string
		if strings.HasPrefix(trimmedContent, "^") {
			cmd := &CLICommand{Flags: map[string]string{"dir": "up", "scope": "prev"}}
			rest := strings.TrimPrefix(trimmedContent, "^")
			if strings.HasPrefix(rest, "all") {
				cmd.Flags["dir"] = "all"
			} else {
				var numDigits strings.Builder
				for _, r := range rest {
					if unicode.IsDigit(r) {
						numDigits.WriteRune(r)
					} else {
						break
					}
				}
				if numDigits.Len() > 0 {
					cmd.Flags["n"] = numDigits.String() + "u"
				}
			}
			contextText = ResolveCellContext(notebook.Cells, cellID, cmd)
		}
		// Build variable resolver looking up named outputs from previous notebook cells
		var varResolver newdsl.VariableResolver = func(name string) (*models.CLIResult, error) {
			cleanName := strings.TrimPrefix(name, "#")
			for _, cell := range notebook.Cells {
				if len(cell.ResultJSON) == 0 {
					continue
				}
				var res models.CLIResult
				if err := json.Unmarshal(cell.ResultJSON, &res); err != nil {
					continue
				}
				if res.Data == nil {
					continue
				}
				if outputOp, ok := res.Data["output_op"].(map[string]interface{}); ok {
					if opName, ok := outputOp["name"].(string); ok {
						cleanOpName := strings.TrimPrefix(opName, "#")
						if cleanOpName == cleanName {
							return &res, nil
						}
					}
				}
			}
			return nil, fmt.Errorf("variable '#%s' not found in notebook context", cleanName)
		}

		res, err := s.cliService.ExecuteDSLWithResolver(ctx, trimmedContent, translationID, contextText, varResolver)
		if err != nil {
			cliResult = &models.CLIResult{
				Type: "error",
				Data: map[string]interface{}{
					"message": err.Error(),
				},
			}
		} else {
			cliResult = res
		}
	} else if strings.HasPrefix(trimmedContent, "/") {
		// 2. Traditional Slash command execution
		cmd := ParseCLICommand(trimmedContent)
		if cmd == nil {
			return nil, errors.New("invalid CLI command format (must start with '/')")
		}

		var contextText string
		if cmd.Name == "/suggest" || cmd.Name == "/themes" {
			contextText = ResolveCellContext(notebook.Cells, cellID, cmd)
		}

		res, err := s.cliService.ExecuteCommand(ctx, cmd, translationID, contextText)
		if err != nil {
			cliResult = &models.CLIResult{
				Type: "error",
				Data: map[string]interface{}{
					"message": err.Error(),
				},
			}
		} else {
			cliResult = res
		}
	} else {
		return nil, errors.New("unsupported cell content format (must start with '@', '?', '^', or '/')")
	}

	// 4. Serialize result to JSON and save back to the repository
	resultBytes, err := json.Marshal(cliResult)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal result: %w", err)
	}

	targetCell.ResultJSON = json.RawMessage(resultBytes)
	err = s.repo.UpdateCellResult(ctx, cellID, resultBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to save execution result: %w", err)
	}

	// 5. If output_op is cell_above or cell_below, create and insert a new cell
	if cliResult.Data != nil {
		if outputOp, ok := cliResult.Data["output_op"].(map[string]interface{}); ok {
			kind, _ := outputOp["kind"].(string)
			name, _ := outputOp["name"].(string)
			if kind == "cell_above" || kind == "cell_below" {
				newCellID := uuid.New().String()
				var newContent string
				if name != "" {
					newContent = "### " + name
				}
				newCell := models.Cell{
					ID:         newCellID,
					NotebookID: notebookID,
					Type:       models.CellTypeMarkdown,
					Content:    newContent,
					ResultJSON: json.RawMessage(resultBytes),
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				}

				targetIdx := -1
				for i := range notebook.Cells {
					if notebook.Cells[i].ID == cellID {
						targetIdx = i
						break
					}
				}

				if targetIdx != -1 {
					insertIdx := targetIdx
					if kind == "cell_below" {
						insertIdx = targetIdx + 1
					}

					var updatedCells []models.Cell
					for i, c := range notebook.Cells {
						if i == insertIdx {
							updatedCells = append(updatedCells, newCell)
						}
						updatedCells = append(updatedCells, c)
					}
					if insertIdx >= len(notebook.Cells) {
						updatedCells = append(updatedCells, newCell)
					}

					for i := range updatedCells {
						updatedCells[i].Position = i
					}

					if saveErr := s.repo.SaveCells(ctx, notebookID, updatedCells); saveErr != nil {
						return nil, fmt.Errorf("failed to save cells after inserting output cell: %w", saveErr)
					}

					cliResult.Data["new_cell_id"] = newCellID
				}
			}
		}
	}

	return cliResult, nil
}
