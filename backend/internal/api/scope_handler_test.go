package api_test

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
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
