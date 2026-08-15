package dsl

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

// SearchNode represents a full-text or regex search query (e.g. ? "love" in @Joh).
type SearchNode struct {
	Query     string
	IsRegex   bool
	ScopeBook string // Optional book filter, e.g. "Joh"
}

func (n *SearchNode) node()          {}
func (n *SearchNode) String() string { return "?" + n.Query }

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

// ActionNode represents a function modifier or formatting option (#themes, #refs, #suggest, :card, limit:5).
type ActionNode struct {
	Kind  string            // #themes, #refs, #suggest, :card, limit
	Value string            // "card", "5", "KR92", etc.
	Args  map[string]string // Optional key-value parameters
}

func (n *ActionNode) node()          {}
func (n *ActionNode) String() string { return "#" + n.Kind }
