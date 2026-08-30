package dsl

import (
	"context"
	"errors"
	"fmt"
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

// ExecutionContext is the runtime context for AST evaluation.
type ExecutionContext struct {
	Ctx            context.Context
	DefaultTrans   string
	ContextText    string
	VerseFetcher   VerseFetcher
	VerseSearcher  VerseSearcher
	ThemeExtractor func(text string, limit int) []models.ThemeItem
	RefsFinder     func(ctx context.Context, ref, translationID string, limit int) ([]models.Verse, error)
	SuggestFinder  func(ctx context.Context, contextText, translationID string, limit int) ([]models.Verse, []string, error)
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

// executeRange fetches all verses between Start and End references (inclusive)
// by retrieving each boundary and returning them as a combined passage result.
// Both references are resolved with the default translation.
func executeRange(ctx *ExecutionContext, n *RangeNode) (*models.CLIResult, error) {
	if ctx.VerseFetcher == nil {
		return nil, errors.New("verse fetcher dependency is not configured")
	}
	tid := parsers.ResolveTranslationID(ctx.DefaultTrans)

	startVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.Start, tid)
	if err != nil {
		return nil, fmt.Errorf("range(): failed to fetch start reference %q: %w", n.Start, err)
	}
	endVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.End, tid)
	if err != nil {
		return nil, fmt.Errorf("range(): failed to fetch end reference %q: %w", n.End, err)
	}

	// Combine: start verses + end verses deduplicated (simple boundary fetch).
	// Full between-query support requires a GetVerseRange repo method (future work).
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
		return executeCountPipe(ctx, n.Left)
	}

	// 2. Parallel comparison vs(A, B) or compare(A, B)
	if action.Kind == "vs" || action.Kind == "compare" {
		if refNode, ok := n.Left.(*VerseRefNode); ok && len(action.Args) >= 2 {
			return executeComparison(ctx, &ComparisonNode{
				Target: refNode,
				Left:   &ActionNode{Kind: "translation", Value: action.Args[0]},
				Right:  &ActionNode{Kind: "translation", Value: action.Args[1]},
			})
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
		} else if pipeNode, ok := n.Left.(*PipeNode); ok {
			// Pipeline chaining: @Joh 3:16 => use(KR92) => refs(3)
			if innerAct, isAct := pipeNode.Right.(*ActionNode); isAct && (innerAct.Kind == "use" || innerAct.Kind == "in" || innerAct.Kind == "translation") {
				transID = innerAct.Value
			}
			if innerRef, isRef := pipeNode.Left.(*VerseRefNode); isRef {
				refStr = innerRef.Reference
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
		if refNode, ok := n.Left.(*VerseRefNode); ok {
			res, err := executeVerseRef(ctx, refNode, ctx.DefaultTrans)
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
		if _, isScope := n.Left.(*ScopeNode); isScope {
			return executeThemesOnText(ctx, ctx.ContextText, limit)
		}
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
		targetText := ctx.ContextText
		if refNode, ok := n.Left.(*VerseRefNode); ok {
			res, err := executeVerseRef(ctx, refNode, ctx.DefaultTrans)
			if err == nil {
				if verses, ok := res.Data["verses"].([]models.Verse); ok && len(verses) > 0 {
					targetText = verses[0].Text
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
		}
		res, err := executePipe(ctx, src)
		if err != nil {
			return nil, err
		}
		if action.Kind == "limit" {
			lim, _ := strconv.Atoi(action.Value)
			if verses, ok := res.Data["verses"].([]models.Verse); ok && lim > 0 && len(verses) > lim {
				res.Data["verses"] = verses[:lim]
				res.Data["count"] = lim
			}
			if refs, ok := res.Data["references"].([]models.Verse); ok && lim > 0 && len(refs) > lim {
				res.Data["references"] = refs[:lim]
				res.Data["count"] = lim
			}
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

func executeCountPipe(ctx *ExecutionContext, left Node) (*models.CLIResult, error) {
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
		return &models.CLIResult{
			Type: "count",
			Data: map[string]interface{}{
				"target_type": "search",
				"query":       target.Query,
				"is_regex":    target.IsRegex,
				"scope_book":  target.ScopeBook,
				"count":       len(verses),
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
		return &models.CLIResult{
			Type: "count",
			Data: map[string]interface{}{
				"target_type": "reference",
				"reference":   target.Reference,
				"count":       len(verses),
				"translation": defaultTid,
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
			return &models.CLIResult{
				Type: "count",
				Data: map[string]interface{}{
					"target_type": "search",
					"query":       searchNode.Query,
					"is_regex":    searchNode.IsRegex,
					"scope_book":  searchNode.ScopeBook,
					"count":       len(verses),
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
			return &models.CLIResult{
				Type: "count",
				Data: map[string]interface{}{
					"target_type": "reference",
					"reference":   refNode.Reference,
					"count":       len(verses),
					"translation": tid,
				},
			}, nil
		}
		return nil, fmt.Errorf("unsupported piped count target: %T", target)

	default:
		return nil, fmt.Errorf("cannot count elements for node type %T", left)
	}
}

func executeComparison(ctx *ExecutionContext, n *ComparisonNode) (*models.CLIResult, error) {
	refNode, ok := n.Target.(*VerseRefNode)
	if !ok {
		return nil, fmt.Errorf("comparison target must be a verse reference, got %T", n.Target)
	}

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
