package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

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
	http.Error(w, err.Error(), http.StatusInternalServerError)
}

// GetInsight handles POST /api/ai/insight
func (h *AIHandler) GetInsight(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Text  string `json:"text"`
		Focus string `json:"focus"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		http.Error(w, "Missing required 'text' field", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.GetInsight(r.Context(), req.Text, req.Focus)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// GetTone handles POST /api/ai/tone
func (h *AIHandler) GetTone(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Text  string `json:"text"`
		Focus string `json:"focus"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		http.Error(w, "Missing required 'text' field", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.GetTone(r.Context(), req.Text, req.Focus)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// GetDeepDive handles POST /api/ai/deep-dive
func (h *AIHandler) GetDeepDive(w http.ResponseWriter, r *http.Request) {
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
	if strings.TrimSpace(req.Topic) == "" {
		http.Error(w, "Missing required 'topic' field", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.DeepDive(r.Context(), req.Topic, req.OutputLanguage, req.Context)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// GetOriginalStudy handles POST /api/ai/original-study
func (h *AIHandler) GetOriginalStudy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Reference      string              `json:"reference"`
		SourceText     string              `json:"sourceText"`
		SourceLanguage string              `json:"sourceLanguage"`
		Translations   []map[string]string `json:"translations"`
		Scope          string              `json:"scope"`
		Focus          string              `json:"focus"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Reference) == "" || strings.TrimSpace(req.SourceText) == "" || len(req.Translations) == 0 {
		http.Error(w, "Missing required fields reference, sourceText, or translations", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.OriginalStudy(r.Context(), req.Reference, req.SourceText, req.SourceLanguage, req.Translations, req.Scope, req.Focus)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// AISearch handles POST /api/ai/search
func (h *AIHandler) AISearch(w http.ResponseWriter, r *http.Request) {
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
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Reference    string `json:"reference"`
		TranslationA string `json:"translationA"`
		TextA        string `json:"textA"`
		TranslationB string `json:"translationB"`
		TextB        string `json:"textB"`
		Focus        string `json:"focus"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Reference) == "" || strings.TrimSpace(req.TextA) == "" || strings.TrimSpace(req.TextB) == "" {
		http.Error(w, "Missing required fields (reference, textA, textB)", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.GetComparison(r.Context(), req.Reference, req.TranslationA, req.TextA, req.TranslationB, req.TextB, req.Focus)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
