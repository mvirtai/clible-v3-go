package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func newTestHandler(t *testing.T) *api.BibleHandler {
	t.Helper()
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	_, _ = conn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`)
	_, _ = conn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'John', 'NT', 4, 21)`)
	_, _ = conn.Exec(`INSERT INTO verses (id, translation_id, book_id, chapter, verse, text) VALUES ('web:Joh:3:16', 'web', 'Joh', 3, 16, 'For God so loved the world...')`)

	verseRepo := db.NewVerseRepository(conn)
	translationRepo := db.NewTranslationRepository(conn)
	verseSvc := services.NewVerseService(verseRepo, translationRepo)
	return api.NewBibleHandler(verseSvc)
}

func TestBibleHandler_GetVersesByReference_Success(t *testing.T) {
	handler := newTestHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/api/verses?ref=Joh+3:16&translation=web", nil)
	rr := httptest.NewRecorder()
	handler.GetVersesByReference(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var body map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	verses, ok := body["verses"].([]any)
	if !ok || len(verses) != 1 {
		t.Errorf("expected 1 verse in response, got %v", body["verses"])
	}
}

func TestBibleHandler_GetVersesByReference_MissingParams(t *testing.T) {
	handler := newTestHandler(t)

	tests := []string{
		"/api/verses",
		"/api/verses?ref=Joh+3:16",
		"/api/verses?translation=web",
	}

	for _, url := range tests {
		req := httptest.NewRequest(http.MethodGet, url, nil)
		rr := httptest.NewRecorder()
		handler.GetVersesByReference(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("url %s: expected status 400, got %d", url, rr.Code)
		}
	}
}

func TestBibleHandler_GetVersesByReference_ServiceError(t *testing.T) {
	handler := newTestHandler(t)

	// "Joh 3" parses as ScopeChapter which returns an error from VerseService
	req := httptest.NewRequest(http.MethodGet, "/api/verses?ref=Joh+3&translation=web", nil)
	rr := httptest.NewRecorder()
	handler.GetVersesByReference(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500 for unimplemented scope, got %d", rr.Code)
	}
}

func TestBibleHandler_SearchVerses_Success(t *testing.T) {
	handler := newTestHandler(t)

	// FTS match test
	req := httptest.NewRequest(http.MethodGet, "/api/search?q=loved&translation=web", nil)
	rr := httptest.NewRecorder()
	handler.SearchVerses(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var results []map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&results); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(results) != 1 {
		t.Errorf("expected 1 search result, got %d", len(results))
	}

	// Regex match test
	req = httptest.NewRequest(http.MethodGet, "/api/search?q=^For&translation=web&regex=true", nil)
	rr = httptest.NewRecorder()
	handler.SearchVerses(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	if err := json.NewDecoder(rr.Body).Decode(&results); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(results) != 1 {
		t.Errorf("expected 1 search result with regex, got %d", len(results))
	}
}

func TestBibleHandler_SearchVerses_MissingQuery(t *testing.T) {
	handler := newTestHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/api/search?translation=web", nil)
	rr := httptest.NewRecorder()
	handler.SearchVerses(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rr.Code)
	}
}

func TestBibleHandler_SearchVerses_InvalidRegexError(t *testing.T) {
	handler := newTestHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=[invalid&regex=true", nil)
	rr := httptest.NewRecorder()
	handler.SearchVerses(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500 for invalid regex query, got %d", rr.Code)
	}
}

