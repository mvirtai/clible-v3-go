package services

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// List of common words to ignore during analysis in Finnish and English.
var stopWords = map[string]bool{
	"ja": true, "se": true, "on": true, "että": true, "kuin": true, "mutta": true,
	"he": true, "ne": true, "kun": true, "jos": true, "tai": true, "vai": true,
	"the": true, "and": true, "that": true, "shall": true, "unto": true, "for": true,
	"with": true, "from": true, "they": true, "them": true, "their": true,
}

// ExtractKeywords processes the input text, removes non-alphabetic characters,
// filters out stop words, and returns the top 5 most frequent words.
func ExtractKeywords(text string) []string {
	// Clean text: keep letters and spaces, convert to lowercase
	reg, _ := regexp.Compile(`[^a-zA-ZäöÄÖåÅ\s]+`)
	cleaned := reg.ReplaceAllString(strings.ToLower(text), " ")

	words := strings.Fields(cleaned)
	wordCounts := make(map[string]int)

	for _, w := range words {
		// Only consider words longer than 3 characters and not in the stopWords list
		if len(w) > 3 && !stopWords[w] {
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

	// Sort in descending order
	sort.Slice(freqs, func(i, j int) bool {
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

	parts := strings.Fields(input)
	if len(parts) == 0 {
		return nil
	}

	cmdName := parts[0]
	flags := make(map[string]string)
	var args []string

	for _, part := range parts[1:] {
		if strings.HasPrefix(part, "--") {
			// Parse flags like --translation=KJV or boolean flags like --regex
			flagPart := strings.TrimPrefix(part, "--")
			subParts := strings.SplitN(flagPart, "=", 2)

			name := subParts[0]
			value := "true" // Default for boolean flahs (e.g. --regex)
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
	case "/refs":
		return s.executeRefsCommand(ctx, cmd, translationID)
	case "/suggest":
		return s.executeSuggestCommand(ctx, cmd, translationID, contextText)
	default:
		return nil, fmt.Errorf("unknown command: %s", cmd.Name)
	}
}

func (s *CLIService) executeReadCommand(ctx context.Context, cmd *CLICommand, translationID string) (*models.CLIResult, error) {
	if len(cmd.Args) == 0 {
		return nil, errors.New("missing reference (e.g. /read John 3:16)")
	}

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
	if err != nil || len(verses) == 0 {
		return nil, fmt.Errorf("verse not found: %w", err)
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
