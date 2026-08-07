package services

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// ThemeItem represents an extracted themeword and its appearance count.
type ThemeItem struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

var nonAlphaRegex = regexp.MustCompile(`[^a-zA-ZäöÄÖåÅ\s]+`)

// ExtractThemes analyzes text, remove stopwords and returns the most common words with their frequencies.
func ExtractThemes(text string, limit int) []ThemeItem {
	if limit <= 0 {
		limit = 10
	}

	cleaned := nonAlphaRegex.ReplaceAllString(strings.ToLower(text), " ")

	words := strings.Fields(cleaned)
	wordCounts := make(map[string]int)

	for _, w := range words {
		if utf8.RuneCountInString(w) > 3 && !stopWords[w] {
			wordCounts[w]++
		}
	}

	var items []ThemeItem
	for w, c := range wordCounts {
		items = append(items, ThemeItem{Word: w, Count: c})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Count == items[j].Count {
			return items[i].Word < items[j].Word
		}
		return items[i].Count > items[j].Count
	})

	if len(items) > limit {
		items = items[:limit]
	}

	return items
}

// ExtractKeywords processes the input text, removes non-alphabetic characters,
// filters out stop words, and returns the top 5 most frequent words.
func ExtractKeywords(text string) []string {
	// Clean text: keep letters and spaces, convert to lowercase
	cleaned := nonAlphaRegex.ReplaceAllString(strings.ToLower(text), " ")

	words := strings.Fields(cleaned)
	wordCounts := make(map[string]int)

	for _, w := range words {
		// Only consider words longer than 3 characters (in runes) and not in the stopWords list
		if utf8.RuneCountInString(w) > 3 && !stopWords[w] {
			wordCounts[w]++
		}
	}

	// Define structure to sort map by values (frequencies)
	type wordFreq struct {
		word  string
		count int
	}
	var freqs []wordFreq
	for w, c := range wordCounts {
		freqs = append(freqs, wordFreq{w, c})
	}

	// Sort in descending order of frequency, and alphabetically for tie-breaking
	sort.Slice(freqs, func(i, j int) bool {
		if freqs[i].count == freqs[j].count {
			return freqs[i].word < freqs[j].word
		}
		return freqs[i].count > freqs[j].count
	})

	// Pick the top 5 keywords
	var keywords []string
	for i := 0; i < len(freqs) && i < 5; i++ {
		keywords = append(keywords, freqs[i].word)
	}

	return keywords
}

// CLICommand represents a parsed slash command.
type CLICommand struct {
	Name  string            // E.g. "/read"
	Args  []string          // Positional arguments, e.g. ["John", "3:16"]
	Flags map[string]string // Keyword flags, e.g. {"translation": "KJV"}
}

// ParseCLICommand parses a raw string input into a structured CLICommand.
// It expects the input to start with a slash '/'.
func ParseCLICommand(input string) *CLICommand {
	input = strings.TrimSpace(input)
	if !strings.HasPrefix(input, "/") {
		return nil
	}

	var parts []string
	var current strings.Builder
	inQuotes := false
	var quoteChar rune

	runes := []rune(input)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		if inQuotes {
			if r == quoteChar {
				inQuotes = false
			} else {
				current.WriteRune(r)
			}
		} else {
			switch r {
			case '"', '\'':
				inQuotes = true
				quoteChar = r
			case ' ', '\t', '\n', '\r':
				if current.Len() > 0 {
					parts = append(parts, current.String())
					current.Reset()
				}
			default:
				current.WriteRune(r)
			}
		}
	}
	if current.Len() > 0 {
		parts = append(parts, current.String())
	}

	if len(parts) == 0 {
		return nil
	}

	cmdName := parts[0]
	flags := make(map[string]string)
	var args []string

	for _, part := range parts[1:] {
		if strings.HasPrefix(part, "--") {
			flagPart := strings.TrimPrefix(part, "--")
			subParts := strings.SplitN(flagPart, "=", 2)
			name := subParts[0]
			value := "true"
			if len(subParts) > 1 {
				value = subParts[1]
			}
			flags[name] = value
		} else {
			args = append(args, part)
		}
	}

	return &CLICommand{
		Name:  cmdName,
		Args:  args,
		Flags: flags,
	}
}

// CLIService orchestrates notebook cell CLI slash command executions.
type CLIService struct {
	verseRepo    *db.VerseRepository
	verseService *VerseService
}

// NewCLIService constructs a CLI command execution engine.
func NewCLIService(vr *db.VerseRepository, vs *VerseService) *CLIService {
	return &CLIService{
		verseRepo:    vr,
		verseService: vs,
	}
}

// ExecuteCommand runs a parsed command and returns a structured CLIResult.
func (s *CLIService) ExecuteCommand(ctx context.Context, cmd *CLICommand, translationID string, contextText string) (*models.CLIResult, error) {
	switch cmd.Name {
	case "/read":
		return s.executeReadCommand(ctx, cmd, translationID)
	case "/search":
		return s.executeSearchCommand(ctx, cmd, translationID)
	case "/refs", "/ref":
		return s.executeRefsCommand(ctx, cmd, translationID)
	case "/suggest":
		return s.executeSuggestCommand(ctx, cmd, translationID, contextText)
	case "/themes":
		return s.executeThemesCommand(ctx, cmd, contextText)
	default:
		return nil, fmt.Errorf("unknown command: %s", cmd.Name)
	}
}

func (s *CLIService) executeReadCommand(ctx context.Context, cmd *CLICommand, translationID string) (*models.CLIResult, error) {
	if len(cmd.Args) == 0 {
		return nil, errors.New("missing reference (e.g. /read John 3:16)")
	}

	fmt.Printf("DEBUG: executeReadCommand Name=%q Args=%#v Flags=%#v\n", cmd.Name, cmd.Args, cmd.Flags)
	refStr := strings.Join(cmd.Args, " ")
	tid := translationID
	if t, ok := cmd.Flags["translation"]; ok {
		tid = t
	}

	verses, err := s.verseService.GetVerses(ctx, refStr, tid)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch verses: %w", err)
	}

	return &models.CLIResult{
		Type: "read",
		Data: map[string]interface{}{
			"reference": refStr,
			"verses":    verses,
		},
	}, nil
}

func (s *CLIService) executeSearchCommand(ctx context.Context, cmd *CLICommand, translationID string) (*models.CLIResult, error) {
	if len(cmd.Args) == 0 {
		return nil, errors.New("missing search query (e.g. /search love)")
	}

	query := strings.Join(cmd.Args, " ")
	useRegex := cmd.Flags["regex"] == "true"

	verses, err := s.verseService.SearchVerses(ctx, query, useRegex, translationID, "", "")
	if err != nil {
		return nil, fmt.Errorf("failed to search verses: %w", err)
	}

	return &models.CLIResult{
		Type: "search",
		Data: map[string]interface{}{
			"query":  query,
			"verses": verses,
		},
	}, nil
}

func (s *CLIService) executeRefsCommand(ctx context.Context, cmd *CLICommand, translationID string) (*models.CLIResult, error) {
	if len(cmd.Args) == 0 {
		return nil, errors.New("missing reference (e.g. /refs John 3:16)")
	}

	refStr := strings.Join(cmd.Args, " ")
	verses, err := s.verseService.GetVerses(ctx, refStr, translationID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch source verse: %w", err)
	}
	if len(verses) == 0 {
		return nil, fmt.Errorf("source verse not found for reference: %s", refStr)
	}

	// Dynamic FTS check on the source verse text
	keywords := ExtractKeywords(verses[0].Text)
	if len(keywords) == 0 {
		return &models.CLIResult{
			Type: "refs",
			Data: map[string]interface{}{
				"source":     refStr,
				"references": []models.Verse{},
			},
		}, nil
	}

	refs, err := s.verseRepo.SearchByKeywords(ctx, keywords, translationID, 6)
	if err != nil {
		return nil, fmt.Errorf("failed to search cross-references: %w", err)
	}

	// Filter out the source verse itself
	var filteredRefs []models.Verse
	for _, r := range refs {
		isSource := false
		for _, sv := range verses {
			if r.BookID == sv.BookID && r.Chapter == sv.Chapter && r.Verse == sv.Verse {
				isSource = true
				break
			}
		}
		if !isSource {
			filteredRefs = append(filteredRefs, r)
		}
	}

	// Return top 5
	if len(filteredRefs) > 5 {
		filteredRefs = filteredRefs[:5]
	}

	return &models.CLIResult{
		Type: "refs",
		Data: map[string]interface{}{
			"source":     refStr,
			"references": filteredRefs,
		},
	}, nil
}

func (s *CLIService) executeSuggestCommand(ctx context.Context, _ *CLICommand, translationID string, contextText string) (*models.CLIResult, error) {
	trimmedCtx := strings.TrimSpace(contextText)
	if trimmedCtx == "" {
		return &models.CLIResult{
			Type: "suggest",
			Data: map[string]interface{}{
				"keywords":    []string{},
				"suggestions": []models.Verse{},
			},
		}, nil
	}

	keywords := ExtractKeywords(trimmedCtx)
	if len(keywords) == 0 {
		return &models.CLIResult{
			Type: "suggest",
			Data: map[string]interface{}{
				"keywords":    []string{},
				"suggestions": []models.Verse{},
			},
		}, nil
	}

	suggestions, err := s.verseRepo.SearchByKeywords(ctx, keywords, translationID, 5)
	if err != nil {
		return nil, fmt.Errorf("failed to search suggestions: %w", err)
	}

	return &models.CLIResult{
		Type: "suggest",
		Data: map[string]interface{}{
			"keywords":    keywords,
			"suggestions": suggestions,
		},
	}, nil
}

// executeThemesCommand implements the /themes command and returns --limit=n * the most frequent words.
func (s *CLIService) executeThemesCommand(_ context.Context, cmd *CLICommand, contextText string) (*models.CLIResult, error) {
	limit := 10
	if lStr, ok := cmd.Flags["limit"]; ok {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}

	trimmedCtx := strings.TrimSpace(contextText)
	if trimmedCtx == "" {
		return &models.CLIResult{
			Type: "themes",
			Data: map[string]interface{}{
				"themes": []ThemeItem{},
				"limit":  limit,
				"count":  0,
			},
		}, nil
	}

	themes := ExtractThemes(trimmedCtx, limit)
	return &models.CLIResult{
		Type: "themes",
		Data: map[string]interface{}{
			"themes": themes,
			"limit":  limit,
			"count":  len(themes),
		},
	}, nil
}
