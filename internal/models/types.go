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
	SourceURL   string    `json:"source_url" db:"source_url"`
	InstalledAt time.Time `json:"installed_at" db:"installed_at"`
}

type Verse struct {
	ID            string `json:"id" db:"id"`
	TranslationID string `json:"translation_id" db:"translation_id"`
	BookID        string `json:"book_id" db:"book_id"`
	Chapter       int    `json:"chapter" db:"chapter"`
	Verse         int    `json:"verse" db:"verse"`
	Text          string `json:"text" db:"text"`
}

type Scope struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type SearchHistory struct {
	ID            string    `json:"id" db:"id"`
	QueryText     string    `json:"query_text" db:"query_text"`
	SearchScope   string    `json:"search_scope" db:"search_scope"`
	ScopeValue    string    `json:"scope_value" db:"scope_value"`
	TranslationID string    `json:"translation_id" db:"translation_id"`
	Mode          string    `json:"mode" db:"mode"`
	ResultCount   int       `json:"result_count" db:"result_count"`
	SearchedAt    time.Time `json:"searched_at" db:"searched_at"`
}

type SavedSearch struct {
	ID            string    `json:"id" db:"id"`
	ScopeID       string    `json:"scope_id" db:"scope_id"`
	Name          string    `json:"name" db:"name"`
	QueryText     string    `json:"query_text" db:"query_text"`
	SearchScope   string    `json:"search_scope" db:"search_scope"`
	ScopeValue    string    `json:"scope_value" db:"scope_value"`
	TranslationID string    `json:"translation_id" db:"translation_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type SavedAnalysis struct {
	ID            string    `json:"id" db:"id"`
	ScopeID       string    `json:"scope_id" db:"scope_id"`
	Name          string    `json:"name" db:"name"`
	Reference     string    `json:"reference" db:"reference"`
	AnalysisType  string    `json:"analysis_type" db:"analysis_type"`
	TranslationID string    `json:"translation_id" db:"translation_id"`
	ParamsJSON    string    `json:"params_json" db:"params_json"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}
