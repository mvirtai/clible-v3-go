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

func TestScopeHandler_EndpointsPipeline(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to boot test db instance: %v", err)
	}
	defer func() { _ = conn.Close() }() // Safe explicit errcheck coverage closure

	ctx := context.Background()
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)

	scopeRepo := db.NewScopeRepository(conn)
	savedRepo := db.NewSavedRepository(conn)
	service := services.NewScopeService(scopeRepo, savedRepo)
	handler := api.NewScopeHandler(service)

	var capturedScopeID string

	t.Run("POST /api/scopes initializes a valid workspace block", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"name": "Gospels Comparison"})
		req := httptest.NewRequest(http.MethodPost, "/api/scopes", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.CreateScope(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected HTTP 201 Created, got %d", rec.Code)
		}

		var resp map[string]interface{}
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)
		capturedScopeID = resp["id"].(string)
	})

	t.Run("GET /api/scopes retrieves active tracking array collection", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/scopes", nil)
		rec := httptest.NewRecorder()

		handler.GetScopes(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected HTTP 200 OK, got %d", rec.Code)
		}
	})

	t.Run("POST /api/scopes/saved-searches links search profiles cleanly", func(t *testing.T) {
		payload := map[string]interface{}{
			"scopeId":       capturedScopeID,
			"name":          "Kingdom searches",
			"queryText":     "kingdom of heaven",
			"searchScope":   "bible",
			"translationId": "web",
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-searches", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.SaveSearch(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected HTTP 201 Created, got %d", rec.Code)
		}
	})

	t.Run("POST /api/scopes/saved-analyses links statistics metric entries cleanly", func(t *testing.T) {
		payload := map[string]interface{}{
			"scopeId":      capturedScopeID,
			"name":         "Matthean Vocabulary",
			"reference":    "Mat 1:1",
			"analysisType": "word_cloud",
			"paramsJson":   "{}",
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-analyses", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.SaveAnalysis(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected HTTP 201 Created, got %d", rec.Code)
		}
	})

	t.Run("GET /api/scopes/workspace aggregates structural elements in one bundle", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/scopes/workspace?id="+capturedScopeID, nil)
		rec := httptest.NewRecorder()

		handler.GetScopeWorkspace(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected HTTP 200 OK, got %d", rec.Code)
		}

		var resp map[string]interface{}
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)

		searches := resp["searches"].([]interface{})
		analyses := resp["analyses"].([]interface{})

		if len(searches) != 1 || len(analyses) != 1 {
			t.Errorf("workspace aggregation yielded unexpected slice lengths: %v", resp)
		}
	})

	t.Run("DELETE /api/scopes triggers cascade wipes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/scopes?id="+capturedScopeID, nil)
		rec := httptest.NewRecorder()

		handler.DeleteScope(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected HTTP 200 OK, got %d", rec.Code)
		}
	})
}
