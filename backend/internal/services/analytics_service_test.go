package services

import (
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestAnalyticService_TokenizeAndAnalyze(t *testing.T) {
	// Initialize service without database dependency for pure text analysis testing
	// Setting filterStopwords to false to avoid missing embedded data directory during isolated unit tests
	svc, err := NewAnalyticService(nil, false, "en")
	if err != nil {
		t.Fatalf("failed to initialize analytic service: %v", err)
	}

	text := "In the beginning, God created the heavens and the earth."
	tokens := svc.Tokenize(text)

	// Verify punctuation parsing and normalization
	expectedTokens := []string{"in", "the", "beginning", "god", "created", "the", "heavens", "and", "the", "earth"}
	if len(tokens) != len(expectedTokens) {
		t.Fatalf("expected %d tokens, got %d", len(expectedTokens), len(tokens))
	}

	for i, v := range tokens {
		if v != expectedTokens[i] {
			t.Errorf("at index %d: expected token '%s', got '%s'", i, expectedTokens[i], v)
		}
	}

	// Test structural evaluation metrics
	verses := []models.Verse{
		{BookID: "Gen", Chapter: 1, Verse: 1, Text: "God created light."},
		{BookID: "Gen", Chapter: 1, Verse: 2, Text: "Light was good."},
	}

	analysis := svc.AnalyzeVerses(verses, 5)

	if analysis.TokenCount != 6 {
		t.Errorf("expected 6 total tokens, got %d", analysis.TokenCount)
	}

	// 'light' appears twice, other 4 words appear once -> 5 unique tokens
	if analysis.UniqueTokenCount != 5 {
		t.Errorf("expected 5 unique tokens, got %d", analysis.UniqueTokenCount)
	}

	expectedTTR := 5.0 / 6.0
	if analysis.TypeTokenRatio != expectedTTR {
		t.Errorf("expected TTR %f, got %f", expectedTTR, analysis.TypeTokenRatio)
	}
}

func TestAnalyticService_CompareTranslations(t *testing.T) {
	svc, err := NewAnalyticService(nil, false, "fi")
	if err != nil {
		t.Fatalf("failed to initialize analytic service: %v", err)
	}

	versesA := []models.Verse{
		{BookID: "John", Chapter: 3, Verse: 16, Text: "Sillä niin on Jumala maailmaa rakastanut"},
	}
	versesB := []models.Verse{
		{BookID: "John", Chapter: 3, Verse: 16, Text: "Sillä niin Jumala rakasti maailmaa"},
	}

	result := svc.CompareTranslations("John 3:16", versesA, versesB)

	if result.Summary.TotalVerses != 1 {
		t.Errorf("expected 1 aligned verse target, got %d", result.Summary.TotalVerses)
	}

	if result.Aligned[0].ExactMatch {
		t.Error("expected exact match verification evaluate to false")
	}

	if result.Summary.AverageSimilarity <= 0.5 {
		t.Errorf("expected high similarity ratio for parallel texts, got %f", result.Summary.AverageSimilarity)
	}

	if len(result.Summary.TopSharedWords) == 0 {
		t.Error("expected shared tokens matrix calculation to find common words")
	}
}

func TestAnalyticService_WithStopwords(t *testing.T) {
	svc, err := NewAnalyticService(nil, true, "en")
	if err != nil {
		t.Fatalf("failed to initialize analytic service with stopwords: %v", err)
	}

	// "the" and "a" are English stopwords and should be filtered out
	tokens := svc.Tokenize("the light shines in a dark place")
	for _, tok := range tokens {
		if tok == "the" || tok == "a" {
			t.Errorf("stopword '%s' should have been filtered", tok)
		}
	}
}

func TestAnalyticService_AnalyzeVerses_Empty(t *testing.T) {
	svc, _ := NewAnalyticService(nil, false, "en")
	result := svc.AnalyzeVerses(nil, 5)
	if result.TokenCount != 0 {
		t.Errorf("expected 0 tokens for empty input, got %d", result.TokenCount)
	}
}

func TestAnalyticService_AnalyzeVerses_AllStopwords(t *testing.T) {
	svc, _ := NewAnalyticService(nil, true, "en")
	// All tokens are stopwords — should return CharacterCount but zero tokens
	verses := []models.Verse{{Text: "the a and or but"}}
	result := svc.AnalyzeVerses(verses, 5)
	if result.TokenCount != 0 {
		t.Errorf("expected 0 tokens after stopword filtering, got %d", result.TokenCount)
	}
	if result.CharacterCount == 0 {
		t.Error("expected non-zero character count")
	}
}

func TestAnalyticService_CompareTranslations_Empty(t *testing.T) {
	svc, _ := NewAnalyticService(nil, false, "en")
	result := svc.CompareTranslations("ref", nil, nil)
	if result.Summary.TotalVerses != 0 {
		t.Errorf("expected 0 verses for empty input, got %d", result.Summary.TotalVerses)
	}
}

func TestAnalyticService_CompareTranslations_ExactMatch(t *testing.T) {
	svc, _ := NewAnalyticService(nil, false, "en")
	text := "For God so loved the world"
	versesA := []models.Verse{{BookID: "Joh", Chapter: 3, Verse: 16, Text: text}}
	versesB := []models.Verse{{BookID: "Joh", Chapter: 3, Verse: 16, Text: text}}

	result := svc.CompareTranslations("Joh 3:16", versesA, versesB)
	if !result.Aligned[0].ExactMatch {
		t.Error("expected exact match for identical texts")
	}
	if result.Summary.ExactMatches != 1 {
		t.Errorf("expected 1 exact match, got %d", result.Summary.ExactMatches)
	}
}
