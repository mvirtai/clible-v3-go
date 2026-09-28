package services

import (
	"testing"
)

func TestLemmatizeFI_BiblicalKeywords(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		// Jeesus
		{"Jeesus", "Jeesus"},
		{"Jeesuksen", "Jeesus"},
		{"Jeesusta", "Jeesus"},
		{"Jeesukselle", "Jeesus"},
		{"Jeesuksessa", "Jeesus"},
		{"jeesuksesta", "Jeesus"},

		// Herra
		{"Herra", "Herra"},
		{"Herran", "Herra"},
		{"Herraa", "Herra"},
		{"Herralle", "Herra"},
		{"Herrasta", "Herra"},
		{"Herrassa", "Herra"},

		// Jumala
		{"Jumala", "Jumala"},
		{"Jumalan", "Jumala"},
		{"Jumalaa", "Jumala"},
		{"Jumalalle", "Jumala"},
		{"Jumalasta", "Jumala"},
		{"Jumalassa", "Jumala"},

		// Kuningas
		{"kuningas", "kuningas"},
		{"kuninkaan", "kuningas"},
		{"kuningasta", "kuningas"},
		{"kuninkaalle", "kuningas"},
		{"kuninkaat", "kuningas"},

		// Opetuslapset & lapset
		{"lapsi", "lapsi"},
		{"lapsen", "lapsi"},
		{"lasta", "lapsi"},
		{"lapset", "lapsi"},
		{"lasten", "lapsi"},
		{"lapsille", "lapsi"},
		{"opetuslapsi", "opetuslapsi"},
		{"opetuslapset", "opetuslapsi"},
		{"opetuslasten", "opetuslapsi"},
		{"opetuslapsille", "opetuslapsi"},

		// Teologiset käsitteet
		{"armo", "armo"},
		{"armon", "armo"},
		{"armossa", "armo"},
		{"armosta", "armo"},
		{"totuus", "totuus"},
		{"totuuden", "totuus"},
		{"totuutta", "totuus"},
		{"rakkaus", "rakkaus"},
		{"rakkauden", "rakkaus"},
		{"rakkaudessa", "rakkaus"},
		{"rakkaudesta", "rakkaus"},
		{"sydän", "sydän"},
		{"sydämen", "sydän"},
		{"sydämestä", "sydän"},
		{"taivas", "taivas"},
		{"taivaan", "taivas"},
		{"taivaassa", "taivas"},
		{"veri", "veri"},
		{"veren", "veri"},
		{"veressä", "veri"},
		{"verensä", "veri"},
	}

	for _, tt := range tests {
		actual := LemmatizeFI(tt.input)
		if actual != tt.expected {
			t.Errorf("LemmatizeFI(%q) = %q, expected %q", tt.input, actual, tt.expected)
		}
	}
}

func TestLemmatizeFI_GeneralMorphology(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"talossa", "talo"},
		{"talosta", "talo"},
		{"talolle", "talo"},
		{"kirjakin", "kirja"},
		{"kaupungissa", "kaupunki"}, // stemmer or prefix
		// Possessives & clitics
		{"taloni", "talo"},
		{"talomme", "talo"},
		{"talonne", "talo"},
		{"talonsa", "talo"},
		{"talosi", "talo"},
		{"talossakin", "talo"},
		{"kirjahan", "kirja"},
		{"onpa", "on"},
		{"onko", "on"},
		// Cases & plural forms
		{"vuorilta", "vuori"},
		{"kirkkoon", "kirkko"},
		{"puutarhaan", "puutarha"},
		{"valkeudeksi", "valkeus"},
		{"pimeydeksi", "pimeys"},
		// Trimming boundary checks
		{"", ""},
		{"a", "a"},
		{"tie", "tie"},
	}

	for _, tt := range tests {
		actual := LemmatizeFI(tt.input)
		if tt.input == "" && actual != "" {
			t.Errorf("LemmatizeFI(%q) expected empty string, got %q", tt.input, actual)
		} else if tt.input != "" && actual == "" {
			t.Errorf("LemmatizeFI(%q) returned empty string", tt.input)
		}
	}
}
