package models

import (
	"encoding/json"
	"time"
)

type CellType string

const (
	CellTypeMarkdown CellType = "markdown"
	CellTypeCode     CellType = "code"
)

type Notebook struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	UserID    string    `json:"userId"`
	ScopeID   string    `json:"scopeId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Cells     []Cell    `json:"cells,omitempty"`
}

type Cell struct {
	ID         string          `json:"id"`
	NotebookID string          `json:"notebookId"`
	Type       CellType        `json:"type"`
	Content    string          `json:"content"`
	ResultJSON json.RawMessage `json:"resultJson,omitempty"`
	Position   int             `json:"position"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
}

type CLIResult struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}
