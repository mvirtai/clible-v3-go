package parsers

import (
	"testing"
)

func TestParseReference_TableDriven(t *testing.T) {
	// Table-driven testing: we define a slice of anonymous structs acting as test cases.
	// This is the most idiomatic way to write clean, maintainable test suites in Go.
	tests := []struct {
		name        string
		input       string
		expectedRef *ParsedReference
		expectError bool
	}{
		{
			name:  "Full Verse Range",
			input: "John 3:16-18",
			expectedRef: &ParsedReference{
				BookName:   "John",
				Chapter:    3,
				VerseStart: 16,
				VerseEnd:   18,
				Scope:      ScopeVerse,
			},
			expectError: false,
		},
		{
			name:  "Single Verse",
			input: "Joh 3:16",
			expectedRef: &ParsedReference{
				BookName:   "Joh",
				Chapter:    3,
				VerseStart: 16,
				VerseEnd:   16,
				Scope:      ScopeVerse,
			},
			expectError: false,
		},
		{
			name:  "Whole Chapter",
			input: "1. Kor 13",
			expectedRef: &ParsedReference{
				BookName: "1. Kor",
				Chapter:  13,
				Scope:    ScopeChapter,
			},
			expectError: false,
		},
		{
			name:  "Whole Book",
			input: "Genesis",
			expectedRef: &ParsedReference{
				BookName: "Genesis",
				Scope:    ScopeBook,
			},
			expectError: false,
		},
		{
			name:        "Empty Input Error",
			input:       "   ",
			expectedRef: nil,
			expectError: true,
		},
		{
			name:        "Invalid Format",
			input:       "!!!",
			expectedRef: nil,
			expectError: true,
		},
	}

	for _, tt := range tests {
		// t.Run launches an isolated sub-test for each element in our matrix
		t.Run(tt.name, func(t *testing.T) {
			res, err := ParseReference(tt.input)

			if tt.expectError {
				if err == nil {
					t.Errorf("expected an error but got success instead")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error triggered: %v", err)
			}

			// Validate core structural field attributes
			if res.BookName != tt.expectedRef.BookName {
				t.Errorf("expected book '%s', got '%s'", tt.expectedRef.BookName, res.BookName)
			}
			if res.Chapter != tt.expectedRef.Chapter {
				t.Errorf("expected chapter %d, got %d", tt.expectedRef.Chapter, res.Chapter)
			}
			if res.VerseStart != tt.expectedRef.VerseStart {
				t.Errorf("expected verse start %d, got %d", tt.expectedRef.VerseStart, res.VerseStart)
			}
			if res.VerseEnd != tt.expectedRef.VerseEnd {
				t.Errorf("expected verse end %d, got %d", tt.expectedRef.VerseEnd, res.VerseEnd)
			}
			if res.Scope != tt.expectedRef.Scope {
				t.Errorf("expected scope %v, got %v", tt.expectedRef.Scope, res.Scope)
			}
		})
	}
}
