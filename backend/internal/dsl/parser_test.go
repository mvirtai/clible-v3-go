package dsl

import (
	"testing"
)

func TestDSLParser_ValidExpressions(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		validate func(t *testing.T, node Node)
	}{
		{
			name:  "Simple Verse Reference",
			input: "@Joh 3:16",
			validate: func(t *testing.T, node Node) {
				refNode, ok := node.(*VerseRefNode)
				if !ok {
					t.Fatalf("expected *VerseRefNode, got %T", node)
				}
				if refNode.Reference != "Joh 3:16" {
					t.Errorf("expected reference 'Joh 3:16', got %q", refNode.Reference)
				}
			},
		},
		{
			name:  "Verse Reference with Pipeline Translation",
			input: "@Joh 3:16 => KR92",
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				ref, ok := pipe.Left.(*VerseRefNode)
				if !ok || ref.Reference != "Joh 3:16" {
					t.Errorf("expected left to be VerseRefNode('Joh 3:16'), got %#v", pipe.Left)
				}
				action, ok := pipe.Right.(*ActionNode)
				if !ok || action.Kind != "translation" || action.Value != "KR92" {
					t.Errorf("expected right to be ActionNode(translation, KR92), got %#v", pipe.Right)
				}
			},
		},
		{
			name:  "Ternary Translation Comparison",
			input: "@Joh 3:16 ? KR92 : KJV",
			validate: func(t *testing.T, node Node) {
				comp, ok := node.(*ComparisonNode)
				if !ok {
					t.Fatalf("expected *ComparisonNode, got %T", node)
				}
				ref, ok := comp.Target.(*VerseRefNode)
				if !ok || ref.Reference != "Joh 3:16" {
					t.Errorf("expected target 'Joh 3:16', got %#v", comp.Target)
				}
				left, ok := comp.Left.(*ActionNode)
				if !ok || left.Value != "KR92" {
					t.Errorf("expected left KR92, got %#v", comp.Left)
				}
				right, ok := comp.Right.(*ActionNode)
				if !ok || right.Value != "KJV" {
					t.Errorf("expected right KJV, got %#v", comp.Right)
				}
			},
		},
		{
			name:  "Search with Limit Pipeline",
			input: `? "love" => limit:5`,
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				search, ok := pipe.Left.(*SearchNode)
				if !ok || search.Query != "love" {
					t.Errorf("expected search query 'love', got %#v", pipe.Left)
				}
				action, ok := pipe.Right.(*ActionNode)
				if !ok || action.Kind != "limit" || action.Value != "5" {
					t.Errorf("expected limit:5 action, got %#v", pipe.Right)
				}
			},
		},
		{
			name:  "Scope Context Themes",
			input: "^3 => #themes",
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				scope, ok := pipe.Left.(*ScopeNode)
				if !ok || scope.Count != 3 {
					t.Errorf("expected scope count 3, got %#v", pipe.Left)
				}
				action, ok := pipe.Right.(*ActionNode)
				if !ok || action.Kind != "themes" {
					t.Errorf("expected action #themes, got %#v", pipe.Right)
				}
			},
		},
		{
			name:  "Scope Context All",
			input: "^all => #themes",
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				scope, ok := pipe.Left.(*ScopeNode)
				if !ok || !scope.All {
					t.Errorf("expected scope all=true, got %#v", pipe.Left)
				}
			},
		},
		{
			name:  "Verse Reference with Style Colon Action",
			input: "@Ps 23:1 => :card",
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				action, ok := pipe.Right.(*ActionNode)
				if !ok || action.Kind != "style" || action.Value != "card" {
					t.Errorf("expected style:card action, got %#v", pipe.Right)
				}
			},
		},
		{
			name:  "Scoped Search with Book Scope",
			input: "? armo @Room",
			validate: func(t *testing.T, node Node) {
				search, ok := node.(*SearchNode)
				if !ok {
					t.Fatalf("expected *SearchNode, got %T", node)
				}
				if search.Query != "armo" || search.ScopeBook != "Room" || search.IsRegex {
					t.Errorf("expected SearchNode(armo, ScopeBook=Room), got %#v", search)
				}
			},
		},
		{
			name:  "Scoped Regex Search with Multi-token Book Scope",
			input: "? /opetuslaps.*/ @1. Kor",
			validate: func(t *testing.T, node Node) {
				search, ok := node.(*SearchNode)
				if !ok {
					t.Fatalf("expected *SearchNode, got %T", node)
				}
				if search.Query != "opetuslaps.*" || search.ScopeBook != "1. Kor" || !search.IsRegex {
					t.Errorf("expected SearchNode(opetuslaps.*, ScopeBook=1. Kor, IsRegex=true), got %#v", search)
				}
			},
		},
		{
			name:  "Ternary Numeric Translation Aliases",
			input: "@Joh 3:16 ? 1992 : 1938",
			validate: func(t *testing.T, node Node) {
				comp, ok := node.(*ComparisonNode)
				if !ok {
					t.Fatalf("expected *ComparisonNode, got %T", node)
				}
				left, ok := comp.Left.(*ActionNode)
				if !ok || left.Value != "1992" {
					t.Errorf("expected left '1992', got %#v", comp.Left)
				}
				right, ok := comp.Right.(*ActionNode)
				if !ok || right.Value != "1938" {
					t.Errorf("expected right '1938', got %#v", comp.Right)
				}
			},
		},
		{
			name:  "Verse Reference Range Ternary Comparison",
			input: "@Room 8:1-5 ? KR92 : KR38",
			validate: func(t *testing.T, node Node) {
				comp, ok := node.(*ComparisonNode)
				if !ok {
					t.Fatalf("expected *ComparisonNode, got %T", node)
				}
				ref, ok := comp.Target.(*VerseRefNode)
				if !ok || ref.Reference != "Room 8:1-5" {
					t.Errorf("expected target 'Room 8:1-5', got %#v", comp.Target)
				}
				left, ok := comp.Left.(*ActionNode)
				if !ok || left.Value != "KR92" {
					t.Errorf("expected left 'KR92', got %#v", comp.Left)
				}
				right, ok := comp.Right.(*ActionNode)
				if !ok || right.Value != "KR38" {
					t.Errorf("expected right 'KR38', got %#v", comp.Right)
				}
			},
		},
		{
			name:  "Multi-part Book Citation with Verse Range",
			input: "@1. Kor 13:4-8 => KR92",
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				ref, ok := pipe.Left.(*VerseRefNode)
				if !ok || ref.Reference != "1. Kor 13:4-8" {
					t.Errorf("expected left '1. Kor 13:4-8', got %#v", pipe.Left)
				}
				action, ok := pipe.Right.(*ActionNode)
				if !ok || action.Kind != "translation" || action.Value != "KR92" {
					t.Errorf("expected right 'KR92', got %#v", pipe.Right)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, err := Parse(tt.input)
			if err != nil {
				t.Fatalf("Parse(%q) returned unexpected error: %v", tt.input, err)
			}
			if node == nil {
				t.Fatalf("Parse(%q) returned nil node", tt.input)
			}
			tt.validate(t, node)
		})
	}
}

func TestParser_CountAction(t *testing.T) {
	tests := []struct {
		input string
	}{
		{`? /opetuslaps.*/ => count`},
		{`? "rakkaus" => KR92 => count`},
		{`? armo @Room => KR92 => count`},
		{`@Joh 3 => count`},
		{`search("armo") => at(Room) => use(KR92) => count()`},
	}

	for _, tt := range tests {
		node, err := Parse(tt.input)
		if err != nil {
			t.Fatalf("Parse(%q) failed: %v", tt.input, err)
		}
		pipe, ok := node.(*PipeNode)
		if !ok {
			t.Fatalf("expected *PipeNode, got %T", node)
		}
		action, ok := pipe.Right.(*ActionNode)
		if !ok || action.Kind != "count" {
			t.Fatalf("expected Right to be count ActionNode, got %+v", pipe.Right)
		}
	}
}

func TestParser_FunctionalSyntaxUseAndAt(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		validate func(t *testing.T, node Node)
	}{
		{
			name:  "at(Joh 1:1) => use(KR92)",
			input: "at(Joh 1:1) => use(KR92)",
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				ref, ok := pipe.Left.(*VerseRefNode)
				if !ok || ref.Reference != "Joh 1:1" {
					t.Errorf("expected left 'Joh 1:1', got %#v", pipe.Left)
				}
				action, ok := pipe.Right.(*ActionNode)
				if !ok || action.Kind != "use" || action.Value != "KR92" {
					t.Errorf("expected right use(KR92), got %#v", pipe.Right)
				}
			},
		},
		{
			name:  "search(\"armo\") => at(Room) => use(KR92)",
			input: `search("armo") => at(Room) => use(KR92)`,
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				useAct, ok := pipe.Right.(*ActionNode)
				if !ok || useAct.Kind != "use" || useAct.Value != "KR92" {
					t.Fatalf("expected right use(KR92), got %#v", pipe.Right)
				}
				innerPipe, ok := pipe.Left.(*PipeNode)
				if !ok {
					t.Fatalf("expected inner *PipeNode, got %T", pipe.Left)
				}
				atAct, ok := innerPipe.Right.(*ActionNode)
				if !ok || atAct.Kind != "scope" || atAct.Value != "Room" {
					t.Fatalf("expected inner right at(Room), got %#v", innerPipe.Right)
				}
			},
		},
		{
			name:  "at(Joh 3:16) => vs(KR92, KJV)",
			input: "at(Joh 3:16) => vs(KR92, KJV)",
			validate: func(t *testing.T, node Node) {
				pipe, ok := node.(*PipeNode)
				if !ok {
					t.Fatalf("expected *PipeNode, got %T", node)
				}
				ref, ok := pipe.Left.(*VerseRefNode)
				if !ok || ref.Reference != "Joh 3:16" {
					t.Errorf("expected left 'Joh 3:16', got %#v", pipe.Left)
				}
				vsAct, ok := pipe.Right.(*ActionNode)
				if !ok || vsAct.Kind != "vs" || len(vsAct.Args) != 2 || vsAct.Args[0] != "KR92" || vsAct.Args[1] != "KJV" {
					t.Errorf("expected vs(KR92, KJV), got %#v", pipe.Right)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, err := Parse(tt.input)
			if err != nil {
				t.Fatalf("Parse(%q) failed: %v", tt.input, err)
			}
			tt.validate(t, node)
		})
	}
}

func TestDSLParser_InvalidExpressions(t *testing.T) {
	invalidInputs := []string{
		"@",                        // Empty verse reference
		`?`,                        // Missing search query
		`@Joh 3:16 ? KR92`,         // Incomplete ternary missing colon and second option
		`@Joh 3:16 ? KR92 KJV`,     // Missing colon in ternary
		`invalid start token`,      // Unexpected starting token
	}

	for _, input := range invalidInputs {
		t.Run("Invalid: "+input, func(t *testing.T) {
			node, err := Parse(input)
			if err == nil {
				t.Fatalf("expected error for input %q, but got node: %#v", input, node)
			}
		})
	}
}

// TestParser_RangeExpression verifies parsing of range(start, end) primary sources.
func TestParser_RangeExpression(t *testing.T) {
	cases := []struct {
		name      string
		input     string
		wantStart string
		wantEnd   string
	}{
		{
			name:      "Verse-level range",
			input:     `range(Joh 1:1, Joh 3:36)`,
			wantStart: "Joh 1:1",
			wantEnd:   "Joh 3:36",
		},
		{
			name:      "Book-level range",
			input:     `range(GEN, DEU)`,
			wantStart: "GEN",
			wantEnd:   "DEU",
		},
		{
			name:      "Range piped to themes",
			input:     `range(Joh 1:1, Joh 3:36) => themes(5)`,
			wantStart: "Joh 1:1",
			wantEnd:   "Joh 3:36",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			node, err := Parse(tc.input)
			if err != nil {
				t.Fatalf("Parse(%q) returned unexpected error: %v", tc.input, err)
			}

			// Unwrap pipe if present
			var rangeNode *RangeNode
			switch n := node.(type) {
			case *RangeNode:
				rangeNode = n
			case *PipeNode:
				rn, ok := n.Left.(*RangeNode)
				if !ok {
					t.Fatalf("expected *RangeNode as pipe left, got %T", n.Left)
				}
				rangeNode = rn
			default:
				t.Fatalf("expected *RangeNode or *PipeNode, got %T", node)
			}

			if rangeNode.Start != tc.wantStart {
				t.Errorf("Start: got %q, want %q", rangeNode.Start, tc.wantStart)
			}
			if rangeNode.End != tc.wantEnd {
				t.Errorf("End: got %q, want %q", rangeNode.End, tc.wantEnd)
			}
		})
	}
}

// TestParser_BooleanSearch verifies AND/OR boolean mode detection in search().
func TestParser_BooleanSearch(t *testing.T) {
	cases := []struct {
		name        string
		input       string
		wantBool    SearchBoolMode
		wantTermLen int
	}{
		{
			name:        "AND boolean search",
			input:       `search("armo" AND "rauha")`,
			wantBool:    SearchBoolAND,
			wantTermLen: 2,
		},
		{
			name:        "OR boolean search",
			input:       `search("kuolema" OR "elämä")`,
			wantBool:    SearchBoolOR,
			wantTermLen: 2,
		},
		{
			name:        "Plain search — no boolean",
			input:       `search("armo")`,
			wantBool:    SearchBoolNone,
			wantTermLen: 1,
		},
		{
			name:        "AND search with scope",
			input:       `search("armo" AND "rauha") => at(evankeliumit) => count()`,
			wantBool:    SearchBoolAND,
			wantTermLen: 2,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			node, err := Parse(tc.input)
			if err != nil {
				t.Fatalf("Parse(%q) unexpected error: %v", tc.input, err)
			}

			// Unwrap pipes to find the SearchNode
			var sn *SearchNode
			var walk func(Node)
			walk = func(n Node) {
				switch x := n.(type) {
				case *SearchNode:
					sn = x
				case *PipeNode:
					walk(x.Left)
				}
			}
			walk(node)

			if sn == nil {
				t.Fatalf("no SearchNode found in AST for %q", tc.input)
			}
			if sn.BoolMode != tc.wantBool {
				t.Errorf("BoolMode: got %q, want %q", sn.BoolMode, tc.wantBool)
			}
			if len(sn.Terms) != tc.wantTermLen {
				t.Errorf("Terms: got %d, want %d — %v", len(sn.Terms), tc.wantTermLen, sn.Terms)
			}
		})
	}
}

// TestParser_SearchNamedParams verifies named param parsing (scope: x) inside search().
func TestParser_SearchNamedParams(t *testing.T) {
	cases := []struct {
		name      string
		input     string
		wantScope string
	}{
		{
			name:      "Named scope param",
			input:     `search("armo", scope: evankeliumit)`,
			wantScope: "evankeliumit",
		},
		{
			name:      "Positional @scope",
			input:     `search("armo", @evankeliumit)`,
			wantScope: "evankeliumit",
		},
		{
			name:      "Trailing @scope",
			input:     `search("armo") @Joh`,
			wantScope: "Joh",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			node, err := Parse(tc.input)
			if err != nil {
				t.Fatalf("Parse(%q) unexpected error: %v", tc.input, err)
			}
			sn, ok := node.(*SearchNode)
			if !ok {
				t.Fatalf("expected *SearchNode, got %T", node)
			}
			if sn.ScopeBook != tc.wantScope {
				t.Errorf("ScopeBook: got %q, want %q", sn.ScopeBook, tc.wantScope)
			}
		})
	}
}

// TestParser_FromAlias verifies that from(ref) produces a VerseRefNode identical to @ref.
func TestParser_FromAlias(t *testing.T) {
	node, err := Parse(`from(Joh 3:16) => use(KR92)`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	pipe, ok := node.(*PipeNode)
	if !ok {
		t.Fatalf("expected *PipeNode, got %T", node)
	}
	ref, ok := pipe.Left.(*VerseRefNode)
	if !ok {
		t.Fatalf("expected *VerseRefNode as Left, got %T", pipe.Left)
	}
	if ref.Reference != "Joh 3:16" {
		t.Errorf("Reference: got %q, want %q", ref.Reference, "Joh 3:16")
	}
}

// TestParser_ISLADiagnosticErrors verifies that unknown primary identifiers with
// call syntax return typed ISLADiagnostic errors.
// Note: bare identifiers in pipeline position (e.g. => refss) fall through to the
// translation-fallback by design to preserve backwards compatibility with short
// translation aliases like KR92, KJV, etc.
func TestParser_ISLADiagnosticErrors(t *testing.T) {
	cases := []struct {
		input    string
		wantCode DiagnosticCode
	}{
		{`unknownfn(5)`, DiagUnknownIdent}, // Unknown primary with call syntax
		{`notacommand(3)`, DiagUnknownIdent},
	}
	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			_, err := Parse(tc.input)
			if err == nil {
				t.Fatalf("expected error for %q", tc.input)
			}
			diag, ok := err.(*ISLADiagnostic)
			if !ok {
				t.Fatalf("expected *ISLADiagnostic, got %T: %v", err, err)
			}
			if diag.Code != tc.wantCode {
				t.Errorf("Code: got %s, want %s", diag.Code, tc.wantCode)
			}
		})
	}
}

