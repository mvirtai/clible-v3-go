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
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestDSLHandler_EvalDSL(t *testing.T) {
	conn := setupHandlerTestDB(t)
	defer func() { _ = conn.Close() }()

	_, _ = conn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = conn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('JHN', 'John', 'NT', 43, 21)`)

	userID := "test-user-dsl"
	seedHandlerTestUser(t, conn, userID)
	_, _ = conn.Exec(`INSERT INTO user_translations (user_id, translation_id) VALUES (?, ?)`, userID, "web")

	verseRepo := db.NewVerseRepository(conn)
	translationRepo := db.NewTranslationRepository(conn)

	ctx := context.Background()
	verses := []models.Verse{
		{
			ID:            "web:JHN:3:16",
			TranslationID: "web",
			BookID:        "JHN",
			Chapter:       3,
			Verse:         16,
			Text:          "For God so loved the world, that he gave his only Son.",
		},
	}
	_ = verseRepo.BulkInsert(ctx, verses)

	verseService := services.NewVerseService(verseRepo, translationRepo)
	cliService := services.NewCLIService(verseRepo, verseService)
	handler := api.NewDSLHandler(cliService)

	t.Run("Method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/dsl/eval", nil)
		rr := httptest.NewRecorder()

		handler.EvalDSL(rr, req)

		if rr.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", rr.Code)
		}
	})

	t.Run("Unauthorized if no user in context", func(t *testing.T) {
		reqBody, _ := json.Marshal(api.DSLEvalRequest{Query: "@Joh 3:16"})
		req := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(reqBody))
		rr := httptest.NewRecorder()

		handler.EvalDSL(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rr.Code)
		}
	})

	t.Run("Bad request on empty query", func(t *testing.T) {
		reqBody, _ := json.Marshal(api.DSLEvalRequest{Query: ""})
		req := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(reqBody))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		handler.EvalDSL(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", rr.Code)
		}
	})

	t.Run("Bad request on invalid json body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBufferString("{invalid-json"))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		handler.EvalDSL(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", rr.Code)
		}
	})

	t.Run("Success evaluation of DSL query", func(t *testing.T) {
		reqBody, _ := json.Marshal(api.DSLEvalRequest{
			Query:         "@Joh 3:16",
			TranslationID: "web",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(reqBody))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		handler.EvalDSL(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
		}

		var res models.CLIResult
		if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if res.Type != "read" {
			t.Errorf("expected result type 'read', got %q", res.Type)
		}

		versesList, ok := res.Data["verses"].([]interface{})
		if !ok || len(versesList) != 1 {
			t.Errorf("expected 1 verse in data, got %v", res.Data["verses"])
		}
	})
}
