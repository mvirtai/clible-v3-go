package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

// FrontendVerse matches the camelCase JSON format expected by ReaderView.tsx
type FrontendVerse struct {
	BookName string `json:"bookName"`
	Chapter  int    `json:"chapter"`
	Verse    int    `json:"verse"`
	Text     string `json:"text"`
}

// FrontendBibleResponse matches the top-level contract for coordinate lookups.
type FrontendBibleResponse struct {
	Reference       string          `json:"reference"`
	Text            string          `json:"text"`
	TranslationName string          `json:"translationName"`
	Verses          []FrontendVerse `json:"verses"`
}

// BibleHandler dependency-injects the real domain workspace services.
type BibleHandler struct {
	verseService *services.VerseService
}

// NewBibleHandler constructs the HTTP controller endpoint handle.
func NewBibleHandler(vs *services.VerseService) *BibleHandler {
	return &BibleHandler{verseService: vs}
}

// GetVersesByReference processes GET /api/verses?ref=John+3:16&translation=fin-1992
func (h *BibleHandler) GetVersesByReference(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	ref := r.URL.Query().Get("ref")
	translation := r.URL.Query().Get("translation")

	if ref == "" || translation == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "query parameters 'ref' and 'translation' are explicitly required"})
		return
	}

	// Correctly invokes the synchronized service layer method
	dbVerses, err := h.verseService.GetVerses(ctx, ref, translation)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to evaluate target coordinates: " + err.Error()})
		return
	}

	// Map internal models into the explicit contract expected by the React client
	frontendVerses := make([]FrontendVerse, len(dbVerses))

	var combinedText strings.Builder
	combinedText.Grow(len(dbVerses) * 100)

	for i, v := range dbVerses {
		frontendVerses[i] = FrontendVerse{
			BookName: v.BookID,
			Chapter:  v.Chapter,
			Verse:    v.Verse,
			Text:     v.Text,
		}
		if i > 0 {
			combinedText.WriteString(" ")
		}
		combinedText.WriteString(v.Text)
	}

	response := FrontendBibleResponse{
		Reference:       ref,
		TranslationName: translation,
		Text:            combinedText.String(),
		Verses:          frontendVerses,
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

// SearchVerses orhestrates the search query through the repository layer.
func (h *BibleHandler) SearchVerses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	query := r.URL.Query().Get("q")
	useRegex := r.URL.Query().Get("regex") == "true"
	translation := r.URL.Query().Get("translation")

	if query == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "query parameter q is required"})
		return
	}

	results, err := h.verseService.SearchVerses(ctx, query, useRegex, translation)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "search operation failed: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(results)
}
