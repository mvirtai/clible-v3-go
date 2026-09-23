package services

import (
	"os"
	"testing"
	"time"
)

func TestLiturgicalService_InMemory(t *testing.T) {
	sampleJSON := `[
		{
			"date": "20.9.2026",
			"iso_date": "2026-09-20",
			"day_of_week": "sunnuntai",
			"day_title": "Sunnuntai 20.9.2026",
			"title": "17. sunnuntai helluntaista",
			"subtitle": "Jeesus antaa elämän",
			"color": "vihreä",
			"candles": "Kaksi alttarikynttilää",
			"current_volume": "volume-2",
			"day_psalm": {
				"verse": "Ps. 22:24–32",
				"text": "Ylistäkää Jumalaa"
			},
			"prayer_offices": {
				"morning": [{"verse": "Ps. 118:19–29", "text": "Avatkaa minulle"}]
			},
			"hymns": [
				{
					"group": "Päivän virsiä",
					"hymns": [{"number": "242", "name": "Jo vaietkoon", "url": "https://virsikirja.fi/242"}]
				}
			]
		},
		{
			"date": "21.9.2026",
			"iso_date": "2026-09-21",
			"day_of_week": "maanantai",
			"day_title": "Maanantai 21.9.2026",
			"title": "17. sunnuntai helluntaista",
			"color": "vihreä",
			"prayer_offices": {
				"morning": [{"verse": "Room. 6:15–23", "text": "Kasteessa"}]
			}
		}
	]`

	svc, err := NewLiturgicalServiceFromBytes([]byte(sampleJSON))
	if err != nil {
		t.Fatalf("failed to create LiturgicalService: %v", err)
	}

	if count := svc.Count(); count != 2 {
		t.Errorf("expected 2 days, got %d", count)
	}

	// Lookup by ISO
	d1, ok := svc.GetByDate("2026-09-20")
	if !ok {
		t.Fatalf("expected to find 2026-09-20")
	}
	if d1.Title != "17. sunnuntai helluntaista" {
		t.Errorf("expected title '17. sunnuntai helluntaista', got %q", d1.Title)
	}
	if d1.Color != "vihreä" {
		t.Errorf("expected color 'vihreä', got %q", d1.Color)
	}
	if d1.DayPsalm == nil || d1.DayPsalm.Verse != "Ps. 22:24–32" {
		t.Errorf("expected day psalm Ps. 22:24–32, got %v", d1.DayPsalm)
	}
	if len(d1.PrayerOffices.Morning) != 1 {
		t.Errorf("expected 1 morning prayer text, got %d", len(d1.PrayerOffices.Morning))
	}
	if len(d1.Hymns) != 1 || len(d1.Hymns[0].Hymns) != 1 {
		t.Errorf("expected 1 hymn group with 1 hymn, got %v", d1.Hymns)
	}

	// Lookup by FI format
	d2, ok := svc.GetByDate("21.9.2026")
	if !ok {
		t.Fatalf("expected to find 21.9.2026")
	}
	if d2.DayOfWeek != "maanantai" {
		t.Errorf("expected day of week 'maanantai', got %q", d2.DayOfWeek)
	}

	// Lookup with leading zero FI format: "04.10.2026" should match "4.10.2026"
	d3, ok := svc.GetByDate("20.09.2026")
	if !ok {
		t.Errorf("expected normalized lookup for 20.09.2026 to succeed")
	} else if d3.ISODate != "2026-09-20" {
		t.Errorf("expected 2026-09-20, got %s", d3.ISODate)
	}

	// Not found
	_, ok = svc.GetByDate("2026-01-01")
	if ok {
		t.Errorf("expected 2026-01-01 not to be found")
	}

	// GetMonth
	monthDays := svc.GetMonth(2026, 9)
	if len(monthDays) != 2 {
		t.Errorf("expected 2 days in month 9, got %d", len(monthDays))
	}

	// Today
	now := time.Date(2026, 9, 20, 10, 0, 0, 0, time.UTC)
	today, ok := svc.GetToday(now)
	if !ok || today.ISODate != "2026-09-20" {
		t.Errorf("GetToday failed, got %v, %v", today, ok)
	}
}

func TestLiturgicalService_ActualFile(t *testing.T) {
	// Check relative paths from backend folder
	possiblePaths := []string{
		"../parsers/data/kirkkovuosi_2026.json",
		"internal/parsers/data/kirkkovuosi_2026.json",
		"../../internal/parsers/data/kirkkovuosi_2026.json",
	}

	var foundPath string
	for _, p := range possiblePaths {
		if _, err := os.Stat(p); err == nil {
			foundPath = p
			break
		}
	}

	if foundPath == "" {
		t.Skip("kirkkovuosi_2026.json not found in test environment, skipping file load test")
	}

	svc, err := NewLiturgicalService(foundPath)
	if err != nil {
		t.Fatalf("failed to load actual file: %v", err)
	}

	if count := svc.Count(); count != 365 {
		t.Errorf("expected 365 days, got %d", count)
	}

	// Test Christmas
	christmas, ok := svc.GetByDate("2026-12-24")
	if !ok {
		t.Fatalf("Christmas eve 2026-12-24 not found")
	}
	if christmas.Title != "Jouluaatto" {
		t.Errorf("expected title 'Jouluaatto', got %q", christmas.Title)
	}
	if christmas.Color != "valkoinen" {
		t.Errorf("expected color 'valkoinen', got %q", christmas.Color)
	}
	if christmas.Image == "" {
		t.Errorf("expected Christmas eve image to be present")
	}
}
