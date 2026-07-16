package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

type NotebookHandler struct {
	notebookService *services.NotebookService
}

// NewNotebookHandler creates a new instance of NotebookHandler.
func NewNotebookHandler(nbService *services.NotebookService) *NotebookHandler {
	return &NotebookHandler{notebookService: nbService}
}

// GetNotebooks handles GET /api/notebooks - retrieves all notes to user
func (h *NotebookHandler) GetNotebooks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	notebooks, err := h.notebookService.GetNotebooksByUserID(r.Context(), userID)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(notebooks)
}

// GetNotebook handles GET /api/notebooks/{id} - retrieves a single notebook and its cells
func (h *NotebookHandler) GetNotebook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing notebook id"})
		return
	}

	notebook, err := h.notebookService.GetNotebookByID(r.Context(), id, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusForbidden)
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(notebook)
}

// CreateNotebook handles POST /api/notebooks - creates a new notebook
func (h *NotebookHandler) CreateNotebook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	var req struct {
		Title   string `json:"title"`
		ScopeID string `json:"scopeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && r.ContentLength > 0 {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	notebook, err := h.notebookService.CreateNotebook(r.Context(), req.Title, userID, req.ScopeID)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(notebook)
}

// UpdateNotebook handles PUT /api/notebooks/{id} - updates the title or workspace association of a notebook
func (h *NotebookHandler) UpdateNotebook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing notebook id"})
		return
	}

	var req struct {
		Title   string `json:"title"`
		ScopeID string `json:"scopeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	notebook, err := h.notebookService.UpdateNotebook(r.Context(), id, req.Title, req.ScopeID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusForbidden)
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(notebook)
}

// DeleteNotebook handles DELETE /api/notebooks/{id} - deletes a notebook
func (h *NotebookHandler) DeleteNotebook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing notebook id"})
		return
	}

	err := h.notebookService.DeleteNotebook(r.Context(), id, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusForbidden)
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// SaveCells handles PUT /api/notebooks/{id}/cells - saves the current state and order of cells
func (h *NotebookHandler) SaveCells(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing notebook id"})
		return
	}

	var cells []models.Cell
	if err := json.NewDecoder(r.Body).Decode(&cells); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	err := h.notebookService.SaveNotebookCells(r.Context(), id, userID, cells)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusForbidden)
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "saved"})
}

// ExecuteCommand handles POST /api/notebooks/{id}/cells/{cell_id}/execute - executes a command in CLI interpreter
func (h *NotebookHandler) ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	notebookID := r.PathValue("id")
	cellID := r.PathValue("cell_id")
	if notebookID == "" || cellID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing notebook_id or cell_id"})
		return
	}

	// Read optional translation flag from query parameters (e.g. ?translation=biblia)
	translationID := r.URL.Query().Get("translation")
	if translationID == "" {
		translationID = "KJV" // Default fallback translation
	}

	// Delegate orchestration to the service layer (O(1) network pass-through rule)
	result, err := h.notebookService.ExecuteCellCommand(r.Context(), notebookID, cellID, userID, translationID)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(result)

}

// handleError is a private helper to write standard JSON error responses
func (h *NotebookHandler) handleError(w http.ResponseWriter, err error) {
	slog.Error("Notebook handler request failed", "error", err)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": "internal server error",
	})
}
