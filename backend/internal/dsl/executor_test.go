package dsl

import (
	"context"
	"errors"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

type mockVerseFetcher struct {
	verses map[string][]models.Verse
	err    error
}

func (m *mockVerseFetcher) GetVerses(_ context.Context, ref, translationID string) ([]models.Verse, error) {
	if m.err != nil {
		return nil, m.err
	}
	key := ref + "@" + translationID
	return m.verses[key], nil
}

type mockVerseSearcher struct {
	results   []models.Verse
	err       error
	lastScope string
	lastValue string
}

func (m *mockVerseSearcher) SearchVerses(_ context.Context, _ string, _ bool, _ string, searchScope, scopeValue string) ([]models.Verse, error) {
	m.lastScope = searchScope
	m.lastValue = scopeValue
	if m.err != nil {
		return nil, m.err
	}
	return m.results, nil
}

type dummyNode struct{}

func (d *dummyNode) node()          {}
func (d *dummyNode) String() string { return "dummy" }

func TestDSLExecutor(t *testing.T) {
	fetcher := &mockVerseFetcher{
		verses: map[string][]models.Verse{
			"Joh 3:16@fin-1992": {{BookID: "JHN", Chapter: 3, Verse: 16, Text: "Sillä niin on Jumala maailmaa rakastanut"}},
			"Joh 3:16@kjv":      {{BookID: "JHN", Chapter: 3, Verse: 16, Text: "For God so loved the world"}},
			"Joh 3:16@web":      {{BookID: "JHN", Chapter: 3, Verse: 16, Text: "For God so loved the world (WEB)"}},
		},
	}
	searcher := &mockVerseSearcher{
		results: []models.Verse{
			{BookID: "1JN", Chapter: 4, Verse: 8, Text: "God is love"},
			{BookID: "ROM", Chapter: 8, Verse: 38, Text: "For I am persuaded..."},
		},
	}

	ctx := &ExecutionContext{
		Ctx:           context.Background(),
		DefaultTrans:  "web",
		ContextText:   "Jumala on rakkaus ja valkeus",
		VerseFetcher:  fetcher,
		VerseSearcher: searcher,
		ThemeExtractor: func(text string, limit int) []models.ThemeItem {
			return []models.ThemeItem{{Word: "rakkaus", Count: 2}}
		},
	}

	t.Run("Nil node or context error", func(t *testing.T) {
		if _, err := Execute(nil, &VerseRefNode{}); err == nil {
			t.Error("expected error for nil context")
		}
		if _, err := Execute(ctx, nil); err == nil {
			t.Error("expected error for nil node")
		}
		if _, err := Execute(ctx, &dummyNode{}); err == nil {
			t.Error("expected error for unsupported node type")
		}
	})

	t.Run("Execute Verse Reference", func(t *testing.T) {
		node, err := Parse("@Joh 3:16")
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(ctx, node)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "read" {
			t.Errorf("expected type 'read', got %q", res.Type)
		}
	})

	t.Run("Execute Verse Reference with Translation Pipeline", func(t *testing.T) {
		node, err := Parse("@Joh 3:16 => KR92")
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(ctx, node)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "read" {
			t.Errorf("expected type 'read', got %q", res.Type)
		}
		verses := res.Data["verses"].([]models.Verse)
		if len(verses) != 1 || verses[0].Text != "Sillä niin on Jumala maailmaa rakastanut" {
			t.Errorf("unexpected verse result: %+v", verses)
		}
	})

	t.Run("Execute Comparison", func(t *testing.T) {
		node, err := Parse("@Joh 3:16 ? KR92 : KJV")
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(ctx, node)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "compare" {
			t.Errorf("expected type 'compare', got %q", res.Type)
		}
	})

	t.Run("Execute Direct Search", func(t *testing.T) {
		node, err := Parse(`? "love"`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(ctx, node)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "search" {
			t.Errorf("expected type 'search', got %q", res.Type)
		}
	})

	t.Run("Execute Search with Limit and Translation", func(t *testing.T) {
		node, err := Parse(`? "love" => limit:1`)
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(ctx, node)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "search" {
			t.Errorf("expected type 'search', got %q", res.Type)
		}
		verses := res.Data["verses"].([]models.Verse)
		if len(verses) != 1 {
			t.Errorf("expected 1 verse due to limit, got %d", len(verses))
		}

		// Search with translation
		tNode := &PipeNode{
			Left:  &SearchNode{Query: "love"},
			Right: &ActionNode{Kind: "translation", Value: "KJV"},
		}
		resTrans, err := Execute(ctx, tNode)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if resTrans.Type != "search" {
			t.Errorf("expected type 'search', got %q", resTrans.Type)
		}
	})

	t.Run("Execute Direct Scope and Scope Context Themes", func(t *testing.T) {
		// Direct Scope Node
		scopeNode := &ScopeNode{Count: 2}
		resScope, err := Execute(ctx, scopeNode)
		if err != nil {
			t.Fatalf("Execute scope error: %v", err)
		}
		if resScope.Type != "themes" {
			t.Errorf("expected type 'themes', got %q", resScope.Type)
		}

		// Scope in Pipe
		node, err := Parse("^3 => #themes")
		if err != nil {
			t.Fatalf("Parse error: %v", err)
		}
		res, err := Execute(ctx, node)
		if err != nil {
			t.Fatalf("Execute error: %v", err)
		}
		if res.Type != "themes" {
			t.Errorf("expected type 'themes', got %q", res.Type)
		}
	})

	t.Run("Execute Action Styling Options", func(t *testing.T) {
		pipeNode := &PipeNode{
			Left:  &VerseRefNode{Reference: "Joh 3:16"},
			Right: &ActionNode{Kind: "card", Value: "compact"},
		}
		res, err := Execute(ctx, pipeNode)
		if err != nil {
			t.Fatalf("Execute style error: %v", err)
		}
		if res.Data["viewStyle"] != "compact" {
			t.Errorf("expected viewStyle 'compact', got %v", res.Data["viewStyle"])
		}

		// Action without explicit value
		pipeNode2 := &PipeNode{
			Left:  &VerseRefNode{Reference: "Joh 3:16"},
			Right: &ActionNode{Kind: "card", Value: ""},
		}
		res2, err := Execute(ctx, pipeNode2)
		if err != nil {
			t.Fatalf("Execute style error: %v", err)
		}
		if res2.Data["viewStyle"] != "card" {
			t.Errorf("expected viewStyle 'card', got %v", res2.Data["viewStyle"])
		}

		// Action styling on SearchNode
		pipeNodeSearch := &PipeNode{
			Left:  &SearchNode{Query: "peace"},
			Right: &ActionNode{Kind: "style", Value: "grid"},
		}
		resSearch, err := Execute(ctx, pipeNodeSearch)
		if err != nil {
			t.Fatalf("Execute search style error: %v", err)
		}
		if resSearch.Data["viewStyle"] != "grid" {
			t.Errorf("expected viewStyle 'grid', got %v", resSearch.Data["viewStyle"])
		}
	})

	t.Run("Execute Themes on empty text or nil extractor", func(t *testing.T) {
		emptyCtx := &ExecutionContext{
			Ctx:          context.Background(),
			ContextText:  "",
			DefaultTrans: "web",
		}
		resEmpty, err := Execute(emptyCtx, &ScopeNode{Count: 1})
		if err != nil {
			t.Fatalf("Unexpected error on empty context text: %v", err)
		}
		if resEmpty.Type != "themes" || resEmpty.Data["count"] != 0 {
			t.Errorf("expected empty themes result, got %+v", resEmpty)
		}
	})

	t.Run("Execute Count Action", func(t *testing.T) {
		// 1. Direct Search count: ? /opetuslaps.*/ => count
		nodeSearch, err := Parse(`? /opetuslaps.*/ => count`)
		if err != nil {
			t.Fatalf("parse failed: %v", err)
		}
		resSearch, err := Execute(ctx, nodeSearch)
		if err != nil {
			t.Fatalf("execute failed: %v", err)
		}
		if resSearch.Type != "count" {
			t.Errorf("expected type 'count', got %q", resSearch.Type)
		}
		if resSearch.Data["count"] != 2 {
			t.Errorf("expected count 2, got %v", resSearch.Data["count"])
		}
		if resSearch.Data["target_type"] != "search" {
			t.Errorf("expected target_type 'search', got %v", resSearch.Data["target_type"])
		}

		// 2. Search with translation piped to count: ? "love" => web => count
		nodeSearchTrans, err := Parse(`? "love" => web => count`)
		if err != nil {
			t.Fatalf("parse failed: %v", err)
		}
		resSearchTrans, err := Execute(ctx, nodeSearchTrans)
		if err != nil {
			t.Fatalf("execute failed: %v", err)
		}
		if resSearchTrans.Type != "count" {
			t.Errorf("expected type 'count', got %q", resSearchTrans.Type)
		}
		if resSearchTrans.Data["count"] != 2 {
			t.Errorf("expected count 2, got %v", resSearchTrans.Data["count"])
		}
		if resSearchTrans.Data["translation"] != "web" {
			t.Errorf("expected translation 'web', got %v", resSearchTrans.Data["translation"])
		}

		// 3. Verse reference count: @Joh 3:16 => count
		nodeRef, err := Parse(`@Joh 3:16 => count`)
		if err != nil {
			t.Fatalf("parse failed: %v", err)
		}
		resRef, err := Execute(ctx, nodeRef)
		if err != nil {
			t.Fatalf("execute failed: %v", err)
		}
		if resRef.Type != "count" {
			t.Errorf("expected type 'count', got %q", resRef.Type)
		}
		if resRef.Data["count"] != 1 {
			t.Errorf("expected count 1, got %v", resRef.Data["count"])
		}
		if resRef.Data["target_type"] != "reference" {
			t.Errorf("expected target_type 'reference', got %v", resRef.Data["target_type"])
		}

		// 4. Scoped Search with count: ? armo @Room => web => count
		nodeScoped, err := Parse(`? armo @Room => web => count`)
		if err != nil {
			t.Fatalf("parse failed: %v", err)
		}
		resScoped, err := Execute(ctx, nodeScoped)
		if err != nil {
			t.Fatalf("execute failed: %v", err)
		}
		if resScoped.Type != "count" {
			t.Errorf("expected type 'count', got %q", resScoped.Type)
		}
		if resScoped.Data["scope_book"] != "Room" {
			t.Errorf("expected scope_book 'Room', got %v", resScoped.Data["scope_book"])
		}
		if searcher.lastScope != "book" || searcher.lastValue != "ROM" {
			t.Errorf("expected searcher scope ('book', 'ROM'), got (%q, %q)", searcher.lastScope, searcher.lastValue)
		}

		// 5. Scoped Search with testament NT/UT: ? "love" @UT
		nodeUT, err := Parse(`? "love" @UT`)
		if err != nil {
			t.Fatalf("parse failed: %v", err)
		}
		_, err = Execute(ctx, nodeUT)
		if err != nil {
			t.Fatalf("execute failed: %v", err)
		}
		if searcher.lastScope != "nt" {
			t.Errorf("expected searcher scope 'nt', got %q", searcher.lastScope)
		}
	})

	t.Run("Error handling and missing dependencies", func(t *testing.T) {
		// Missing VerseFetcher
		noFetcherCtx := &ExecutionContext{Ctx: context.Background(), DefaultTrans: "web"}
		if _, err := Execute(noFetcherCtx, &VerseRefNode{Reference: "Gen 1:1"}); err == nil {
			t.Error("expected error for unconfigured fetcher")
		}

		// Missing VerseSearcher
		if _, err := Execute(noFetcherCtx, &SearchNode{Query: "test"}); err == nil {
			t.Error("expected error for unconfigured searcher")
		}

		// Fetcher returns error
		errFetcherCtx := &ExecutionContext{
			Ctx:          context.Background(),
			DefaultTrans: "web",
			VerseFetcher: &mockVerseFetcher{err: errors.New("db error")},
		}
		if _, err := Execute(errFetcherCtx, &VerseRefNode{Reference: "Gen 1:1"}); err == nil {
			t.Error("expected error when fetcher returns error")
		}

		// Searcher returns error
		errSearcherCtx := &ExecutionContext{
			Ctx:           context.Background(),
			DefaultTrans:  "web",
			VerseSearcher: &mockVerseSearcher{err: errors.New("search error")},
		}
		if _, err := Execute(errSearcherCtx, &SearchNode{Query: "test"}); err == nil {
			t.Error("expected error when searcher returns error")
		}

		// Pipe target not an action
		invalidPipe := &PipeNode{Left: &VerseRefNode{Reference: "Gen 1:1"}, Right: &VerseRefNode{Reference: "Gen 1:2"}}
		if _, err := Execute(ctx, invalidPipe); err == nil {
			t.Error("expected error when pipe target is not an action")
		}

		// Unsupported pipe source
		unsupportedPipe := &PipeNode{Left: &dummyNode{}, Right: &ActionNode{Kind: "card"}}
		if _, err := Execute(ctx, unsupportedPipe); err == nil {
			t.Error("expected error when pipe source is unsupported")
		}

		// Comparison target not VerseRefNode
		invalidComp := &ComparisonNode{Target: &SearchNode{Query: "test"}}
		if _, err := Execute(ctx, invalidComp); err == nil {
			t.Error("expected error when comparison target is not VerseRefNode")
		}

		// Comparison fetcher error (left or right)
		if _, err := Execute(errFetcherCtx, &ComparisonNode{Target: &VerseRefNode{Reference: "Gen 1:1"}}); err == nil {
			t.Error("expected error when comparison fetcher fails")
		}
	})
}

func TestExecute_ComparisonNode(t *testing.T) {
	node, err := Parse(`@Joh 3:16 ? KR92 : KJV`)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}

	mockFetcher := &mockVerseFetcher{
		verses: map[string][]models.Verse{
			"fin-1992": {
				{ID: "joh-3-16-kr92", BookID: "JHN", Chapter: 3, Verse: 16, Text: "Sillä niin on Jumala maailmaa rakastanut...", TranslationID: "fin-1992"},
			},
			"kjv": {
				{ID: "joh-3-16-kjv", BookID: "JHN", Chapter: 3, Verse: 16, Text: "For God so loved the world...", TranslationID: "kjv"},
			},
		},
	}

	execCtx := &ExecutionContext{
		Ctx:          context.Background(),
		DefaultTrans: "KR92",
		VerseFetcher: mockFetcher,
	}

	res, err := Execute(execCtx, node)
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	if res.Type != "compare" {
		t.Fatalf("expected type 'compare', got %q", res.Type)
	}

	leftData, ok := res.Data["left"].(map[string]interface{})
	if !ok || leftData["translation"] != "fin-1992" {
		t.Errorf("expected left translation 'fin-1992', got %v", leftData["translation"])
	}

	rightData, ok := res.Data["right"].(map[string]interface{})
	if !ok || rightData["translation"] != "kjv" {
		t.Errorf("expected right translation 'kjv', got %v", rightData["translation"])
	}

	// Test KR92 vs KR38 & 1992 vs 1938 aliases
	mockFetcher.verses["fin-1938"] = []models.Verse{
		{ID: "joh-3-16-kr38", BookID: "JHN", Chapter: 3, Verse: 16, Text: "Sillä niin on Jumala maailmaa rakastanut...", TranslationID: "fin-1938"},
	}

	nodeAliases, err := Parse(`@Joh 3:16 ? KR92 : KR38`)
	if err != nil {
		t.Fatalf("Parse KR92 : KR38 failed: %v", err)
	}
	resAliases, err := Execute(execCtx, nodeAliases)
	if err != nil {
		t.Fatalf("Execute KR92 : KR38 failed: %v", err)
	}
	if resAliases.Data["left"].(map[string]interface{})["translation"] != "fin-1992" {
		t.Errorf("expected left 'fin-1992', got %v", resAliases.Data["left"].(map[string]interface{})["translation"])
	}
	if resAliases.Data["right"].(map[string]interface{})["translation"] != "fin-1938" {
		t.Errorf("expected right 'fin-1938', got %v", resAliases.Data["right"].(map[string]interface{})["translation"])
	}

	nodeNumeric, err := Parse(`@Joh 3:16 ? 1992 : 1938`)
	if err != nil {
		t.Fatalf("Parse 1992 : 1938 failed: %v", err)
	}
	resNumeric, err := Execute(execCtx, nodeNumeric)
	if err != nil {
		t.Fatalf("Execute 1992 : 1938 failed: %v", err)
	}
	if resNumeric.Data["left"].(map[string]interface{})["translation"] != "fin-1992" {
		t.Errorf("expected left 'fin-1992', got %v", resNumeric.Data["left"].(map[string]interface{})["translation"])
	}
	if resNumeric.Data["right"].(map[string]interface{})["translation"] != "fin-1938" {
		t.Errorf("expected right 'fin-1938', got %v", resNumeric.Data["right"].(map[string]interface{})["translation"])
	}
}
