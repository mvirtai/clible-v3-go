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
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestHistoryHandler_Endpoints(t *testing.T) {
	// Setup an in-memory database to simulate a fully connected integration environment
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to setup mock db: %v", err)
	}
	defer conn.Close()

	ctx := context.Background()
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)

	repo := db.NewSearchHistoryRepository(conn)
	service := services.NewSearchHistoryService(repo)
	handler := api.NewHistoryHandler(service)

	t.Run("POST /api/history returns 201 on valid structured JSON payload input", func(t *testing.T) {
		payload := map[string]interface{}{
			"queryText":     "salvation",
			"searchScope":   "bible",
			"scopeValue":    "",
			"translationId": "web",
			"mode":          "phrase",
			"resultCount":   12,
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/history", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.AddSearch(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected HTTP 201 Created, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var resp map[string]string
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)
		if resp["status"] != "success" || resp["id"] == "" {
			t.Errorf("unexpected return context parameters response properties: %v", resp)
		}
	})

	t.Run("POST /api/history returns 400 Bad Request on empty queryText string criterion", func(t *testing.T) {
		payload := map[string]interface{}{"queryText": ""}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/history", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.AddSearch(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected HTTP 400 Bad Request, got %d", rec.Code)
		}
	})

	t.Run("GET /api/history returns 200 OK list tracking recent user queries collection", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/history?limit=5", nil)
		rec := httptest.NewRecorder()

		handler.GetRecentHistory(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected HTTP 200 OK, got %d", rec.Code)
		}

		var list []map[string]interface{}
		if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
			t.Fatalf("failed to decode response payload array list: %v", err)
		}

		// Should capture exactly 1 record remaining in SQLite memory from our first valid POST test run
		if len(list) != 1 {
			t.Errorf("expected exactly 1 historical log entry item, got %d", len(list))
		}

		if list[0]["queryText"] != "salvation" {
			t.Errorf("expected payload queryText string reference value to match 'salvation', got %v", list[0]["queryText"])
		}
	})
}
