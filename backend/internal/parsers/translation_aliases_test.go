package parsers

import (
	"testing"
)

func TestResolveTranslationID(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"KR92", "fin-1992"},
		{"kr92", "fin-1992"},
		{"1992", "fin-1992"},
		{"fin-1992", "fin-1992"},
		{"Kirkkoraamattu (1992)", "fin-1992"},
		{"KR38", "fin-1938"},
		{"kr38", "fin-1938"},
		{"1938", "fin-1938"},
		{"1933", "fin-1938"},
		{"fin-1938", "fin-1938"},
		{"WEB", "web"},
		{"web", "web"},
		{"World English Bible", "web"},
		{"KJV", "kjv"},
		{"kjv", "kjv"},
		{"King James", "kjv"},
		{"grc", "grc-tisch"},
		{"GRC", "grc-tisch"},
		{"tisch", "grc-tisch"},
		{"unknown-trans", "unknown-trans"},
		{"", ""},
	}

	for _, tt := range tests {
		got := ResolveTranslationID(tt.input)
		if got != tt.expected {
			t.Errorf("ResolveTranslationID(%q) = %q, expected %q", tt.input, got, tt.expected)
		}
	}
}
