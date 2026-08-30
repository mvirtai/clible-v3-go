package dsl

import (
	"strings"
	"testing"
)

// TestISLADiagnostic_Error verifies the ISLADiagnostic.Error() string format.
func TestISLADiagnostic_Error(t *testing.T) {
	t.Run("error with hint", func(t *testing.T) {
		d := &ISLADiagnostic{
			Code:    DiagUnknownScope,
			Message: "unknown scope",
			Hint:    "Did you mean @evankeliumit?",
		}
		got := d.Error()
		if !strings.Contains(got, "[UNKNOWN_SCOPE]") {
			t.Errorf("expected code in error, got: %s", got)
		}
		if !strings.Contains(got, "Did you mean") {
			t.Errorf("expected hint in error, got: %s", got)
		}
	})

	t.Run("error without hint", func(t *testing.T) {
		d := &ISLADiagnostic{
			Code:    DiagMissingArg,
			Message: "missing required argument",
		}
		got := d.Error()
		if !strings.Contains(got, "[MISSING_ARG]") {
			t.Errorf("expected code in error, got: %s", got)
		}
		if strings.Contains(got, "—") {
			t.Errorf("unexpected separator in error without hint: %s", got)
		}
	})
}

// TestNewUnknownScopeDiagnostic_Hints verifies that near-miss scopes get Levenshtein hints.
func TestNewUnknownScopeDiagnostic_Hints(t *testing.T) {
	cases := []struct {
		input    string
		wantHint string
	}{
		{"evangeliumit", "evankeliumit"},  // Common Finnish typo
		{"gossels", "gospels"},            // English near-miss
		{"profetia", "profeetat"},         // Finnish partial match
		{"historia", "historia"},          // Exact — should still match
	}

	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			d := NewUnknownScopeDiagnostic(tc.input, 0)
			if d.Code != DiagUnknownScope {
				t.Errorf("expected DiagUnknownScope, got %s", d.Code)
			}
			if tc.wantHint != "" && !strings.Contains(d.Hint, tc.wantHint) {
				t.Errorf("expected hint to contain %q, got %q", tc.wantHint, d.Hint)
			}
		})
	}
}

// TestNewUnknownIdentDiagnostic_Hints verifies hints for near-miss command names.
func TestNewUnknownIdentDiagnostic_Hints(t *testing.T) {
	cases := []struct {
		input    string
		wantHint string
	}{
		{"refss", "refs"},
		{"conut", "count"},
		{"teme", "themes"},
	}

	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			d := NewUnknownIdentDiagnostic(tc.input, 0)
			if d.Code != DiagUnknownIdent {
				t.Errorf("expected DiagUnknownIdent, got %s", d.Code)
			}
			if !strings.Contains(d.Hint, tc.wantHint) {
				t.Errorf("expected hint to contain %q, got %q", tc.wantHint, d.Hint)
			}
		})
	}
}

// TestLevenshtein validates a selection of edit-distance computations.
func TestLevenshtein(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"", "", 0},
		{"", "abc", 3},
		{"abc", "", 3},
		{"abc", "abc", 0},
		{"kitten", "sitting", 3},
		{"refs", "refss", 1},
		{"count", "conut", 2},
	}
	for _, tc := range cases {
		got := levenshtein(tc.a, tc.b)
		if got != tc.want {
			t.Errorf("levenshtein(%q, %q) = %d, want %d", tc.a, tc.b, got, tc.want)
		}
	}
}
