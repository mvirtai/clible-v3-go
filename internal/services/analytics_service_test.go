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

	// Setup parallel verse structures mimicking two distinct Bible translations
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

	// The texts are structurally similar but not identical string matches
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
