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

func TestScopeHandler_CreateScope_InvalidJSON(t *testing.T) {
	// Rikkinäisen JSON-syötteen pitäisi palauttaa Bad Request ennen palvelukutsua
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/scopes", bytes.NewBufferString("{invalid-json"))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.CreateScope(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_RenameScope_InvalidJSON(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPut, "/api/scopes", bytes.NewBufferString("{invalid-json"))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.RenameScope(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_DeleteSearch_MissingID(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/scopes/saved-searches?id=", nil)
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.DeleteSearch(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_RenameSearch_InvalidJSON(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPut, "/api/scopes/saved-searches", bytes.NewBufferString("{invalid-json"))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.RenameSearch(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_DeleteAnalysis_MissingID(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/scopes/saved-analyses?id=", nil)
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.DeleteAnalysis(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_RenameAnalysis_InvalidJSON(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPut, "/api/scopes/saved-analyses", bytes.NewBufferString("{invalid-json"))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.RenameAnalysis(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_Unauthorized_Endpoints(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	endpoints := []struct {
		name   string
		method string
		target string
		call   func(w http.ResponseWriter, r *http.Request)
	}{
		{"CreateScope", http.MethodPost, "/api/scopes", handler.CreateScope},
		{"GetScopes", http.MethodGet, "/api/scopes", handler.GetScopes},
		{"DeleteScope", http.MethodDelete, "/api/scopes?id=123", handler.DeleteScope},
		{"GetScopeWorkspace", http.MethodGet, "/api/scopes/workspace?id=123", handler.GetScopeWorkspace},
		{"RenameScope", http.MethodPut, "/api/scopes", handler.RenameScope},
		{"DeleteSearch", http.MethodDelete, "/api/scopes/saved-searches?id=123", handler.DeleteSearch},
		{"RenameSearch", http.MethodPut, "/api/scopes/saved-searches", handler.RenameSearch},
		{"DeleteAnalysis", http.MethodDelete, "/api/scopes/saved-analyses?id=123", handler.DeleteAnalysis},
		{"RenameAnalysis", http.MethodPut, "/api/scopes/saved-analyses", handler.RenameAnalysis},
	}

	for _, tt := range endpoints {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.target, nil)
			rr := httptest.NewRecorder()
			tt.call(rr, req)

			if rr.Code != http.StatusUnauthorized {
				t.Errorf("%s: expected status code %d, got %d", tt.name, http.StatusUnauthorized, rr.Code)
			}
		})
	}
}

func TestScopeHandler_MissingID_Endpoints(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	endpoints := []struct {
		name   string
		method string
		target string
		call   func(w http.ResponseWriter, r *http.Request)
	}{
		{"DeleteScope", http.MethodDelete, "/api/scopes", handler.DeleteScope},
		{"GetScopeWorkspace", http.MethodGet, "/api/scopes/workspace", handler.GetScopeWorkspace},
	}

	for _, tt := range endpoints {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.target, nil)
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			tt.call(rr, req)

			if rr.Code != http.StatusBadRequest {
				t.Errorf("%s: expected status code %d, got %d", tt.name, http.StatusBadRequest, rr.Code)
			}
		})
	}
}

func TestScopeHandler_SaveSearch_InvalidJSON(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-searches", bytes.NewBufferString("{invalid-json"))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.SaveSearch(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_SaveAnalysis_InvalidJSON(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-analyses", bytes.NewBufferString("{invalid-json"))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.SaveAnalysis(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestScopeHandler_SaveSearch_Success_NewAndExisting(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize db: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()
	_, _ = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ('test-user-id', 'user@example.com', 'hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO scopes (id, name, user_id, created_at) VALUES ('scope-1', 'Test Scope', 'test-user-id', CURRENT_TIMESTAMP)`)

	scopeRepo := db.NewScopeRepository(conn)
	savedRepo := db.NewSavedRepository(conn)
	notebookRepo := db.NewNotebookRepository(conn)
	scopeService := services.NewScopeService(scopeRepo, savedRepo, notebookRepo)
	handler := api.NewScopeHandler(scopeService)

	// 1. Create a fresh saved search without ID
	createPayload := map[string]interface{}{
		"scopeId":       "scope-1",
		"name":          "Faith Search",
		"queryText":     "faith",
		"searchScope":   "nt",
		"scopeValue":    "",
		"translationId": "web",
		"resultJson":    `{"verses":[{"id":"v1"}]}`,
	}
	body, _ := json.Marshal(createPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-searches", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id"))
	rr := httptest.NewRecorder()

	handler.SaveSearch(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, rr.Code, rr.Body.String())
	}

	var created models.SavedSearch
	if err := json.Unmarshal(rr.Body.Bytes(), &created); err != nil {
		t.Fatalf("failed to parse created response: %v", err)
	}
	if created.ID == "" {
		t.Errorf("expected generated ID, got empty string")
	}
	if created.Name != "Faith Search" {
		t.Errorf("expected name Faith Search, got %s", created.Name)
	}

	// 2. Update the existing saved search with the same ID
	updatePayload := map[string]interface{}{
		"id":            created.ID,
		"scopeId":       "scope-1",
		"name":          "Faith Search Curated",
		"queryText":     "faith",
		"searchScope":   "nt",
		"scopeValue":    "",
		"translationId": "web",
		"resultJson":    `{"verses":[{"id":"v1","curated":true}]}`,
	}
	updateBody, _ := json.Marshal(updatePayload)
	updateReq := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-searches", bytes.NewReader(updateBody))
	updateReq = updateReq.WithContext(context.WithValue(updateReq.Context(), middleware.UserIDKey, "test-user-id"))
	updateRR := httptest.NewRecorder()

	handler.SaveSearch(updateRR, updateReq)
	if updateRR.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, updateRR.Code, updateRR.Body.String())
	}

	var updated models.SavedSearch
	if err := json.Unmarshal(updateRR.Body.Bytes(), &updated); err != nil {
		t.Fatalf("failed to parse updated response: %v", err)
	}
	if updated.ID != created.ID {
		t.Errorf("expected same ID %s, got %s", created.ID, updated.ID)
	}
	// 3. Attacker attempts to overwrite the victim's saved search with the same ID
	attackerPayload := map[string]interface{}{
		"id":            created.ID,
		"scopeId":       "scope-1",
		"name":          "Hacked Title",
		"queryText":     "hacked",
		"searchScope":   "nt",
		"scopeValue":    "",
		"translationId": "web",
		"resultJson":    `{"verses":[]}`,
	}
	attackerBody, _ := json.Marshal(attackerPayload)
	attackerReq := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-searches", bytes.NewReader(attackerBody))
	attackerReq = attackerReq.WithContext(context.WithValue(attackerReq.Context(), middleware.UserIDKey, "attacker-user-id"))
	attackerRR := httptest.NewRecorder()

	handler.SaveSearch(attackerRR, attackerReq)
	if attackerRR.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 Forbidden on cross-user overwrite attempt, got %d", attackerRR.Code)
	}

	// Verify original record is intact
	searches, _ := savedRepo.GetSearchesByScope(ctx, "scope-1")
	if len(searches) != 1 || searches[0].Name != "Faith Search Curated" {
		t.Errorf("saved search was corrupted by cross-user request: %+v", searches)
	}
}

func TestScopeHandler_SaveSearch_Unauthorized(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-searches", bytes.NewBufferString("{}"))
	rr := httptest.NewRecorder()

	handler.SaveSearch(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestScopeHandler_SaveAnalysis_Unauthorized(t *testing.T) {
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/scopes/saved-analyses", bytes.NewBufferString("{}"))
	rr := httptest.NewRecorder()

	handler.SaveAnalysis(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}
