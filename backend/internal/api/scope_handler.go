package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

// ScopeHandler orchestrates presentation controller boundaries for study contexts and saved data.
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
	ID            string `json:"id,omitempty"`
	ScopeID       string `json:"scopeId"`
	Name          string `json:"name"`
	QueryText     string `json:"queryText"`
	SearchScope   string `json:"searchScope"`
	ScopeValue    string `json:"scopeValue"`
	TranslationID string `json:"translationId"`
	ResultJSON    string `json:"resultJson"`
}

// SaveAnalysisRequest maps client camelCase schema representations for saved analyses.
type SaveAnalysisRequest struct {
	ScopeID       string `json:"scopeId"`
	Name          string `json:"name"`
	Reference     string `json:"reference"`
	AnalysisType  string `json:"analysisType"`
	TranslationID string `json:"translationId"`
	ParamsJSON    string `json:"paramsJson"`
	ResultJSON    string `json:"resultJson"`
}

// CreateScope handles POST /api/scopes to spin up a fresh context window.
func (h *ScopeHandler) CreateScope(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	var req ScopeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	scope, err := h.scopeService.CreateScope(ctx, req.Name, userID)
	if err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(scope)
}

// GetScopes handles GET /api/scopes to yield a chronologically ordered index list.
func (h *ScopeHandler) GetScopes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	scopes, err := h.scopeService.GetScopes(ctx, userID)
	if err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(scopes)
}

// DeleteScope handles DELETE /api/scopes?id=... releasing children automatically.
func (h *ScopeHandler) DeleteScope(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		WriteError(w, "invalid query parameter", http.StatusBadRequest, nil)
		return
	}

	if err := h.scopeService.DeleteScope(ctx, id, userID); err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// SaveSearch handles POST /api/scopes/saved-searches pinning search activity.
func (h *ScopeHandler) SaveSearch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	var req SaveSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	searchItem := models.SavedSearch{
		ID:            req.ID,
		ScopeID:       req.ScopeID,
		Name:          req.Name,
		QueryText:     req.QueryText,
		SearchScope:   req.SearchScope,
		ScopeValue:    req.ScopeValue,
		TranslationID: req.TranslationID,
		ResultJSON:    req.ResultJSON,
	}

	if err := h.scopeService.SaveSearch(ctx, &searchItem, userID); err != nil {
		if strings.Contains(err.Error(), "unauthorized") || strings.Contains(err.Error(), "does not belong") {
			WriteError(w, "forbidden", http.StatusForbidden, err)
		} else if strings.Contains(err.Error(), "not found") {
			WriteError(w, "not found", http.StatusNotFound, err)
		} else {
			WriteError(w, "internal server error", http.StatusInternalServerError, err)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(searchItem)
}

// SaveAnalysis handles POST /api/scopes/saved-analyses pinning text statistics metric sets.
func (h *ScopeHandler) SaveAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	var req SaveAnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	analysisItem := models.SavedAnalysis{
		ScopeID:       req.ScopeID,
		Name:          req.Name,
		Reference:     req.Reference,
		AnalysisType:  req.AnalysisType,
		TranslationID: req.TranslationID,
		ParamsJSON:    req.ParamsJSON,
		ResultJSON:    req.ResultJSON,
	}

	if err := h.scopeService.SaveAnalysis(ctx, &analysisItem, userID); err != nil {
		if strings.Contains(err.Error(), "unauthorized") || strings.Contains(err.Error(), "does not belong") {
			WriteError(w, "forbidden", http.StatusForbidden, err)
		} else if strings.Contains(err.Error(), "not found") {
			WriteError(w, "not found", http.StatusNotFound, err)
		} else {
			WriteError(w, "internal server error", http.StatusInternalServerError, err)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(analysisItem)
}

// GetScopeWorkspace handles GET /api/scopes/workspace?id=... aggregating nested elements.
func (h *ScopeHandler) GetScopeWorkspace(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		WriteError(w, "invalid query parameter", http.StatusBadRequest, nil)
		return
	}

	workspace, err := h.scopeService.GetScopeWorkspace(ctx, id, userID)
	if err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(workspace)
}

// RenameScopeRequest defines the payload for scope renaming.
type RenameScopeRequest struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// RenameScope handles PUT /api/scopes.
func (h *ScopeHandler) RenameScope(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	var req RenameScopeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	if err := h.scopeService.RenameScope(ctx, req.ID, req.Name, userID); err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "renamed"})
}

// DeleteSearch handles DELETE /api/scopes/saved-searches?id=...
func (h *ScopeHandler) DeleteSearch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		WriteError(w, "invalid query parameter", http.StatusBadRequest, nil)
		return
	}

	if err := h.scopeService.DeleteSearch(ctx, id, userID); err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// RenameSavedItemRequest defines payload for renaming searches or analyses.
type RenameSavedItemRequest struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// RenameSearch handles PUT /api/scopes/saved-searches.
func (h *ScopeHandler) RenameSearch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	var req RenameSavedItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	if err := h.scopeService.RenameSearch(ctx, req.ID, req.Name, userID); err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "renamed"})
}

// DeleteAnalysis handles DELETE /api/scopes/saved-analyses?id=...
func (h *ScopeHandler) DeleteAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		WriteError(w, "invalid query parameter", http.StatusBadRequest, nil)
		return
	}

	if err := h.scopeService.DeleteAnalysis(ctx, id, userID); err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// RenameAnalysis handles PUT /api/scopes/saved-analyses.
func (h *ScopeHandler) RenameAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		WriteError(w, "unauthorized", http.StatusUnauthorized, nil)
		return
	}

	var req RenameSavedItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, "invalid request body", http.StatusBadRequest, err)
		return
	}

	if err := h.scopeService.RenameAnalysis(ctx, req.ID, req.Name, userID); err != nil {
		WriteError(w, "internal server error", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "renamed"})
}
