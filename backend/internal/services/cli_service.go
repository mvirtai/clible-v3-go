package services

import (
	"regexp"
	"sort"
	"strings"
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
