package parsers

import (
	"errors"
	"regexp"
	"strconv"
	"strings"
)

// ReferenceScope defines whether the reference targets a single book, chapter, or verse range.
type ReferenceScope int

const (
	ScopeVerse ReferenceScope = iota
	ScopeChapter
	ScopeBook
)

// ParsedReference is the final structural output returned to the Service layer.
// BookName is always a canonical book_id (e.g. "GEN", "JHN", "1CO") after parsing.
type ParsedReference struct {
	BookName   string         `json:"book_name"`
	Chapter    int            `json:"chapter"`
	VerseStart int            `json:"verse_start"`
	VerseEnd   int            `json:"verse_end"`
	Scope      ReferenceScope `json:"scope"`
}

// refRegex parses a normalized reference string.
// Handles formats like: "JHN 3:16-18", "JHN 3:16", "JHN 3", "JHN 11:21-29 (30-31) 32-45", or "JHN".
// Group 1: Book name (including optional leading number like "1 Kor", "1. Moos.", "Ap. t.")
// Group 2: Chapter number (optional)
// Group 3: Verse part (optional, e.g. "16", "16-18", "1-6, 13-15", "21-29 (30-31) 32-45")
var refRegex = regexp.MustCompile(`^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.|\s+[a-zA-ZÀ-ÿ.]+)*)(?:\s+(\d+)(?:\s*:\s*(.*))?)?$`)

// reDigits extracts all consecutive digit sequences from the verse section.
var reDigits = regexp.MustCompile(`\d+`)

// reCommentary matches parenthesized non-verse annotations like "(1. vuosikerta)".
var reCommentary = regexp.MustCompile(`\s*\([^)]*[a-zA-ZÀ-ÿ]+[^)]*\)`)

// reColonSpace collapses spaces after a colon: "3: 1" -> "3:1".
var reColonSpace = regexp.MustCompile(`:\s+(\d+)`)

// reLetterDigit matches a letter immediately followed (optionally via a dot) by a digit.
// Used to insert a space at the book-chapter boundary: "GEN1" → "GEN 1", "GEN.1" → "GEN 1", "1moos1" → "1moos 1".
var reLetterDigit = regexp.MustCompile(`([a-zA-ZÀ-ÿ])\.?(\d)`)

// reColonNormalize detects the pattern "BOOK:CHAPTER" (colon instead of space).
// Handles: "JHN:1:3" → "JHN 1:3".
var reColonNormalize = regexp.MustCompile(`^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ\s]+):(\d+)`)

// ParseReference extracts structured metadata out of a raw user query string.
// The returned ParsedReference.BookName is always a canonical book_id (e.g. "GEN").
//
// Supported input formats (examples):
//
//	"John 3:16"             – standard spaced English name
//	"Joh 3:16"              – short English abbreviation
//	"joh3:16"               – abbreviation without space
//	"GEN1:1"                – uppercase ID without space
//	"GEN.1:1"               – uppercase ID with dot separator
//	"1 moos 1:1"            – Finnish full name with space
//	"1moos1:1"              – Finnish abbreviation without spaces
//	"JHN:1:3"               – colon-separated book and chapter
//	"Luuk. 7:11–16"         – Finnish church year with en-dash
//	"Ap. t. 4:8–12"         – Finnish abbreviation with embedded space
//	"Job 14:1–6, 13–15"     – Discontinuous verse ranges with comma
//	"Joh. 11:21–29 (30–31) 32–45" – Optional reading brackets
func ParseReference(input string) (*ParsedReference, error) {
	cleaned := strings.TrimSpace(input)
	if cleaned == "" {
		return nil, errors.New("cannot parse an empty reference string")
	}

	// Step 1: Normalize unicode dashes (en-dash, em-dash, minus sign) to standard hyphen.
	cleaned = strings.ReplaceAll(cleaned, "–", "-")
	cleaned = strings.ReplaceAll(cleaned, "—", "-")
	cleaned = strings.ReplaceAll(cleaned, "−", "-")

	// Step 2: Remove textual commentary in parentheses like "(1. vuosikerta)".
	cleaned = reCommentary.ReplaceAllString(cleaned, "")
	cleaned = strings.TrimSpace(cleaned)

	// Step 3: Normalize colon-as-separator between book and chapter.
	// "JHN:1:3" → "JHN 1:3"
	cleaned = reColonNormalize.ReplaceAllString(cleaned, "$1 $2")

	// Step 4: Collapse whitespace after colon: "3: 1" → "3:1".
	cleaned = reColonSpace.ReplaceAllString(cleaned, ":$1")

	// Step 5: Insert a space between any letter and the following digit (optionally separated by a dot).
	// This handles: "GEN1" → "GEN 1", "GEN.1" → "GEN 1", "1moos1" → "1moos 1".
	// The replacement targets only the book-chapter boundary; verse separators (:, -)
	// are not affected because they are not letters.
	cleaned = reLetterDigit.ReplaceAllString(cleaned, "$1 $2")

	// Step 6: Match the normalized string against the structural regex.
	matches := refRegex.FindStringSubmatch(cleaned)
	if len(matches) == 0 {
		return nil, errors.New("invalid bible reference format")
	}

	// Step 7: Resolve the raw book name to a canonical book_id via the alias map.
	rawBook := strings.TrimSpace(matches[1])
	bookID := ResolveBookID(rawBook)

	// If chapter (Group 2) is empty, the scope is the entire book (e.g. "Genesis").
	if matches[2] == "" {
		return &ParsedReference{
			BookName: bookID,
			Scope:    ScopeBook,
		}, nil
	}

	chapter, err := strconv.Atoi(matches[2])
	if err != nil {
		return nil, errors.New("invalid chapter number format")
	}

	// If verse section (Group 3) is empty, the scope is the entire chapter (e.g. "John 3").
	if matches[3] == "" {
		return &ParsedReference{
			BookName: bookID,
			Chapter:  chapter,
			Scope:    ScopeChapter,
		}, nil
	}

	// Step 8: Extract verse numbers from the verse section.
	digits := reDigits.FindAllString(matches[3], -1)
	if len(digits) == 0 {
		return &ParsedReference{
			BookName: bookID,
			Chapter:  chapter,
			Scope:    ScopeChapter,
		}, nil
	}

	verseStart, err := strconv.Atoi(digits[0])
	if err != nil {
		return nil, errors.New("invalid verse start number format")
	}

	verseEnd := verseStart
	if len(digits) > 1 {
		lastNum, err := strconv.Atoi(digits[len(digits)-1])
		if err != nil {
			return nil, errors.New("invalid verse end number format")
		}
		if lastNum >= verseStart {
			verseEnd = lastNum
		}
	}

	return &ParsedReference{
		BookName:   bookID,
		Chapter:    chapter,
		VerseStart: verseStart,
		VerseEnd:   verseEnd,
		Scope:      ScopeVerse,
	}, nil
}
