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

