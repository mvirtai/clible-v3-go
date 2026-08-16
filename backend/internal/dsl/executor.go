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
	SearchVerses(ctx context.Context, query string, isRegex bool, translationID, startBook, endBook string) ([]models.Verse, error)
}

// ExecutionContext is the runtime context for AST evaluation.
type ExecutionContext struct {
	Ctx            context.Context
	DefaultTrans   string
	ContextText    string
	VerseFetcher   VerseFetcher
	VerseSearcher  VerseSearcher
	ThemeExtractor func(text string, limit int) []models.ThemeItem
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
		return executeSearch(ctx, n, ctx.DefaultTrans, 0)
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

	tid := transID
	if tid == "" {
		tid = ctx.DefaultTrans
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

func resolveSearchScope(scopeBook string) (string, string) {
	if scopeBook == "" {
		return "", ""
	}
	norm := strings.ToUpper(strings.TrimSpace(scopeBook))
	if norm == "VT" || norm == "OT" {
		return "ot", ""
	}
	if norm == "UT" || norm == "NT" {
		return "nt", ""
	}
	bookID := parsers.ResolveBookID(scopeBook)
	return "book", bookID
}

func executeSearch(ctx *ExecutionContext, n *SearchNode, transID string, limit int) (*models.CLIResult, error) {
	if ctx.VerseSearcher == nil {
		return nil, errors.New("verse searcher dependency not configured")
	}

	tid := transID
	if tid == "" {
		tid = ctx.DefaultTrans
	}

	searchScope, scopeValue := resolveSearchScope(n.ScopeBook)
	verses, err := ctx.VerseSearcher.SearchVerses(ctx.Ctx, n.Query, n.IsRegex, tid, searchScope, scopeValue)
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
			"is_regex":    n.IsRegex,
			"scope_book":  n.ScopeBook,
			"translation": tid,
			"verses":      verses,
			"count":       len(verses),
		},
	}, nil
}

func executePipe(ctx *ExecutionContext, n *PipeNode) (*models.CLIResult, error) {
	action, isAction := n.Right.(*ActionNode)
	if !isAction {
		return nil, fmt.Errorf("pipeline target must be an action, got %T", n.Right)
	}

	if action.Kind == "count" {
		return executeCountPipe(ctx, n.Left)
	}

	switch src := n.Left.(type) {
	case *VerseRefNode:
		if action.Kind == "translation" {
			return executeVerseRef(ctx, src, action.Value)
		}
		res, err := executeVerseRef(ctx, src, ctx.DefaultTrans)
		if err != nil {
			return nil, err
		}
		return applyActionToResult(ctx, res, action)

	case *SearchNode:
		if action.Kind == "translation" {
			return executeSearch(ctx, src, action.Value, 0)
		}
		if action.Kind == "limit" {
			lim, _ := strconv.Atoi(action.Value)
			return executeSearch(ctx, src, ctx.DefaultTrans, lim)
		}
		res, err := executeSearch(ctx, src, ctx.DefaultTrans, 0)
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
		res, err := executePipe(ctx, src)
		if err != nil {
			return nil, err
		}
		return applyActionToResult(ctx, res, action)

	default:
		return nil, fmt.Errorf("unsupported pipeline source type: %T", n.Left)
	}
}

func executeCountPipe(ctx *ExecutionContext, left Node) (*models.CLIResult, error) {
	switch target := left.(type) {
	case *SearchNode:
		if ctx.VerseSearcher == nil {
			return nil, errors.New("verse searcher dependency not configured")
		}
		searchScope, scopeValue := resolveSearchScope(target.ScopeBook)
		verses, err := ctx.VerseSearcher.SearchVerses(ctx.Ctx, target.Query, target.IsRegex, ctx.DefaultTrans, searchScope, scopeValue)
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
				"translation": ctx.DefaultTrans,
			},
		}, nil

	case *VerseRefNode:
		if ctx.VerseFetcher == nil {
			return nil, errors.New("verse fetcher dependency not configured")
		}
		verses, err := ctx.VerseFetcher.GetVerses(ctx.Ctx, target.Reference, ctx.DefaultTrans)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch verses for count: %w", err)
		}
		return &models.CLIResult{
			Type: "count",
			Data: map[string]interface{}{
				"target_type": "reference",
				"reference":   target.Reference,
				"count":       len(verses),
				"translation": ctx.DefaultTrans,
			},
		}, nil

	case *PipeNode:
		// Jos ketjutettu: ? /armo.*/ @Room => KR92 => count
		if transAction, ok := target.Right.(*ActionNode); ok && transAction.Kind == "translation" {
			if searchNode, isSearch := target.Left.(*SearchNode); isSearch {
				searchScope, scopeValue := resolveSearchScope(searchNode.ScopeBook)
				verses, err := ctx.VerseSearcher.SearchVerses(ctx.Ctx, searchNode.Query, searchNode.IsRegex, transAction.Value, searchScope, scopeValue)
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
						"translation": transAction.Value,
					},
				}, nil
			}
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

	leftTrans := "default"
	if leftAct, ok := n.Left.(*ActionNode); ok && leftAct.Value != "" {
		leftTrans = leftAct.Value
	}

	rightTrans := "default"
	if rightAct, ok := n.Right.(*ActionNode); ok && rightAct.Value != "" {
		rightTrans = rightAct.Value
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
