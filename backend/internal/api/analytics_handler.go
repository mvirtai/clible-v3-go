package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

// AnalyticsHandler handles complex in-memory textual metric evaluations over target references.
type AnalyticsHandler struct {
	analyticService *services.AnalyticService
	verseService    *services.VerseService
}

// NewAnalyticsHandler constructs an operational gateway endpoint controller.
func NewAnalyticsHandler(as *services.AnalyticService, vs *services.VerseService) *AnalyticsHandler {
	// Note: We usea small re-mapping trick or direct reference depending on package import naming
	return &AnalyticsHandler{
		analyticService: as,
		verseService:    vs,
	}
}

// AnalyzeRequest maps inbound requests for single translation text profiling.
type AnalyzeRequest struct {
	Reference     string `json:"reference"`
	TranslationID string `json:"translationId"`
}

// CompareRequest maps dual validation parameters to execute linguistic cross-alignments.
type CompareRequest struct {
	Reference      string `json:"reference"`
	TranslationID1 string `json:"translationId1"`
	TranslationID2 string `json:"translationId2"`
}

// Analyze handles POST /api/analytics/analyze providingg token distribution maps.
func (h *AnalyticsHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var req AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	if req.Reference == "" || req.TranslationID == "" {
		WriteError(w, "missing mandatory fields: reference and translationId", http.StatusBadRequest, nil)
		return
	}

	// 1. Fetch targeted text structures
	verses, err := h.verseService.GetVerses(ctx, req.Reference, req.TranslationID)
	if err != nil {
		if strings.Contains(err.Error(), "failed to parse reference") {
			WriteError(w, "failed to parse reference", http.StatusBadRequest, err)
			return
		}
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	// 2. Feed metrics engine directly in-memory
	analysis := h.analyticService.AnalyzeVerses(verses, 10)

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(analysis)
}

// Compare handles POST /api/analytics/compare evaluating text similarity layers.
func (h *AnalyticsHandler) Compare(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var req CompareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	if req.Reference == "" || req.TranslationID1 == "" || req.TranslationID2 == "" {
		WriteError(w, "missing validation arguments", http.StatusBadRequest, nil)
		return
	}

	// Gather baseline translation group
	verses1, err := h.verseService.GetVerses(ctx, req.Reference, req.TranslationID1)
	if err != nil {
		if strings.Contains(err.Error(), "failed to parse reference") {
			WriteError(w, "failed to parse reference", http.StatusBadRequest, err)
			return
		}
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	// Gather target comparative translation group
	verses2, err := h.verseService.GetVerses(ctx, req.Reference, req.TranslationID2)
	if err != nil {
		if strings.Contains(err.Error(), "failed to parse reference") {
			WriteError(w, "failed to parse reference", http.StatusBadRequest, err)
			return
		}
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	// Compute differences and alignment arrays
	comparison := h.analyticService.CompareTranslations(req.Reference, verses1, verses2)

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(comparison)
}
