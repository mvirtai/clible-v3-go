package api

import (
	"encoding/json"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

// TranslationHandler orchestrates catalog routing metadata interfaces.
type TranslationHandler struct {
	translationRepo *db.TranslationRepository
	seedService     *services.SeedService
}

// NewTranslationHandler constructs a delivery controller for application translations.
func NewTranslationHandler(repo *db.TranslationRepository, ss *services.SeedService) *TranslationHandler {
	return &TranslationHandler{translationRepo: repo, seedService: ss}
}

// GetTranslations handles GET /api/translations to serve a simple listing array.
func (h *TranslationHandler) GetTranslations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	translations, err := h.translationRepo.GetByUser(r.Context(), userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to gather installed translations catalog: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(translations)
}

// ImportTranslation handles POST /api/translations/import via multipart/form-data streaming.
func (h *TranslationHandler) ImportTranslation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	// Parse multi-part limits safely (10 MB cache allocation boundary for headers)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to parse multipart form payload"})
		return
	}

	translationID := r.FormValue("translationId")
	name := r.FormValue("name")
	language := r.FormValue("language")

	if translationID == "" || name == "" || language == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing required metadata form parameters: translationId, name, language"})
		return
	}

	// Intercept the streaming file multi-part file handle vector
	file, _, err := r.FormFile("file")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing translation target xml file attachment parameter"})
		return
	}
	defer func() { _ = file.Close() }()

	// If translation already exists, delete it first to ensure clean overwrite (with cascading verses)
	exists, err := h.translationRepo.Exists(translationID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to check translation existence: " + err.Error()})
		return
	}
	if exists {
		if err := h.translationRepo.Delete(translationID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to remove existing translation: " + err.Error()})
			return
		}
	}

	// 1. Create and commit the translation index row metadata footprint first
	tMeta := models.Translation{
		ID:       translationID,
		Name:     name,
		Language: language,
		Format:   "text",
	}

	if err := h.translationRepo.Create(tMeta); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to commit catalog metadata index: " + err.Error()})
		return
	}

	if err := h.seedService.ParseStreamShortcut(ctx, file, translationID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "metadata saved but file streaming compilation failed: " + err.Error()})
		return
	}

	// Link the newly imported translation to the user who uploaded it
	userID, ok := middleware.GetUserID(ctx)
	if ok {
		if err := h.translationRepo.LinkUser(ctx, userID, translationID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to link translation to user: " + err.Error()})
			return
		}
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": translationID, "status": "successfully compiled and imported"})
}
