package parsers

import (
	"strings"
)

var translationAliasMap = map[string]string{
	// Finnish 1992 aliases
	"kr92":                   "fin-1992",
	"kr-92":                  "fin-1992",
	"fin-1992":               "fin-1992",
	"fin1992":                "fin-1992",
	"1992":                   "fin-1992",
	"finpr":                  "fin-1992",
	"fi-1992":                "fin-1992",
	"kirkkoraamattu 1992":    "fin-1992",
	"kirkkoraamattu (1992)":  "fin-1992",

	// Finnish 1933/38 aliases
	"kr38":                   "fin-1938",
	"kr-38":                  "fin-1938",
	"kr33":                   "fin-1938",
	"kr-33":                  "fin-1938",
	"fin-1938":               "fin-1938",
	"fin1938":                "fin-1938",
	"1938":                   "fin-1938",
	"1933":                   "fin-1938",
	"fi-1938":                "fin-1938",
	"kirkkoraamattu 1938":    "fin-1938",
	"kirkkoraamattu 1933/38": "fin-1938",

	// English WEB aliases
	"web":                  "web",
	"world english bible":  "web",

	// English KJV aliases
	"kjv":                  "kjv",
	"king james":           "kjv",
	"king james version":   "kjv",

	// Ancient Greek (Tischendorf) aliases
	"grc":        "grc-tisch",
	"tisch":      "grc-tisch",
	"grc-tisch":  "grc-tisch",
	"tischendorf": "grc-tisch",
}

// normalizeTranslationKey normalizes an input string by lowercasing and trimming spaces.
func normalizeTranslationKey(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// ResolveTranslationID normalizes translation alias strings (e.g. "KR92", "kr92", "1992", "KR38", "KJV")
// into canonical translation database IDs (e.g. "fin-1992", "fin-1938", "kjv", "web").
// Returns the lowercased input unchanged if no alias match is found.
func ResolveTranslationID(raw string) string {
	if raw == "" {
		return ""
	}
	key := normalizeTranslationKey(raw)
	if canonical, ok := translationAliasMap[key]; ok {
		return canonical
	}
	return key
}
