package newdsl

import "testing"

// -- ISLAExpression.String() ---------------------------------------------------------------------

func TestISLAExpressions_String(t *testing.T) {
	tests := []struct {
		name string
		expr ISLAExpression
		want string
	}{
		{
			name: "verse ref with use method, inline output",
			expr: ISLAExpression{
				Object:  &VerseRefNode{Reference: "John 3:16"},
				Methods: []MethodCall{{Name: "use", Args: []string{"KR92"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
			want: "@(John 3:16).use(KR92) =>",
		},
		{
			name: "verse ref with vs method, inline output",
			expr: ISLAExpression{
				Object:  &VerseRefNode{Reference: "Joh 3:16"},
				Methods: []MethodCall{{Name: "vs", Args: []string{"KR92", "KR38"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
			want: "@(Joh 3:16).vs(KR92, KR38) =>",
		},
		{
			name: "range with chained methods and named cell below",
			expr: ISLAExpression{
				Object: &RangeNode{Start: "GEN", End: "DEU"},
				Methods: []MethodCall{
					{Name: "themes", Args: []string{"5"}},
					{Name: "suggest", Args: []string{"3"}},
				},
				Output: OutputOp{Kind: OutputNewCellBelow, Name: "#torah-themes"},
			},
			want: "range(GEN, DEU).themes(5).suggest(3) >> #torah-themes",
		},
		{
			name: "range with cell above and free title",
			expr: ISLAExpression{
				Object:  &RangeNode{Start: "Joh 1:1", End: "Joh 1:18"},
				Methods: []MethodCall{{Name: "top", Args: []string{"10"}}},
				Output:  OutputOp{Kind: OutputNewCellAbove, Name: "Top 10 words"},
			},
			want: "range(Joh 1:1, Joh 1:18).top(10) > Top 10 words",
		},
		{
			name: "search with at scope and count, inline",
			expr: ISLAExpression{
				Object: &SearchNode{Query: "grace"},
				Methods: []MethodCall{
					{Name: "at", Args: []string{"epistles"}},
					{Name: "count", Args: []string{"verses"}},
				},
				Output: OutputOp{Kind: OutputInline},
			},
			want: `search("grace").at(epistles).count(verses) =>`,
		},
		{
			name: "boolean AND search with stats",
			expr: ISLAExpression{
				Object: &SearchNode{
					BoolMode: SearchBoolAND,
					Terms:    []string{`"grace"`, `"faith"`},
				},
				Methods: []MethodCall{{Name: "stats"}},
				Output:  OutputOp{Kind: OutputInline},
			},
			want: `search("grace" AND "faith").stats() =>`,
		},
		{
			name: "regex search with count below",
			expr: ISLAExpression{
				Object:  &SearchNode{Query: `righteou.*`, IsRegex: true},
				Methods: []MethodCall{{Name: "count", Args: []string{"verses"}}},
				Output:  OutputOp{Kind: OutputNewCellBelow},
			},
			want: "search(/righteou.*/).count(verses) >>",
		},
		{
			name: "cell context all with stats, inline",
			expr: ISLAExpression{
				Object:  &CellCtxNode{All: true},
				Methods: []MethodCall{{Name: "stats"}},
				Output:  OutputOp{Kind: OutputInline},
			},
			want: "^all.stats() =>",
		},
		{
			name: "cell context N=3 with count words",
			expr: ISLAExpression{
				Object:  &CellCtxNode{Count: 3},
				Methods: []MethodCall{{Name: "count", Args: []string{"words"}}},
				Output:  OutputOp{Kind: OutputNewCellBelow},
			},
			want: "^3.count(words) >>",
		},
		{
			name: "no methods — bare object with inline output",
			expr: ISLAExpression{
				Object:  &VerseRefNode{Reference: "Ps 23"},
				Methods: nil,
				Output:  OutputOp{Kind: OutputInline},
			},
			want: "@(Ps 23) =>",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.expr.String()
			if got != tt.want {
				t.Errorf("\ngot:  %q\nwant: %q", got, tt.want)
			}
		})
	}
}

// ── OutputOp.String() ─────────────────────────────────────────────────────────

func TestOutputOp_String(t *testing.T) {
	tests := []struct {
		op   OutputOp
		want string
	}{
		{OutputOp{Kind: OutputInline}, "=>"},
		{OutputOp{Kind: OutputNewCellAbove}, ">"},
		{OutputOp{Kind: OutputNewCellBelow}, ">>"},
		{OutputOp{Kind: OutputNewCellAbove, Name: "#grace-search"}, "> #grace-search"},
		{OutputOp{Kind: OutputNewCellBelow, Name: "#torah-themes"}, ">> #torah-themes"},
		{OutputOp{Kind: OutputNewCellBelow, Name: "Torah themes"}, ">> Torah themes"},
	}

	for _, tt := range tests {
		got := tt.op.String()
		if got != tt.want {
			t.Errorf("OutputOp{%v, %q}.String() = %q, want %q", tt.op.Kind, tt.op.Name, got, tt.want)
		}
	}
}

// ── Individual node String() methods ─────────────────────────────────────────

func TestVerseRefNode_String(t *testing.T) {
	tests := []struct{ ref, want string }{
		{"Joh 3:16", "@(Joh 3:16)"},
		{"1. Kor 13:4-8", "@(1. Kor 13:4-8)"},
		{"Ps 23", "@(Ps 23)"},
	}
	for _, tt := range tests {
		got := (&VerseRefNode{Reference: tt.ref}).String()
		if got != tt.want {
			t.Errorf("got %q, want %q", got, tt.want)
		}
	}
}

func TestRangeNode_String(t *testing.T) {
	got := (&RangeNode{Start: "GEN", End: "DEU"}).String()
	want := "range(GEN, DEU)"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestCellCtxNode_String(t *testing.T) {
	tests := []struct {
		node CellCtxNode
		want string
	}{
		{CellCtxNode{Count: 1}, "^"},
		{CellCtxNode{Count: 3}, "^3"},
		{CellCtxNode{All: true}, "^all"},
	}
	for _, tt := range tests {
		got := tt.node.String()
		if got != tt.want {
			t.Errorf("got %q, want %q", got, tt.want)
		}
	}
}

func TestMethodCall_String(t *testing.T) {
	tests := []struct {
		m    MethodCall
		want string
	}{
		{MethodCall{Name: "stats"}, ".stats()"},
		{MethodCall{Name: "themes", Args: []string{"5"}}, ".themes(5)"},
		{MethodCall{Name: "vs", Args: []string{"KR92", "KR38"}}, ".vs(KR92, KR38)"},
	}
	for _, tt := range tests {
		got := tt.m.String()
		if got != tt.want {
			t.Errorf("got %q, want %q", got, tt.want)
		}
	}
}
