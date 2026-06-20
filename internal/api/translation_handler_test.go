package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestTranslationHandler_GetTranslations(t *testing.T) {
	t.Run("GET /api/translations returns 200 OK with catalog array", func(t *testing.T) {
		conn, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		defer func() { _ = conn.Close() }()

		repo := db.NewTranslationRepository(conn)

		err = repo.Create(models.Translation{
			ID:       "fin-1992",
			Name:     "Finnish 1992",
			Language: "fi",
			Format:   "text",
		})
		if err != nil {
			t.Fatalf("failed to seed translation: %v", err)
		}

		handler := api.NewTranslationHandler(repo)

		req := httptest.NewRequest(http.MethodGet, "/api/translations", nil)
		rec := httptest.NewRecorder()

		handler.GetTranslations(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected HTTP 200 OK, got %d", rec.Code)
		}

		var list []models.Translation
		if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
			t.Fatalf("failed to decode response payload: %v", err)
		}

		if len(list) != 1 || list[0].ID != "fin-1992" {
			t.Errorf("unexpected translation array return: %v", list)
		}
	})

	t.Run("GET /api/translations returns 500 Internal Server Error on database failure", func(t *testing.T) {
		connErr, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		repoErr := db.NewTranslationRepository(connErr)
		handlerErr := api.NewTranslationHandler(repoErr)

		// Explicitly close the database connection to force an internal query failure
		_ = connErr.Close()

		req := httptest.NewRequest(http.MethodGet, "/api/translations", nil)
		rec := httptest.NewRecorder()

		handlerErr.GetTranslations(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Errorf("expected HTTP 500 Internal Server Error, got %d", rec.Code)
		}
	})
}
