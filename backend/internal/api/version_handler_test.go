package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/version"
)

func TestVersionHandler_GetVersion(t *testing.T) {
	handler := NewVersionHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/version", nil)
	rr := httptest.NewRecorder()

	handler.GetVersion(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d", rr.Code)
	}

	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}

	var res version.Info
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response JSON: %v", err)
	}

	if res.Version != version.Version {
		t.Errorf("expected version %q, got %q", version.Version, res.Version)
	}

	if res.GitCommit != version.GitCommit {
		t.Errorf("expected gitCommit %q, got %q", version.GitCommit, res.GitCommit)
	}
}
