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
