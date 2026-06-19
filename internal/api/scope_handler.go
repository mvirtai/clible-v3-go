package api

import (
	"encoding/json"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

// ScopeHandler orchestrates presentation controller boundaries for study context and saved data.
type ScopeHandler struct {
	scopeService *services.ScopeService
}

// NewScopeHandler constructs a fresh API controller for workspaces.
func NewScopeHandler(ss *services.ScopeService) *ScopeHandler {
	return &ScopeHandler{scopeService: ss}
}

// ScopeRequest maps incoming creation json schema structures.
type ScopeRequest struct {
	Name string `json:"name"`
}

// SaveSearchRequest maps client camelCase schema representations for saved searches.
type SaveSearchRequest struct {
	ScopeID       string `json:"scopeId"`
	Name          string `json:"name"`
	QueryText     string `json:"queryText"`
	SearchScope   string `json:"searchScope"`
	ScopeValue    string `json:"scopeValue"`
	TranslationID string `json:"translationId"`
}

// SaveAnalysisRequest maps client camelCase schema representations for saved analyses.
type SaveAnalysisRequest struct {
	ScopeID       string `json:"scopeId"`
	Name          string `json:"name"`
	Reference     string `json:"reference"`
	AnalysisType  string `json:"analysisType"`
	TranslationID string `json:"translationId"`
	ParamsJSON    string `json:"paramsJson"`
}

// WorkspaceItemResponse matches serialization schemas for outbound nested array returns.
type WorkspaceItemResponse struct {
	ID        string `json:"id"`
	ScopeID   string `json:"scopeId"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
	Type      string `json:"type"` // "search" or "analysis"
	Details   string `json:"details"`
}

// CreateScope handles POST /api/scopes to spin up a fresh context window.
func (h *ScopeHandler) CreateScope(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var req ScopeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid json body sequence"})
		return
	}

	scope, err := h.scopeService.CreateScope(ctx, req.Name)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(scope)
}

// GetScopes handles GET /api/scopes to yield a chronologically ordered index list.
func (h *ScopeHandler) GetScopes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	scopes, err := h.scopeService.GetScopes(ctx)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(scopes)
}

// DeleteScope handles DELETE /api/scopes?id=... releasing children automatically.
func (h *ScopeHandler) DeleteScope(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	id := r.URL.Query().Get("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "query parameter 'id' is required"})
		return
	}

	if err := h.scopeService.DeleteScope(ctx, id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// SaveSearch handles POST /api/scopes/saved-searches pinning searching activity.
func (h *ScopeHandler) SaveSearch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var req SaveSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid json format"})
		return
	}

	searchItem := models.SavedSearch{
		ScopeID:       req.ScopeID,
		Name:          req.Name,
		QueryText:     req.QueryText,
		SearchScope:   req.SearchScope,
		ScopeValue:    req.ScopeValue,
		TranslationID: req.TranslationID,
	}

	if err := h.scopeService.SaveSearch(ctx, &searchItem); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(searchItem)
}

// GetScopeWorkspace handles GET /api/scopes/workspace?id=... aggregating nested scope assets.
func (h *ScopeHandler) GetScopeWorkspace(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	id := r.URL.Query().Get("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "query parameter 'id' is required"})
		return
	}

	workspace, err := h.scopeService.GetScopeWorkspace(ctx, id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(workspace)
}

// SaveAnalysis handles POST /api/scopes/saved-analyses pinning text statistics metric sets.
func (h *ScopeHandler) SaveAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var req SaveAnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid json format payload"})
		return
	}

	analysisItem := models.SavedAnalysis{
		ScopeID:       req.ScopeID,
		Name:          req.Name,
		Reference:     req.Reference,
		AnalysisType:  req.AnalysisType,
		TranslationID: req.TranslationID,
		ParamsJSON:    req.ParamsJSON,
	}

	if err := h.scopeService.SaveAnalysis(ctx, &analysisItem); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(analysisItem)
}
