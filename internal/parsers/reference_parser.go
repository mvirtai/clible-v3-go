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
type ParsedReference struct {
	BookName   string         `json:"book_name"`
	Chapter    int            `json:"chapter"`
	VerseStart int            `json:"verse_start"`
	VerseEnd   int            `json:"verse_end"`
	Scope      ReferenceScope `json:"scope"`
}

// Global regex compiled once at application startup to maximize performance.
// It handles formats like: "John 3:16-18", "John 3:16", "John 3", or "John".
// Group 1: Book name (including optional leading numbers like '1. Joh')
// Group 2: Chapter number (optional)
// Group 3: Verse start number (optional)
// Group 4: Verse end number (optional)
var refRegex = regexp.MustCompile(`^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+)(?:\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?)?$`)

// ParseReference extracts structured metadata out of a raw user query string.
func ParseReference(input string) (*ParsedReference, error) {
	cleaned := strings.TrimSpace(input)
	if cleaned == "" {
		return nil, errors.New("cannot parse an empty reference string")
	}

	// FindStringSubmatch returns a slice of strings containing the full match and all capture groups
	matches := refRegex.FindStringSubmatch(cleaned)
	if len(matches) == 0 {
		return nil, errors.New("invalid bible reference format configuration")
	}

	// Group 1 is always the book name if the regex succeeded
	bookName := strings.TrimSpace(matches[1])

	// If chapter (Group 2) is empty, the scope is the entire Book (e.g. "John")
	if matches[2] == "" {
		return &ParsedReference{
			BookName: bookName,
			Scope:    ScopeBook,
		}, nil
	}

	// Convert chapter string to integer using strconv.Atoi (letters to integer)
	chapter, err := strconv.Atoi(matches[2])
	if err != nil {

		return nil, errors.New("invalid chapter number format")
	}

	// If verse start (Group 3) is empty, the scope is the entire Chapter (e.g., "John 3")
	if matches[3] == "" {
		return &ParsedReference{
			BookName: bookName,
			Chapter:  chapter,
			Scope:    ScopeChapter,
		}, nil
	}

	verseStart, err := strconv.Atoi(matches[3])
	if err != nil {
		return nil, errors.New("invalid verse start number format")
	}

	// Default verseEnd to match verseStart in case it's a single verse reference (e.g., "John 3:16")
	verseEnd := verseStart
	if matches[4] != "" {
		verseEnd, err = strconv.Atoi(matches[4])
		if err != nil {
			return nil, errors.New("invalid verse end number format")
		}
	}

	return &ParsedReference{
		BookName:   bookName,
		Chapter:    chapter,
		VerseStart: verseStart,
		VerseEnd:   verseEnd,
		Scope:      ScopeVerse,
	}, nil
}
