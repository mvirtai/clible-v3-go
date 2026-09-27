package services

import (
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestIsStopWord(t *testing.T) {
	stopCases := []string{
		"ja", "tai", "mutta", "että",
		"minä", "sinä", "hän", "me", "te", "he",
		"itse", "itseämme", "itsemme", "itseään", "itseensä", "itseäni",
		"jota", "tätä", "tämän", "tästä", "tällä", "tältä",
		"virsi", "virsikirja", "psalmi", "laudes", "vesperi",
		"https", "http", "www", "url",
	}

	for _, w := range stopCases {
		if !IsStopWord(w) {
			t.Errorf("expected IsStopWord(%q) = true, got false", w)
		}
	}

	theologicalContentWords := []string{
		"jeesus", "kristus", "jumala", "herra",
		"rukoilla", "rukoilemme", "rukoilen", "rukoilkaamme",
		"kiitos", "kiitämme",
		"paha", "pahan", "pahasta", "pahalle",
		"rakkaus", "totuus", "vapaus", "elämä", "armo", "usko", "toivo",
	}

	for _, w := range theologicalContentWords {
		if IsStopWord(w) {
			t.Errorf("expected IsStopWord(%q) = false (theological/content word), got true", w)
		}
	}
}

func TestAnalyticService_WithFinnishStopwords(t *testing.T) {
	svc, err := NewAnalyticService(nil, true, "fi")
	if err != nil {
		t.Fatalf("failed to initialize analytic service with fi stopwords: %v", err)
	}

	text := "Me rukoilemme Jeesuksen nimeä ja kiitämme Jumalaa itseämme varten virsi 123"
	tokens := svc.Tokenize(text)

	// Verify that stopwords 'me', 'ja', 'itseämme', 'virsi' were filtered out
	for _, tok := range tokens {
		if tok == "me" || tok == "ja" || tok == "itseämme" || tok == "virsi" {
			t.Errorf("token %q should have been filtered out as a stopword", tok)
		}
	}

	// Verify that theological and prayer words were preserved
	foundJeesus := false
	foundRukoilemme := false
	foundKiitämme := false
	for _, tok := range tokens {
		if tok == "jeesuksen" {
			foundJeesus = true
		}
		if tok == "rukoilemme" {
			foundRukoilemme = true
		}
		if tok == "kiitämme" {
			foundKiitämme = true
		}
	}

	if !foundJeesus {
		t.Error("expected 'jeesuksen' to be retained in tokens")
	}
	if !foundRukoilemme {
		t.Error("expected 'rukoilemme' to be retained in tokens")
	}
	if !foundKiitämme {
		t.Error("expected 'kiitämme' to be retained in tokens")
	}

	verses := []models.Verse{
		{BookID: "Office", Chapter: 1, Verse: 1, Text: "Rukous ja virsi 50: rukoilemme Jeesusta."},
	}
	res := svc.AnalyzeVerses(verses, 10)
	if len(res.TopWords) == 0 {
		t.Fatal("expected top words from analyzed verses")
	}

	for _, tw := range res.TopWords {
		if tw.Word == "virsi" || tw.Word == "ja" {
			t.Errorf("stopword %q found in TopWords results", tw.Word)
		}
	}
}

func TestExtractThemes_FiltersStopwordsAndRetainsTheology(t *testing.T) {
	text := "virsi 10. Me rukoilemme Jeesuksen armoa ja kiitämme Herraa tätä varten itseämme unohtaen."
	themes := ExtractThemes(text, 5)

	for _, th := range themes {
		if th.Word == "virsi" || th.Word == "tätä" || th.Word == "itseämme" {
			t.Errorf("stopword %q should not appear in themes", th.Word)
		}
	}

	foundTheological := false
	for _, th := range themes {
		if th.Word == "rukoilemme" || th.Word == "jeesuksen" || th.Word == "kiitämme" || th.Word == "armoa" {
			foundTheological = true
			break
		}
	}
	if !foundTheological {
		t.Errorf("expected theological themes to be retained, got: %v", themes)
	}
}
