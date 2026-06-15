package api

import (
	"encoding/json"
	"net/http"
)

// VerseResponse represents a single verse item in the JSON array.
type VerseResponse struct {
	BookName string `json:"bookName"`
	Chapter  int    `json:"chapter"`
	Verse    int    `json:"verse"`
	Text     string `json:"text"`
}

// BibleResponse represents the top-level structured payload expected by the frontend.
type BibleResponse struct {
	Reference       string          `json:"reference"`
	Text            string          `json:"text"`
	TranslationName string          `json:"translationName"`
	Verses          []VerseResponse `json:"verses"`
}

// BibleHandler handles REST endpoints for scriptural data.
type BibleHandler struct {
	// We can extend this struct later with real service dependencies.
}

// NewBibleHandler constructor pattern for the API layer.
func NewBibleHandler() *BibleHandler {
	return &BibleHandler{}
}

// GetVersesByReference processes GET /api/verses?ref=John+3:16&translation=fin-1992
func (h *BibleHandler) GetVersesByReference(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ref := r.URL.Query().Get("ref")
	translation := r.URL.Query().Get("translation")

	if ref == "" || translation == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "query parameters 'ref' and 'translation' are required"})
		return
	}

	// SIMULATION WORKSPACE: Return hardcoded mock data to simulate successful backend behavior
	mockResponse := BibleResponse{
		Reference:       ref,
		TranslationName: translation,
		Text:            "For God so loved the world, that he gave his only Son...",
		Verses: []VerseResponse{
			{
				BookName: "John",
				Chapter:  3,
				Verse:    16,
				Text:     "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
			},
		},
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(mockResponse)
}
