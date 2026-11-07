package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

type AIHandler struct {
	aiService services.AIService
}

// NewAIHandler creates a new instance of AIHandler.
func NewAIHandler(aiService services.AIService) *AIHandler {
	return &AIHandler{aiService: aiService}
}

// handleError is a private helper to write standard JSON error responses
func (h *AIHandler) handleError(w http.ResponseWriter, err error) {
	slog.Error("AI handler request failed", "error", err)
	if strings.Contains(strings.ToLower(err.Error()), "gemini api key is not configured") {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "AI disabled",
			"hint":  "Set GEMINI_API_KEY to enable AI features.",
		})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": "AI request failed",
	})
}

// GetInsight handles POST /api/ai/insight
func (h *AIHandler) GetInsight(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 100*1024)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Text           string `json:"text"`
		Focus          string `json:"focus"`
		OutputLanguage string `json:"outputLanguage"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if len(req.Text) > 15000 {
		http.Error(w, "Input text exceeds maximum allowed length (15 000 characters)", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Text) == "" {
		http.Error(w, "Missing required 'text' field", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.GetInsight(r.Context(), req.Text, req.Focus, req.OutputLanguage)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// GetTone handles POST /api/ai/tone
func (h *AIHandler) GetTone(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 100*1024)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Text           string `json:"text"`
		Focus          string `json:"focus"`
		OutputLanguage string `json:"outputLanguage"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if len(req.Text) > 15000 {
		http.Error(w, "Input text exceeds maximum allowed length (15 000 characters)", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Text) == "" {
		http.Error(w, "Missing required 'text' field", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.GetTone(r.Context(), req.Text, req.Focus, req.OutputLanguage)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// GetDeepDive handles POST /api/ai/deep-dive
func (h *AIHandler) GetDeepDive(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 100*1024)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Topic          string                 `json:"topic"`
		OutputLanguage string                 `json:"outputLanguage"`
		Context        map[string]interface{} `json:"context"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if len(req.Topic) > 15000 {
		http.Error(w, "Input topic exceeds maximum allowed length (15 000 characters)", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Topic) == "" {
		http.Error(w, "Missing required 'topic' field", http.StatusBadRequest)
		return
	}

	path, err := sanitizeDeepDivePath(req.Context["path"])
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Context == nil {
		req.Context = map[string]interface{}{}
	}
	if path != nil {
		req.Context["path"] = path // typed []string for the service layer
	}

	resp, err := h.aiService.DeepDive(r.Context(), req.Topic, req.OutputLanguage, req.Context)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

const (
	maxDeepDivePathDepth = 5
	maxDeepDivePathLabel = 200 // runes
)

// sanitizeDeepDivePath validates the optional "path" entry of the deep-dive
// context and returns a cleaned copy. It returns (nil, nil) when absent.
func sanitizeDeepDivePath(raw interface{}) ([]string, error) {
	if raw == nil {
		return nil, nil
	}
	items, ok := raw.([]interface{})
	if !ok {
		return nil, errors.New("'path' must be an array of strings")
	}
	if len(items) > maxDeepDivePathDepth {
		return nil, fmt.Errorf("'path' exceeds maximum depth (%d)", maxDeepDivePathDepth)
	}
	out := make([]string, 0, len(items))
	for _, it := range items {
		s, ok := it.(string)
		if !ok {
			return nil, errors.New("'path' must contain only strings")
		}
		s = strings.TrimSpace(s)
		if s == "" || utf8.RuneCountInString(s) > maxDeepDivePathLabel {
			return nil, errors.New("'path' items must be 1-200 characters")
		}
		out = append(out, s)
	}
	return out, nil
}

// GetOriginalStudy handles POST /api/ai/original-study
func (h *AIHandler) GetOriginalStudy(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 100*1024)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Reference      string              `json:"reference"`
		SourceText     string              `json:"sourceText"`
		SourceLanguage string              `json:"sourceLanguage"`
		OutputLanguage string              `json:"outputLanguage"`
		Translations   []map[string]string `json:"translations"`
		Scope          string              `json:"scope"`
		Focus          string              `json:"focus"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if len(req.SourceText) > 15000 {
		http.Error(w, "Input source text exceeds maximum allowed length (15 000 characters)", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Reference) == "" || strings.TrimSpace(req.SourceText) == "" || len(req.Translations) == 0 {
		http.Error(w, "Missing required fields reference, sourceText, or translations", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.OriginalStudy(r.Context(), req.Reference, req.SourceText, req.SourceLanguage, req.OutputLanguage, req.Translations, req.Scope, req.Focus)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// AISearch handles POST /api/ai/search
func (h *AIHandler) AISearch(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 100*1024)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Query         string `json:"query"`
		TranslationID string `json:"translationId"`
		UILanguage    string `json:"uiLanguage"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if len(req.Query) > 15000 {
		http.Error(w, "Input query exceeds maximum allowed length (15 000 characters)", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Query) == "" || strings.TrimSpace(req.TranslationID) == "" {
		http.Error(w, "Missing required query or translationId field", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.AISearch(r.Context(), req.Query, req.TranslationID, req.UILanguage)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// GetComparison handles POST /api/ai/compare
func (h *AIHandler) GetComparison(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 100*1024)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Reference      string `json:"reference"`
		TranslationA   string `json:"translationA"`
		TextA          string `json:"textA"`
		TranslationB   string `json:"translationB"`
		TextB          string `json:"textB"`
		Focus          string `json:"focus"`
		OutputLanguage string `json:"outputLanguage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Reference) == "" || strings.TrimSpace(req.TextA) == "" || strings.TrimSpace(req.TextB) == "" {
		http.Error(w, "Missing required fields (reference, textA, textB)", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.GetComparison(r.Context(), req.Reference, req.TranslationA, req.TextA, req.TranslationB, req.TextB, req.Focus, req.OutputLanguage)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

const (
	maxRefinePromptRunes = 500
	maxRefinePayloadList = 500
	maxRefineEvaluated   = 300
	maxRefineVerseIDLen  = 64
	maxRefineBookIDLen   = 32
	maxRefineVerseRunes  = 1000
)

// RefineSearch handles POST /api/ai/search/refine
func (h *AIHandler) RefineSearch(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 250*1024)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Query            string         `json:"query"`
		RefinementPrompt string         `json:"refinementPrompt"`
		Verses           []models.Verse `json:"verses"`
		UILanguage       string         `json:"uiLanguage"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if utf8.RuneCountInString(req.RefinementPrompt) > maxRefinePromptRunes || utf8.RuneCountInString(req.Query) > maxRefinePromptRunes {
		http.Error(w, "Input prompt exceeds maximum allowed length (500 characters)", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.RefinementPrompt) == "" {
		http.Error(w, "Missing required 'refinementPrompt' field", http.StatusBadRequest)
		return
	}

	if len(req.Verses) > maxRefinePayloadList {
		http.Error(w, "Verses list exceeds maximum allowed count", http.StatusBadRequest)
		return
	}

	evalLimit := len(req.Verses)
	if evalLimit > maxRefineEvaluated {
		evalLimit = maxRefineEvaluated
	}
	for i := 0; i < evalLimit; i++ {
		v := req.Verses[i]
		if strings.TrimSpace(v.ID) == "" || len(v.ID) > maxRefineVerseIDLen || len(v.BookID) > maxRefineBookIDLen || utf8.RuneCountInString(v.Text) > maxRefineVerseRunes {
			http.Error(w, "Invalid verse entry in refinement payload", http.StatusBadRequest)
			return
		}
	}

	resp, err := h.aiService.RefineSearch(r.Context(), req.Query, req.RefinementPrompt, req.Verses[:evalLimit], req.UILanguage)
	if err != nil {
		var invalidIntentErr *services.InvalidRefinementIntentError
		if errors.As(err, &invalidIntentErr) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": invalidIntentErr.Message,
			})
			return
		}
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
