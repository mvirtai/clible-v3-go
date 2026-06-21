package models

import "time"

type Testament string

const (
	TestamentOT  Testament = "OT"
	TestamentNT  Testament = "NT"
	TestamentDeu Testament = "DEU"
)

type Book struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Testament Testament `json:"testament" db:"testament"`
	Position  int       `json:"position" db:"position"`
	Chapters  int       `json:"chapters" db:"chapters"`
}

type Translation struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Language    string    `json:"language" db:"language"`
	Format      string    `json:"format" db:"format"`
	SourceURL   string    `json:"sourceUrl" db:"source_url"`
	InstalledAt time.Time `json:"installedAt" db:"installed_at"`
}

type Verse struct {
	ID            string `json:"id" db:"id"`
	TranslationID string `json:"translationId" db:"translation_id"`
	BookID        string `json:"bookId" db:"book_id"`
	Chapter       int    `json:"chapter" db:"chapter"`
	Verse         int    `json:"verse" db:"verse"`
	Text          string `json:"text" db:"text"`
}

type Scope struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

type SearchHistory struct {
	ID            string    `json:"id" db:"id"`
	QueryText     string    `json:"queryText" db:"query_text"`
	SearchScope   string    `json:"searchScope" db:"search_scope"`
	ScopeValue    string    `json:"scopeValue" db:"scope_value"`
	TranslationID string    `json:"translationId" db:"translation_id"`
	Mode          string    `json:"mode" db:"mode"`
	ResultCount   int       `json:"resultCount" db:"result_count"`
	SearchedAt    time.Time `json:"searchedAt" db:"searched_at"`
}

type SavedSearch struct {
	ID            string    `json:"id" db:"id"`
	ScopeID       string    `json:"scopeId" db:"scope_id"`
	Name          string    `json:"name" db:"name"`
	QueryText     string    `json:"queryText" db:"query_text"`
	SearchScope   string    `json:"searchScope" db:"search_scope"`
	ScopeValue    string    `json:"scopeValue" db:"scope_value"`
	TranslationID string    `json:"translationId" db:"translation_id"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

type SavedAnalysis struct {
	ID            string    `json:"id" db:"id"`
	ScopeID       string    `json:"scopeId" db:"scope_id"`
	Name          string    `json:"name" db:"name"`
	Reference     string    `json:"reference" db:"reference"`
	AnalysisType  string    `json:"analysisType" db:"analysis_type"`
	TranslationID string    `json:"translationId" db:"translation_id"`
	ParamsJSON    string    `json:"paramsJson" db:"params_json"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}
