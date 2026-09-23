package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

// LiturgicalHandler handles HTTP requests for church year liturgical days and prayer offices.
type LiturgicalHandler struct {
	service *services.LiturgicalService
}

// NewLiturgicalHandler creates a new LiturgicalHandler instance.
func NewLiturgicalHandler(service *services.LiturgicalService) *LiturgicalHandler {
	return &LiturgicalHandler{service: service}
}

// GetToday handles GET /api/liturgical/today
func (h *LiturgicalHandler) GetToday(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	day, ok := h.service.GetToday(time.Now())
	if !ok {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "liturgical day not found for today"})
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(day)
}

// GetDay handles GET /api/liturgical/day?date=YYYY-MM-DD or d.m.YYYY
func (h *LiturgicalHandler) GetDay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	dateParam := strings.TrimSpace(r.URL.Query().Get("date"))
	if dateParam == "" {
		h.GetToday(w, r)
		return
	}

	day, ok := h.service.GetByDate(dateParam)
	if !ok {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "liturgical day not found for specified date"})
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(day)
}

// GetMonth handles GET /api/liturgical/month?year=2026&month=9
func (h *LiturgicalHandler) GetMonth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	now := time.Now()
	year := now.Year()
	month := int(now.Month())

	if yStr := r.URL.Query().Get("year"); yStr != "" {
		if y, err := strconv.Atoi(yStr); err == nil && y > 1900 && y < 2200 {
			year = y
		}
	}

	if mStr := r.URL.Query().Get("month"); mStr != "" {
		if m, err := strconv.Atoi(mStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}

	days := h.service.GetMonth(year, month)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(days)
}
