package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestTranslationHandler_Endpoints(t *testing.T) {
	t.Run("GET /api/translations returns 200 OK with full catalog including installed flag", func(t *testing.T) {
		conn, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		defer func() { _ = conn.Close() }()

		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		userID := "test-user"
		_, _ = conn.Exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", userID, "test@example.com", "hash")

		// Seed a global translation
		err = repo.Create(models.Translation{
			ID:       "web",
			Name:     "World English Bible",
			Language: "en",
			Format:   "text",
		})
		if err != nil {
			t.Fatalf("failed to seed translation: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/api/translations", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.GetTranslations(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected HTTP 200 OK, got %d", rec.Code)
		}

		var translations []map[string]interface{}
		if err := json.NewDecoder(rec.Body).Decode(&translations); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(translations) != 1 {
			t.Fatalf("expected 1 translation in catalog, got %d", len(translations))
		}

		// installed should be false (not linked yet)
		if installed, ok := translations[0]["installed"].(bool); !ok || installed {
			t.Errorf("expected installed=false for unlinked translation, got %v", translations[0]["installed"])
		}
	})

	t.Run("GET /api/translations returns 500 on database failure", func(t *testing.T) {
		connErr, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		repoErr := db.NewTranslationRepository(connErr)
		handlerErr := api.NewTranslationHandler(repoErr)
		_ = connErr.Close()

		req := httptest.NewRequest(http.MethodGet, "/api/translations", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handlerErr.GetTranslations(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Errorf("expected HTTP 500 Internal Server Error, got %d", rec.Code)
		}
	})

	t.Run("POST /api/translations/link returns 200 OK when linking a valid global translation", func(t *testing.T) {
		conn, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		defer func() { _ = conn.Close() }()

		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		userID := "test-user"
		_, _ = conn.Exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", userID, "test@example.com", "hash")
		if err := repo.Create(models.Translation{ID: "fin-1992", Name: "Finnish 1992", Language: "fi", Format: "text"}); err != nil {
			t.Fatalf("failed to seed translation: %v", err)
		}

		body, _ := json.Marshal(map[string]string{"translationId": "fin-1992"})
		req := httptest.NewRequest(http.MethodPost, "/api/translations/link", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.LinkTranslation(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected HTTP 200 OK, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("POST /api/translations/link returns 400 when translationId not found", func(t *testing.T) {
		conn, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		defer func() { _ = conn.Close() }()

		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		userID := "test-user"
		_, _ = conn.Exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", userID, "test@example.com", "hash")

		body, _ := json.Marshal(map[string]string{"translationId": "does-not-exist"})
		req := httptest.NewRequest(http.MethodPost, "/api/translations/link", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.LinkTranslation(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected HTTP 400 Bad Request for nonexistent translation, got %d", rec.Code)
		}
	})

	t.Run("DELETE /api/translations/link returns 204 No Content on successful unlink", func(t *testing.T) {
		conn, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		defer func() { _ = conn.Close() }()

		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)
		ctx := context.Background()

		userID := "test-user"
		_, _ = conn.Exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", userID, "test@example.com", "hash")
		if err := repo.Create(models.Translation{ID: "kjv", Name: "King James Version", Language: "en", Format: "text"}); err != nil {
			t.Fatalf("failed to seed translation: %v", err)
		}
		if err := repo.LinkUser(ctx, userID, "kjv"); err != nil {
			t.Fatalf("failed to pre-link translation: %v", err)
		}

		body, _ := json.Marshal(map[string]string{"translationId": "kjv"})
		req := httptest.NewRequest(http.MethodDelete, "/api/translations/link", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		reqCtx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(reqCtx)
		rec := httptest.NewRecorder()

		handler.UnlinkTranslation(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Errorf("expected HTTP 204 No Content, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("POST /api/translations/link returns 400 on empty translationId", func(t *testing.T) {
		conn, _ := db.InitializeDB(":memory:")
		defer func() { _ = conn.Close() }()
		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		body, _ := json.Marshal(map[string]string{"translationId": ""})
		req := httptest.NewRequest(http.MethodPost, "/api/translations/link", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.LinkTranslation(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected HTTP 400 Bad Request, got %d", rec.Code)
		}
	})

	t.Run("GET /api/translations returns 200 with global translations in guest mode", func(t *testing.T) {
		conn, _ := db.InitializeDB(":memory:")
		defer func() { _ = conn.Close() }()
		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		req := httptest.NewRequest(http.MethodGet, "/api/translations", nil)
		rec := httptest.NewRecorder()
		handler.GetTranslations(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK for guest access, got %d", rec.Code)
		}
	})

	t.Run("POST /api/translations/link returns 401 when unauthorized", func(t *testing.T) {
		conn, _ := db.InitializeDB(":memory:")
		defer func() { _ = conn.Close() }()
		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		req := httptest.NewRequest(http.MethodPost, "/api/translations/link", nil)
		rec := httptest.NewRecorder()
		handler.LinkTranslation(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("DELETE /api/translations/link returns 401 when unauthorized", func(t *testing.T) {
		conn, _ := db.InitializeDB(":memory:")
		defer func() { _ = conn.Close() }()
		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		req := httptest.NewRequest(http.MethodDelete, "/api/translations/link", nil)
		rec := httptest.NewRecorder()
		handler.UnlinkTranslation(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("DELETE /api/translations/link returns 400 on empty translationId", func(t *testing.T) {
		conn, _ := db.InitializeDB(":memory:")
		defer func() { _ = conn.Close() }()
		repo := db.NewTranslationRepository(conn)
		handler := api.NewTranslationHandler(repo)

		body, _ := json.Marshal(map[string]string{"translationId": ""})
		req := httptest.NewRequest(http.MethodDelete, "/api/translations/link", bytes.NewReader(body))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.UnlinkTranslation(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})
}

