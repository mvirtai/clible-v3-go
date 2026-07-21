package services

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/config"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

type mockTransport struct {
	roundTrip func(req *http.Request) (*http.Response, error)
}

func (t *mockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return t.roundTrip(req)
}

// Structures matching Gemini response format to dynamically generate clean JSON mock responses.
type mockPart struct {
	Text string `json:"text"`
}
type mockContent struct {
	Parts []mockPart `json:"parts"`
}
type mockCandidate struct {
	Content mockContent `json:"content"`
}
type mockUsageMetadata struct {
	PromptTokenCount     int `json:"promptTokenCount"`
	CandidatesTokenCount int `json:"candidatesTokenCount"`
	TotalTokenCount      int `json:"totalTokenCount"`
}
type mockResponse struct {
	Candidates    []mockCandidate   `json:"candidates"`
	UsageMetadata mockUsageMetadata `json:"usageMetadata"`
}

func makeMockResponseJSON(text string) string {
	resp := mockResponse{
		Candidates: []mockCandidate{
			{
				Content: mockContent{
					Parts: []mockPart{
						{Text: text},
					},
				},
			},
		},
		UsageMetadata: mockUsageMetadata{
			PromptTokenCount:     10,
			CandidatesTokenCount: 20,
			TotalTokenCount:      30,
		},
	}
	bytes, _ := json.Marshal(resp)
	return string(bytes)
}

func TestAIService_GetInsight(t *testing.T) {
	cfg := &config.Config{
		GeminiAPIKey:       "test-key",
		GeminiModelInsight: "gemini-model",
	}

	rawText := "## Summary\nInsight analysis\n\n## Takeaways\n### 1. Point One\nParagraph one\n\n```json\n{\n  \"next_focus\": [\n    {\n      \"label\": \"love\",\n      \"kind\": \"theme\",\n      \"reason\": \"Important element\"\n    }\n  ]\n}\n```"
	mockJSONResponse := makeMockResponseJSON(rawText)

	mockClient := &http.Client{
		Transport: &mockTransport{
			roundTrip: func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(mockJSONResponse)),
					Header:     make(http.Header),
				}, nil
			},
		},
	}

	service := &aiServiceImpl{
		cfg:    cfg,
		client: mockClient,
	}

	resp, err := service.GetInsight(context.Background(), "John 3:16", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expectedText := "## Summary\nInsight analysis\n\n## Takeaways\n### 1. Point One\nParagraph one"
	if resp.Text != expectedText {
		t.Errorf("expected text %q, got %q", expectedText, resp.Text)
	}

	if len(resp.NextFocus) != 1 {
		t.Fatalf("expected 1 next focus item, got %d", len(resp.NextFocus))
	}

	if resp.NextFocus[0].Label != "love" {
		t.Errorf("expected label 'love', got %q", resp.NextFocus[0].Label)
	}

	if resp.GeminiUsageMetadata.PromptTokenCount != 10 {
		t.Errorf("expected PromptTokenCount 10, got %d", resp.GeminiUsageMetadata.PromptTokenCount)
	}
	if resp.GeminiUsageMetadata.CandidatesTokenCount != 20 {
		t.Errorf("expected CandidatesTokenCount 20, got %d", resp.GeminiUsageMetadata.CandidatesTokenCount)
	}
	if resp.GeminiUsageMetadata.TotalTokenCount != 30 {
		t.Errorf("expected TotalTokenCount 30, got %d", resp.GeminiUsageMetadata.TotalTokenCount)
	}
}

func TestAIService_GetTone(t *testing.T) {
	cfg := &config.Config{
		GeminiAPIKey:    "test-key",
		GeminiModelTone: "gemini-model",
	}

	rawText := "## Sävy\nSävy-analyysi\n\n```json\n{\n  \"next_focus\": []\n}\n```"
	mockJSONResponse := makeMockResponseJSON(rawText)

	mockClient := &http.Client{
		Transport: &mockTransport{
			roundTrip: func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(mockJSONResponse)),
					Header:     make(http.Header),
				}, nil
			},
		},
	}

	service := &aiServiceImpl{
		cfg:    cfg,
		client: mockClient,
	}

	resp, err := service.GetTone(context.Background(), "Gen 1:1", "Creation")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expectedText := "## Sävy\nSävy-analyysi"
	if resp.Text != expectedText {
		t.Errorf("expected text %q, got %q", expectedText, resp.Text)
	}
}

func TestAIService_DeepDive(t *testing.T) {
	cfg := &config.Config{
		GeminiAPIKey:       "test-key",
		GeminiModelInsight: "gemini-model",
	}

	rawText := "## Deep Dive Theme\nContent analysis\n\n```json\n{\n  \"next_focus\": [\n    {\n      \"label\": \"faith\",\n      \"kind\": \"word\",\n      \"reason\": \"lexical study\"\n    }\n  ]\n}\n```"
	mockJSONResponse := makeMockResponseJSON(rawText)

	mockClient := &http.Client{
		Transport: &mockTransport{
			roundTrip: func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(mockJSONResponse)),
					Header:     make(http.Header),
				}, nil
			},
		},
	}

	service := &aiServiceImpl{
		cfg:    cfg,
		client: mockClient,
	}

	resp, err := service.DeepDive(context.Background(), "Grace", "en", map[string]interface{}{"reference": "Eph 2:8"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expectedText := "## Deep Dive Theme\nContent analysis"
	if resp.Text != expectedText {
		t.Errorf("expected text %q, got %q", expectedText, resp.Text)
	}

	if len(resp.NextFocus) != 1 || resp.NextFocus[0].Label != "faith" {
		t.Errorf("unexpected next focus output")
	}
}

func TestAIService_AISearch_Mocked(t *testing.T) {
	// Setup in-memory SQLite database
	dbConn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize db: %v", err)
	}
	defer func() { _ = dbConn.Close() }()

	// Seed required translations and books metadata
	_, _ = dbConn.Exec(`INSERT INTO translations (id, name, language, format) VALUES ('web', 'WEB', 'en', 'text')`)
	_, _ = dbConn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('JHN', 'John', 'NT', 4, 21)`)

	// Populate the FTS5 indexed tables using the repository's BulkInsert
	verseRepo := db.NewVerseRepository(dbConn)
	err = verseRepo.BulkInsert(context.Background(), []models.Verse{
		{
			ID:            "web-jhn-3-16",
			TranslationID: "web",
			BookID:        "JHN",
			Chapter:       3,
			Verse:         16,
			Text:          "For God so love the world",
		},
	})
	if err != nil {
		t.Fatalf("failed to populate mock verses: %v", err)
	}

	cfg := &config.Config{
		GeminiAPIKey:      "test-key",
		GeminiModelSearch: "gemini-model",
	}

	// AI Search calls Gemini twice: Planner first, then Summarizer.
	callCount := 0
	mockClient := &http.Client{
		Transport: &mockTransport{
			roundTrip: func(req *http.Request) (*http.Response, error) {
				callCount++
				var textVal string
				if callCount == 1 {
					// Planner response
					textVal = `{"terms":["love"],"mode":"words","operator":"and","scope":"book","book":"JHN","rationale":"Querying JHN for love"}`
				} else {
					// Summarizer response
					textVal = "## Love Summary\nSummary paragraph citing JHN 3:16."
				}
				body := makeMockResponseJSON(textVal)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(body)),
					Header:     make(http.Header),
				}, nil
			},
		},
	}

	service := &aiServiceImpl{
		cfg:       cfg,
		client:    mockClient,
		verseRepo: verseRepo,
	}

	res, err := service.AISearch(context.Background(), "love in John", "web", "en")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	planVal, ok := res["plan"]
	if !ok {
		t.Fatal("missing 'plan' in response map")
	}
	plan := planVal.(SearchPlan)
	if plan.Book == nil || *plan.Book != "JHN" {
		t.Errorf("expected JHN book scope, got %v", plan.Book)
	}

	searchVal, ok := res["search"].(map[string]interface{})
	if !ok {
		t.Fatal("missing or invalid 'search' in response map")
	}
	versesList := searchVal["verses"].([]models.Verse)
	if len(versesList) != 1 || versesList[0].BookID != "JHN" {
		t.Errorf("expected 1 John verse in search results, got %v", versesList)
	}

	summaryVal, ok := res["summary"].(map[string]interface{})
	if !ok {
		t.Fatal("missing or invalid 'summary' in response map")
	}
	if summaryVal["text"] != "## Love Summary\nSummary paragraph citing JHN 3:16." {
		t.Errorf("unexpected summary text: %q", summaryVal["text"])
	}
}

func TestAIService_GetComparison(t *testing.T) {
	cfg := &config.Config{
		GeminiAPIKey:    "test-key",
		GeminiModelTone: "gemini-model-compare",
	}

	rawText := "## Translation Comparison\nLexical comparison analysis\n\n```json\n{\n  \"next_focus\": [\n    {\n      \"label\": \"faith\",\n      \"kind\": \"theme\",\n      \"reason\": \"Interesting translation choice\"\n    }\n  ]\n}\n```"
	mockJSONResponse := makeMockResponseJSON(rawText)

	mockClient := &http.Client{
		Transport: &mockTransport{
			roundTrip: func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(mockJSONResponse)),
					Header:     make(http.Header),
				}, nil
			},
		},
	}

	service := &aiServiceImpl{
		cfg:    cfg,
		client: mockClient,
	}

	resp, err := service.GetComparison(context.Background(), "John 3:16", "kr92", "Jumala rakasti", "web", "God loved", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expectedText := "## Translation Comparison\nLexical comparison analysis"
	if resp.Text != expectedText {
		t.Errorf("expected text %q, got %q", expectedText, resp.Text)
	}

	if len(resp.NextFocus) != 1 {
		t.Fatalf("expected 1 next focus item, got %d", len(resp.NextFocus))
	}

	if resp.NextFocus[0].Label != "faith" {
		t.Errorf("expected label 'faith', got %q", resp.NextFocus[0].Label)
	}
}

func TestAIService_OriginalStudy_UsesExplicitOutputLanguageAcrossScopes(t *testing.T) {
	cfg := &config.Config{
		GeminiAPIKey:        "test-key",
		GeminiModelOriginal: "gemini-original-test",
	}

	var prompts []string
	mockClient := &http.Client{
		Transport: &mockTransport{
			roundTrip: func(req *http.Request) (*http.Response, error) {
				var payload geminiRequest
				if err := json.NewDecoder(req.Body).Decode(&payload); err != nil {
					return nil, err
				}
				if len(payload.Contents) != 1 || len(payload.Contents[0].Parts) != 1 {
					return nil, io.ErrUnexpectedEOF
				}
				prompts = append(prompts, payload.Contents[0].Parts[0].Text)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(makeMockResponseJSON("## English heading\\nEnglish paragraph"))),
					Header:     make(http.Header),
				}, nil
			},
		},
	}

	service := &aiServiceImpl{cfg: cfg, client: mockClient}
	translations := []map[string]string{{
		"id": "web", "name": "World English Bible", "text": "God loved the world",
	}}

	tests := []struct {
		name           string
		scope          string
		outputLanguage string
		wantLanguage   string
	}{
		{name: "verse English", scope: "verse", outputLanguage: "en", wantLanguage: "English"},
		{name: "chapter Finnish", scope: "chapter", outputLanguage: "fi", wantLanguage: "Finnish"},
		{name: "book English", scope: "book", outputLanguage: "en", wantLanguage: "English"},
		{name: "unknown defaults English", scope: "verse", outputLanguage: "", wantLanguage: "English"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := service.OriginalStudy(context.Background(), "John 3:16", "houtos gar", "grc", tc.outputLanguage, translations, tc.scope, "")
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			prompt := prompts[len(prompts)-1]
			want := "Write the entire response in " + tc.wantLanguage
			if !strings.Contains(prompt, want) {
				t.Fatalf("prompt does not contain %q: %s", want, prompt)
			}
			if !strings.Contains(prompt, "Do not mix in another natural language") {
				t.Fatal("prompt is missing the no-mixed-language instruction")
			}
		})
	}

	if len(prompts) != len(tests) {
		t.Fatalf("expected %d Gemini requests, got %d", len(tests), len(prompts))
	}
}
