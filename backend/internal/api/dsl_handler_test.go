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

	t.Run("Allows unauthenticated guest evaluation", func(t *testing.T) {
		reqBody, _ := json.Marshal(api.DSLEvalRequest{
			Query:         "@Joh 3:16",
			TranslationID: "web",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(reqBody))
		rr := httptest.NewRecorder()

		handler.EvalDSL(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
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

	t.Run("Rejects request body exceeding max size", func(t *testing.T) {
		largeBody := bytes.Repeat([]byte("a"), (10<<20)+10)
		req := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(largeBody))
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

	t.Run("Success evaluation of cross-reference tilde query", func(t *testing.T) {
		reqBody, _ := json.Marshal(api.DSLEvalRequest{
			Query:         "~ @Joh 3:16",
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
		if res.Type != "refs" {
			t.Errorf("expected result type 'refs', got %q", res.Type)
		}
	})

	t.Run("Success evaluation of context words count with leading bang", func(t *testing.T) {
		reqBody, _ := json.Marshal(api.DSLEvalRequest{
			Query:         "! ^ => count(words)",
			TranslationID: "web",
			ContextText:   "Alussa loi Jumala taivaan ja maan.",
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

		if res.Type != "count" {
			t.Errorf("expected result type 'count', got %q", res.Type)
		}
		if res.Data["target_type"] != "context" {
			t.Errorf("expected target_type 'context', got %v", res.Data["target_type"])
		}
		if res.Data["count"] != float64(6) {
			t.Errorf("expected count 6 words, got %v", res.Data["count"])
		}
	})

	t.Run("Success evaluation of ISLA v2 output operator metadata", func(t *testing.T) {
		reqBody, _ := json.Marshal(api.DSLEvalRequest{
			Query:         "! @(JHN 3:16) >> #armo-maara",
			TranslationID: "web",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(reqBody))
		rr := httptest.NewRecorder()

		handler.EvalDSL(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
		}

		var res models.CLIResult
		if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		outputOp, ok := res.Data["output_op"].(map[string]interface{})
		if !ok {
			t.Fatalf("expected output_op metadata in response data, got %v", res.Data)
		}
		if outputOp["kind"] != "cell_below" {
			t.Errorf("expected output_op kind 'cell_below', got %v", outputOp["kind"])
		}
		if outputOp["name"] != "#armo-maara" {
			t.Errorf("expected output_op name '#armo-maara', got %v", outputOp["name"])
		}
	})

	t.Run("Success evaluation of variable assignment, cross-cell resolution, and inline execution", func(t *testing.T) {
		// Step 1: Evaluate inline assignment: ! @(JHN 3:16) => #joh316
		assignReqBody, _ := json.Marshal(api.DSLEvalRequest{
			Query:         "! @(JHN 3:16) => #joh316",
			TranslationID: "web",
		})
		assignReq := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(assignReqBody))
		assignRR := httptest.NewRecorder()

		handler.EvalDSL(assignRR, assignReq)

		if assignRR.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", assignRR.Code, assignRR.Body.String())
		}

		var assignRes models.CLIResult
		if err := json.NewDecoder(assignRR.Body).Decode(&assignRes); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		outputOp, ok := assignRes.Data["output_op"].(map[string]interface{})
		if !ok {
			t.Fatalf("expected output_op in response data, got %v", assignRes.Data)
		}
		if outputOp["kind"] != "inline" {
			t.Errorf("expected output_op kind 'inline', got %v", outputOp["kind"])
		}
		if outputOp["name"] != "#joh316" {
			t.Errorf("expected output_op name '#joh316', got %v", outputOp["name"])
		}

		// Step 2: Cross-cell evaluation referencing #joh316 in subsequent cell
		downstreamReqBody, _ := json.Marshal(api.DSLEvalRequest{
			Query:         "! #joh316.count(words) =>",
			TranslationID: "web",
			Variables: map[string]*models.CLIResult{
				"joh316": &assignRes,
			},
		})
		downstreamReq := httptest.NewRequest(http.MethodPost, "/api/dsl/eval", bytes.NewBuffer(downstreamReqBody))
		downstreamRR := httptest.NewRecorder()

		handler.EvalDSL(downstreamRR, downstreamReq)

		if downstreamRR.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", downstreamRR.Code, downstreamRR.Body.String())
		}

		var downstreamRes models.CLIResult
		if err := json.NewDecoder(downstreamRR.Body).Decode(&downstreamRes); err != nil {
			t.Fatalf("failed to decode downstream response: %v", err)
		}

		if downstreamRes.Type != "count" {
			t.Errorf("expected downstream result type 'count', got %q", downstreamRes.Type)
		}
		if countVal, ok := downstreamRes.Data["count"].(float64); !ok || countVal <= 0 {
			t.Errorf("expected positive count value, got %v", downstreamRes.Data["count"])
		}
	})
}
