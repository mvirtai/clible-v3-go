package dsl

import (
	"strings"
)

// Node represents the base interface for all AST nodes.
type Node interface {
	node()
	String() string
}

// VerseRefNode represents an explicit Bible verse reference (e.g. @Joh 3:16-18).
type VerseRefNode struct {
	Reference string
}

func (n *VerseRefNode) node()          {}
func (n *VerseRefNode) String() string { return "@" + n.Reference }

// SearchBoolMode defines how multiple search terms are composed.
type SearchBoolMode string

const (
	// SearchBoolNone is plain full-text search with a single query term.
	SearchBoolNone SearchBoolMode = ""
	// SearchBoolAND requires all terms to be present (PostgreSQL: term1 & term2).
	SearchBoolAND SearchBoolMode = "AND"
	// SearchBoolOR requires at least one term to match (PostgreSQL: term1 | term2).
	SearchBoolOR SearchBoolMode = "OR"
)

// SearchNode represents a full-text or regex search query (e.g. ? "love" in @Joh).
type SearchNode struct {
	Query     string
	IsRegex   bool
	ScopeBook string         // Optional book filter, e.g. "Joh" or "evankeliumit"
	BoolMode  SearchBoolMode // Boolean composition mode: "", "AND", "OR"
	Terms     []string       // Individual terms for boolean mode; Query holds the raw input
}

func (n *SearchNode) node() {}
func (n *SearchNode) String() string {
	res := "search("
	if len(n.Terms) > 1 {
		res += strings.Join(n.Terms, " "+string(n.BoolMode)+" ")
	} else {
		res += n.Query
	}
	res += ")"
	if n.ScopeBook != "" {
		res += " @" + n.ScopeBook
	}
	return res
}

// RangeNode represents a contiguous passage range, e.g. range(Joh 1:1, Joh 3:36).
// Start and End are raw verse reference strings resolved the same way as VerseRefNode.
type RangeNode struct {
	Start string
	End   string
}

func (n *RangeNode) node() {}
func (n *RangeNode) String() string {
	return "range(" + n.Start + ", " + n.End + ")"
}

// ScopeNode represents a contextual scope reference to preceding cells (e.g. ^, ^3, ^all)
type ScopeNode struct {
	Count int  // Number of cells, e.g. 1, 3 (-1 for all notebook cells)
	All   bool // Flag for full notebook scope
}

func (n *ScopeNode) node()          {}
func (n *ScopeNode) String() string { return "^" }

// PipeNode represents a pipeline transform or projection operator (Target => Action/Option)
type PipeNode struct {
	Left  Node
	Right Node
}

func (n *PipeNode) node()          {}
func (n *PipeNode) String() string { return n.Left.String() + " => " + n.Right.String() }

// ComparisonNode represents a ternary multi-option or comparison expression (Target ? OptionA : OptionB)
type ComparisonNode struct {
	Target Node
	Left   Node // e.g. KR92
	Right  Node //e.g. KJV
}

func (n *ComparisonNode) node() {}
func (n *ComparisonNode) String() string {
	return n.Target.String() + " ? " + n.Left.String() + " : " + n.Right.String()
}

// ActionNode represents a function modifier, pipeline action or formatting option
// (e.g. in(KR92), vs(KR92, KR38), refs(3), themes(5), suggest(3), count(), limit(5), :card)
type ActionNode struct {
	Kind   string            // "in", "vs", "refs", "themes", "suggest", "count", "limit", "style", "scope", "translation"
	Value  string            // Single value e.g. "KR92", "5", "cards"
	Args   []string          // Positional arguments (e.g. ["KR92", "KR38"] for vs)
	Params map[string]string // Optional key-value parameters
}

func (n *ActionNode) node() {}
func (n *ActionNode) String() string {
	if len(n.Args) > 0 {
		return n.Kind + "(" + strings.Join(n.Args, ", ") + ")"
	}
	if n.Value != "" {
		return n.Kind + "(" + n.Value + ")"
	}
	return n.Kind + "()"
}
