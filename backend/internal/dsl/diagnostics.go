package dsl

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

// DiagnosticCode identifies the category of an ISLA parse or execution diagnostic.
type DiagnosticCode string

const (
	// DiagUnknownScope is returned when a scope identifier cannot be resolved.
	DiagUnknownScope DiagnosticCode = "UNKNOWN_SCOPE"
	// DiagUnknownIdent is returned when an unrecognised identifier is encountered.
	DiagUnknownIdent DiagnosticCode = "UNKNOWN_IDENT"
	// DiagMissingArg is returned when a required argument is absent.
	DiagMissingArg DiagnosticCode = "MISSING_ARG"
	// DiagInvalidLimit is returned when a numeric limit is out of the allowed range.
	DiagInvalidLimit DiagnosticCode = "INVALID_LIMIT"
	// DiagBooleanSyntax is returned for malformed boolean search expressions.
	DiagBooleanSyntax DiagnosticCode = "BOOLEAN_SYNTAX"
	// DiagRangeSyntax is returned when a range expression is invalid.
	DiagRangeSyntax DiagnosticCode = "RANGE_SYNTAX"
)

// ISLADiagnostic carries structured error information from the ISLA DSL parser
// and executor, suitable for rendering IDE-style inline diagnostics in the frontend.
type ISLADiagnostic struct {
	// Code is a machine-readable error category identifier.
	Code DiagnosticCode
	// Message is a concise, human-readable error description.
	Message string
	// Pos is the byte offset in the original DSL input where the issue was detected.
	Pos int
	// Hint is an optional suggestion to guide the user toward a correction,
	// e.g. "Did you mean @evankeliumit?"
	Hint string
}

// Error implements the error interface so ISLADiagnostic can be returned as an error.
func (d *ISLADiagnostic) Error() string {
	if d.Hint != "" {
		return fmt.Sprintf("[%s] %s — %s", d.Code, d.Message, d.Hint)
	}
	return fmt.Sprintf("[%s] %s", d.Code, d.Message)
}

// knownScopes holds all canonical scope identifiers for Levenshtein hint matching.
var knownScopes = []string{
	"evankeliumit", "gospels",
	"toora", "torah", "laki", "law", "pentateukki", "pentateuch",
	"kirjeet", "epistles", "letters",
	"viisaus", "wisdom", "runous", "poetry",
	"profeetat", "prophets",
	"historia", "history",
	"VT", "OT", "vt", "ot",
	"UT", "NT", "ut", "nt",
}

// knownCommands holds canonical pipeline action identifiers for Levenshtein hints.
var knownCommands = []string{
	"in", "use", "at", "vs", "compare",
	"refs", "themes", "suggest", "count", "limit",
	"range", "from", "multi",
	"search", "read",
}

// NewUnknownScopeDiagnostic creates a DiagUnknownScope diagnostic with a
// nearest-match hint derived from the known scope registry.
func NewUnknownScopeDiagnostic(scope string, pos int) *ISLADiagnostic {
	hint := ""
	if nearest, ok := nearestMatch(scope, knownScopes, 3); ok {
		hint = fmt.Sprintf("Did you mean @%s?", nearest)
	}
	return &ISLADiagnostic{
		Code:    DiagUnknownScope,
		Message: fmt.Sprintf("unknown scope %q — no matching book group or book ID found", scope),
		Pos:     pos,
		Hint:    hint,
	}
}

// NewUnknownIdentDiagnostic creates a DiagUnknownIdent diagnostic with a
// nearest-match hint for unrecognised pipeline commands.
func NewUnknownIdentDiagnostic(ident string, pos int) *ISLADiagnostic {
	hint := ""
	if nearest, ok := nearestMatch(ident, knownCommands, 2); ok {
		hint = fmt.Sprintf("Did you mean %s(...)?", nearest)
	}
	return &ISLADiagnostic{
		Code:    DiagUnknownIdent,
		Message: fmt.Sprintf("unknown pipeline command %q", ident),
		Pos:     pos,
		Hint:    hint,
	}
}

// nearestMatch returns the closest string in candidates to input using
// Levenshtein distance, capped at maxDist. Returns ("", false) if no
// candidate is within maxDist edits.
func nearestMatch(input string, candidates []string, maxDist int) (string, bool) {
	best := ""
	bestDist := maxDist + 1
	norm := strings.ToLower(strings.TrimSpace(input))
	for _, c := range candidates {
		d := levenshtein(norm, strings.ToLower(c))
		if d < bestDist {
			bestDist = d
			best = c
		}
	}
	if bestDist <= maxDist {
		return best, true
	}
	return "", false
}

// levenshtein computes the edit distance between two UTF-8 strings.
func levenshtein(a, b string) int {
	ra := []rune(a)
	rb := []rune(b)
	la := utf8.RuneCountInString(a)
	lb := utf8.RuneCountInString(b)
	_ = ra
	_ = rb

	if la == 0 {
		return lb
	}
	if lb == 0 {
		return la
	}

	prev := make([]int, lb+1)
	curr := make([]int, lb+1)
	for j := 0; j <= lb; j++ {
		prev[j] = j
	}

	aRunes := []rune(a)
	bRunes := []rune(b)

	for i := 1; i <= la; i++ {
		curr[0] = i
		for j := 1; j <= lb; j++ {
			cost := 1
			if aRunes[i-1] == bRunes[j-1] {
				cost = 0
			}
			del := prev[j] + 1
			ins := curr[j-1] + 1
			sub := prev[j-1] + cost
			curr[j] = min3(del, ins, sub)
		}
		prev, curr = curr, prev
	}
	return prev[lb]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}
