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

func TestAnalyticsHandler_Endpoints(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()
	if _, err = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('web', 'World English Bible', 'en', 'text')`); err != nil {
		t.Fatalf("failed to seed web translation: %v", err)
	}
	if _, err = conn.ExecContext(ctx, `INSERT INTO books (id, name, testament, position, chapters) VALUES ('Joh', 'John', 'NT', 4, 21)`); err != nil {
		t.Fatalf("failed to seed Joh book: %v", err)
	}
	if _, err = conn.ExecContext(ctx, `INSERT INTO users (id, email, password_hash) VALUES ('test-user-id', 'test@example.com', 'hash')`); err != nil {
		t.Fatalf("failed to seed test user: %v", err)
	}

	verseRepo := db.NewVerseRepository(conn)
	verses := []models.Verse{
		{ID: "web:Joh:3:16", TranslationID: "web", BookID: "Joh", Chapter: 3, Verse: 16, Text: "For God so loved the world"},
	}
	_ = verseRepo.BulkInsert(ctx, verses)

	// Link 'web' translation to the test user so it is accessible
	translationRepo := db.NewTranslationRepository(conn)
	if err := translationRepo.LinkUser(ctx, "test-user-id", "web"); err != nil {
		t.Fatalf("failed to link web translation to test user: %v", err)
	}

	// Build the real core analytics engine instance
	analyticService, err := services.NewAnalyticService(verseRepo, false, "en")
	if err != nil {
		t.Fatalf("failed to initialize analytic service: %v", err)
	}

	// Build verse lookup service required to resolve references during HTTP calls
	verseService := services.NewVerseService(verseRepo, translationRepo)

	handler := api.NewAnalyticsHandler(analyticService, verseService)
	userID := "test-user-id"

	t.Run("POST /api/analytics/analyze calculates text parameters successfully", func(t *testing.T) {
		payload := map[string]interface{}{
			"reference":     "Joh 3:16",
			"translationId": "web",
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/analytics/analyze", bytes.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rec := httptest.NewRecorder()

		handler.Analyze(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected HTTP 200 OK, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var resp map[string]interface{}
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)

		// Assert metrics computation structure returned cleanly
		if resp["token_count"].(float64) == 0 {
			t.Error("expected non-zero token count calculation output")
		}
	})

	t.Run("POST /api/analytics/analyze returns 400 Bad Request on empty reference string", func(t *testing.T) {
		payload := map[string]string{"reference": "", "translationId": "web"}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/analytics/analyze", bytes.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rec := httptest.NewRecorder()

		handler.Analyze(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected HTTP 400 Bad Request, got %d", rec.Code)
		}
	})

	t.Run("POST /api/analytics/compare executes cross-translation similarity checks", func(t *testing.T) {
		if _, err = conn.ExecContext(ctx, `INSERT INTO translations (id, name, language, format) VALUES ('kjv', 'King James Bible', 'en', 'text')`); err != nil {
			t.Fatalf("failed to seed KJV translation: %v", err)
		}

		// Link KJV translation to the test user so it is accessible
		if err := translationRepo.LinkUser(ctx, userID, "kjv"); err != nil {
			t.Fatalf("failed to link KJV to test user: %v", err)
		}

		// Seed a comparative verse for the KJV translation alignment grid
		versesB := []models.Verse{
			{ID: "kjv:Joh:3:16", TranslationID: "kjv", BookID: "Joh", Chapter: 3, Verse: 16, Text: "For God so loved the world, that he gave his only begotten Son"},
		}
		if err := verseRepo.BulkInsert(ctx, versesB); err != nil {
			t.Fatalf("failed to seed KJV mock item: %v", err)
		}

		payload := map[string]interface{}{
			"reference":      "Joh 3:16",
			"translationId1": "web",
			"translationId2": "kjv",
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/analytics/compare", bytes.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rec := httptest.NewRecorder()

		handler.Compare(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected HTTP 200 OK, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse comparison response: %v", err)
		}

		// Assert that the reference mapping returns correctly from the underlying engine
		if resp["reference"].(string) != "Joh 3:16" {
			t.Errorf("expected reference tracking matrix to match 'Joh 3:16', got %v", resp["reference"])
		}

		// Verify summary aggregation objects are present in the wire output DTO
		summary := resp["summary"].(map[string]interface{})
		if summary["total_verses"].(float64) != 1 {
			t.Errorf("expected 1 aligned verse summary block, got %v", summary["total_verses"])
		}

		// --- LISÄTÄÄN TIEDOSTON LOPPUUN TestAnalyticsHandler_Endpoints FUNKTION SISÄLLE ---

		t.Run("POST /api/analytics/compare returns 400 Bad Request on invalid JSON structure", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/analytics/compare", bytes.NewReader([]byte("{bad-json-sequence")))
			rec := httptest.NewRecorder()

			handler.Compare(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected HTTP 400 Bad Request, got %d", rec.Code)
			}
		})

		t.Run("POST /api/analytics/compare returns 400 Bad Request on missing mandatory fields", func(t *testing.T) {
			payload := map[string]string{"reference": "", "translationId1": "web", "translationId2": "kjv"}
			body, _ := json.Marshal(payload)
			req := httptest.NewRequest(http.MethodPost, "/api/analytics/compare", bytes.NewReader(body))
			rec := httptest.NewRecorder()

			handler.Compare(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected HTTP 400 Bad Request, got %d", rec.Code)
			}
		})

		t.Run("POST /api/analytics/compare returns 400 Bad Request when verse parsing fails", func(t *testing.T) {
			// Pass an un-parsable reference sequence to force VerseService.GetVerses to throw an error
			payload := map[string]string{
				"reference":      "InvalidReferenceFormat!!!",
				"translationId1": "web",
				"translationId2": "kjv",
			}
			body, _ := json.Marshal(payload)
			req := httptest.NewRequest(http.MethodPost, "/api/analytics/compare", bytes.NewReader(body))
			rec := httptest.NewRecorder()

			handler.Compare(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected HTTP 400 Bad Request, got %d", rec.Code)
			}
		})
	})
}
