package parsers

import (
	"testing"
)

func TestParseReference_TableDriven(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expectedRef *ParsedReference
		expectError bool
	}{
		// --- Standard spaced formats ---
		{
			name:  "Full verse range with English name",
			input: "John 3:16-18",
			expectedRef: &ParsedReference{
				BookName:   "JHN",
				Chapter:    3,
				VerseStart: 16,
				VerseEnd:   18,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Single verse with short English abbreviation",
			input: "Joh 3:16",
			expectedRef: &ParsedReference{
				BookName:   "JHN",
				Chapter:    3,
				VerseStart: 16,
				VerseEnd:   16,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Finnish abbreviation with trailing dot and space: room. 1:1-5",
			input: "room. 1:1-5",
			expectedRef: &ParsedReference{
				BookName:   "ROM",
				Chapter:    1,
				VerseStart: 1,
				VerseEnd:   5,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Finnish abbreviation with trailing dot and space: Joh. 3:16",
			input: "Joh. 3:16",
			expectedRef: &ParsedReference{
				BookName:   "JHN",
				Chapter:    3,
				VerseStart: 16,
				VerseEnd:   16,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Finnish numbered abbreviation with dots and space: 1. Kor. 13",
			input: "1. Kor. 13",
			expectedRef: &ParsedReference{
				BookName: "1CO",
				Chapter:  13,
				Scope:    ScopeChapter,
			},
		},
		{
			name:  "Whole book with English full name",
			input: "Genesis",
			expectedRef: &ParsedReference{
				BookName: "GEN",
				Scope:    ScopeBook,
			},
		},
		{
			name:  "Whole book with Finnish name",
			input: "Psalmit",
			expectedRef: &ParsedReference{
				BookName: "PSA",
				Scope:    ScopeBook,
			},
		},

		// --- No-space formats (book name glued to chapter number) ---
		{
			name:  "Uppercase ID without space: GEN1:1",
			input: "GEN1:1",
			expectedRef: &ParsedReference{
				BookName:   "GEN",
				Chapter:    1,
				VerseStart: 1,
				VerseEnd:   1,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Lowercase abbreviation without space: joh3:16",
			input: "joh3:16",
			expectedRef: &ParsedReference{
				BookName:   "JHN",
				Chapter:    3,
				VerseStart: 16,
				VerseEnd:   16,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Finnish abbreviation without any space: 1moos1:1",
			input: "1moos1:1",
			expectedRef: &ParsedReference{
				BookName:   "GEN",
				Chapter:    1,
				VerseStart: 1,
				VerseEnd:   1,
				Scope:      ScopeVerse,
			},
		},

		// --- Dot separator formats ---
		{
			name:  "Uppercase ID with dot before chapter: GEN.1:1",
			input: "GEN.1:1",
			expectedRef: &ParsedReference{
				BookName:   "GEN",
				Chapter:    1,
				VerseStart: 1,
				VerseEnd:   1,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Finnish abbreviated form with trailing dot: Joh.3:16",
			input: "Joh.3:16",
			expectedRef: &ParsedReference{
				BookName:   "JHN",
				Chapter:    3,
				VerseStart: 16,
				VerseEnd:   16,
				Scope:      ScopeVerse,
			},
		},

		// --- Colon as book-chapter separator ---
		{
			name:  "Colon-separated book and chapter: JHN:1:3",
			input: "JHN:1:3",
			expectedRef: &ParsedReference{
				BookName:   "JHN",
				Chapter:    1,
				VerseStart: 3,
				VerseEnd:   3,
				Scope:      ScopeVerse,
			},
		},

		// --- Case insensitivity ---
		{
			name:  "Lowercase canonical ID: gen 1:1",
			input: "gen 1:1",
			expectedRef: &ParsedReference{
				BookName:   "GEN",
				Chapter:    1,
				VerseStart: 1,
				VerseEnd:   1,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Finnish abbreviation with space: 1 moos 1:1",
			input: "1 moos 1:1",
			expectedRef: &ParsedReference{
				BookName:   "GEN",
				Chapter:    1,
				VerseStart: 1,
				VerseEnd:   1,
				Scope:      ScopeVerse,
			},
		},

		// --- Liturgical calendar & complex church year formats ---
		{
			name:  "Liturgical en-dash verse range: Luuk. 7:11–16",
			input: "Luuk. 7:11–16",
			expectedRef: &ParsedReference{
				BookName:   "LUK",
				Chapter:    7,
				VerseStart: 11,
				VerseEnd:   16,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Liturgical book with embedded space and en-dash: Ap. t. 4:8–12",
			input: "Ap. t. 4:8–12",
			expectedRef: &ParsedReference{
				BookName:   "ACT",
				Chapter:    4,
				VerseStart: 8,
				VerseEnd:   12,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Discontinuous verse range with comma and en-dash: Job 14:1–6, 13–15",
			input: "Job 14:1–6, 13–15",
			expectedRef: &ParsedReference{
				BookName:   "JOB",
				Chapter:    14,
				VerseStart: 1,
				VerseEnd:   15,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Complex gospel reading with optional verses in parentheses: Joh. 11:21–29 (30–31) 32–45",
			input: "Joh. 11:21–29 (30–31) 32–45",
			expectedRef: &ParsedReference{
				BookName:   "JHN",
				Chapter:    11,
				VerseStart: 21,
				VerseEnd:   45,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Old Testament reading with space after colon and optional verses: 1. Moos. 3: 1–7 (8–19)",
			input: "1. Moos. 3: 1–7 (8–19)",
			expectedRef: &ParsedReference{
				BookName:   "GEN",
				Chapter:    3,
				VerseStart: 1,
				VerseEnd:   19,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Chapter scope with parenthesized commentary: 1. Kor. 13 (1. vuosikerta)",
			input: "1. Kor. 13 (1. vuosikerta)",
			expectedRef: &ParsedReference{
				BookName: "1CO",
				Chapter:  13,
				Scope:    ScopeChapter,
			},
		},
		{
			name:  "Liturgical prophets: Hoos. 14:2–10",
			input: "Hoos. 14:2–10",
			expectedRef: &ParsedReference{
				BookName:   "HOS",
				Chapter:    14,
				VerseStart: 2,
				VerseEnd:   10,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Liturgical poetry: Laul. l. 2:10–13",
			input: "Laul. l. 2:10–13",
			expectedRef: &ParsedReference{
				BookName:   "SNG",
				Chapter:    2,
				VerseStart: 10,
				VerseEnd:   13,
				Scope:      ScopeVerse,
			},
		},
		{
			name:  "Liturgical lamentations: Valit. 3:22–26",
			input: "Valit. 3:22–26",
			expectedRef: &ParsedReference{
				BookName:   "LAM",
				Chapter:    3,
				VerseStart: 22,
				VerseEnd:   26,
				Scope:      ScopeVerse,
			},
		},

		// --- Error cases ---
		{
			name:        "Empty input returns error",
			input:       "   ",
			expectError: true,
		},
		{
			name:        "Non-alphabetic input returns error",
			input:       "!!!",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := ParseReference(tt.input)

			if tt.expectError {
				if err == nil {
					t.Errorf("expected an error but got success")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if res.BookName != tt.expectedRef.BookName {
				t.Errorf("BookName: expected %q, got %q", tt.expectedRef.BookName, res.BookName)
			}
			if res.Chapter != tt.expectedRef.Chapter {
				t.Errorf("Chapter: expected %d, got %d", tt.expectedRef.Chapter, res.Chapter)
			}
			if res.VerseStart != tt.expectedRef.VerseStart {
				t.Errorf("VerseStart: expected %d, got %d", tt.expectedRef.VerseStart, res.VerseStart)
			}
			if res.VerseEnd != tt.expectedRef.VerseEnd {
				t.Errorf("VerseEnd: expected %d, got %d", tt.expectedRef.VerseEnd, res.VerseEnd)
			}
			if res.Scope != tt.expectedRef.Scope {
				t.Errorf("Scope: expected %v, got %v", tt.expectedRef.Scope, res.Scope)
			}
		})
	}
}

func TestNormalizeBookKey(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"GEN", "gen"},
		{"GEN.", "gen"},
		{"1. Moos", "1 moos"},
		{"1.moos", "1 moos"},
		{"Joh.", "joh"},
		{"1. Kor.", "1 kor"},
		{"  John  ", "john"},
	}
	for _, c := range cases {
		got := normalizeBookKey(c.input)
		if got != c.expected {
			t.Errorf("normalizeBookKey(%q) = %q, want %q", c.input, got, c.expected)
		}
	}
}

func TestBuildAliasMap(t *testing.T) {
	m := buildAliasMap(bookNamesJSON)

	checks := []struct {
		key      string
		expected string
	}{
		{"gen", "GEN"},
		{"genesis", "GEN"},
		{"1 moos", "GEN"},
		{"1 mooseksen kirja", "GEN"},
		{"jhn", "JHN"},
		{"john", "JHN"},
		{"joh", "JHN"},
		{"1co", "1CO"},
		{"1 kor", "1CO"},
		{"rev", "REV"},
		{"ilm", "REV"},
		{"psa", "PSA"},
		{"ps", "PSA"},
		{"psalmit", "PSA"},
		{"ap t", "ACT"},
		{"apt", "ACT"},
		{"hoos", "HOS"},
		{"laul l", "SNG"},
		{"valit", "LAM"},
	}

	for _, c := range checks {
		got, ok := m[c.key]
		if !ok {
			t.Errorf("alias map missing key %q (expected %q)", c.key, c.expected)
			continue
		}
		if got != c.expected {
			t.Errorf("alias map[%q] = %q, want %q", c.key, got, c.expected)
		}
	}
}

func TestGetBookSpan(t *testing.T) {
	tests := []struct {
		start string
		end   string
		want  []string
	}{
		{
			start: "MAT",
			end:   "JOH",
			want:  []string{"MAT", "MRK", "LUK", "JHN"},
		},
		{
			start: "Matt",
			end:   "Joh",
			want:  []string{"MAT", "MRK", "LUK", "JHN"},
		},
		{
			start: "GEN",
			end:   "DEU",
			want:  []string{"GEN", "EXO", "LEV", "NUM", "DEU"},
		},
		{
			start: "ROM",
			end:   "GAL",
			want:  []string{"ROM", "1CO", "2CO", "GAL"},
		},
		{
			start: "REV",
			end:   "REV",
			want:  []string{"REV"},
		},
	}

	for _, tt := range tests {
		got := GetBookSpan(tt.start, tt.end)
		if len(got) != len(tt.want) {
			t.Fatalf("GetBookSpan(%q, %q) length = %d, want %d (got: %v)", tt.start, tt.end, len(got), len(tt.want), got)
		}
		for i := range got {
			if got[i] != tt.want[i] {
				t.Errorf("GetBookSpan(%q, %q)[%d] = %q, want %q", tt.start, tt.end, i, got[i], tt.want[i])
			}
		}
	}
}

