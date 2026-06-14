package services

import (

	// The blank import for "embed" is required to enable the //go:embed compiler directive
	_ "embed"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

// stopwordsRaw bakes the entire JSON file directly into the application binary at compile time.
// This completely eliminates runtime file path errors and path resolution issues.
//
//go:embed stopwords.json
var stopwordsRaw []byte

// WordCount maps a string token to its frequency.
type WordCount struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

// AnalysisResult aggregates metrics exposed directly to the React frontend.
type AnalysisResult struct {
	TokenCount        int         `json:"token_count"`
	UniqueTokenCount  int         `json:"unique_token_count"`
	TypeTokenRatio    float64     `json:"type_token_ratio"`
	CharacterCount    int         `json:"character_count"`
	AverageWordLength float64     `json:"avg_word_length"`
	TopWords          []WordCount `json:"top_words"`
	TopBigrams        []WordCount `json:"top_bigrams"`
	TopTrigrams       []WordCount `json:"top_trigrams"`
}

type AlignedVerse struct {
	BookID     string  `json:"book_id"`
	Chapter    int     `json:"chapter"`
	Verse      int     `json:"verse"`
	TextA      string  `json:"text_a"`
	TextB      string  `json:"text_b"`
	Similarity float64 `json:"similarity"`
	ExactMatch bool    `json:"exact_match"`
}

type ComparisonSummary struct {
	TotalVerses         int         `json:"total_verses"`
	FullyAlignedVerses  int         `json:"fully_aligned_verses"`
	ExactMatches        int         `json:"exact_matches"`
	ExactMatchRatio     float64     `json:"exact_match_ratio"`
	AverageSimilarity   float64     `json:"average_similarity"`
	TopSharedWords      []WordCount `json:"top_shared_words"`
	MostSimilarVerseRef string      `json:"most_similar_verse_ref,omitempty"`
}

type ComparisonResult struct {
	Reference    string            `json:"reference"`
	TranslationA string            `json:"translation_a"`
	TranslationB string            `json:"translation_b"`
	Aligned      []AlignedVerse    `json:"aligned_verses"`
	Summary      ComparisonSummary `json:"summary"`
}

type AnalyticService struct {
	verseRepo       *db.VerseRepository
	stopwords       map[string]bool
	filterStopwords bool
	punctuation     *regexp.Regexp
}

// NewAnalyticService initializes the service, parsing the statically baked stopwords directly from memory.
func NewAnalyticService(verseRepo *db.VerseRepository, filterStopwords bool, lang string) (*AnalyticService, error) {
	stopwordsMap := make(map[string]bool)
	punct := regexp.MustCompile(`^[.,?!;:"()\[\]{}]+|[.,?!;:"()\[\]{}]+$`)

	if filterStopwords {
		// Define an internal anonymous struct to match the "words" array layout in the JSON.
		// Go's JSON parser safely ignores fields we don't map (like the "description" field in 'en' and 'fi').
		var schema map[string]struct {
			Words []string `json:"words"`
		}

		// Unmarshal the compile-time embedded byte slice directly. No file I/O overhead!
		if err := json.Unmarshal(stopwordsRaw, &schema); err != nil {
			return nil, fmt.Errorf("failed to parse embedded stopwords JSON: %w", err)
		}

		// Extract target language array elements if they exist in the uploaded matrix
		if langData, exists := schema[lang]; exists {
			for _, w := range langData.Words {
				stopwordsMap[strings.ToLower(w)] = true
			}
		}
	}

	return &AnalyticService{
		verseRepo:       verseRepo,
		stopwords:       stopwordsMap,
		filterStopwords: filterStopwords,
		punctuation:     punct,
	}, nil
}

// Tokenize converts raw text into clean, lowercased word streams.
func (s *AnalyticService) Tokenize(text string) []string {
	words := strings.Fields(text)
	tokens := make([]string, 0, len(words))

	for _, w := range words {
		token := strings.ToLower(w)
		token = s.punctuation.ReplaceAllString(token, "")
		if token == "" {
			continue
		}
		if s.filterStopwords && s.stopwords[token] {
			continue
		}
		tokens = append(tokens, token)
	}
	return tokens
}

// AnalyzeVerses calculates analytics metrics over an array of domain verses.
func (s *AnalyticService) AnalyzeVerses(verses []models.Verse, topN int) AnalysisResult {
	if len(verses) == 0 {
		return AnalysisResult{}
	}

	var totalCharCount int
	var rawWordCount int
	var allTokens []string

	for _, v := range verses {
		totalCharCount += len(v.Text)
		rawWordCount += len(strings.Fields(v.Text))
		allTokens = append(allTokens, s.Tokenize(v.Text)...)
	}

	if len(allTokens) == 0 {
		var avgLen float64
		if rawWordCount > 0 {
			avgLen = float64(totalCharCount) / float64(rawWordCount)
		}
		return AnalysisResult{
			CharacterCount:    totalCharCount,
			AverageWordLength: avgLen,
		}
	}

	uniqueTokens := make(map[string]int)
	for _, t := range allTokens {
		uniqueTokens[t]++
	}

	avgWordLen := float64(totalCharCount) / float64(rawWordCount)
	ttr := float64(len(uniqueTokens)) / float64(len(allTokens))

	return AnalysisResult{
		TokenCount:        len(allTokens),
		UniqueTokenCount:  len(uniqueTokens),
		TypeTokenRatio:    ttr,
		CharacterCount:    totalCharCount,
		AverageWordLength: avgWordLen,
		TopWords:          s.extractTopFrequencies(uniqueTokens, topN),
		TopBigrams:        s.extractNGrams(allTokens, 2, topN),
		TopTrigrams:       s.extractNGrams(allTokens, 3, topN),
	}
}

// CompareTranslations runs deep structural alignment comparisons for dual translation text structures.
func (s *AnalyticService) CompareTranslations(reference string, versesA, versesB []models.Verse) ComparisonResult {
	aligned := s.alignVerses(versesA, versesB)

	res := ComparisonResult{
		Reference: reference,
		Aligned:   aligned,
	}

	if len(aligned) == 0 {
		return res
	}

	sharedWords := make(map[string]int)
	var exactMatches int
	var fullyAligned int
	var similaritySum float64
	var maxSimilarity float64
	var mostSimilarRef string

	for i, row := range aligned {
		if row.TextA != "" && row.TextB != "" {
			fullyAligned++
			normA := strings.TrimSpace(strings.ToLower(row.TextA))
			normB := strings.TrimSpace(strings.ToLower(row.TextB))

			isExact := normA == normB
			if isExact {
				exactMatches++
			}

			seqRatio := s.computeSequenceRatio(normA, normB)
			overlapRatio := s.computeTokenOverlap(row.TextA, row.TextB)
			similarity := (seqRatio + overlapRatio) / 2.0

			aligned[i].Similarity = similarity
			aligned[i].ExactMatch = isExact
			similaritySum += similarity

			tokensA := s.Tokenize(row.TextA)
			tokensB := s.Tokenize(row.TextB)
			setA := make(map[string]bool)
			for _, t := range tokensA {
				setA[t] = true
			}

			seenShared := make(map[string]bool)
			for _, t := range tokensB {
				if setA[t] && !seenShared[t] {
					sharedWords[t]++
					seenShared[t] = true
				}
			}

			if similarity > maxSimilarity {
				maxSimilarity = similarity
				mostSimilarRef = fmt.Sprintf("%s %d:%d", row.BookID, row.Chapter, row.Verse)
			}
		}
	}

	var avgSim, exactRatio float64
	if fullyAligned > 0 {
		avgSim = similaritySum / float64(fullyAligned)
		exactRatio = float64(exactMatches) / float64(fullyAligned)
	}

	res.Summary = ComparisonSummary{
		TotalVerses:         len(aligned),
		FullyAlignedVerses:  fullyAligned,
		ExactMatches:        exactMatches,
		ExactMatchRatio:     exactRatio,
		AverageSimilarity:   avgSim,
		TopSharedWords:      s.extractTopFrequencies(sharedWords, 8),
		MostSimilarVerseRef: mostSimilarRef,
	}

	return res
}

func (s *AnalyticService) alignVerses(versesA, versesB []models.Verse) []AlignedVerse {
	type key struct {
		book    string
		chapter int
		verse   int
	}

	alignedMap := make(map[key]*AlignedVerse)

	for _, v := range versesA {
		k := key{v.BookID, v.Chapter, v.Verse}
		alignedMap[k] = &AlignedVerse{
			BookID:  v.BookID,
			Chapter: v.Chapter,
			Verse:   v.Verse,
			TextA:   v.Text,
		}
	}

	for _, v := range versesB {
		k := key{v.BookID, v.Chapter, v.Verse}
		if row, exists := alignedMap[k]; exists {
			row.TextB = v.Text
		} else {
			alignedMap[k] = &AlignedVerse{
				BookID:  v.BookID,
				Chapter: v.Chapter,
				Verse:   v.Verse,
				TextB:   v.Text,
			}
		}
	}

	keys := make([]key, 0, len(alignedMap))
	for k := range alignedMap {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].book != keys[j].book {
			return keys[i].book < keys[j].book
		}
		if keys[i].chapter != keys[j].chapter {
			return keys[i].chapter < keys[j].chapter
		}
		return keys[i].verse < keys[j].verse
	})

	result := make([]AlignedVerse, 0, len(keys))
	for _, k := range keys {
		result = append(result, *alignedMap[k])
	}
	return result
}

func (s *AnalyticService) computeTokenOverlap(textA, textB string) float64 {
	tokensA := s.Tokenize(textA)
	tokensB := s.Tokenize(textB)

	setA := make(map[string]bool)
	union := make(map[string]bool)
	for _, t := range tokensA {
		setA[t] = true
		union[t] = true
	}

	var intersectionCount int
	seenIntersection := make(map[string]bool)
	for _, t := range tokensB {
		union[t] = true
		if setA[t] && !seenIntersection[t] {
			intersectionCount++
			seenIntersection[t] = true
		}
	}

	if len(union) == 0 {
		return 1.0
	}
	return float64(intersectionCount) / float64(len(union))
}

func (s *AnalyticService) computeSequenceRatio(a, b string) float64 {
	if a == "" || b == "" {
		if a == b {
			return 1.0
		}
		return 0.0
	}

	m := len(a)
	n := len(b)
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}

	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else {
				dp[i][j] = dp[i-1][j]
				if dp[i][j-1] > dp[i][j] {
					dp[i][j] = dp[i][j-1]
				}
			}
		}
	}

	lcsLength := dp[m][n]
	return float64(2*lcsLength) / float64(m+n)
}

func (s *AnalyticService) extractTopFrequencies(frequencies map[string]int, n int) []WordCount {
	counts := make([]WordCount, 0, len(frequencies))
	for k, v := range frequencies {
		counts = append(counts, WordCount{Word: k, Count: v})
	}

	sort.Slice(counts, func(i, j int) bool {
		if counts[i].Count != counts[j].Count {
			return counts[i].Count > counts[j].Count
		}
		return counts[i].Word < counts[j].Word
	})

	if len(counts) > n {
		return counts[:n]
	}
	return counts
}

func (s *AnalyticService) extractNGrams(tokens []string, size, n int) []WordCount {
	if len(tokens) < size {
		return nil
	}

	frequencies := make(map[string]int)
	for i := 0; i <= len(tokens)-size; i++ {
		ngram := strings.Join(tokens[i:i+size], " ")
		frequencies[ngram]++
	}

	return s.extractTopFrequencies(frequencies, n)
}
