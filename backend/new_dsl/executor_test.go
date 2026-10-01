package newdsl

import (
	"context"
	"strings"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

type mockVerseFetcher struct {
	verses []models.Verse
}

func (m *mockVerseFetcher) GetVerses(ctx context.Context, ref, translationID string) ([]models.Verse, error) {
	return m.verses, nil
}

type mockVerseSearcher struct {
	verses []models.Verse
}

func (m *mockVerseSearcher) SearchVerses(ctx context.Context, query string, isRegex bool, translationID, searchScope, scopeValue string) ([]models.Verse, error) {
	return m.verses, nil
}

func TestExecute_VerseRefWithUseAndInlineOutput(t *testing.T) {
	sampleVerses := []models.Verse{
		{BookID: "JHN", Chapter: 3, Verse: 16, Text: "Sillä niin on Jumala maailmaa rakastanut"},
	}

	execCtx := &ExecutionContext{
		Ctx:          context.Background(),
		DefaultTrans: "web",
		VerseFetcher: &mockVerseFetcher{verses: sampleVerses},
	}

	expr, err := ParseISLA(`! @(Joh 3:16).use(KR92) =>`)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	res, err := Execute(execCtx, expr)
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	if res.Type != "read" {
		t.Errorf("res.Type = %q, want 'read'", res.Type)
	}

	if res.Data["translation"] != "fin-1992" {
		t.Errorf("res.Data[translation] = %q, want 'fin-1992'", res.Data["translation"])
	}

	outputOp, ok := res.Data["output_op"].(map[string]interface{})
	if !ok || outputOp["kind"] != "inline" {
		t.Errorf("output_op kind = %v, want 'inline'", outputOp["kind"])
	}
}

func TestExecute_SearchWithCountAndBelowOutput(t *testing.T) {
	sampleVerses := []models.Verse{
		{BookID: "ROM", Chapter: 5, Verse: 1, Text: "Koska me siis olemme uskosta vanhurskaiksi tulleet"},
		{BookID: "ROM", Chapter: 5, Verse: 2, Text: "jonka kautta meillä myös on pääsy tähän armoon"},
	}

	execCtx := &ExecutionContext{
		Ctx:           context.Background(),
		DefaultTrans:  "web",
		VerseSearcher: &mockVerseSearcher{verses: sampleVerses},
	}

	expr, err := ParseISLA(`! search("armo").at(kirjeet).count(verses) >> #armo-maara`)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	res, err := Execute(execCtx, expr)
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	if res.Type != "count" {
		t.Errorf("res.Type = %q, want 'count'", res.Type)
	}

	if res.Data["count"] != 2 {
		t.Errorf("res.Data[count] = %v, want 2", res.Data["count"])
	}

	outputOp, ok := res.Data["output_op"].(map[string]interface{})
	if !ok || outputOp["kind"] != "cell_below" || outputOp["name"] != "#armo-maara" {
		t.Errorf("output_op = %+v, want kind 'cell_below' and name '#armo-maara'", outputOp)
	}
}

func TestExecute_CellContextTopAndStats(t *testing.T) {
	contextText := `Jumalan armo on suuri ja ihmeellinen. Armo uudistaa meidät.`

	execCtx := &ExecutionContext{
		Ctx:         context.Background(),
		ContextText: contextText,
	}

	// 1. Top words
	exprTop, err := ParseISLA(`! ^.top(5) > "Top sanat"`)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	resTop, err := Execute(execCtx, exprTop)
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	if resTop.Type != "words" {
		t.Errorf("resTop.Type = %q, want 'words'", resTop.Type)
	}
	outputOp, ok := resTop.Data["output_op"].(map[string]interface{})
	if !ok || outputOp["kind"] != "cell_above" || outputOp["name"] != "Top sanat" {
		t.Errorf("resTop output_op = %+v", outputOp)
	}

	// 2. Stats
	exprStats, err := ParseISLA(`! ^all.stats =>`)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	resStats, err := Execute(execCtx, exprStats)
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	if resStats.Type != "stats" {
		t.Errorf("resStats.Type = %q, want 'stats'", resStats.Type)
	}
	if resStats.Data["token_count"] != 9 {
		t.Errorf("token_count = %v, want 9", resStats.Data["token_count"])
	}
	if _, ok := resStats.Data["unique_token_count"]; !ok {
		t.Error("stats result is missing unique_token_count")
	}
	if _, ok := resStats.Data["character_count"]; !ok {
		t.Error("stats result is missing character_count")
	}
	if resStats.Data["hapax_legomena_count"] != 7 {
		t.Errorf("hapax_legomena_count = %v, want 7", resStats.Data["hapax_legomena_count"])
	}
	if resStats.Data["hapax_legomena_ratio"] != 7.0/9.0 {
		t.Errorf("hapax_legomena_ratio = %v, want %f", resStats.Data["hapax_legomena_ratio"], 7.0/9.0)
	}
}

func TestExecute_CellContextNgrams(t *testing.T) {
	execCtx := &ExecutionContext{
		Ctx:         context.Background(),
		ContextText: "Jumalan armo kantaa. Jumalan armo riittää.",
	}

	expr, err := ParseISLA(`! ^.ngrams(2, 2) =>`)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	res, err := Execute(execCtx, expr)
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	if res.Type != "words" {
		t.Fatalf("res.Type = %q, want 'words'", res.Type)
	}
	if res.Data["ngram_size"] != 2 {
		t.Errorf("ngram_size = %v, want 2", res.Data["ngram_size"])
	}

	words, ok := res.Data["words"].([]models.ThemeItem)
	if !ok {
		t.Fatalf("res.Data[words] is not []models.ThemeItem: %v", res.Data["words"])
	}
	if len(words) == 0 || words[0].Word != "jumalan armo" || words[0].Count != 2 {
		t.Errorf("words = %+v, want top bigram 'jumalan armo' with count 2", words)
	}

	trigrams, err := ParseISLA(`! ^.ngrams(3, 10) =>`)
	if err != nil {
		t.Fatalf("Parse trigram expression: %v", err)
	}
	trigramResult, err := Execute(execCtx, trigrams)
	if err != nil {
		t.Fatalf("Execute trigram expression: %v", err)
	}
	if trigramResult.Data["ngram_size"] != 3 {
		t.Errorf("trigram ngram_size = %v, want 3", trigramResult.Data["ngram_size"])
	}

	for _, input := range []string{
		`! ^.ngrams(1, 10) =>`,
		`! ^.ngrams(4, 10) =>`,
		`! ^.ngrams(2, 0) =>`,
		`! ^.ngrams(2, 10, 1) =>`,
	} {
		expr, err := ParseISLA(input)
		if err != nil {
			t.Fatalf("Parse invalid ngram expression %q: %v", input, err)
		}
		if _, err := Execute(execCtx, expr); err == nil {
			t.Errorf("Execute(%q) succeeded, want error", input)
		}
	}
}

func TestExecute_Comparison(t *testing.T) {
	kr92Verse := []models.Verse{{BookID: "JHN", Chapter: 3, Verse: 16, Text: "Sillä niin on Jumala..."}}
	kr38Verse := []models.Verse{{BookID: "JHN", Chapter: 3, Verse: 16, Text: "Sillä niin on Jumala..."}}

	execCtx := &ExecutionContext{
		Ctx: context.Background(),
		VerseFetcher: &mockVerseFetcherDelegate{
			fn: func(ctx context.Context, ref, translationID string) ([]models.Verse, error) {
				if strings.Contains(translationID, "1992") {
					return kr92Verse, nil
				}
				return kr38Verse, nil
			},
		},
	}

	expr, err := ParseISLA(`! @(Joh 3:16).vs(KR92, KR38) =>`)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	res, err := Execute(execCtx, expr)
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	if res.Type != "compare" {
		t.Errorf("res.Type = %q, want 'compare'", res.Type)
	}
}

type mockVerseFetcherDelegate struct {
	fn func(ctx context.Context, ref, translationID string) ([]models.Verse, error)
}

func (m *mockVerseFetcherDelegate) GetVerses(ctx context.Context, ref, translationID string) ([]models.Verse, error) {
	return m.fn(ctx, ref, translationID)
}

func TestExecute_Variable(t *testing.T) {
	sampleVerses := []models.Verse{
		{BookID: "ROM", Chapter: 5, Verse: 1, Text: "Koska me siis olemme uskosta vanhurskaiksi tulleet"},
		{BookID: "ROM", Chapter: 5, Verse: 2, Text: "jonka kautta meillä myös on pääsy tähän armoon"},
	}

	variables := map[string]*models.CLIResult{
		"armo": {
			Type: "search",
			Data: map[string]interface{}{
				"verses": sampleVerses,
				"count":  len(sampleVerses),
			},
		},
		"armo-json": {
			Type: "search",
			Data: map[string]interface{}{
				"verses": []interface{}{
					map[string]interface{}{"text": "Sillä niin on Jumala maailmaa rakastanut"},
					map[string]interface{}{"text": "että hän antoi ainokaisen Poikansa"},
				},
			},
		},
		"teksti": {
			Type: "cell_context",
			Data: map[string]interface{}{
				"text": "Jumalan armo ja rauha olkoon teille.",
			},
		},
	}

	execCtx := &ExecutionContext{
		Ctx:          context.Background(),
		DefaultTrans: "web",
		VariableResolver: func(name string) (*models.CLIResult, error) {
			clean := strings.TrimPrefix(name, "#")
			if res, ok := variables[clean]; ok {
				return res, nil
			}
			return nil, nil
		},
	}

	t.Run("Variable count(words)", func(t *testing.T) {
		expr, err := ParseISLA(`! #armo.count(words) =>`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(execCtx, expr)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "count" {
			t.Errorf("res.Type = %q, want 'count'", res.Type)
		}
		// 7 words in first verse + 8 words in second verse = 15 words
		if res.Data["count"] != 15 {
			t.Errorf("res.Data[count] = %v, want 15", res.Data["count"])
		}
	})

	t.Run("Variable with JSON-unmarshaled verses and top(5)", func(t *testing.T) {
		expr, err := ParseISLA(`! #armo-json.top(5) >> #tulokset`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(execCtx, expr)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "words" {
			t.Errorf("res.Type = %q, want 'words'", res.Type)
		}
		outputOp, ok := res.Data["output_op"].(map[string]interface{})
		if !ok || outputOp["kind"] != "cell_below" || outputOp["name"] != "#tulokset" {
			t.Errorf("output_op = %+v, want cell_below and #tulokset", outputOp)
		}
	})

	t.Run("Variable text with stats", func(t *testing.T) {
		expr, err := ParseISLA(`! #teksti.stats =>`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(execCtx, expr)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "stats" {
			t.Errorf("res.Type = %q, want 'stats'", res.Type)
		}
		if res.Data["token_count"] != 6 {
			t.Errorf("token_count = %v, want 6", res.Data["token_count"])
		}
	})

	t.Run("Bare variable returns original result", func(t *testing.T) {
		expr, err := ParseISLA(`! #armo =>`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(execCtx, expr)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "search" {
			t.Errorf("res.Type = %q, want 'search'", res.Type)
		}
	})

	t.Run("Variable not found returns error", func(t *testing.T) {
		expr, err := ParseISLA(`! #tuntematon.count(words) =>`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		_, err = Execute(execCtx, expr)
		if err == nil {
			t.Fatalf("expected error for unknown variable, got nil")
		}
		if !strings.Contains(err.Error(), "not found") {
			t.Errorf("expected 'not found' in error, got %v", err)
		}
	})
}

func TestExecute_RangeMultiBookSpan(t *testing.T) {
	matVerses := []models.Verse{{BookID: "MAT", Chapter: 1, Verse: 1, Text: "Jeesuksen Kristuksen, Daavidin pojan..."}}
	mrkVerses := []models.Verse{{BookID: "MRK", Chapter: 1, Verse: 1, Text: "Jeesuksen Kristuksen, Jumalan Pojan..."}}
	lukVerses := []models.Verse{{BookID: "LUK", Chapter: 1, Verse: 1, Text: "Koska monet ovat yrittäneet..."}}
	jhnVerses := []models.Verse{{BookID: "JHN", Chapter: 1, Verse: 1, Text: "Alussa oli Sana, ja Sana oli Jumalan luona..."}}

	execCtx := &ExecutionContext{
		Ctx: context.Background(),
		VerseFetcher: &mockVerseFetcherDelegate{
			fn: func(ctx context.Context, ref, translationID string) ([]models.Verse, error) {
				switch ref {
				case "MAT":
					return matVerses, nil
				case "MRK":
					return mrkVerses, nil
				case "LUK":
					return lukVerses, nil
				case "JHN":
					return jhnVerses, nil
				default:
					return nil, nil
				}
			},
		},
	}

	tests := []struct {
		name      string
		query     string
		wantBooks int
	}{
		{
			name:      "bare parens (MAT .. JOH).count(books)",
			query:     "! (MAT .. JOH).count(books) =>",
			wantBooks: 4,
		},
		{
			name:      "explicit range(MAT .. JOH).count(books)",
			query:     "! range(MAT .. JOH).count(books) =>",
			wantBooks: 4,
		},
		{
			name:      "at-parens @(MAT .. JOH).count(books)",
			query:     "! @(MAT .. JOH).count(books) =>",
			wantBooks: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expr, err := ParseISLA(tt.query)
			if err != nil {
				t.Fatalf("Parse error: %v", err)
			}
			res, err := Execute(execCtx, expr)
			if err != nil {
				t.Fatalf("Execute error: %v", err)
			}
			if res.Type != "count" {
				t.Errorf("res.Type = %q, want 'count'", res.Type)
			}
			cnt, ok := res.Data["count"].(int)
			if !ok {
				t.Fatalf("count is not int: %v", res.Data["count"])
			}
			if cnt != tt.wantBooks {
				t.Errorf("count = %d, want %d", cnt, tt.wantBooks)
			}
		})
	}
}

func TestExecute_TopWithCategorizeAndLemma(t *testing.T) {
	// Text containing inflected forms of "Herra" and "Jeesus":
	// Herra, Herran, Herralle (3 inflected forms of Herra)
	// Jeesus, Jeesuksen (2 inflected forms of Jeesus)
	// armo (1)
	contextText := "Herra puhui Herran palvelijoille ja Herralle laulettiin. Jeesus opetti ja Jeesuksen sanat toivat armon."

	mockLemmatizer := func(word string) string {
		switch strings.ToLower(word) {
		case "herra", "herran", "herralle":
			return "Herra"
		case "jeesus", "jeesuksen":
			return "Jeesus"
		case "armon", "armo":
			return "armo"
		default:
			return word
		}
	}

	execCtx := &ExecutionContext{
		Ctx:         context.Background(),
		ContextText: contextText,
		Lemmatizer:  mockLemmatizer,
	}

	t.Run("categorize(true) clusters inflected words", func(t *testing.T) {
		expr, err := ParseISLA(`! ^.top(5).categorize(true) =>`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}

		res, err := Execute(execCtx, expr)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}

		if res.Type != "words" {
			t.Fatalf("res.Type = %q, want 'words'", res.Type)
		}

		words, ok := res.Data["words"].([]models.ThemeItem)
		if !ok {
			t.Fatalf("res.Data[words] is not []models.ThemeItem: %v", res.Data["words"])
		}

		foundHerra := false
		foundJeesus := false
		for _, w := range words {
			if w.Word == "Herra" {
				foundHerra = true
				if w.Count != 3 {
					t.Errorf("Herra count = %d, want 3", w.Count)
				}
			}
			if w.Word == "Jeesus" {
				foundJeesus = true
				if w.Count != 2 {
					t.Errorf("Jeesus count = %d, want 2", w.Count)
				}
			}
		}

		if !foundHerra {
			t.Errorf("expected clustered lemma 'Herra' in top words, got: %+v", words)
		}
		if !foundJeesus {
			t.Errorf("expected clustered lemma 'Jeesus' in top words, got: %+v", words)
		}
	})

	t.Run("lemma() clusters inflected words", func(t *testing.T) {
		expr, err := ParseISLA(`! ^.top(5).lemma() =>`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}

		res, err := Execute(execCtx, expr)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}

		words, ok := res.Data["words"].([]models.ThemeItem)
		if !ok {
			t.Fatalf("res.Data[words] is not []models.ThemeItem: %v", res.Data["words"])
		}

		foundHerra := false
		for _, w := range words {
			if w.Word == "Herra" {
				foundHerra = true
				if w.Count != 3 {
					t.Errorf("Herra count = %d, want 3", w.Count)
				}
			}
		}
		if !foundHerra {
			t.Errorf("expected 'Herra' with count 3, got %+v", words)
		}
	})
}
