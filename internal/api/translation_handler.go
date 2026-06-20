package api

import (
	"encoding/json"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/db"
)

// TranslationHandler orchestrates catalog routing metadata interfaces.
type TranslationHandler struct {
	translationRepo *db.TranslationRepository
}

// NewTranslationHandler constructs a delivery controller for application translations.
func NewTranslationHandler(repo *db.TranslationRepository) *TranslationHandler {
	return &TranslationHandler{translationRepo: repo}
}

// GetTranslations handles GET /api/translations to serve a simple listing array.
func (h *TranslationHandler) GetTranslations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	translations, err := h.translationRepo.GetAll()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to gather installed translations catalog"})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(translations)
}
