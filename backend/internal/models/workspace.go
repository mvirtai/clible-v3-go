package models

// ScopeWorkspace aggregates a research scope along with all its structural nested assets.
// This includes searches, analyses, and notebooks that are scoped to the workspace.
type ScopeWorkspace struct {
	Scope     Scope             `json:"scope"`
	Searches  []SavedSearch     `json:"searches"`
	Analyses  []SavedAnalysis   `json:"analyses"`
	Notebooks []Notebook        `json:"notebooks"`
}
