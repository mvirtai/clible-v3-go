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
