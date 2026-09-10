package newdsl

import (
	"reflect"
	"testing"
)

func TestParseISLA_VerseRef(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    *ISLAExpression
		wantErr bool
	}{
		{
			name:  "simple verse ref with use method inline",
			input: "! @(Joh 3:16).use(KR92) =>",
			want: &ISLAExpression{
				Object:  &VerseRefNode{Reference: "Joh 3:16"},
				Methods: []MethodCall{{Name: "use", Args: []string{"KR92"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "verse ref with verse range and book with dot",
			input: "! @(1. Kor 13:4-8).vs(KR92, KR38) =>",
			want: &ISLAExpression{
				Object:  &VerseRefNode{Reference: "1. Kor 13:4-8"},
				Methods: []MethodCall{{Name: "vs", Args: []string{"KR92", "KR38"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "verse ref with refs method creating new cell below with slug",
			input: "@(Joh 3:16).refs(5) >> #joh316-refs",
			want: &ISLAExpression{
				Object:  &VerseRefNode{Reference: "Joh 3:16"},
				Methods: []MethodCall{{Name: "refs", Args: []string{"5"}}},
				Output:  OutputOp{Kind: OutputNewCellBelow, Name: "#joh316-refs"},
			},
		},
		{
			name:  "at() syntax parallel to @()",
			input: "! at(Joh 3:16).use(KR92) =>",
			want: &ISLAExpression{
				Object:  &VerseRefNode{Reference: "Joh 3:16"},
				Methods: []MethodCall{{Name: "use", Args: []string{"KR92"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "from() syntax with comparison",
			input: "from(1. Kor 13:4-8).vs(KR92, KR38)",
			want: &ISLAExpression{
				Object:  &VerseRefNode{Reference: "1. Kor 13:4-8"},
				Methods: []MethodCall{{Name: "vs", Args: []string{"KR92", "KR38"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseISLA(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseISLA(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("\ngot:  %+v\nwant: %+v", got, tt.want)
			}
		})
	}
}

func TestParseISLA_Range(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    *ISLAExpression
		wantErr bool
	}{
		{
			name:  "range with chained themes and suggest methods",
			input: "! range(GEN, DEU).themes(5).suggest(3) >> #tooran-teemat",
			want: &ISLAExpression{
				Object: &RangeNode{Start: "GEN", End: "DEU"},
				Methods: []MethodCall{
					{Name: "themes", Args: []string{"5"}},
					{Name: "suggest", Args: []string{"3"}},
				},
				Output: OutputOp{Kind: OutputNewCellBelow, Name: "#tooran-teemat"},
			},
		},
		{
			name:  "range with chapter verses and top method above with free title",
			input: `range(Joh 1:1, Joh 1:18).top(10) > "Johanneksen prologin sanat"`,
			want: &ISLAExpression{
				Object:  &RangeNode{Start: "Joh 1:1", End: "Joh 1:18"},
				Methods: []MethodCall{{Name: "top", Args: []string{"10"}}},
				Output:  OutputOp{Kind: OutputNewCellAbove, Name: "Johanneksen prologin sanat"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseISLA(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseISLA(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("\ngot:  %+v\nwant: %+v", got, tt.want)
			}
		})
	}
}

func TestParseISLA_Search(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    *ISLAExpression
		wantErr bool
	}{
		{
			name:  "simple search with at scope and count",
			input: `! search("armo").at(kirjeet).count(verses) =>`,
			want: &ISLAExpression{
				Object: &SearchNode{Query: "armo"},
				Methods: []MethodCall{
					{Name: "at", Args: []string{"kirjeet"}},
					{Name: "count", Args: []string{"verses"}},
				},
				Output: OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "boolean AND search with limit and count",
			input: `search("armo" AND "rakkaus").limit(10).count() =>`,
			want: &ISLAExpression{
				Object: &SearchNode{
					BoolMode: SearchBoolAND,
					Terms:    []string{`"armo"`, `"rakkaus"`},
				},
				Methods: []MethodCall{
					{Name: "limit", Args: []string{"10"}},
					{Name: "count"},
				},
				Output: OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "regex search with at and stats",
			input: `search(/vanhurska.*/).at(Room).stats =>`,
			want: &ISLAExpression{
				Object: &SearchNode{
					Query:   "vanhurska.*",
					IsRegex: true,
				},
				Methods: []MethodCall{
					{Name: "at", Args: []string{"Room"}},
					{Name: "stats"},
				},
				Output: OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "shorthand question mark search",
			input: `?"usko".at(UT).count(verses) =>`,
			want: &ISLAExpression{
				Object: &SearchNode{Query: "usko"},
				Methods: []MethodCall{
					{Name: "at", Args: []string{"UT"}},
					{Name: "count", Args: []string{"verses"}},
				},
				Output: OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "question mark search with parentheses",
			input: `?("usko").at(UT).count(verses) =>`,
			want: &ISLAExpression{
				Object: &SearchNode{Query: "usko"},
				Methods: []MethodCall{
					{Name: "at", Args: []string{"UT"}},
					{Name: "count", Args: []string{"verses"}},
				},
				Output: OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "omitted output operator defaults to inline",
			input: `search("armo").count()`,
			want: &ISLAExpression{
				Object: &SearchNode{Query: "armo"},
				Methods: []MethodCall{
					{Name: "count"},
				},
				Output: OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "question mark search with chained .@() scope and output routing above",
			input: `?("Herra").@(evankeliumit) > #herra`,
			want: &ISLAExpression{
				Object: &SearchNode{Query: "Herra"},
				Methods: []MethodCall{
					{Name: "at", Args: []string{"evankeliumit"}},
				},
				Output: OutputOp{Kind: OutputNewCellAbove, Name: "#herra"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseISLA(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseISLA(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("\ngot:  %+v\nwant: %+v", got, tt.want)
			}
		})
	}
}

func TestParseISLA_CellContext(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    *ISLAExpression
		wantErr bool
	}{
		{
			name:  "single cell context with themes",
			input: `! ^.themes(5) >>`,
			want: &ISLAExpression{
				Object:  &CellCtxNode{Count: 1},
				Methods: []MethodCall{{Name: "themes", Args: []string{"5"}}},
				Output:  OutputOp{Kind: OutputNewCellBelow},
			},
		},
		{
			name:  "N=3 cell context with count words",
			input: `^3.count(words) =>`,
			want: &ISLAExpression{
				Object:  &CellCtxNode{Count: 3},
				Methods: []MethodCall{{Name: "count", Args: []string{"words"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "all cells context with stats (and ttr alias normalization)",
			input: `^all.ttr =>`,
			want: &ISLAExpression{
				Object:  &CellCtxNode{All: true, Count: -1},
				Methods: []MethodCall{{Name: "stats"}},
				Output:  OutputOp{Kind: OutputInline},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseISLA(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseISLA(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("\ngot:  %+v\nwant: %+v", got, tt.want)
			}
		})
	}
}

func TestParseISLA_ValidationErrors(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr string
	}{
		{
			name:    "empty expression before output operator",
			input:   `=>`,
			wantErr: "expression is empty",
		},
		{
			name:    "invalid method .at() on verse reference",
			input:   `@(Joh 3:16).at(kirjeet) =>`,
			wantErr: ".at() scope method is only permitted on search()",
		},
		{
			name:    "invalid method .vs() on search",
			input:   `search("armo").vs(KR92, KR38) =>`,
			wantErr: ".vs() comparison method is only permitted on verse references",
		},
		{
			name:    "invalid method .use() on cell context",
			input:   `^.use(KR92) =>`,
			wantErr: ".use() method is not permitted on cell context",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseISLA(tt.input)
			if err == nil {
				t.Fatalf("ParseISLA(%q) expected error containing %q, got nil", tt.input, tt.wantErr)
			}
		})
	}
}

func TestParseISLA_Variable(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    *ISLAExpression
		wantErr bool
	}{
		{
			name:  "variable with count words",
			input: "#johannes.count(words) =>",
			want: &ISLAExpression{
				Object:  &VariableNode{Name: "johannes"},
				Methods: []MethodCall{{Name: "count", Args: []string{"words"}}},
				Output:  OutputOp{Kind: OutputInline},
			},
		},
		{
			name:  "variable with stats and output below to new slug",
			input: "#muuttuja.stats >> #uusi-muuttuja",
			want: &ISLAExpression{
				Object:  &VariableNode{Name: "muuttuja"},
				Methods: []MethodCall{{Name: "stats"}},
				Output:  OutputOp{Kind: OutputNewCellBelow, Name: "#uusi-muuttuja"},
			},
		},
		{
			name:  "naming with inline output operator => #slug",
			input: "@(Joh 3:16).use(KR92) => #my-slug",
			want: &ISLAExpression{
				Object:  &VerseRefNode{Reference: "Joh 3:16"},
				Methods: []MethodCall{{Name: "use", Args: []string{"KR92"}}},
				Output:  OutputOp{Kind: OutputInline, Name: "#my-slug"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseISLA(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseISLA(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("\ngot:  %+v\nwant: %+v", got, tt.want)
			}
		})
	}
}
