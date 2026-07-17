package services

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// List of common words to ignore during analysis in Finnish and English.
var stopWords = map[string]bool{
	// Finnish general stop words (conjunctions, prepositions, pronouns, adverbs)
	"ja": true, "se": true, "on": true, "että": true, "kuin": true, "mutta": true,
	"he": true, "ne": true, "kun": true, "jos": true, "tai": true, "vai": true,
	"minä": true, "sinä": true, "me": true, "te": true, "tämä": true, "nämä": true,
	"tuo": true, "joka": true, "jotka": true, "mikä": true, "mitä": true, "joku": true,
	"jokin": true, "jokainen": true, "kaikki": true, "kaikkien": true, "kaikkea": true,
	"kaikille": true, "kaikista": true, "kaikilla": true, "oma": true, "omat": true,
	"muu": true, "muut": true, "toinen": true, "toiset": true, "vaan": true, "sillä": true,
	"eli": true, "eikä": true, "niin": true, "noin": true, "näin": true, "siten": true,
	"miten": true, "kuten": true, "miksi": true, "myös": true, "jopa": true, "ehkä": true,
	"kyllä": true, "pian": true, "heti": true, "vain": true, "vaikka": true, "koska": true,
	"siksi": true, "tässä": true, "siinä": true, "siitä": true, "tähän": true, "tälle": true,
	"heille": true, "hänelle": true, "minulle": true, "sinulle": true, "meille": true,
	"heiltä": true, "häneltä": true, "minulta": true, "sinulta": true, "meiltä": true,
	"heidän": true, "hänen": true, "minun": true, "sinun": true, "meidän": true,
	"teidän": true,

	// Finnish common auxiliary verbs & forms of "olla"
	"olla": true, "olen": true, "olet": true, "olemme": true, "olette": true, "ovat": true,
	"oli": true, "olin": true, "olit": true, "olimme": true, "olitte": true, "olivat": true,
	"ollut": true, "olleet": true, "olisi": true, "olisin": true, "olisit": true, "olisimme": true,
	"olisitte": true, "olisivat": true, "tulee": true, "tuli": true, "tulivat": true, "voida": true,
	"voi": true, "voivat": true, "voisi": true, "pitää": true, "piti": true, "pitäisi": true,

	// English stop words
	"the": true, "and": true, "that": true, "shall": true, "unto": true, "for": true,
	"with": true, "from": true, "they": true, "them": true, "their": true, "this": true,
	"these": true, "those": true, "have": true, "has": true, "had": true, "been": true,
	"were": true, "was": true, "are": true, "you": true, "your": true, "him": true,
	"his": true, "her": true, "she": true, "its": true, "our": true, "will": true,
	"would": true, "should": true, "could": true, "then": true, "than": true, "when": true,
	"where": true, "what": true, "which": true, "who": true, "whom": true, "about": true,
	"into": true, "over": true, "after": true, "before": true, "here": true, "there": true,
	"some": true, "such": true, "every": true, "other": true, "another": true,

	// Metadata and Citation terms (Finnish & English)
	"kr92": true, "kr33": true, "kr38": true, "web": true, "kjv": true, "biblia": true,
	"translation": true, "käännös": true, "luku": true, "jae": true, "jakeet": true,
	"chapter": true, "verse": true, "verses": true, "bible": true, "raamattu": true,
	"muistikirja": true, "notebook": true, "cell": true, "solu": true, "command": true,
	"komento": true, "ref": true, "refs": true, "read": true, "search": true, "suggest": true,

	// Finnish Bible book names & abbreviations (all lowercase)
	"genesis": true, "exodus": true, "leviticus": true, "numbers": true, "deuteronomy": true,
	"joosua": true, "joos": true, "tuomarien": true, "tuom": true, "ruut": true, "samuelin": true,
	"sam": true, "kuninkaiden": true, "aikakirjan": true, "aik": true, "esra": true,
	"nehemia": true, "neh": true, "ester": true, "job": true, "psalmit": true, "ps": true,
	"sananlaskut": true, "snl": true, "saarnaaja": true, "saarn": true, "laulujen": true,
	"laul": true, "jesaja": true, "jes": true, "jeremia": true, "jer": true, "valitusvirret": true,
	"val": true, "esekiel": true, "esek": true, "daniel": true, "dan": true, "hoosea": true,
	"hoos": true, "joel": true, "amos": true, "obadja": true, "obad": true, "joona": true,
	"miika": true, "miik": true, "nahum": true, "nah": true, "habakuk": true, "hab": true,
	"sefanja": true, "sef": true, "haggai": true, "hag": true, "sakaria": true, "sak": true,
	"malakia": true, "mal": true, "matteus": true, "matt": true, "markus": true, "mark": true,
	"luukas": true, "luuk": true, "johannes": true, "joh": true, "apostolien": true, "apt": true,
	"roomalaisille": true, "room": true, "korinttolaisille": true, "kor": true, "galatalaisille": true,
	"gal": true, "efesolaisille": true, "efes": true, "filippiläisille": true, "fil": true,
	"kolossalaisille": true, "kol": true, "tessalonikalaisille": true, "tess": true, "timoteukselle": true,
	"tim": true, "titukselle": true, "tit": true, "filemonille": true, "filem": true, "heprealaisille": true,
	"hepr": true, "jaakobin": true, "jaak": true, "pietarin": true, "piet": true, "juudan": true,
	"juud": true, "ilmestyskirja": true, "ilm": true, "mooseksen": true, "moos": true,

	// English Bible book names & abbreviations (all lowercase)
	"joshua": true, "judges": true, "ruth": true, "samuel": true, "kings": true, "chronicles": true,
	"ezra": true, "nehemiah": true, "esther": true, "psalms": true, "proverbs": true, "ecclesiastes": true,
	"isaiah": true, "jeremiah": true, "lamentations": true, "ezekiel": true, "hosea": true,
	"obadiah": true, "jonah": true, "micah": true, "zephaniah": true, "zechariah": true,
	"matthew": true, "acts": true, "romans": true, "corinthians": true, "galatians": true,
	"ephesians": true, "philippians": true, "colossians": true, "thessalonians": true, "timothy": true,
	"hebrews": true, "james": true, "peter": true, "jude": true, "revelation": true,
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
