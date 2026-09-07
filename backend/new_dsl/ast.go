package newdsl

import (
	"fmt"
	"strings"
)

// -- Base interfaces -------------------------------------------------

// Node is the base interface implemented by every AST node.
type Node interface {
	node()
	String() string
}

// Object is the entry-point of an ISLA-expression.
// All four source types implement this interface.
type Object interface {
	Node
	objectKind() ObjectKind
}

// ObjectKind enumarates the four source object types.
type ObjectKind int

const (
	ObjectVerseRef ObjectKind = iota // @(Joh 3:16)
	ObjectRange                      // range(GEN, DEU)
	ObjectSearch                     // search("grace")
	ObjectCellCtx                    // ^, ^3, ^all
)

// -- Object types ──────────────────────────────────────────────────────────────

// VerseRefNode represents a single verse or verse-range reference: @(Joh 3:16)
// Parentheses are mandatory - Reference may contain spaces and special chars.
type VerseRefNode struct {
	Reference string // "Joh 3:16", "1. Kor 13:4-8", "Ps 23"
}

func (n *VerseRefNode) node()                  {}
func (n *VerseRefNode) objectKind() ObjectKind { return ObjectVerseRef }
func (n *VerseRefNode) String() string         { return "@(" + n.Reference + ")" }

// RangeNode represents a contiguos scriptur passage: range(GEN, DEU)
type RangeNode struct {
	Start string // "GEN", "1. Petr 1:1"
	End   string // "DEU", "Joh 1:18"
}

func (n *RangeNode) node()                  {}
func (n *RangeNode) objectKind() ObjectKind { return ObjectRange }
func (n *RangeNode) String() string         { return "range(" + n.Start + ", " + n.End + ")" }

// SearchBoolMode defines how multiple search terms are composed.
// The AST always stores the canonical form ("AND" / "OR").
// The parser normalizes user-facing aliases before building the AST:
//
//	"AND" | "&"  →  SearchBoolAND
//	"OR"  | "|"  →  SearchBoolOR
type SearchBoolMode string

const (
	SearchBoolNone SearchBoolMode = ""    // single-term search, no boolean operator
	SearchBoolAND  SearchBoolMode = "AND" // accepted input: "AND" or "&"
	SearchBoolOR   SearchBoolMode = "OR"  // accepted input: "OR"  or "|"
)

// SearchNode represents a full-text or regex search: search("grace") or search("a" AND "b")
type SearchNode struct {
	Query    string         // Raw search term or regex pattern (without slashes)
	IsRegex  bool           // true when Query is a regex pattern
	BoolMode SearchBoolMode // "", "AND", "OR"
	Terms    []string       // Individual terms for boolean mode
}

func (n *SearchNode) node()                  {}
func (n *SearchNode) objectKind() ObjectKind { return ObjectSearch }
func (n *SearchNode) String() string {
	if len(n.Terms) > 1 {
		return "search(" + strings.Join(n.Terms, " "+string(n.BoolMode)+" ") + ")"
	}
	if n.IsRegex {
		return "search(/" + n.Query + "/)"
	}
	return `search("` + n.Query + `")`
}

// CellCtxNode represents a reference to preceding notebook cells: ^, ^3, ^all
type CellCtxNode struct {
	Count int  // 1 = previous cell, N = N previous cells, -1 = all cells
	All   bool // true when ^all
}

func (n *CellCtxNode) node()                  {}
func (n *CellCtxNode) objectKind() ObjectKind { return ObjectCellCtx }
func (n *CellCtxNode) String() string {
	if n.All {
		return "^all"
	}
	if n.Count > 1 {
		return fmt.Sprintf("^%d", n.Count)
	}
	return "^"
}

// -- Method call ─────────────────────────────────────────────────────────────────────────────

// MethodCall represents a single dot-chained method: .themes(5), .use(KR92), .count(verses)
// Methods are stored in order in ISLAExpression.Methods.
type MethodCall struct {
	Name string   // "use", "vs", "at", "count", "themes", "suggest", "refs", "top", "stats", "limit"
	Args []string // ["KR92"], ["KR92", "KR38"], ["5"], ["verses"], or empty
}

func (m MethodCall) String() string {
	if len(m.Args) == 0 {
		return "." + m.Name + "()"
	}
	return "." + m.Name + "(" + strings.Join(m.Args, ", ") + ")"
}

// -- Output operator ─────────────────────────────────────────────────────────────────────────────

// OutputKind specifies where the expression result is rendered.
type OutputKind int

const (
	OutputInline       OutputKind = iota // => render into this cell (replaces the command line)
	OutputNewCellAbove                   // >  create a new cell directly above
	OutputNewCellBelow                   // >> create a new cell directly below
)

// OutputOp represents the trailing output operator and optional cell name
type OutputOp struct {
	Kind OutputKind
	Name string // "" | "#slug" | "free title text"
}

func (o OutputOp) String() string {
	sym := map[OutputKind]string{
		OutputInline:       "=>",
		OutputNewCellAbove: ">",
		OutputNewCellBelow: ">>",
	}[o.Kind]
	if o.Name != "" {
		return sym + " " + o.Name
	}
	return sym
}

// -- Root expression ─────────────────────────────────────────────────────────────────────────────

// ISLAExpression is the complete parsed ISLA v2 expression.
//
// Grammar (simplified):
//
// expression = object method* output_op
// object     = verse_ref | range | search | cell_ctx
// method     = "." IDENT "(" args ")"
// output_op  = "=>" | ">" [name] | ">>" [name]
//
// Examples:
//
// @(Joh 3:16).use(KR92)                     => Expression{Obj:*VerseRefNode, Methods:[{Name:"use",Args:["KR92"]}]}
// @(Joh 3:16).use(KR92).vs(KR38).at(KR11)   => Expression{..., Methods:[..., {Name:"vs",Args:["KR38"]}, {Name:"at",Args:["KR11"]}]}
// range(GEN, DEU).themes(5)                 => Expression{Obj:*RangeNode, Methods:[{Name:"themes",Args:["5"]}]}
// search("grace").limit(10).count(verses)   => Expression{Obj:*SearchNode, Methods:[..., {Name:"limit",Args:["10"]}, {Name:"count",Args:["verses"]}]}
// ^3.stats(lemmas, "GRACE")                 => Expression{Obj:*CellCtxNode, Methods:[{Name:"stats",Args:["lemmas","GRACE"]}]}
// ^all                                      => Expression{Obj:*CellCtxNode, Methods:[]}
// @(Joh 3:16).use(KR92) =>                  => Expression{..., OutputOp:{Kind:OutputInline}}
// search("sin").count(verses) > MyResults   => Expression{..., OutputOp:{Kind:OutputNewCellAbove, Name:"MyResults"}}
// range(GEN, DEU).use(KR92) >> New Cell     => Expression{..., OutputOp:{Kind:OutputNewCellBelow, Name:"New Cell"}}
// @(Joh 3:16)                               => Expression{Obj:*VerseRefNode, Methods:[], OutputOp:{Kind:OutputInline}}

type ISLAExpression struct {
	Object  Object       // Mandatory source object
	Methods []MethodCall // Zero or more chained method calls, in order
	Output  OutputOp     // Mandatory output operator
}

func (e *ISLAExpression) node() {}
func (e *ISLAExpression) String() string {
	var sb strings.Builder
	sb.WriteString(e.Object.String())
	for _, m := range e.Methods {
		sb.WriteString(m.String())
	}
	sb.WriteRune(' ')
	sb.WriteString(e.Output.String())
	return sb.String()
}
