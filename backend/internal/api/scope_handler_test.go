package api_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
)

func TestScopeHandler_CreateScope_InvalidJSON(t *testing.T) {
	// Rikkinäisen JSON-syötteen pitäisi palauttaa Bad Request ennen palvelukutsua
	handler := api.NewScopeHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/scopes", bytes.NewBufferString("{invalid-json"))
	rr := httptest.NewRecorder()

	handler.CreateScope(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status code %d, got %d", http.StatusBadRequest, rr.Code)
	}
}
