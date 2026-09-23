package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func setupTestLiturgicalHandler(t *testing.T) *LiturgicalHandler {
	t.Helper()
	sampleJSON := `[
		{
			"date": "20.9.2026",
			"iso_date": "2026-09-20",
			"day_of_week": "sunnuntai",
			"title": "17. sunnuntai helluntaista",
			"color": "vihreä"
		},
		{
			"date": "21.9.2026",
			"iso_date": "2026-09-21",
			"day_of_week": "maanantai",
			"title": "17. sunnuntai helluntaista",
			"color": "vihreä"
		}
	]`

	svc, err := services.NewLiturgicalServiceFromBytes([]byte(sampleJSON))
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}

	return NewLiturgicalHandler(svc)
}

func TestLiturgicalHandler_GetDay(t *testing.T) {
	h := setupTestLiturgicalHandler(t)

	// Valid date query
	req := httptest.NewRequest(http.MethodGet, "/api/liturgical/day?date=2026-09-20", nil)
	rec := httptest.NewRecorder()

	h.GetDay(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", rec.Code)
	}

	var day models.LiturgicalDay
	if err := json.NewDecoder(rec.Body).Decode(&day); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if day.Title != "17. sunnuntai helluntaista" {
		t.Errorf("expected title '17. sunnuntai helluntaista', got %q", day.Title)
	}

	// Not found date query
	reqNotFound := httptest.NewRequest(http.MethodGet, "/api/liturgical/day?date=2026-01-01", nil)
	recNotFound := httptest.NewRecorder()

	h.GetDay(recNotFound, reqNotFound)

	if recNotFound.Code != http.StatusNotFound {
		t.Fatalf("expected HTTP 404, got %d", recNotFound.Code)
	}
}

func TestLiturgicalHandler_GetMonth(t *testing.T) {
	h := setupTestLiturgicalHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/api/liturgical/month?year=2026&month=9", nil)
	rec := httptest.NewRecorder()

	h.GetMonth(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", rec.Code)
	}

	var days []models.LiturgicalDay
	if err := json.NewDecoder(rec.Body).Decode(&days); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(days) != 2 {
		t.Errorf("expected 2 days, got %d", len(days))
	}
}
