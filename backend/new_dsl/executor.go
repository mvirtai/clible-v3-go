package newdsl

import (
	"context"
	"errors"
	"fmt"
	"regexp"
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

var (
	islaLineRegex    = regexp.MustCompile(`(?m)^\s*(!|ISLA|isla)\s+.*$`)
	codeBlockRegex   = regexp.MustCompile("(?s)```.*?```")
	inlineCodeRegex  = regexp.MustCompile("`[^`]*`")
	nonAlphaRegex    = regexp.MustCompile(`[^a-zA-ZäöÄÖåÅ\s]+`)
	whitespaceRegex  = regexp.MustCompile(`\s+`)
)

// StripISLAFromText sanitises text by removing ISLA directives, code blocks,
// and markdown magic tokens before feeding into NLP algorithms.
func StripISLAFromText(text string) string {
	res := codeBlockRegex.ReplaceAllString(text, " ")
	res = inlineCodeRegex.ReplaceAllString(res, " ")
	res = islaLineRegex.ReplaceAllString(res, " ")
	res = whitespaceRegex.ReplaceAllString(res, " ")
	return strings.TrimSpace(res)
}

// Execute evaluates a parsed ISLAExpression and returns a structured CLIResult.
func Execute(ctx *ExecutionContext, expr *ISLAExpression) (*models.CLIResult, error) {
	if expr == nil {
		return nil, errors.New("cannot execute nil ISLA expression")
	}
	if ctx == nil {
		return nil, errors.New("execution context cannot be nil")
	}

	res, err := evaluateExpression(ctx, expr)
	if err != nil {
		return nil, err
	}

	// Attach OutputOp metadata to the result data map
	if res.Data == nil {
		res.Data = make(map[string]interface{})
	}

	outputKindStr := "inline"
	switch expr.Output.Kind {
	case OutputNewCellAbove:
		outputKindStr = "cell_above"
	case OutputNewCellBelow:
		outputKindStr = "cell_below"
	}

	res.Data["output_op"] = map[string]interface{}{
		"kind": outputKindStr,
		"name": expr.Output.Name,
		"raw":  expr.Output.String(),
	}

	return res, nil
}

func evaluateExpression(ctx *ExecutionContext, expr *ISLAExpression) (*models.CLIResult, error) {
	switch obj := expr.Object.(type) {
	case *VerseRefNode:
		return executeVerseRefExpr(ctx, obj, expr.Methods)
	case *RangeNode:
		return executeRangeExpr(ctx, obj, expr.Methods)
	case *SearchNode:
		return executeSearchExpr(ctx, obj, expr.Methods)
	case *CellCtxNode:
		return executeCellCtxExpr(ctx, obj, expr.Methods)
	default:
		return nil, fmt.Errorf("unsupported object type: %T", expr.Object)
	}
}

// -- Verse Reference Execution --------------------------------------------------

func executeVerseRefExpr(ctx *ExecutionContext, n *VerseRefNode, methods []MethodCall) (*models.CLIResult, error) {
	if ctx.VerseFetcher == nil {
		return nil, errors.New("verse fetcher dependency is not configured")
	}

	// Check if translation is overridden by .use(trans)
	transID := ctx.DefaultTrans
	for _, m := range methods {
		if m.Name == "use" && len(m.Args) > 0 {
			transID = m.Args[0]
			break
		}
	}
	tid := parsers.ResolveTranslationID(transID)
	if tid == "" {
		tid = parsers.ResolveTranslationID(ctx.DefaultTrans)
	}

	// Check if comparison .vs(trans1, trans2) is present
	for _, m := range methods {
		if m.Name == "vs" && len(m.Args) >= 2 {
			return executeComparison(ctx, n.Reference, m.Args[0], m.Args[1])
		}
	}

	// Check if cross-references .refs(limit) is present
	for _, m := range methods {
		if m.Name == "refs" {
			limit := 5
			if len(m.Args) > 0 {
				if parsedLim, err := strconv.Atoi(m.Args[0]); err == nil && parsedLim > 0 {
					limit = parsedLim
				}
			}
			if ctx.RefsFinder == nil {
				return nil, errors.New("refs finder dependency not configured")
			}
			verses, err := ctx.RefsFinder(ctx.Ctx, n.Reference, tid, limit)
			if err != nil {
				return nil, err
			}
			return &models.CLIResult{
				Type: "refs",
				Data: map[string]interface{}{
					"source":      n.Reference,
					"translation": tid,
					"references":  verses,
					"count":       len(verses),
				},
			}, nil
		}
	}

	verses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.Reference, tid)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch verses for %q: %w", n.Reference, err)
	}

	res := &models.CLIResult{
		Type: "read",
		Data: map[string]interface{}{
			"reference":   n.Reference,
			"translation": tid,
			"verses":      verses,
			"count":       len(verses),
		},
	}

	// Apply remaining analytical methods
	return applyAnalyticalMethods(ctx, res, verses, "", methods)
}

// -- Range Execution ------------------------------------------------------------

func executeRangeExpr(ctx *ExecutionContext, n *RangeNode, methods []MethodCall) (*models.CLIResult, error) {
	if ctx.VerseFetcher == nil {
		return nil, errors.New("verse fetcher dependency is not configured")
	}

	transID := ctx.DefaultTrans
	for _, m := range methods {
		if m.Name == "use" && len(m.Args) > 0 {
			transID = m.Args[0]
			break
		}
	}
	tid := parsers.ResolveTranslationID(transID)
	if tid == "" {
		tid = parsers.ResolveTranslationID(ctx.DefaultTrans)
	}

	var verses []models.Verse
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
			var err error
			verses, err = ctx.VerseFetcher.GetVerses(ctx.Ctx, combinedRef, tid)
			if err != nil {
				verses = nil
			}
		}
	}

	if len(verses) == 0 {
		startVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.Start, tid)
		if err != nil {
			return nil, fmt.Errorf("range(): failed to fetch start reference %q: %w", n.Start, err)
		}
		endVerses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, n.End, tid)
		if err != nil {
			return nil, fmt.Errorf("range(): failed to fetch end reference %q: %w", n.End, err)
		}

		seen := make(map[string]struct{}, len(startVerses)+len(endVerses))
		for _, v := range append(startVerses, endVerses...) {
			key := fmt.Sprintf("%s-%d-%d", v.BookID, v.Chapter, v.Verse)
			if _, dup := seen[key]; !dup {
				seen[key] = struct{}{}
				verses = append(verses, v)
			}
		}
	}

	res := &models.CLIResult{
		Type: "range",
		Data: map[string]interface{}{
			"start":       n.Start,
			"end":         n.End,
			"reference":   fmt.Sprintf("%s – %s", n.Start, n.End),
			"translation": tid,
			"verses":      verses,
			"count":       len(verses),
		},
	}

	return applyAnalyticalMethods(ctx, res, verses, "", methods)
}

// -- Search Execution -----------------------------------------------------------

func executeSearchExpr(ctx *ExecutionContext, n *SearchNode, methods []MethodCall) (*models.CLIResult, error) {
	if ctx.VerseSearcher == nil {
		return nil, errors.New("verse searcher dependency not configured")
	}

	// Extract search configurations from methods: .at(scope), .limit(n), .use(trans)
	scope := ""
	limit := 0
	transID := ""

	for _, m := range methods {
		switch m.Name {
		case "at":
			if len(m.Args) > 0 {
				scope = m.Args[0]
			}
		case "limit":
			if len(m.Args) > 0 {
				lim, _ := strconv.Atoi(m.Args[0])
				limit = lim
			}
		case "use":
			if len(m.Args) > 0 {
				transID = m.Args[0]
			}
		}
	}

	tid := parsers.ResolveTranslationID(transID)
	if tid == "" {
		effectiveTrans := inferTranslationFromScope(scope, ctx.DefaultTrans)
		tid = parsers.ResolveTranslationID(effectiveTrans)
	}

	searchScope, scopeValue := resolveSearchScope(scope)
	if searchScope == "unknown" {
		return nil, fmt.Errorf("unknown search scope %q", scope)
	}

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

	res := &models.CLIResult{
		Type: "search",
		Data: map[string]interface{}{
			"query":       n.Query,
			"bool_mode":   string(n.BoolMode),
			"terms":       n.Terms,
			"is_regex":    n.IsRegex,
			"scope_book":  scope,
			"translation": tid,
			"verses":      verses,
			"count":       len(verses),
		},
	}

	return applyAnalyticalMethods(ctx, res, verses, "", methods)
}

// -- Cell Context Execution -----------------------------------------------------

func executeCellCtxExpr(ctx *ExecutionContext, n *CellCtxNode, methods []MethodCall) (*models.CLIResult, error) {
	text := StripISLAFromText(ctx.ContextText)

	res := &models.CLIResult{
		Type: "cell_context",
		Data: map[string]interface{}{
			"count": n.Count,
			"all":   n.All,
			"text":  text,
		},
	}

	return applyAnalyticalMethods(ctx, res, nil, text, methods)
}

// -- Analytical & Aggregation Methods -------------------------------------------

func applyAnalyticalMethods(ctx *ExecutionContext, baseRes *models.CLIResult, verses []models.Verse, text string, methods []MethodCall) (*models.CLIResult, error) {
	currentRes := baseRes

	for _, m := range methods {
		switch m.Name {
		case "count":
			unit := "verses"
			if len(m.Args) > 0 {
				unit = normalizeCountUnit(m.Args[0])
			}
			cnt := aggregateCount(verses, text, unit)
			currentRes = &models.CLIResult{
				Type: "count",
				Data: map[string]interface{}{
					"count": cnt,
					"unit":  unit,
				},
			}

		case "top":
			limit := 10
			if len(m.Args) > 0 {
				if lim, err := strconv.Atoi(m.Args[0]); err == nil && lim > 0 {
					limit = lim
				}
			}
			if ctx.AnalyticsFinder != nil {
				analytics := ctx.AnalyticsFinder(verses, text, limit)
				currentRes = &models.CLIResult{
					Type: "words",
					Data: map[string]interface{}{
						"words":            analytics.TopWords,
						"top_words":        analytics.TopWords,
						"limit":            limit,
						"count":            len(analytics.TopWords),
						"token_count":      analytics.TokenCount,
						"unique_tokens":    analytics.UniqueTokenCount,
						"type_token_ratio": analytics.TypeTokenRatio,
					},
				}
			} else {
				items := extractTopFrequencies(aggregateText(verses, text), limit)
				currentRes = &models.CLIResult{
					Type: "words",
					Data: map[string]interface{}{
						"words":     items,
						"top_words": items,
						"limit":     limit,
						"count":     len(items),
					},
				}
			}

		case "stats":
			if ctx.AnalyticsFinder != nil {
				analytics := ctx.AnalyticsFinder(verses, text, 10)
				currentRes = &models.CLIResult{
					Type: "stats",
					Data: map[string]interface{}{
						"token_count":        analytics.TokenCount,
						"unique_token_count": analytics.UniqueTokenCount,
						"type_token_ratio":   analytics.TypeTokenRatio,
						"character_count":    analytics.CharacterCount,
						"avg_word_length":    analytics.AverageWordLength,
						"top_words":          analytics.TopWords,
					},
				}
			} else {
				analytics := computeBasicAnalytics(aggregateText(verses, text))
				currentRes = &models.CLIResult{
					Type: "stats",
					Data: map[string]interface{}{
						"token_count":        analytics.TokenCount,
						"unique_token_count": analytics.UniqueTokenCount,
						"type_token_ratio":   analytics.TypeTokenRatio,
						"character_count":    analytics.CharacterCount,
						"avg_word_length":    analytics.AverageWordLength,
					},
				}
			}

		case "themes":
			limit := 10
			if len(m.Args) > 0 {
				if lim, err := strconv.Atoi(m.Args[0]); err == nil && lim > 0 {
					limit = lim
				}
			}
			targetText := aggregateText(verses, text)
			var themeItems []models.ThemeItem
			if ctx.ThemeExtractor != nil {
				themeItems = ctx.ThemeExtractor(targetText, limit)
			} else {
				themeItems = extractTopFrequencies(targetText, limit)
			}
			currentRes = &models.CLIResult{
				Type: "themes",
				Data: map[string]interface{}{
					"themes": themeItems,
					"count":  len(themeItems),
				},
			}

		case "suggest":
			limit := 5
			if len(m.Args) > 0 {
				if lim, err := strconv.Atoi(m.Args[0]); err == nil && lim > 0 {
					limit = lim
				}
			}
			if ctx.SuggestFinder == nil {
				return nil, errors.New("suggest finder dependency not configured")
			}
			targetText := aggregateText(verses, text)
			sugVerses, keywords, err := ctx.SuggestFinder(ctx.Ctx, targetText, ctx.DefaultTrans, limit)
			if err != nil {
				return nil, err
			}
			currentRes = &models.CLIResult{
				Type: "suggest",
				Data: map[string]interface{}{
					"keywords":    keywords,
					"suggestions": sugVerses,
					"count":       len(sugVerses),
				},
			}
		}
	}

	return currentRes, nil
}

// -- Comparison Execution -------------------------------------------------------

func executeComparison(ctx *ExecutionContext, ref, trans1, trans2 string) (*models.CLIResult, error) {
	tid1 := parsers.ResolveTranslationID(trans1)
	tid2 := parsers.ResolveTranslationID(trans2)

	v1, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, ref, tid1)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch comparison verses for %s (%s): %w", ref, tid1, err)
	}
	v2, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, ref, tid2)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch comparison verses for %s (%s): %w", ref, tid2, err)
	}

	return &models.CLIResult{
		Type: "compare",
		Data: map[string]interface{}{
			"reference": ref,
			"left": map[string]interface{}{
				"translation": tid1,
				"verses":      v1,
			},
			"right": map[string]interface{}{
				"translation": tid2,
				"verses":      v2,
			},
		},
	}, nil
}

// -- Helper Utilities -----------------------------------------------------------

func aggregateText(verses []models.Verse, fallback string) string {
	if len(verses) > 0 {
		var sb strings.Builder
		for _, v := range verses {
			sb.WriteString(v.Text)
			sb.WriteString(" ")
		}
		return strings.TrimSpace(sb.String())
	}
	return fallback
}

func normalizeCountUnit(raw string) string {
	norm := strings.ToLower(strings.TrimSpace(raw))
	switch norm {
	case "verses", "verse", "v", "jakeet", "jae":
		return "verses"
	case "books", "book", "b", "kirjat", "kirja":
		return "books"
	case "chapters", "chapter", "c", "luvut", "luku":
		return "chapters"
	case "words", "word", "w", "sanat", "sana":
		return "words"
	case "unique_words", "uw", "uniques", "uniikit", "sanasto":
		return "unique_words"
	default:
		return "verses"
	}
}

func aggregateCount(verses []models.Verse, text string, unit string) int {
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
			key := fmt.Sprintf("%s-%d", v.BookID, v.Chapter)
			uniqueChapters[key] = struct{}{}
		}
		return len(uniqueChapters)

	case "words":
		target := aggregateText(verses, text)
		words := strings.Fields(nonAlphaRegex.ReplaceAllString(target, " "))
		return len(words)

	case "unique_words":
		target := aggregateText(verses, text)
		words := strings.Fields(nonAlphaRegex.ReplaceAllString(target, " "))
		unique := make(map[string]struct{})
		for _, w := range words {
			unique[strings.ToLower(w)] = struct{}{}
		}
		return len(unique)

	case "verses":
		fallthrough
	default:
		if len(verses) > 0 {
			return len(verses)
		}
		if text != "" {
			return len(strings.Fields(nonAlphaRegex.ReplaceAllString(text, " ")))
		}
		return 0
	}
}

func extractTopFrequencies(text string, limit int) []models.ThemeItem {
	clean := nonAlphaRegex.ReplaceAllString(text, " ")
	words := strings.Fields(clean)
	counts := make(map[string]int)
	for _, w := range words {
		l := strings.ToLower(w)
		if len([]rune(l)) >= 3 {
			counts[l]++
		}
	}
	type pair struct {
		w string
		c int
	}
	var pairs []pair
	for w, c := range counts {
		pairs = append(pairs, pair{w, c})
	}
	for i := 0; i < len(pairs); i++ {
		for j := i + 1; j < len(pairs); j++ {
			if pairs[j].c > pairs[i].c {
				pairs[i], pairs[j] = pairs[j], pairs[i]
			}
		}
	}
	if limit > len(pairs) {
		limit = len(pairs)
	}
	var res []models.ThemeItem
	for i := 0; i < limit; i++ {
		res = append(res, models.ThemeItem{Word: pairs[i].w, Count: pairs[i].c})
	}
	return res
}

func computeBasicAnalytics(text string) AnalyticsData {
	clean := nonAlphaRegex.ReplaceAllString(text, " ")
	words := strings.Fields(clean)
	tokenCount := len(words)
	uniqueTokens := make(map[string]struct{})
	totalChars := 0
	for _, w := range words {
		uniqueTokens[strings.ToLower(w)] = struct{}{}
		totalChars += len([]rune(w))
	}
	uniqueCount := len(uniqueTokens)
	ttr := 0.0
	avgLen := 0.0
	if tokenCount > 0 {
		ttr = float64(uniqueCount) / float64(tokenCount)
		avgLen = float64(totalChars) / float64(tokenCount)
	}
	return AnalyticsData{
		TokenCount:        tokenCount,
		UniqueTokenCount:  uniqueCount,
		TypeTokenRatio:    ttr,
		CharacterCount:    totalChars,
		AverageWordLength: avgLen,
	}
}

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
			return "unknown", ""
		}
		return "book", bookID
	}
}
