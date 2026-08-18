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
