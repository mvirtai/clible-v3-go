package services

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// LiturgicalService provides fast in-memory lookups for church year liturgical days and prayer offices.
type LiturgicalService struct {
	mu        sync.RWMutex
	daysByISO map[string]*models.LiturgicalDay
	daysByFI  map[string]*models.LiturgicalDay
	allDays   []*models.LiturgicalDay
}

// NewLiturgicalService loads liturgical days from a JSON file path.
func NewLiturgicalService(dataPath string) (*LiturgicalService, error) {
	data, err := os.ReadFile(dataPath)
	if err != nil {
		return nil, fmt.Errorf("reading liturgical data failed: %w", err)
	}
	return NewLiturgicalServiceFromBytes(data)
}

// NewLiturgicalServiceFromBytes loads liturgical days from raw JSON bytes.
func NewLiturgicalServiceFromBytes(data []byte) (*LiturgicalService, error) {
	var rawDays []models.LiturgicalDay
	if err := json.Unmarshal(data, &rawDays); err != nil {
		return nil, fmt.Errorf("unmarshaling liturgical data failed: %w", err)
	}

	svc := &LiturgicalService{
		daysByISO: make(map[string]*models.LiturgicalDay, len(rawDays)),
		daysByFI:  make(map[string]*models.LiturgicalDay, len(rawDays)),
		allDays:   make([]*models.LiturgicalDay, 0, len(rawDays)),
	}

	for i := range rawDays {
		d := &rawDays[i]
		svc.allDays = append(svc.allDays, d)
		if d.ISODate != "" {
			svc.daysByISO[d.ISODate] = d
		}
		if d.Date != "" {
			svc.daysByFI[d.Date] = d
			// Support normalized leading zeroes (e.g. 04.10.2026 <-> 4.10.2026)
			normalized := normalizeFIDate(d.Date)
			if normalized != "" && normalized != d.Date {
				svc.daysByFI[normalized] = d
			}
		}
	}

	return svc, nil
}

// GetToday returns the liturgical day for the current local time.
func (s *LiturgicalService) GetToday(now time.Time) (*models.LiturgicalDay, bool) {
	iso := now.Format("2006-01-02")
	return s.GetByDate(iso)
}

// GetByDate returns the liturgical day matching either ISO ("2026-09-20") or Finnish ("20.9.2026") date format.
func (s *LiturgicalService) GetByDate(dateStr string) (*models.LiturgicalDay, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dateStr = strings.TrimSpace(dateStr)
	if d, ok := s.daysByISO[dateStr]; ok {
		return d, true
	}
	if d, ok := s.daysByFI[dateStr]; ok {
		return d, true
	}

	normalized := normalizeFIDate(dateStr)
	if normalized != "" {
		if d, ok := s.daysByFI[normalized]; ok {
			return d, true
		}
	}

	return nil, false
}

// GetMonth returns all liturgical days for a specific year and month, sorted by date.
func (s *LiturgicalService) GetMonth(year, month int) []*models.LiturgicalDay {
	s.mu.RLock()
	defer s.mu.RUnlock()

	prefix := fmt.Sprintf("%04d-%02d-", year, month)
	var result []*models.LiturgicalDay

	for iso, d := range s.daysByISO {
		if strings.HasPrefix(iso, prefix) {
			result = append(result, d)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ISODate < result[j].ISODate
	})

	return result
}

// Count returns the total number of loaded liturgical days.
func (s *LiturgicalService) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.allDays)
}

func normalizeFIDate(dateStr string) string {
	parts := strings.Split(dateStr, ".")
	if len(parts) != 3 {
		return ""
	}
	d := strings.TrimLeft(parts[0], "0")
	m := strings.TrimLeft(parts[1], "0")
	y := parts[2]
	if d == "" {
		d = "0"
	}
	if m == "" {
		m = "0"
	}
	return fmt.Sprintf("%s.%s.%s", d, m, y)
}
