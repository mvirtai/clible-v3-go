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

	if resTop.Type != "top_words" {
		t.Errorf("resTop.Type = %q, want 'top_words'", resTop.Type)
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

	if res.Type != "comparison" {
		t.Errorf("res.Type = %q, want 'comparison'", res.Type)
	}
}

type mockVerseFetcherDelegate struct {
	fn func(ctx context.Context, ref, translationID string) ([]models.Verse, error)
}

func (m *mockVerseFetcherDelegate) GetVerses(ctx context.Context, ref, translationID string) ([]models.Verse, error) {
	return m.fn(ctx, ref, translationID)
}
