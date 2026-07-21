package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/config"
	"github.com/mvirtai/clible-v3-go/internal/db"
)

// Theological and style stances ported from v2
const theologicalStance = "Theological stance: you operate from the presupposition that the Bible is genuine divine " +
	"revelation, written under the guidance of the Holy Spirit, and that it speaks truthfully. " +
	"This is not a confessional or denominational position — do not read the text through any " +
	"tradition's interpretive filter (Reformed, Catholic, Lutheran, Pentecostal, or any other). " +
	"Apply rigorous philological and historical-critical methods as scholarly tools; these tools " +
	"are not a framework that excludes divine authorship, but instruments for reading the text " +
	"as carefully as possible. Let the text itself determine where the exegesis leads. " +
	"When scholarly opinions diverge, report them honestly without forcing a confessional " +
	"resolution. Do not assert certainty where the evidence does not justify it."

const languageConsistencyRule = "Language rule: ALL headings, subheadings, table headers, and labels must be in the same language as the body text. " +
	"Never mix English headings with Finnish body text (or vice versa). If the surrounding content is Finnish, headings must be Finnish; " +
	"if it is English, headings must be English. This is strict."

const nextFocusFooterRule = "Next focus footer: append a FINAL JSON code block (```json ... ```) as the last thing in your response. " +
	"It must be valid JSON with this shape: { \"next_focus\": [ { \"label\": string, \"kind\": \"word\"|\"theme\"|\"question\"|\"phrase\", \"reason\": string } ] }. " +
	"Return 1–3 items (or an empty array if nothing sensible). Keep labels short. Nothing may appear after the JSON block."

const deepDiveSystemInstruction = "You write a focused theological deep dive on a single topic, for a reader who wants to go beyond the previous analysis. " +
	theologicalStance + " " + languageConsistencyRule + " " + nextFocusFooterRule + " " +
	"IMPORTANT: do NOT repeat the previous task type (do not re-run verse-by-verse comparison, tone analysis, or the original outline). " +
	"Your ONLY task is to explain the selected topic clearly and academically. " +
	"Use real Markdown headings (## / ###), short paragraphs, and bullets when helpful."

const insightSystemInstruction = "You are a scholarly Bible study assistant. " +
	theologicalStance + " " + languageConsistencyRule + " " + nextFocusFooterRule + " " +
	"Write the full answer—including every `##` and `###` heading—in the same language as the Bible passage the user pasted. " +
	"If the passage is clearly in one language (e.g. Finnish, Swedish, German), use that language for headings and body. " +
	"Only use English if the passage is English or the language is genuinely ambiguous. " +
	"Follow the requested Markdown shape exactly (real `##` / `###` headings, not bold-only titles)."

const toneSystemInstruction = "You describe tone, mood, and linguistic style of Bible passages. " +
	theologicalStance + " " + languageConsistencyRule + " " + nextFocusFooterRule + " " +
	"Write the full answer—including every Markdown heading—in the same language as the passage. " +
	"Use real `##` / `###` headings for section titles; reserve `**bold**` for short emphasis inside paragraphs only, never as a substitute for headings. " +
	"Keep sections scannable: tight paragraphs, optional bullet lists for subpoints."

const originalStudySystemInstruction = "You are a biblical scholar serving simultaneously as interpreter, comparative linguist, Bible translator, and theologian. " +
	"Your primary audience is a reader who has NO knowledge of Greek or Hebrew script. " +
	theologicalStance + " " + languageConsistencyRule + " " + nextFocusFooterRule + " " +
	"RULE 1 — Transliteration via phrases: when presenting original-language text, group words into natural syntactic phrases (2-5 words each). Never transliterate word-by-word across a full verse or paragraph — always group into meaningful phrases. " +
	"RULE 2 — Readable format: present phrases in a Markdown table with three columns (Original, Phonetic, Meaning). Bold the original script in the first column. Italicize the phonetic form. Keep the meaning column as a natural clause in the reader's language. " +
	"RULE 3 — NEVER use slash-delimited chains like `word / transliteration / gloss / word / ...`. This format is strictly forbidden. " +
	"RULE 4 — Multi-translation evaluation: when multiple modern translations are provided, compare them against the original and identify which best captures the original wording, tone, and theological nuance — and explain why. " +
	"RULE 5 — Language: write all headings and body text in the same language as the provided translations (if Finnish, respond in Finnish; if English, respond in English). " +
	"RULE 6 — Markdown: use real ## and ### headings; never use bold-only text as a substitute for section headings. Keep paragraphs short and scannable."

const aiSearchPlannerSystemInstruction = "You convert natural-language Bible search questions into structured FTS search parameters. " +
	"Output ONLY valid JSON with no markdown fences and no extra text. " +
	"Schema: " +
	"{ \"terms\": string[], \"mode\": \"phrase\"|\"words\"|\"wildcard\", \"operator\": \"and\"|\"or\"|\"not\", " +
	"\"scope\": \"bible\"|\"ot\"|\"nt\"|\"book\", \"book\": string|null, \"rationale\": string }. " +
	"Rules: " +
	"(1) terms must be in the same language as the installed translation text (Finnish translation → Finnish terms). " +
	"(2) scope book requires non-null book (e.g. Psalms, Psalmit, John, Johanneksen evankelium). " +
	"(3) scope bible|ot|nt must have book null. " +
	"(4) Do not invent verse references in rationale. " +
	"(5) Prefer phrase for idioms; words+or for synonyms; wildcard only for clear stems like lov*. " +
	"(6) rationale is 1-2 sentences in the requested ui language explaining the search strategy."

const aiSearchSummarySystemInstruction = "You summarize Bible search results for a study app. " +
	theologicalStance + " " + languageConsistencyRule + " " +
	"CRITICAL: Answer ONLY using the verse snippets provided. " +
	"Do not cite any reference that is not in the snippet list. " +
	"If the snippets are insufficient, say so explicitly. " +
	"Use real Markdown (## heading + short paragraphs). Keep the answer concise (under 250 words)."

// Structs matching the JSON footers and models
type GeminiUsageMetadata struct {
	PromptTokenCount     int `json:"promptTokenCount"`
	CandidatesTokenCount int `json:"candidatesTokenCount"`
	TotalTokenCount      int `json:"totalTokenCount"`
}

type geminiResponse struct {
	Candidates    []geminiCandidate   `json:"candidates"`
	UsageMetadata GeminiUsageMetadata `json:"usageMetadata"`
}

type NextFocusItem struct {
	Label  string `json:"label"`
	Kind   string `json:"kind"`
	Reason string `json:"reason"`
}

type AIResponse struct {
	Text                string              `json:"text"`
	NextFocus           []NextFocusItem     `json:"nextFocus"`
	GeminiUsageMetadata GeminiUsageMetadata `json:"geminiUsageMetadata,omitempty"`
}

// SearchPlan is the planner's structured output
type SearchPlan struct {
	Terms     []string `json:"terms"`
	Mode      string   `json:"mode"`
	Operator  string   `json:"operator"`
	Scope     string   `json:"scope"`
	Book      *string  `json:"book"`
	Rationale string   `json:"rationale"`
}

// AIService defines backend's AI functionalities
type AIService interface {
	GetInsight(ctx context.Context, text, focus string) (*AIResponse, error)
	GetTone(ctx context.Context, text, focus string) (*AIResponse, error)
	DeepDive(ctx context.Context, topic, outputLanguage string, contextData map[string]interface{}) (*AIResponse, error)
	OriginalStudy(ctx context.Context, reference, sourceText, sourceLanguage, outputLanguage string, translations []map[string]string, scope, focus string) (*AIResponse, error)
	AISearch(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error)
	GetComparison(ctx context.Context, reference, transA, textA, transB, textB, focus string) (*AIResponse, error)
}

type aiServiceImpl struct {
	cfg       *config.Config
	client    *http.Client
	verseRepo *db.VerseRepository
}

// NewAIService creates a new AIService implementation
func NewAIService(cfg *config.Config, verseRepo *db.VerseRepository) AIService {
	return &aiServiceImpl{
		cfg: cfg,
		client: &http.Client{
			Timeout: 45 * time.Second,
		},
		verseRepo: verseRepo,
	}
}

// --- Gemini Request / Response Schemas ---

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiInstruction struct {
	Parts []geminiPart `json:"parts"`
}

type geminiGenConfig struct {
	ResponseMimeType string `json:"responseMimeType,omitempty"`
}

type geminiRequest struct {
	Contents          []geminiContent    `json:"contents"`
	SystemInstruction *geminiInstruction `json:"systemInstruction,omitempty"`
	GenerationConfig  *geminiGenConfig   `json:"generationConfig,omitempty"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

// callGemini makes a raw JSON HTTP POST request to the Google Gemini generateContent endpoint
func (s *aiServiceImpl) callGemini(ctx context.Context, model, systemPrompt, userPrompt string, forceJSON bool) (string, *GeminiUsageMetadata, error) {
	if s.cfg.GeminiAPIKey == "" {
		return "", nil, fmt.Errorf("gemini API key is not configured")
	}

	reqPayload := geminiRequest{
		Contents: []geminiContent{
			{
				Parts: []geminiPart{{Text: userPrompt}},
			},
		},
	}

	if systemPrompt != "" {
		reqPayload.SystemInstruction = &geminiInstruction{
			Parts: []geminiPart{{Text: systemPrompt}},
		}
	}

	if forceJSON {
		reqPayload.GenerationConfig = &geminiGenConfig{
			ResponseMimeType: "application/json",
		}
	}

	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		return "", nil, fmt.Errorf("failed to marshal Gemini request payload: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, s.cfg.GeminiAPIKey)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", nil, fmt.Errorf("failed to create http request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("failed to perform Gemini http request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		var errData map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errData)
		return "", nil, fmt.Errorf("gemini API returned HTTP status %d: %v", resp.StatusCode, errData)
	}

	var geminiResp geminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", nil, fmt.Errorf("failed to decode Gemini API response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", nil, fmt.Errorf("received emp	ty response from Gemini API")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, &geminiResp.UsageMetadata, nil
}

// parseAIResponse extracts the json footer block from the markdown output
func parseAIResponse(raw string) *AIResponse {
	response := &AIResponse{
		Text:      raw,
		NextFocus: []NextFocusItem{},
	}

	startIdx := strings.LastIndex(raw, "```json")
	if startIdx == -1 {
		return response
	}

	remaining := raw[startIdx:]
	endIdx := strings.Index(remaining, "```")
	if endIdx == -1 {
		// Try matching closing fence without newline if it exists
		return response
	}

	// We need to look for closing backticks in the rest of the string
	closingIdx := strings.Index(raw[startIdx+7:], "```")
	if closingIdx == -1 {
		return response
	}
	closingIdx = startIdx + 7 + closingIdx

	jsonBlock := strings.TrimSpace(raw[startIdx+7 : closingIdx])

	var footerData struct {
		NextFocus []NextFocusItem `json:"next_focus"`
	}

	if err := json.Unmarshal([]byte(jsonBlock), &footerData); err == nil {
		response.NextFocus = footerData.NextFocus
		response.Text = strings.TrimSpace(raw[:startIdx])
	}

	return response
}

func focusDirective(focus string) string {
	f := strings.TrimSpace(focus)
	if f == "" {
		return ""
	}
	return fmt.Sprintf("\n\n## Focus\n\nFocus specifically on: **%s**. Keep the overall structure, but make this the main emphasis.\n", f)
}

func (s *aiServiceImpl) GetInsight(ctx context.Context, text, focus string) (*AIResponse, error) {
	prompt := fmt.Sprintf("Analyze the Bible passage at the end of this message.\n\n"+
		"## Structure (use real Markdown headings—word the titles yourself)\n\n"+
		"Use **three** `##` sections **in this order**. Choose natural titles in **the same language as the passage** (do not keep English labels if the passage is not English).\n\n"+
		"**Section A — short opening overview**  \n"+
		"One concise paragraph.  \n"+
		"_Finnish example titles:_ `## Johdanto` or `## Yhteenveto`  \n"+
		"_English examples:_ `## Summary` or `## Overview`\n\n"+
		"**Section B — historical and cultural background**  \n"+
		"One to several paragraphs; scale length to how much relevant context exists and to passage length.  \n"+
		"_Finnish example:_ `## Historiallinen konteksti`  \n"+
		"_English example:_ `## Historical context`\n\n"+
		"**Section C — exactly three takeaways**  \n"+
		"A `##` title, then three subsections. Each takeaway: one `###` line (number + short title) and one paragraph.  \n"+
		"_Finnish example section title:_ `## Kolme keskeistä pointtia` or `## Kolme pointtia`  \n"+
		"_Finnish takeaway lines:_ `### 1. …`, `### 2. …`, `### 3. …` with Finnish titles.\n\n"+
		"**Formatting rules**\n"+
		"- Every section and takeaway must use `##` or `###` headings (not `**bold**` alone for those titles).\n"+
		"- **All** headings and body text must match the passage language.\n"+
		"- Do not prefix the answer with a separate intro sentence in another language; start directly with the first `##` section if possible.\n\n"+
		"## Passage\n\n%s%s\n\n"+
		"## Output rules\n\n"+
		"- After your Markdown answer, append the required JSON footer (see below).\n\n"+
		"```json\n{ \"next_focus\": [ { \"label\": \"…\", \"kind\": \"theme\", \"reason\": \"…\" } ] }\n```", text, focusDirective(focus))

	raw, usage, err := s.callGemini(ctx, s.cfg.GeminiModelInsight, insightSystemInstruction, prompt, false)
	if err != nil {
		return nil, err
	}

	resp := parseAIResponse(raw)
	if usage != nil {
		resp.GeminiUsageMetadata = *usage
	}
	return resp, nil
}

func (s *aiServiceImpl) GetTone(ctx context.Context, text, focus string) (*AIResponse, error) {
	prompt := fmt.Sprintf("Analyze the **tone**, **mood (atmosphere)**, and **linguistic style** of the passage at the end of this message.\n\n"+
		"Your reply must follow this Markdown layout (do not copy the instruction labels below into the answer):\n\n"+
		"**Language:** Write all headings and body text in the **same language as the passage**.\n\n"+
		"**1. No lead-in sentence**  \n"+
		"Do not start your response with a sentence introducing what you will cover.\n\n"+
		"**2. Three main sections — each starts with a level-2 Markdown heading (`##`)**\n\n"+
		"Use exactly **three** `##` sections in this order. Pick natural titles in the passage language. \n"+
		"Adjust the length of your response to fit the length of the passage provided.\n\n"+
		"| Role | Finnish examples | English examples |\n"+
		"|------|------------------|------------------|\n"+
		"| A | `## Sävy` | `## Tone` |\n"+
		"| B | `## Tunnelma` | `## Atmosphere` |\n"+
		"| C | `## Kielellinen tyyli` | `## Linguistic style` |\n\n"+
		"Under each `##`, write one or more paragraphs. Be concise but concrete.\n\n"+
		"**3. Emphasis vs headings**\n"+
		"- Put section names (**Sävy**, **Tunnelma**, …) **only** on the `##` line. Do **not** repeat them as `**bold**` at the start of the paragraph.\n"+
		"- Use `**bold**` only for short in-sentence emphasis (a few words).\n\n"+
		"**4. Subpoints (optional)**  \n"+
		"Use `- **Label:** explanation` if needed; keep bullets secondary to `##` titles.\n\n"+
		"--- Passage ---\n\n%s%s\n\n"+
		"## Output rules\n\n"+
		"- Append the required JSON footer as the final block.\n\n"+
		"```json\n{ \"next_focus\": [ { \"label\": \"…\", \"kind\": \"theme\", \"reason\": \"…\" } ] }\n```", text, focusDirective(focus))

	raw, usage, err := s.callGemini(ctx, s.cfg.GeminiModelTone, toneSystemInstruction, prompt, false)
	if err != nil {
		return nil, err
	}

	resp := parseAIResponse(raw)
	if usage != nil {
		resp.GeminiUsageMetadata = *usage
	}
	return resp, nil
}

func (s *aiServiceImpl) DeepDive(ctx context.Context, topic, outputLanguage string, contextData map[string]interface{}) (*AIResponse, error) {
	langLabel := "English"
	if outputLanguage == "fi" {
		langLabel = "Finnish"
	}

	var contextLines []string
	if contextData != nil {
		if val, ok := contextData["feature"]; ok && val != nil {
			contextLines = append(contextLines, fmt.Sprintf("- Feature: %v", val))
		}
		if val, ok := contextData["reference"]; ok && val != nil {
			contextLines = append(contextLines, fmt.Sprintf("- Reference: %v", val))
		}
		if val, ok := contextData["note"]; ok && val != nil {
			contextLines = append(contextLines, fmt.Sprintf("- Note: %v", val))
		}
	}

	var contextBlock string
	if len(contextLines) > 0 {
		contextBlock = fmt.Sprintf("\n\n## Context\n\n%s\n", strings.Join(contextLines, "\n"))
	}

	prompt := fmt.Sprintf("Write a focused deep dive on the topic at the end of this message.\n\n"+
		"## Output language\n"+
		"Write the entire response (headings, labels, body, and JSON footer) in %s.\n\n"+
		"## Required structure (Markdown)\n"+
		"- Start with a level-2 Markdown heading (##) that names the topic in the output language.\n"+
		"- Include 2–4 additional level-2 sections (##) (e.g. definitions, lexical/historical background, interpretive implications, common misconceptions).\n"+
		"- When relevant, use brief Greek/Hebrew forms with transliteration, but do NOT do any verse-by-verse walkthrough.\n"+
		"- End with the required JSON footer.%s\n"+
		"## Topic\n\n%s", langLabel, contextBlock, strings.TrimSpace(topic))

	raw, usage, err := s.callGemini(ctx, s.cfg.GeminiModelInsight, deepDiveSystemInstruction, prompt, false)
	if err != nil {
		return nil, err
	}

	resp := parseAIResponse(raw)
	if usage != nil {
		resp.GeminiUsageMetadata = *usage
	}
	return resp, nil
}

func (s *aiServiceImpl) OriginalStudy(ctx context.Context, reference, sourceText, sourceLanguage, outputLanguage string, translations []map[string]string, scope, focus string) (*AIResponse, error) {
	langLabel := "Koine Greek (primary text)"
	if sourceLanguage == "he" {
		langLabel = "Biblical Hebrew (primary text)"
	}

	normalizedScope := "verse"
	if scope == "book" || scope == "chapter" {
		normalizedScope = scope
	}

	var trLines []string
	for _, tr := range translations {
		trLines = append(trLines, fmt.Sprintf("**%s (%s)**\n\n%s", tr["name"], tr["id"], tr["text"]))
	}
	translationBlock := strings.Join(trLines, "\n\n---\n\n")

	var prompt string
	switch normalizedScope {
	case "book":
		prompt = fmt.Sprintf("You are analyzing book scope for **%s** — %s.%s\n\n"+
			"## Required structure (use real Markdown headings in the translation language)\n\n"+
			"**Section A — Book structure map** (`##` heading)\n"+
			"Provide a compact structure table (major sections with chapter spans and thematic labels).\n\n"+
			"**Section B — Authorship, audience, and genre context** (`##` heading)\n"+
			"Summarize plausible authorship, historical setting, audience, and literary genre.\n\n"+
			"**Section C — Theological backbone** (`##` heading)\n"+
			"Identify the book's core theological themes and show how they develop across major sections.\n\n"+
			"**Section D — Pivotal lexical windows** (`##` heading)\n"+
			"Choose 3-5 pivotal verses or phrases. Present each as a subsection:\n\n"+
			"### `<phrase in original>` — *<transliteration>* — \"<gloss>\" (`<verse ref>`)\n"+
			"Then 1-2 sentences on interpretive impact and how each translation renders it.\n\n"+
			"NEVER chain multiple words with slashes. Each item gets its own `###` block.\n\n"+
			"**Section E — Translation comparison** (`##` heading)\n"+
			"Evaluate each translation at book level: where it preserves nuance well and where it smooths ambiguity.\n\n"+
			"**Section F — Study cautions and next checks** (`##` heading)\n"+
			"Provide caution points and concrete follow-up checks for rigorous study.\n\n"+
			"---\n\n"+
			"**Reference:** %s\n\n"+
			"**Primary text (%s)**\n\n%s\n\n"+
			"---\n\n%s", reference, langLabel, focusDirective(focus), reference, langLabel, sourceText, translationBlock)
	case "chapter":
		prompt = fmt.Sprintf("You are analyzing chapter scope for **%s** — %s.%s\n\n"+
			"## Required structure (use real Markdown headings in the translation language)\n\n"+
			"**Section A — Chapter structure map** (`##` heading)\n"+
			"Provide a compact table with 3-7 rows: verse range, main movement, and a one-line comment.\n\n"+
			"**Section B — Historical and literary setting** (`##` heading)\n"+
			"Explain where this chapter sits in the broader argument and historical context.\n\n"+
			"**Section C — Key lexical moments** (`##` heading)\n"+
			"Select 5-8 pivotal words or short phrases. Present each in a short subsection:\n\n"+
			"### `<word or phrase in original>` — *<transliteration>* — \"<gloss>\"\n"+
			"Then 1-2 sentences explaining why this word matters for interpretation and how the translations handle it.\n\n"+
			"NEVER chain multiple words with slashes. Each lexical item gets its own `###` block.\n\n"+
			"**Section D — Translation comparison** (`##` heading)\n"+
			"Compare how each translation handles the chapter's most meaningful shifts in tone, nuance, and theology.\n\n"+
			"**Section E — Theological center** (`##` heading)\n"+
			"State the chapter's central theological movement in 1-2 concise paragraphs.\n\n"+
			"**Section F — Study cautions** (`##` heading)\n"+
			"List what should be verified in deeper study: variants, disputed readings, lexical uncertainty, and interpretive risks.\n\n"+
			"---\n\n"+
			"**Reference:** %s\n\n"+
			"**Primary text (%s)**\n\n%s\n\n"+
			"---\n\n%s", reference, langLabel, focusDirective(focus), reference, langLabel, sourceText, translationBlock)
	default:
		prompt = fmt.Sprintf("You are analyzing **%s** — %s compared against %d modern translation(s).%s\n\n"+
			"## Required structure (use real Markdown headings in the translation's language)\n\n"+
			"**Section A — Interlinear phrase table** (`##` heading)\n"+
			"Break the passage into **meaningful syntactic phrases** (2-5 words each, typically 3-6 phrases per verse).\n"+
			"Present them as a Markdown table with exactly three columns. The **table headers must match your output language** (Finnish headers for Finnish output, English headers for English output).\n\n"+
			"Example (Finnish headers):\n"+
			"| Alkuteksti | Foneettinen | Merkitys |\n"+
			"|------------|-------------|----------|\n"+
			"| **Οὕτως γὰρ ἠγάπησεν** | *hoútōs gàr ēgápēsen* | \"Sillä niin rakasti\" |\n\n"+
			"Rules for this table:\n"+
			"- Group words into natural clauses or phrases — NEVER one row per word.\n"+
			"- Bold the original script. Italicize the phonetic rendering.\n"+
			"- The meaning column must be a natural phrase in the reader's language, not a word-by-word gloss.\n"+
			"- For multi-verse passages, add a row with the verse label (e.g. **v.2**) spanning all columns.\n"+
			"- NEVER use inline slash-chains like `word / transliteration / gloss`. The table IS the format.\n\n"+
			"**Section B — Context & literary setting** (`##` heading)\n"+
			"One concise paragraph: where this passage sits historically, literarily, and theologically.\n\n"+
			"**Section C — Key words & translation decisions** (`##` heading)\n"+
			"Focus on 3–6 words/phrases where translations differ or where original nuance is theologically important.\n"+
			"Present each as a subsection:\n"+
			"### `<word in original script>` — *<transliteration>* — \"<literal gloss>\"\n"+
			"Then explain why this word matters and how each translation handles it (1-3 sentences).\n"+
			"NEVER chain words with slashes on a single line.\n\n"+
			"**Section D — Translation comparison** (`##` heading)\n"+
			"Evaluate each provided translation against the original. Be specific.\n\n"+
			"**Section E — Best match verdict** (`##` heading)\n"+
			"State clearly which translation best captures the original wording and theological nuance, and why.\n\n"+
			"**Section F — Study cautions** (`##` heading)\n"+
			"What a careful reader should verify beyond this snapshot.\n\n"+
			"---\n\n"+
			"**Reference:** %s\n\n"+
			"**Primary text (%s)**\n\n%s\n\n"+
			"---\n\n%s", reference, langLabel, len(translations), focusDirective(focus), reference, langLabel, sourceText, translationBlock)
	}

	outputLabel := "English"
	if strings.EqualFold(strings.TrimSpace(outputLanguage), "fi") {
		outputLabel = "Finnish"
	}
	prompt = fmt.Sprintf("## Output language\n\nWrite the entire response in %s. This includes every heading, paragraph, table header, label, explanation, comparison, and JSON footer. Do not mix in another natural language. Original Greek/Hebrew terms and transliterations may remain unchanged.\n\n%s", outputLabel, prompt)

	raw, usage, err := s.callGemini(ctx, s.cfg.GeminiModelOriginal, originalStudySystemInstruction, prompt, false)
	if err != nil {
		return nil, err
	}

	resp := parseAIResponse(raw)
	if usage != nil {
		resp.GeminiUsageMetadata = *usage
	}
	return resp, nil
}

func (s *aiServiceImpl) AISearch(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error) {
	langLabel := "English"
	if uiLanguage == "fi" {
		langLabel = "Finnish"
	}

	plannerPrompt := fmt.Sprintf("Convert the user's question into search parameters for translation \"%s\".\n"+
		"Output language for rationale: %s.\n\n"+
		"Note on 'book': If scope is 'book', specify the book name in Finnish or English, or prefer a 3-letter uppercase canonical identifier (e.g. PSA, GEN, JHN, ROM) if you are certain of it.\n\n"+
		"User question:\n%s", translationID, langLabel, strings.TrimSpace(query))

	planRaw, usagePlanner, err := s.callGemini(ctx, s.cfg.GeminiModelSearch, aiSearchPlannerSystemInstruction, plannerPrompt, true)
	if err != nil {
		return nil, fmt.Errorf("AI search planner phase failed: %w", err)
	}

	var plan SearchPlan
	if err := json.Unmarshal([]byte(planRaw), &plan); err != nil {
		return nil, fmt.Errorf("failed to parse structured AI search plan: %w. raw json: %s", err, planRaw)
	}

	// Dynamic database SearchParams mapping
	dbScope := plan.Scope
	if dbScope == "bible" {
		dbScope = "all"
	}

	dbScopeValue := ""
	if plan.Book != nil {
		dbScopeValue = *plan.Book
		// Simple normalization helper for canonical 3-letter codes inside database lookup:
		// If the book matches common names, we map it, otherwise try uppercase lookup in db
		upperVal := strings.ToUpper(strings.TrimSpace(dbScopeValue))
		if len(upperVal) >= 3 {
			// Query the database to find if there is a book matching this value by ID or Name
			var resolvedID string
			dbErr := s.verseRepo.DB().QueryRowContext(ctx,
				"SELECT id FROM books WHERE id = $1 OR UPPER(name) = $1 LIMIT 1", upperVal).Scan(&resolvedID)
			if dbErr == nil {
				dbScopeValue = resolvedID
			}
		}
	}

	var ftsQuery string
	if plan.Mode == "phrase" {
		ftsQuery = fmt.Sprintf(`"%s"`, strings.Join(plan.Terms, " "))
	} else if plan.Operator == "or" {
		ftsQuery = strings.Join(plan.Terms, " OR ")
	} else if plan.Operator == "not" && len(plan.Terms) > 1 {
		ftsQuery = fmt.Sprintf("%s NOT %s", plan.Terms[0], strings.Join(plan.Terms[1:], " NOT "))
	} else {
		ftsQuery = strings.Join(plan.Terms, " AND ")
	}

	dbParams := db.SearchParams{
		FTSQuery:      ftsQuery,
		TranslationID: translationID,
		SearchScope:   dbScope,
		ScopeValue:    dbScopeValue,
	}

	verses, err := s.verseRepo.Search(ctx, dbParams)
	if err != nil {
		return nil, fmt.Errorf("database search execution failed: %w", err)
	}

	// Limit search hits passed to AI summarizer to avoid massive tokens
	limitCount := 15
	if len(verses) < limitCount {
		limitCount = len(verses)
	}
	limitedVerses := verses[:limitCount]

	result := map[string]interface{}{
		"plan": plan,
		"search": map[string]interface{}{
			"verses": verses,
		},
	}

	if len(verses) == 0 {
		result["summary"] = nil
		return result, nil
	}

	var snippetBlock strings.Builder
	for _, v := range limitedVerses {
		_, _ = fmt.Fprintf(&snippetBlock, "%s %d:%d | %s\n", v.BookID, v.Chapter, v.Verse, v.Text)
	}

	summaryPrompt := fmt.Sprintf("The user asked (in natural language):\n\n%s\n\n"+
		"Write a brief grounded summary in %s. Use only these verses (reference | text):\n\n%s\n\n"+
		"Structure:\n"+
		"- One ## heading (in %s)\n"+
		"- 2-4 short paragraphs on themes and patterns across the hits\n"+
		"- Mention specific references inline only when they appear in the list above", query, langLabel, snippetBlock.String(), langLabel)

	summaryRaw, usageSummarizer, err := s.callGemini(ctx, s.cfg.GeminiModelSearch, aiSearchSummarySystemInstruction, summaryPrompt, false)
	if err != nil {
		return nil, fmt.Errorf("AI search summarizer phase failed: %w", err)
	}

	// Simple heuristic extraction of cited references
	var citedRefs []string
	summaryUpper := strings.ToUpper(summaryRaw)
	for _, v := range limitedVerses {
		ref := fmt.Sprintf("%s %d:%d", v.BookID, v.Chapter, v.Verse)
		if strings.Contains(summaryUpper, strings.ToUpper(ref)) || strings.Contains(summaryUpper, fmt.Sprintf("%s %d", v.BookID, v.Chapter)) {
			citedRefs = append(citedRefs, ref)
		}
	}

	result["summary"] = map[string]interface{}{
		"text":            strings.TrimSpace(summaryRaw),
		"citedReferences": citedRefs,
	}

	var totalPrompt, totalCandidates, totalTotal int
	if usagePlanner != nil {
		totalPrompt += usagePlanner.PromptTokenCount
		totalCandidates += usagePlanner.CandidatesTokenCount
		totalTotal += usagePlanner.TotalTokenCount
	}
	if usageSummarizer != nil {
		totalPrompt += usageSummarizer.PromptTokenCount
		totalCandidates += usageSummarizer.CandidatesTokenCount
		totalTotal += usageSummarizer.TotalTokenCount
	}

	result["usageMetadata"] = GeminiUsageMetadata{
		PromptTokenCount:     totalPrompt,
		CandidatesTokenCount: totalCandidates,
		TotalTokenCount:      totalTotal,
	}

	return result, nil
}

const compareSystemInstruction = "You describe differences, style, and theological nuances between two translations of a Bible passage. " +
	theologicalStance + " " + languageConsistencyRule + " " + nextFocusFooterRule + " " +
	"Write the full answer—including every Markdown heading—in the same language as the passage (e.g. Finnish for Finnish passages). " +
	"Use real `##` / `###` headings for section titles. Focus on lexical changes, grammar choices, and theological impacts. " +
	"Keep sections scannable with tight paragraphs and bullet lists."

func (s *aiServiceImpl) GetComparison(ctx context.Context, reference, transA, textA, transB, textB, focus string) (*AIResponse, error) {
	var userPrompt string
	if focus != "" {
		userPrompt = fmt.Sprintf("Passage: %s\n\nTranslation A (%s):\n%s\n\nTranslation B (%s):\n%s\n\nFocus Area: %s\n\nCompare these two translations, specifically focusing on the requested area.", reference, transA, textA, transB, textB, focus)
	} else {
		userPrompt = fmt.Sprintf("Passage: %s\n\nTranslation A (%s):\n%s\n\nTranslation B (%s):\n%s\n\nCompare these two translations and analyze their differences.", reference, transA, textA, transB, textB)
	}

	raw, usage, err := s.callGemini(ctx, s.cfg.GeminiModelTone, compareSystemInstruction, userPrompt, false)
	if err != nil {
		return nil, err
	}

	resp := parseAIResponse(raw)
	if usage != nil {
		resp.GeminiUsageMetadata = *usage
	}
	return resp, nil
}
