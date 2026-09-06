package dsl

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
)

// VerseFetcher defines the interface for retrieving verses by reference.
type VerseFetcher interface {
	GetVerses(ctx context.Context, ref, translationID string) ([]models.Verse, error)
}

// VerseSearcher defines the interface for searching verses by query.
type VerseSearcher interface {
	SearchVerses(ctx context.Context, query string, isRegex bool, translationID, searchScope, scopeValue string) ([]models.Verse, error)
}

// AnalyticsData contains aggregated lexical and linguistic metrics.
type AnalyticsData struct {
	TokenCount        int                `json:"token_count"`
	UniqueTokenCount  int                `json:"unique_token_count"`
	TypeTokenRatio    float64            `json:"type_token_ratio"`
	CharacterCount    int                `json:"character_count"`
	AverageWordLength float64            `json:"avg_word_length"`
	TopWords          []models.ThemeItem `json:"top_words"`
}

// ExecutionContext is the runtime context for AST evaluation.
type ExecutionContext struct {
	Ctx             context.Context
	DefaultTrans    string
	ContextText     string
	VerseFetcher    VerseFetcher
	VerseSearcher   VerseSearcher
	ThemeExtractor  func(text string, limit int) []models.ThemeItem
	RefsFinder      func(ctx context.Context, ref, translationID string, limit int) ([]models.Verse, error)
	SuggestFinder   func(ctx context.Context, contextText, translationID string, limit int) ([]models.Verse, []string, error)
	AnalyticsFinder func(verses []models.Verse, text string, topN int) AnalyticsData
}

// Execute evaluates an AST Node and returns a structured CLIResult.
func Execute(ctx *ExecutionContext, node Node) (*models.CLIResult, error) {
	if node == nil {
		return nil, errors.New("cannot execute nil AST node")
	}
	if ctx == nil {
		return nil, errors.New("execution context cannot be nil")
	}

	switch n := node.(type) {
	case *VerseRefNode:
		return executeVerseRef(ctx, n, ctx.DefaultTrans)
	case *SearchNode:
		return executeSearch(ctx, n, "", 0)
	case *RangeNode:
		return executeRange(ctx, n)
	case *PipeNode:
		return executePipe(ctx, n)
	case *ComparisonNode:
		return executeComparison(ctx, n)
	case *ScopeNode:
		return executeScope(ctx, n)

	default:
		return nil, fmt.Errorf("unsupported node type: %T", n)
	}
}

func executeVerseRef(ctx *ExecutionContext, n *VerseRefNode, transID string) (*models.CLIResult, error) {
	if ctx.VerseFetcher == nil {
		return nil, errors.New("verse fetcher dependency is not configured")
	}

	tid := parsers.ResolveTranslationID(transID)
	if tid == "" {
		tid = parsers.ResolveTranslationID(ctx.DefaultTrans)
	}

	verses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.Reference, tid)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch verses for %q: %w", n.Reference, err)
	}

	return &models.CLIResult{
		Type: "read",
		Data: map[string]interface{}{
			"reference":   n.Reference,
			"translation": tid,
			"verses":      verses,
			"count":       len(verses),
		},
	}, nil
}

// inferTranslationFromScope determines the appropriate default Bible translation
// when the user has not explicitly specified one via a pipeline action.
// If the scope uses Finnish terminology (e.g. "kirjeet", "epistolat", "evankeliumit",
// "toora", "viisaus", "profeetat", "historia", "vt", "ut", etc.), it defaults to "KR92" (fin-1992).
// If English terminology is used ("epistles", "gospels", "torah", "wisdom", "prophets",
// "history", "ot", "nt"), it defaults to "web".
// If no language-specific scope is detected, it falls back to defaultTrans (or "web").
func inferTranslationFromScope(scope string, defaultTrans string) string {
	norm := strings.ToLower(strings.TrimSpace(scope))
	norm = strings.TrimPrefix(norm, "@")

	switch norm {
	case "kirjeet", "epistolat", "evankeliumit", "evankeliumi", "toora", "laki", "mooses",
		"pentateukki", "viisaus", "viisauskirjat", "runous", "profeetat", "profetia",
		"historia", "historiakirjat", "vt", "vanha testamentti", "ut", "uusi testamentti":
		return "KR92"
	case "epistles", "paul", "letters", "gospels", "gospel", "torah", "law", "moses",
		"pentateuch", "wisdom", "poetry", "prophets", "prophecy", "history", "historical",
		"ot", "old testament", "nt", "new testament":
		return "web"
	default:
		if defaultTrans != "" {
			return defaultTrans
		}
		return "web"
	}
}

// resolveSearchScope maps a scope identifier (canonical or bilingual alias) to a
// (searchScope, scopeValue) pair consumed by the verse repository layer.
// On an unrecognised identifier it returns ("unknown", "") so callers can
// detect the failure and surface an ISLADiagnostic to the user.
func resolveSearchScope(scopeBook string) (string, string) {
	if scopeBook == "" {
		return "", ""
	}
	norm := strings.ToLower(strings.TrimSpace(scopeBook))
	norm = strings.TrimPrefix(norm, "@")

	switch norm {
	case "vt", "ot", "vanha testamentti", "old testament":
		return "ot", ""
	case "ut", "nt", "uusi testamentti", "new testament":
		return "nt", ""
	case "evankeliumit", "gospels", "evankeliumi", "gospel":
		return "group", "MAT,MRK,LUK,JHN"
	case "toora", "torah", "mooses", "moses", "pentateukki", "pentateuch", "laki", "law":
		return "group", "GEN,EXO,LEV,NUM,DEU"
	case "kirjeet", "epistles", "paavali", "paul", "letters", "epistolat":
		return "group", "ROM,1CO,2CO,GAL,EPH,PHP,COL,1TH,2TH,1TI,2TI,TIT,PHM,HEB,JAS,1PE,2PE,1JN,2JN,3JN,JUD"
	case "viisaus", "wisdom", "runous", "poetry", "viisauskirjat":
		return "group", "JOB,PSA,PRO,ECC,SNG"
	case "profeetat", "prophets", "profetia", "prophecy":
		return "group", "ISA,JER,LAM,EZK,DAN,HOS,JOL,AMO,OBD,JON,MIC,NAM,HAB,ZEP,HAG,ZEC,MAL"
	case "historia", "history", "historical", "historiakirjat":
		return "group", "JOS,JDG,RUT,1SA,2SA,1KI,2KI,1CH,2CH,EZR,NEH,EST"
	default:
		bookID := parsers.ResolveBookID(scopeBook)
		if bookID == "" {
			// Return sentinel so callers can emit an ISLADiagnostic.
			return "unknown", ""
		}
		return "book", bookID
	}
}

func executeSearch(ctx *ExecutionContext, n *SearchNode, transID string, limit int) (*models.CLIResult, error) {
	if ctx.VerseSearcher == nil {
		return nil, errors.New("verse searcher dependency not configured")
	}

	tid := parsers.ResolveTranslationID(transID)
	if tid == "" {
		effectiveTrans := inferTranslationFromScope(n.ScopeBook, ctx.DefaultTrans)
		tid = parsers.ResolveTranslationID(effectiveTrans)
	}

	searchScope, scopeValue := resolveSearchScope(n.ScopeBook)
	if searchScope == "unknown" {
		return nil, NewUnknownScopeDiagnostic(n.ScopeBook, 0)
	}

	// Build the effective query: for boolean mode, join terms with PostgreSQL
	// tsquery operators (& for AND, | for OR). The repository layer detects
	// the presence of these operators and switches from plainto_tsquery to to_tsquery.
	effectiveQuery := n.Query
	if len(n.Terms) > 1 && n.BoolMode != SearchBoolNone {
		sep := " & "
		if n.BoolMode == SearchBoolOR {
			sep = " | "
		}
		effectiveQuery = strings.Join(n.Terms, sep)
	}

	verses, err := ctx.VerseSearcher.SearchVerses(ctx.Ctx, effectiveQuery, n.IsRegex, tid, searchScope, scopeValue)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search: %w", err)
	}

	if limit > 0 && len(verses) > limit {
		verses = verses[:limit]
	}

	return &models.CLIResult{
		Type: "search",
		Data: map[string]interface{}{
			"query":       n.Query,
			"bool_mode":   string(n.BoolMode),
			"terms":       n.Terms,
			"is_regex":    n.IsRegex,
			"scope_book":  n.ScopeBook,
			"translation": tid,
			"verses":      verses,
			"count":       len(verses),
		},
	}, nil
}

// executeRange fetches all verses between Start and End references (inclusive).
// If both references belong to the same chapter of the same book, it fetches all verses
// in the range (e.g. range(Joh 1:1, Joh 1:5) -> verses 1..5).
// Otherwise, it retrieves the boundaries and combines them.
func executeRange(ctx *ExecutionContext, n *RangeNode) (*models.CLIResult, error) {
	if ctx.VerseFetcher == nil {
		return nil, errors.New("verse fetcher dependency is not configured")
	}
	tid := parsers.ResolveTranslationID(ctx.DefaultTrans)

	// Check if both start and end references are within the same chapter of the same book
	pStart, errStart := parsers.ParseReference(n.Start)
	pEnd, errEnd := parsers.ParseReference(n.End)
	if errStart == nil && errEnd == nil &&
		pStart.BookName != "" && pStart.BookName == pEnd.BookName &&
		pStart.Chapter > 0 && pStart.Chapter == pEnd.Chapter &&
		pStart.Scope == parsers.ScopeVerse && pEnd.Scope == parsers.ScopeVerse {
		endVerse := pEnd.VerseEnd
		if endVerse == 0 {
			endVerse = pEnd.VerseStart
		}
		if pStart.VerseStart > 0 && endVerse >= pStart.VerseStart {
			combinedRef := fmt.Sprintf("%s %d:%d-%d", pStart.BookName, pStart.Chapter, pStart.VerseStart, endVerse)
			verses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, combinedRef, tid)
			if err == nil && len(verses) > 0 {
				return &models.CLIResult{
					Type: "range",
					Data: map[string]interface{}{
						"start":       n.Start,
						"end":         n.End,
						"reference":   fmt.Sprintf("%s – %s", n.Start, n.End),
						"translation": tid,
						"verses":      verses,
						"count":       len(verses),
					},
				}, nil
			}
		}
	}

	startVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.Start, tid)
	if err != nil {
		return nil, fmt.Errorf("range(): failed to fetch start reference %q: %w", n.Start, err)
	}
	endVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.End, tid)
	if err != nil {
		return nil, fmt.Errorf("range(): failed to fetch end reference %q: %w", n.End, err)
	}

	// Combine: start verses + end verses deduplicated (boundary fetch).
	seen := make(map[string]struct{}, len(startVerses)+len(endVerses))
	all := make([]models.Verse, 0, len(startVerses)+len(endVerses))
	for _, v := range append(startVerses, endVerses...) {
		key := fmt.Sprintf("%s-%d-%d", v.BookID, v.Chapter, v.Verse)
		if _, dup := seen[key]; !dup {
			seen[key] = struct{}{}
			all = append(all, v)
		}
	}

	return &models.CLIResult{
		Type: "range",
		Data: map[string]interface{}{
			"start":       n.Start,
			"end":         n.End,
			"reference":   fmt.Sprintf("%s – %s", n.Start, n.End),
			"translation": tid,
			"verses":      all,
			"count":       len(all),
		},
	}, nil
}

func executePipe(ctx *ExecutionContext, n *PipeNode) (*models.CLIResult, error) {
	action, isAction := n.Right.(*ActionNode)
	if !isAction {
		return nil, fmt.Errorf("pipeline target must be an action, got %T", n.Right)
	}

	// 1. Count aggregator => count()
	if action.Kind == "count" {
		return executeCountPipe(ctx, n.Left, action.Value)
	}

	// 2. Top word frequencies => top(10), words(10), top_words
	if action.Kind == "top" || action.Kind == "words" || action.Kind == "top_words" {
		limit := 10
		if action.Value != "" {
			if parsedLim, err := strconv.Atoi(action.Value); err == nil && parsedLim > 0 {
				limit = parsedLim
			}
		}
		return executeTopPipe(ctx, n.Left, limit)
	}

	// 3. Text statistics & Type-Token Ratio => stats(), ttr()
	if action.Kind == "stats" || action.Kind == "ttr" {
		return executeStatsPipe(ctx, n.Left, action.Value)
	}

	// 2. Parallel comparison vs(A, B) or compare(A, B)
	if action.Kind == "vs" || action.Kind == "compare" {
		if len(action.Args) >= 2 {
			if refNode, ok := n.Left.(*VerseRefNode); ok {
				return executeComparison(ctx, &ComparisonNode{
					Target: refNode,
					Left:   &ActionNode{Kind: "translation", Value: action.Args[0]},
					Right:  &ActionNode{Kind: "translation", Value: action.Args[1]},
				})
			}
			if rangeNode, ok := n.Left.(*RangeNode); ok {
				return executeComparison(ctx, &ComparisonNode{
					Target: rangeNode,
					Left:   &ActionNode{Kind: "translation", Value: action.Args[0]},
					Right:  &ActionNode{Kind: "translation", Value: action.Args[1]},
				})
			}
		}
	}

	// 3. Cross-references => refs(3)
	if action.Kind == "refs" {
		limit := 5
		if action.Value != "" {
			if parsedLim, err := strconv.Atoi(action.Value); err == nil && parsedLim > 0 {
				limit = parsedLim
			}
		}
		if ctx.RefsFinder == nil {
			return nil, errors.New("refs finder dependency not configured")
		}

		refStr := ""
		transID := ctx.DefaultTrans
		if refNode, ok := n.Left.(*VerseRefNode); ok {
			refStr = refNode.Reference
		} else if rangeNode, ok := n.Left.(*RangeNode); ok {
			refStr = rangeNode.Start
		} else if pipeNode, ok := n.Left.(*PipeNode); ok {
			// Pipeline chaining: @Joh 3:16 => use(KR92) => refs(3) or range(...) => use(KR92) => refs(3)
			if innerAct, isAct := pipeNode.Right.(*ActionNode); isAct && (innerAct.Kind == "use" || innerAct.Kind == "in" || innerAct.Kind == "translation") {
				transID = innerAct.Value
			}
			if innerRef := extractRootVerseRefNode(pipeNode); innerRef != nil {
				refStr = innerRef.Reference
			} else if innerRange := extractRootRangeNode(pipeNode); innerRange != nil {
				refStr = innerRange.Start
			}
		}

		if refStr != "" {
			verses, err := ctx.RefsFinder(ctx.Ctx, refStr, transID, limit)
			if err != nil {
				return nil, err
			}
			return &models.CLIResult{
				Type: "refs",
				Data: map[string]interface{}{
					"source":      refStr,
					"translation": transID,
					"references":  verses,
					"count":       len(verses),
				},
			}, nil
		}
	}

	// 4. Themes analysis => themes(5)
	if action.Kind == "themes" {
		limit := 10
		if action.Value != "" {
			if parsedLim, err := strconv.Atoi(action.Value); err == nil && parsedLim > 0 {
				limit = parsedLim
			}
		}
		if _, isScope := n.Left.(*ScopeNode); isScope {
			return executeThemesOnText(ctx, StripISLAFromText(ctx.ContextText), limit)
		}
		res, err := Execute(ctx, n.Left)
		if err != nil {
			return nil, err
		}
		var sb strings.Builder
		if verses, ok := res.Data["verses"].([]models.Verse); ok {
			for _, v := range verses {
				sb.WriteString(v.Text + " ")
			}
		}
		return executeThemesOnText(ctx, sb.String(), limit)
	}

	// 5. Suggestions => suggest(3)
	if action.Kind == "suggest" {
		limit := 5
		if action.Value != "" {
			if parsedLim, err := strconv.Atoi(action.Value); err == nil && parsedLim > 0 {
				limit = parsedLim
			}
		}
		if ctx.SuggestFinder == nil {
			return nil, errors.New("suggest finder dependency not configured")
		}
		targetText := StripISLAFromText(ctx.ContextText)
		if _, isScope := n.Left.(*ScopeNode); !isScope {
			if res, err := Execute(ctx, n.Left); err == nil {
				if verses, ok := res.Data["verses"].([]models.Verse); ok && len(verses) > 0 {
					var sb strings.Builder
					for _, v := range verses {
						sb.WriteString(v.Text + " ")
					}
					targetText = strings.TrimSpace(sb.String())
				}
			}
		}
		suggestions, keywords, err := ctx.SuggestFinder(ctx.Ctx, targetText, ctx.DefaultTrans, limit)
		if err != nil {
			return nil, err
		}
		return &models.CLIResult{
			Type: "suggest",
			Data: map[string]interface{}{
				"keywords":    keywords,
				"suggestions": suggestions,
				"count":       len(suggestions),
			},
		}, nil
	}

	// 6. Scope in pipeline (search("armo") => @Joh or => at(Room))
	if action.Kind == "scope" {
		if searchNode, isSearch := n.Left.(*SearchNode); isSearch {
			searchNode.ScopeBook = action.Value
			return executeSearch(ctx, searchNode, "", 0)
		}
	}

	// 7. Other pipeline actions (use, in, translation, limit)
	switch src := n.Left.(type) {
	case *VerseRefNode:
		if action.Kind == "use" || action.Kind == "in" || action.Kind == "translation" {
			return executeVerseRef(ctx, src, action.Value)
		}
		res, err := executeVerseRef(ctx, src, ctx.DefaultTrans)
		if err != nil {
			return nil, err
		}
		return applyActionToResult(ctx, res, action)

	case *SearchNode:
		if action.Kind == "use" || action.Kind == "in" || action.Kind == "translation" {
			return executeSearch(ctx, src, action.Value, 0)
		}
		if action.Kind == "limit" {
			lim, _ := strconv.Atoi(action.Value)
			return executeSearch(ctx, src, "", lim)
		}
		res, err := executeSearch(ctx, src, "", 0)
		if err != nil {
			return nil, err
		}
		return applyActionToResult(ctx, res, action)

	case *ScopeNode:
		res, err := executeScope(ctx, src)
		if err != nil {
			return nil, err
		}
		return applyActionToResult(ctx, res, action)

	case *RangeNode:
		if action.Kind == "use" || action.Kind == "in" || action.Kind == "translation" {
			prevTrans := ctx.DefaultTrans
			ctx.DefaultTrans = action.Value
			res, err := executeRange(ctx, src)
			ctx.DefaultTrans = prevTrans
			return res, err
		}
		res, err := executeRange(ctx, src)
		if err != nil {
			return nil, err
		}
		return applyActionToResult(ctx, res, action)

	case *PipeNode:
		if action.Kind == "use" || action.Kind == "in" || action.Kind == "translation" {
			if refNode := extractRootVerseRefNode(src); refNode != nil {
				return executeVerseRef(ctx, refNode, action.Value)
			}
			if searchNode := extractRootSearchNode(src); searchNode != nil {
				_, scopeVal := extractPipedSearchOptions(src, "")
				if scopeVal != "" {
					searchNode.ScopeBook = scopeVal
				}
				return executeSearch(ctx, searchNode, action.Value, 0)
			}
			if rangeNode := extractRootRangeNode(src); rangeNode != nil {
				prevTrans := ctx.DefaultTrans
				ctx.DefaultTrans = action.Value
				res, err := executeRange(ctx, rangeNode)
				ctx.DefaultTrans = prevTrans
				return res, err
			}
		}
		res, err := executePipe(ctx, src)
		if err != nil {
			return nil, err
		}
		return applyActionToResult(ctx, res, action)

	default:
		return nil, fmt.Errorf("unsupported pipeline source type: %T", n.Left)
	}
}

func extractRootSearchNode(n Node) *SearchNode {
	switch t := n.(type) {
	case *SearchNode:
		return t
	case *PipeNode:
		return extractRootSearchNode(t.Left)
	default:
		return nil
	}
}

func extractRootVerseRefNode(n Node) *VerseRefNode {
	switch t := n.(type) {
	case *VerseRefNode:
		return t
	case *PipeNode:
		return extractRootVerseRefNode(t.Left)
	default:
		return nil
	}
}

func extractRootRangeNode(n Node) *RangeNode {
	switch t := n.(type) {
	case *RangeNode:
		return t
	case *PipeNode:
		return extractRootRangeNode(t.Left)
	default:
		return nil
	}
}

func extractPipedSearchOptions(n Node, defaultTid string) (string, string) {
	tid := defaultTid
	scopeVal := ""

	var walk func(node Node)
	walk = func(node Node) {
		if p, ok := node.(*PipeNode); ok {
			if act, isAct := p.Right.(*ActionNode); isAct {
				switch act.Kind {
				case "use", "in", "translation":
					tid = parsers.ResolveTranslationID(act.Value)
				case "scope":
					scopeVal = act.Value
				}
			}
			walk(p.Left)
		}
	}
	walk(n)

	return tid, scopeVal
}

func aggregateCount(verses []models.Verse, unit string) int {
	switch unit {
	case "books":
		uniqueBooks := make(map[string]struct{})
		for _, v := range verses {
			if v.BookID != "" {
				uniqueBooks[v.BookID] = struct{}{}
			}
		}
		return len(uniqueBooks)
	case "chapters":
		uniqueChapters := make(map[string]struct{})
		for _, v := range verses {
			if v.BookID != "" && v.Chapter > 0 {
				key := fmt.Sprintf("%s-%d", v.BookID, v.Chapter)
				uniqueChapters[key] = struct{}{}
			}
		}
		return len(uniqueChapters)
	case "words":
		totalWords := 0
		for _, v := range verses {
			if v.Text != "" {
				totalWords += len(strings.Fields(v.Text))
			}
		}
		return totalWords
	case "unique_words":
		seen := make(map[string]struct{})
		for _, v := range verses {
			if v.Text != "" {
				for _, w := range strings.Fields(v.Text) {
					cleaned := strings.Trim(strings.ToLower(w), ".,;:!?\"'()[]{}«»—–-")
					if cleaned != "" {
						seen[cleaned] = struct{}{}
					}
				}
			}
		}
		return len(seen)
	case "verses":
		fallthrough
	default:
		return len(verses)
	}
}

// StripISLAFromText strips all ISLA directives, code blocks, embeds, and triggers from text,
// leaving only the user's natural language notes and narrative prose.
func StripISLAFromText(text string) string {
	if text == "" {
		return ""
	}
	lines := strings.Split(text, "\n")
	var kept []string
	inISLABlock := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		lower := strings.ToLower(trimmed)
		if strings.HasPrefix(lower, "```isla") {
			inISLABlock = true
			continue
		}
		if inISLABlock {
			if strings.HasPrefix(trimmed, "```") {
				inISLABlock = false
			}
			continue
		}
		// Skip directive lines starting with ! or isla
		if strings.HasPrefix(trimmed, "!") || strings.HasPrefix(lower, "isla ") {
			continue
		}
		// Skip standalone DSL triggers
		if strings.HasPrefix(trimmed, "^") && strings.Contains(trimmed, "=>") {
			continue
		}
		if strings.HasPrefix(trimmed, "@") || strings.HasPrefix(trimmed, "?") || strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "~") {
			continue
		}
		kept = append(kept, line)
	}
	return strings.TrimSpace(strings.Join(kept, "\n"))
}

func executeCountPipe(ctx *ExecutionContext, left Node, unit string) (*models.CLIResult, error) {
	if unit == "" {
		unit = "verses"
	}
	defaultTid := parsers.ResolveTranslationID(ctx.DefaultTrans)
	if defaultTid == "" {
		defaultTid = "web"
	}

	switch target := left.(type) {
	case *SearchNode:
		if ctx.VerseSearcher == nil {
			return nil, errors.New("verse searcher dependency not configured")
		}
		searchTid := parsers.ResolveTranslationID(inferTranslationFromScope(target.ScopeBook, defaultTid))
		searchScope, scopeValue := resolveSearchScope(target.ScopeBook)
		verses, err := ctx.VerseSearcher.SearchVerses(ctx.Ctx, target.Query, target.IsRegex, searchTid, searchScope, scopeValue)
		if err != nil {
			return nil, fmt.Errorf("failed to search verses for count: %w", err)
		}
		count := aggregateCount(verses, unit)
		return &models.CLIResult{
			Type: "count",
			Data: map[string]interface{}{
				"target_type": "search",
				"query":       target.Query,
				"is_regex":    target.IsRegex,
				"scope_book":  target.ScopeBook,
				"count":       count,
				"unit":        unit,
				"translation": searchTid,
			},
		}, nil

	case *VerseRefNode:
		if ctx.VerseFetcher == nil {
			return nil, errors.New("verse fetcher dependency not configured")
		}
		verses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, target.Reference, defaultTid)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch verses for count: %w", err)
		}
		count := aggregateCount(verses, unit)
		return &models.CLIResult{
			Type: "count",
			Data: map[string]interface{}{
				"target_type": "reference",
				"reference":   target.Reference,
				"count":       count,
				"unit":        unit,
				"translation": defaultTid,
			},
		}, nil

	case *RangeNode:
		res, err := executeRange(ctx, target)
		if err != nil {
			return nil, err
		}
		count := 0
		if verses, ok := res.Data["verses"].([]models.Verse); ok {
			count = aggregateCount(verses, unit)
		}
		return &models.CLIResult{
			Type: "count",
			Data: map[string]interface{}{
				"target_type": "range",
				"reference":   fmt.Sprintf("%s – %s", target.Start, target.End),
				"count":       count,
				"unit":        unit,
				"translation": res.Data["translation"],
			},
		}, nil

	case *PipeNode:
		// Piped search or verse reference: e.g. search("armo") => at(evankeliumit) => use(KR92) => count()
		tid, scopeVal := extractPipedSearchOptions(target, "")
		if searchNode := extractRootSearchNode(target); searchNode != nil {
			if scopeVal != "" {
				searchNode.ScopeBook = scopeVal
			}
			if tid == "" {
				tid = parsers.ResolveTranslationID(inferTranslationFromScope(searchNode.ScopeBook, defaultTid))
			}
			searchScope, scopeValue := resolveSearchScope(searchNode.ScopeBook)
			verses, err := ctx.VerseSearcher.SearchVerses(ctx.Ctx, searchNode.Query, searchNode.IsRegex, tid, searchScope, scopeValue)
			if err != nil {
				return nil, fmt.Errorf("failed to search verses for count: %w", err)
			}
			count := aggregateCount(verses, unit)
			return &models.CLIResult{
				Type: "count",
				Data: map[string]interface{}{
					"target_type": "search",
					"query":       searchNode.Query,
					"is_regex":    searchNode.IsRegex,
					"scope_book":  searchNode.ScopeBook,
					"count":       count,
					"unit":        unit,
					"translation": tid,
				},
			}, nil
		}
		if refNode := extractRootVerseRefNode(target); refNode != nil {
			if tid == "" {
				tid = defaultTid
			}
			verses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, refNode.Reference, tid)
			if err != nil {
				return nil, fmt.Errorf("failed to fetch verses for count: %w", err)
			}
			count := aggregateCount(verses, unit)
			return &models.CLIResult{
				Type: "count",
				Data: map[string]interface{}{
					"target_type": "reference",
					"reference":   refNode.Reference,
					"count":       count,
					"unit":        unit,
					"translation": tid,
				},
			}, nil
		}
		if rangeNode := extractRootRangeNode(target); rangeNode != nil {
			if tid == "" {
				tid = defaultTid
			}
			prevDefault := ctx.DefaultTrans
			ctx.DefaultTrans = tid
			res, err := executeRange(ctx, rangeNode)
			ctx.DefaultTrans = prevDefault
			if err != nil {
				return nil, fmt.Errorf("failed to fetch range for count: %w", err)
			}
			count := 0
			if verses, ok := res.Data["verses"].([]models.Verse); ok {
				count = aggregateCount(verses, unit)
			}
			return &models.CLIResult{
				Type: "count",
				Data: map[string]interface{}{
					"target_type": "range",
					"reference":   fmt.Sprintf("%s – %s", rangeNode.Start, rangeNode.End),
					"count":       count,
					"unit":        unit,
					"translation": tid,
				},
			}, nil
		}
		return nil, fmt.Errorf("unsupported piped count target: %T", target)

	case *ScopeNode:
		text := StripISLAFromText(ctx.ContextText)
		count := 0
		switch unit {
		case "words":
			if text != "" {
				total := 0
				for _, w := range strings.Fields(text) {
					cleaned := strings.Trim(w, ".,;:!?\"'()[]{}«»—–-#*`_~")
					if cleaned != "" {
						total++
					}
				}
				count = total
			}
		case "unique_words":
			if text != "" {
				seen := make(map[string]struct{})
				for _, w := range strings.Fields(text) {
					cleaned := strings.Trim(strings.ToLower(w), ".,;:!?\"'()[]{}«»—–-#*`_~")
					if cleaned != "" {
						seen[cleaned] = struct{}{}
					}
				}
				count = len(seen)
			}
		case "verses":
			if text != "" {
				lines := strings.Split(strings.TrimSpace(text), "\n")
				count = len(lines)
			}
		default:
			if text != "" {
				total := 0
				for _, w := range strings.Fields(text) {
					cleaned := strings.Trim(w, ".,;:!?\"'()[]{}«»—–-#*`_~")
					if cleaned != "" {
						total++
					}
				}
				count = total
			}
		}
		return &models.CLIResult{
			Type: "count",
			Data: map[string]interface{}{
				"target_type": "context",
				"count":       count,
				"unit":        unit,
			},
		}, nil

	default:
		return nil, fmt.Errorf("cannot count elements for node type %T", left)
	}
}

func executeComparison(ctx *ExecutionContext, n *ComparisonNode) (*models.CLIResult, error) {
	leftTrans := parsers.ResolveTranslationID(ctx.DefaultTrans)
	if leftAct, ok := n.Left.(*ActionNode); ok && leftAct.Value != "" {
		leftTrans = parsers.ResolveTranslationID(leftAct.Value)
	}

	rightTrans := parsers.ResolveTranslationID(ctx.DefaultTrans)
	if rightAct, ok := n.Right.(*ActionNode); ok && rightAct.Value != "" {
		rightTrans = parsers.ResolveTranslationID(rightAct.Value)
	}

	if ctx.VerseFetcher == nil {
		return nil, errors.New("verse fetcher dependency not configured")
	}

	if refNode, ok := n.Target.(*VerseRefNode); ok {
		leftVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, refNode.Reference, leftTrans)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch left verses %q: %w", leftTrans, err)
		}

		rightVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, refNode.Reference, rightTrans)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch right verses %q: %w", rightTrans, err)
		}

		return &models.CLIResult{
			Type: "compare",
			Data: map[string]interface{}{
				"reference": refNode.Reference,
				"left": map[string]interface{}{
					"translation": leftTrans,
					"verses":      leftVerses,
				},
				"right": map[string]interface{}{
					"translation": rightTrans,
					"verses":      rightVerses,
				},
			},
		}, nil
	}

	if rangeNode, ok := n.Target.(*RangeNode); ok {
		prevTrans := ctx.DefaultTrans
		ctx.DefaultTrans = leftTrans
		leftRes, err := executeRange(ctx, rangeNode)
		ctx.DefaultTrans = prevTrans
		if err != nil {
			return nil, fmt.Errorf("failed to fetch left verses %q: %w", leftTrans, err)
		}
		var leftVerses []models.Verse
		if v, ok := leftRes.Data["verses"].([]models.Verse); ok {
			leftVerses = v
		}

		ctx.DefaultTrans = rightTrans
		rightRes, err := executeRange(ctx, rangeNode)
		ctx.DefaultTrans = prevTrans
		if err != nil {
			return nil, fmt.Errorf("failed to fetch right verses %q: %w", rightTrans, err)
		}
		var rightVerses []models.Verse
		if v, ok := rightRes.Data["verses"].([]models.Verse); ok {
			rightVerses = v
		}

		return &models.CLIResult{
			Type: "compare",
			Data: map[string]interface{}{
				"reference": fmt.Sprintf("%s – %s", rangeNode.Start, rangeNode.End),
				"left": map[string]interface{}{
					"translation": leftTrans,
					"verses":      leftVerses,
				},
				"right": map[string]interface{}{
					"translation": rightTrans,
					"verses":      rightVerses,
				},
			},
		}, nil
	}

	return nil, fmt.Errorf("comparison target must be a verse reference or range, got %T", n.Target)
}

func executeScope(ctx *ExecutionContext, _ *ScopeNode) (*models.CLIResult, error) {
	return executeThemesOnText(ctx, ctx.ContextText, 10)
}

func executeThemesOnText(ctx *ExecutionContext, text string, limit int) (*models.CLIResult, error) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" || ctx.ThemeExtractor == nil {
		return &models.CLIResult{
			Type: "themes",
			Data: map[string]interface{}{
				"themes": []models.ThemeItem{},
				"limit":  limit,
				"count":  0,
			},
		}, nil
	}

	themes := ctx.ThemeExtractor(trimmed, limit)
	return &models.CLIResult{
		Type: "themes",
		Data: map[string]interface{}{
			"themes": themes,
			"limit":  limit,
			"count":  len(themes),
		},
	}, nil
}

func applyActionToResult(_ *ExecutionContext, res *models.CLIResult, action *ActionNode) (*models.CLIResult, error) {
	if action.Kind == "limit" {
		lim, _ := strconv.Atoi(action.Value)
		if lim > 0 && res.Data != nil {
			if verses, ok := res.Data["verses"].([]models.Verse); ok && len(verses) > lim {
				res.Data["verses"] = verses[:lim]
				res.Data["count"] = lim
			}
			if refs, ok := res.Data["references"].([]models.Verse); ok && len(refs) > lim {
				res.Data["references"] = refs[:lim]
				res.Data["count"] = lim
			}
			if suggs, ok := res.Data["suggestions"].([]models.Verse); ok && len(suggs) > lim {
				res.Data["suggestions"] = suggs[:lim]
				res.Data["count"] = lim
			}
			if themes, ok := res.Data["themes"].([]models.ThemeItem); ok && len(themes) > lim {
				res.Data["themes"] = themes[:lim]
				res.Data["count"] = lim
			}
		}
	}
	if action.Kind == "style" || action.Kind == "card" || action.Kind == "cards" {
		if res.Data == nil {
			res.Data = make(map[string]interface{})
		}
		res.Data["viewStyle"] = action.Value
		if action.Value == "" {
			res.Data["viewStyle"] = action.Kind
		}
	}
	return res, nil
}

func extractTargetContent(ctx *ExecutionContext, left Node) ([]models.Verse, string, error) {
	if _, isScope := left.(*ScopeNode); isScope {
		return nil, StripISLAFromText(ctx.ContextText), nil
	}

	res, err := Execute(ctx, left)
	if err != nil {
		return nil, "", err
	}

	if verses, ok := res.Data["verses"].([]models.Verse); ok && len(verses) > 0 {
		return verses, "", nil
	}

	if text, ok := res.Data["text"].(string); ok && text != "" {
		return nil, text, nil
	}

	return nil, "", nil
}

func defaultAnalytics(verses []models.Verse, text string, topN int) AnalyticsData {
	if topN <= 0 {
		topN = 10
	}
	if topN > 1000 {
		topN = 1000
	}

	var combinedText strings.Builder
	if text != "" {
		combinedText.WriteString(text)
	} else if len(verses) > 0 {
		for i, v := range verses {
			if i > 0 {
				combinedText.WriteString(" ")
			}
			combinedText.WriteString(v.Text)
		}
	}

	content := strings.TrimSpace(combinedText.String())
	if content == "" {
		return AnalyticsData{
			TopWords: []models.ThemeItem{},
		}
	}

	rawWords := strings.Fields(content)
	tokenCount := len(rawWords)
	totalCharCount := len([]rune(content))

	freqMap := make(map[string]int)
	cleanCharSum := 0
	cleanWordCount := 0

	for _, w := range rawWords {
		cleaned := strings.Trim(strings.ToLower(w), ".,;:!?\"'()[]{}«»—–-")
		if cleaned == "" {
			continue
		}
		freqMap[cleaned]++
		cleanCharSum += len([]rune(cleaned))
		cleanWordCount++
	}

	uniqueCount := len(freqMap)
	ttr := 0.0
	if tokenCount > 0 {
		ttr = float64(uniqueCount) / float64(tokenCount)
	}

	avgWordLen := 0.0
	if cleanWordCount > 0 {
		avgWordLen = float64(cleanCharSum) / float64(cleanWordCount)
		avgWordLen = float64(int(avgWordLen*100+0.5)) / 100
	}

	type wordFreq struct {
		word  string
		count int
	}
	var sortedList []wordFreq
	for w, c := range freqMap {
		sortedList = append(sortedList, wordFreq{word: w, count: c})
	}
	sort.Slice(sortedList, func(i, j int) bool {
		if sortedList[i].count == sortedList[j].count {
			return sortedList[i].word < sortedList[j].word
		}
		return sortedList[i].count > sortedList[j].count
	})

	if len(sortedList) > topN {
		sortedList = sortedList[:topN]
	}

	topWords := make([]models.ThemeItem, len(sortedList))
	for i, item := range sortedList {
		topWords[i] = models.ThemeItem{
			Word:  item.word,
			Count: item.count,
		}
	}

	return AnalyticsData{
		TokenCount:        tokenCount,
		UniqueTokenCount:  uniqueCount,
		TypeTokenRatio:    ttr,
		CharacterCount:    totalCharCount,
		AverageWordLength: avgWordLen,
		TopWords:          topWords,
	}
}

func executeTopPipe(ctx *ExecutionContext, left Node, limit int) (*models.CLIResult, error) {
	verses, text, err := extractTargetContent(ctx, left)
	if err != nil {
		return nil, err
	}

	var data AnalyticsData
	if ctx.AnalyticsFinder != nil {
		data = ctx.AnalyticsFinder(verses, text, limit)
	} else {
		data = defaultAnalytics(verses, text, limit)
	}

	return &models.CLIResult{
		Type: "words",
		Data: map[string]interface{}{
			"words":            data.TopWords,
			"limit":            limit,
			"count":            len(data.TopWords),
			"token_count":      data.TokenCount,
			"unique_tokens":    data.UniqueTokenCount,
			"type_token_ratio": data.TypeTokenRatio,
		},
	}, nil
}

func executeStatsPipe(ctx *ExecutionContext, left Node, mode string) (*models.CLIResult, error) {
	verses, text, err := extractTargetContent(ctx, left)
	if err != nil {
		return nil, err
	}

	var data AnalyticsData
	if ctx.AnalyticsFinder != nil {
		data = ctx.AnalyticsFinder(verses, text, 10)
	} else {
		data = defaultAnalytics(verses, text, 10)
	}

	return &models.CLIResult{
		Type: "stats",
		Data: map[string]interface{}{
			"mode":             mode,
			"token_count":      data.TokenCount,
			"unique_tokens":    data.UniqueTokenCount,
			"type_token_ratio": data.TypeTokenRatio,
			"character_count":  data.CharacterCount,
			"avg_word_length":  data.AverageWordLength,
			"top_words":        data.TopWords,
		},
	}, nil
}
