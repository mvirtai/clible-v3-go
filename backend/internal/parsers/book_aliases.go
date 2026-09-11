package parsers

import (
	_ "embed"
	"encoding/json"
	"strings"
)

//go:embed data/book_names.json
var bookNamesJSON []byte

// bookEntry mirrors the JSON structure of a single book entry in book_names.json.
type bookEntry struct {
	En       string   `json:"en"`
	Fi       string   `json:"fi"`
	AliasesFi []string `json:"aliases_fi"`
	AbbrFi   string   `json:"abbr_fi"`
}

// bookAliasMap maps a normalized alias key -> canonical book_id (e.g. "joh" -> "JHN").
// Built once at startup from the embedded book_names.json.
var bookAliasMap map[string]string

func init() {
	bookAliasMap = buildAliasMap(bookNamesJSON)
}

// buildAliasMap parses the book_names JSON and constructs the alias lookup table.
// Exported for testability; production code uses the package-level bookAliasMap.
func buildAliasMap(data []byte) map[string]string {
	var books map[string]bookEntry
	if err := json.Unmarshal(data, &books); err != nil {
		// Panic at startup: the embedded file is malformed — this is a programmer error.
		panic("parsers: failed to parse embedded book_names.json: " + err.Error())
	}

	m := make(map[string]string, len(books)*8)
	for id, entry := range books {
		canonical := id // e.g. "GEN", "JHN", "1CO"

		// Register the canonical ID itself (case-insensitive)
		register(m, canonical, canonical)

		// Also register with spaces collapsed so "1moos" matches "1 moos", "1kor" matches "1 kor", etc.
		registerCollapsed(m, canonical, canonical)

		// Register the English full name (e.g. "genesis", "john")
		register(m, entry.En, canonical)

		// Register the Finnish full name (e.g. "1 mooseksen kirja")
		register(m, entry.Fi, canonical)

		// Register the Finnish abbreviation
		register(m, entry.AbbrFi, canonical)
		registerCollapsed(m, entry.AbbrFi, canonical)

		// Register all Finnish aliases
		for _, alias := range entry.AliasesFi {
			register(m, alias, canonical)
			registerCollapsed(m, alias, canonical)
		}
	}
	return m
}

// register normalizes the key and adds it to the map.
// Silently skips empty keys. Does not overwrite existing entries to preserve
// the first-registered mapping in case of unlikely collisions.
func register(m map[string]string, raw, canonical string) {
	key := normalizeBookKey(raw)
	if key == "" {
		return
	}
	if _, exists := m[key]; !exists {
		m[key] = canonical
	}
}

// registerCollapsed registers a space-collapsed variant of the alias so that
// "1 moos" also registers "1moos", enabling input without spaces to resolve correctly.
func registerCollapsed(m map[string]string, raw, canonical string) {
	key := normalizeBookKey(raw)
	collapsed := strings.ReplaceAll(key, " ", "")
	if collapsed == "" || collapsed == key {
		return // no spaces to collapse, already registered by register()
	}
	if _, exists := m[collapsed]; !exists {
		m[collapsed] = canonical
	}
}

// normalizeBookKey produces a canonical lookup key from a raw book name string.
// Rules:
//   - Lowercase
//   - Replace all dots with spaces (handles "1." → "1 ", "Joh." → "Joh ")
//   - Collapse and trim whitespace
//
// Examples:
//
//	"GEN."     → "gen"
//	"1. Moos"  → "1 moos"
//	"Joh."     → "joh"
//	"1.moos"   → "1 moos"
func normalizeBookKey(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, ".", " ")
	s = strings.Join(strings.Fields(s), " ")
	return s
}

// ResolveBookID looks up a raw book name string in the alias map and returns the
// canonical book_id (e.g. "GEN", "JHN"). Returns the uppercased input unchanged
// if no alias match is found, preserving backward compatibility.
func ResolveBookID(raw string) string {
	key := normalizeBookKey(raw)
	if canonical, ok := bookAliasMap[key]; ok {
		return canonical
	}
	// Fallback: uppercase the raw input as-is (supports direct ID input like "gen" → "GEN")
	return strings.ToUpper(strings.TrimSpace(raw))
}

// CanonicalBookIDs defines the canonical 66-book order of the Protestant canon.
var CanonicalBookIDs = []string{
	// Old Testament (39)
	"GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
	"1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
	"ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
	"OBD", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
	// New Testament (27)
	"MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH",
	"PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS",
	"1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
}

var bookOrderIndex map[string]int

func initBookOrder() {
	bookOrderIndex = make(map[string]int, len(CanonicalBookIDs))
	for i, id := range CanonicalBookIDs {
		bookOrderIndex[id] = i
	}
}

func init() {
	initBookOrder()
}

// GetBookSpan returns an inclusive slice of canonical book IDs between startBook and endBook
// according to canonical order. If both books cannot be found in canonical order or if
// start is after end, it returns a slice containing just start and end (if different).
func GetBookSpan(startRaw, endRaw string) []string {
	startID := ResolveBookID(startRaw)
	endID := ResolveBookID(endRaw)

	idxStart, okStart := bookOrderIndex[startID]
	idxEnd, okEnd := bookOrderIndex[endID]

	if !okStart || !okEnd || idxStart > idxEnd {
		if startID == endID {
			return []string{startID}
		}
		return []string{startID, endID}
	}

	span := make([]string, 0, idxEnd-idxStart+1)
	for i := idxStart; i <= idxEnd; i++ {
		span = append(span, CanonicalBookIDs[i])
	}
	return span
}

