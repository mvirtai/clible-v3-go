package main

import (
	"testing"
)

func TestCleanHTML(t *testing.T) {
	input := `<p>Ylistäkää Jumalaa, te Herran pal<span class="kadenssi-underline">ve</span>lijat! <span class="kadenssi-star">*</span><br />
Jaakobin suku, kunnioita häntä, palvele vavisten, Isra<span class="kadenssi-underline">e</span>lin kansa!<br />
&nbsp;&nbsp;&nbsp;&nbsp;Ei hän halveksinut heikkoa eikä kartta<span class="kadenssi-underline">nut</span> kurjaa, <span class="kadenssi-star">*</span><br />
ei kääntänyt pois kasvojaan vaan kuu<span class="kadenssi-underline">li</span>, kun huusin.</p>`

	expected := "Ylistäkää Jumalaa, te Herran pal<u>ve</u>lijat! *\nJaakobin suku, kunnioita häntä, palvele vavisten, Isra<u>e</u>lin kansa!\nEi hän halveksinut heikkoa eikä kartta<u>nut</u> kurjaa, *\nei kääntänyt pois kasvojaan vaan kuu<u>li</u>, kun huusin."

	result := cleanHTML(input)
	if result != expected {
		t.Errorf("cleanHTML mismatch.\nGot:\n%s\nExpected:\n%s", result, expected)
	}
}

func TestExtractVerses(t *testing.T) {
	vol := WPVolume{
		Passages1: []WPPassage{{Verse1: "Job 14:1–6"}},
		Passages2: []WPPassage{{Verse2: "Room. 8:18–23"}},
		Gospels:   []WPPassage{{Verse3: "Luuk. 7:11–16"}},
	}

	cycle := extractVerses(vol)
	if len(cycle.OldTestament) != 1 || cycle.OldTestament[0] != "Job 14:1–6" {
		t.Errorf("expected OldTestament Job 14:1–6, got %v", cycle.OldTestament)
	}
	if len(cycle.Epistle) != 1 || cycle.Epistle[0] != "Room. 8:18–23" {
		t.Errorf("expected Epistle Room. 8:18–23, got %v", cycle.Epistle)
	}
	if len(cycle.Gospel) != 1 || cycle.Gospel[0] != "Luuk. 7:11–16" {
		t.Errorf("expected Gospel Luuk. 7:11–16, got %v", cycle.Gospel)
	}
}

func TestCleanHymns(t *testing.T) {
	raw := []WPHymnGroup{
		{
			GroupName: "Päivän virsiä",
			Hymns: []WPHymn{
				{Name: "Jo vaietkoon", Number: "242", URL: "https://virsikirja.fi/242"},
			},
		},
	}

	cleaned := cleanHymns(raw)
	if len(cleaned) != 1 {
		t.Fatalf("expected 1 hymn group, got %d", len(cleaned))
	}
	if cleaned[0].Group != "Päivän virsiä" {
		t.Errorf("expected group 'Päivän virsiä', got %s", cleaned[0].Group)
	}
	if len(cleaned[0].Hymns) != 1 || cleaned[0].Hymns[0].Number != "242" {
		t.Errorf("expected hymn 242, got %v", cleaned[0].Hymns)
	}
}

func TestParseColorClassName(t *testing.T) {
	tests := []struct {
		classes  []string
		expected string
	}{
		{[]string{"liturgical-color--green", "day"}, "vihreä"},
		{[]string{"liturgical-color--white"}, "valkoinen"},
		{[]string{"liturgical-color--red"}, "punainen"},
		{[]string{"liturgical-color--purple"}, "violetti"},
		{[]string{"liturgical-color--black"}, "musta"},
		{[]string{"other-class"}, ""},
	}

	for _, tt := range tests {
		res := parseColorClassName(tt.classes)
		if res != tt.expected {
			t.Errorf("parseColorClassName(%v) = %q, want %q", tt.classes, res, tt.expected)
		}
	}
}

func TestParseColorFromAltarImage(t *testing.T) {
	tests := []struct {
		url      string
		expected string
	}{
		{"https://.../Vihrea-2-kyntt-Alppila-400px.jpg", "vihreä"},
		{"https://.../Valkoinen-kyntt-400px.jpg", "valkoinen"},
		{"https://.../Punainen-kyntt.jpg", "punainen"},
		{"https://.../Violetti-kyntt.jpg", "violetti"},
		{"https://.../Musta-kyntt.jpg", "musta"},
		{"https://.../unknown.jpg", ""},
	}

	for _, tt := range tests {
		res := parseColorFromAltarImage(tt.url)
		if res != tt.expected {
			t.Errorf("parseColorFromAltarImage(%q) = %q, want %q", tt.url, res, tt.expected)
		}
	}
}

func TestParseDateInput(t *testing.T) {
	t1, err := parseDateInput("20.9.2026")
	if err != nil || t1.Day() != 20 || t1.Month() != 9 || t1.Year() != 2026 {
		t.Errorf("unexpected parseDateInput 20.9.2026: %v, %v", t1, err)
	}

	t2, err := parseDateInput("2026-09-20")
	if err != nil || t2.Day() != 20 || t2.Month() != 9 || t2.Year() != 2026 {
		t.Errorf("unexpected parseDateInput 2026-09-20: %v, %v", t2, err)
	}
}
