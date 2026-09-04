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
		{"KR38", "fin-biblia-33-38"},
		{"kr38", "fin-biblia-33-38"},
		{"1938", "fin-biblia-33-38"},
		{"1933", "fin-biblia-33-38"},
		{"fin-1938", "fin-biblia-33-38"},
		{"fin-biblia-33-38", "fin-biblia-33-38"},
		{"1776", "fin-1776"},
		{"biblia", "fin-1776"},
		{"heb", "heb-leningrad"},
		{"heprea", "heb-leningrad"},
		{"Hebrew", "heb-leningrad"},
		{"heb-leningradu", "heb-leningrad"},
		{"WEB", "web"},
		{"web", "web"},
		{"World English Bible", "web"},
		{"KJV", "kjv"},
		{"kjv", "kjv"},
		{"King James", "kjv"},
		{"grc", "sblgnt"},
		{"GRC", "sblgnt"},
		{"greek", "sblgnt"},
		{"kreikka", "sblgnt"},
		{"sblgnt", "sblgnt"},
		{"tisch", "sblgnt"},
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
