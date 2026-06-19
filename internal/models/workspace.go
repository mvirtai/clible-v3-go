package models

// ScopeWorkspace aggregates a research scope along with its complete nested assets.
type ScopeWorkspace struct {
	Scope    Scope           `json:"scope"`
	Searches []SavedSearch   `json:"searches"`
	Analyses []SavedAnalysis `json:"analyses"`
}
