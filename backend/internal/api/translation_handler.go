package api

import (
	"encoding/json"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
)

// TranslationHandler orchestrates catalog routing and user translation activation.
type TranslationHandler struct {
	translationRepo *db.TranslationRepository
}

// NewTranslationHandler constructs a delivery controller for application translations.
func NewTranslationHandler(repo *db.TranslationRepository) *TranslationHandler {
	return &TranslationHandler{translationRepo: repo}
}

// GetTranslations handles GET /api/translations.
// Returns all global translations annotated with the current user's installed status,
// or marked all as installed if unauthenticated (guest mode).
func (h *TranslationHandler) GetTranslations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx := r.Context()

	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		// Guest mode: all global translations are accessible and marked as installed
		translations, err := h.translationRepo.GetAllGlobal(ctx)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to gather translations catalog: " + err.Error()})
			return
		}
		for i := range translations {
			translations[i].Installed = true
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(translations)
		return
	}

	translations, err := h.translationRepo.GetAllWithInstalled(ctx, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to gather translations catalog: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(translations)
}

// linkRequest is the request body for link/unlink operations.
type linkRequest struct {
	TranslationID string `json:"translationId"`
}

// LinkTranslation handles POST /api/translations/link.
// Activates a global translation for the authenticated user (adds to user_translations).
func (h *TranslationHandler) LinkTranslation(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	var req linkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TranslationID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing or invalid translationId in request body"})
		return
	}

	canonicalID := parsers.ResolveTranslationID(req.TranslationID)
	if err := h.translationRepo.LinkUser(r.Context(), userID, canonicalID); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": canonicalID, "status": "activated"})
}

// UnlinkTranslation handles DELETE /api/translations/link.
// Deactivates a translation for the authenticated user (removes from user_translations).
func (h *TranslationHandler) UnlinkTranslation(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	var req linkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TranslationID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing or invalid translationId in request body"})
		return
	}

	canonicalID := parsers.ResolveTranslationID(req.TranslationID)
	if err := h.translationRepo.UnlinkUser(r.Context(), userID, canonicalID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to deactivate translation: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
