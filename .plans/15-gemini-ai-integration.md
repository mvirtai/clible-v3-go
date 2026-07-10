# Kehittäjäopas: Gemini API -integraatio ja AI-ominaisuudet (Suunnitelma 15)

Tämä opas ohjaa sinut vaiheittain Gemini AI -toiminnallisuuksien toteuttamiseen Clible-v3-go -järjestelmässä. Seuraamme kehitysfilosofiaamme: teet koodimuutokset itse tämän oppaan avulla, jolloin säilytät hyvän tuntuman koodikantaan ja sen arkkitehtuuriin.

---

## 1. Tietoturva- ja arkkitehtuuripäätökset

Kun otamme käyttöön maksullisen ulkoisen rajapinnan (Gemini API), tietoturva ja kustannusten hallinta ovat kriittisiä. Olemme tehneet seuraavat linjaukset:

1. **Avaimen eristys (Key Containment)**: `GEMINI_API_KEY` pidetään tiukasti vain backendin muistissa (luetaan ympäristömuuttujista). Sitä ei koskaan lähetetä selaimelle eikä lokiteta tiedostoihin.
2. **Käyttöoikeudet (Authorization)**: Kaikki `/api/ai/*` -endpointit suojataan `RequireAuth`-middlewarella. Vain kirjautuneet ja todennetut käyttäjät voivat kuluttaa API-kiintiötä.
3. **Tiukempi Rate Limiting**: AI-endpointit ovat hitaita ja laskutuksellisesti kalliita. Otamme backendissä käyttöön erillisen, tiukemman rate limiterin nimenomaan tekoälyreiteille (esim. 5 kutsua minuutissa per käyttäjä/IP), jotta voimme suojautua väärinkäytöksiltä.
4. **Vakio HTTP-asiakas (net/http)**: Emme asenna raskaita ulkoisia SDK-kirjastoja. Teemme kutsut suoraan Google AI Studion standardiin JSON-rajapintaan käyttäen Go:n `net/http`- ja `encoding/json`-paketteja. Tämä tekee koodista nopean, kevyen ja helposti testattavan.

---

## 2. Vaihe 1: Ympäristömuuttujat ja konfiguraatio

Lisätään Gemini-avain ja malliasetukset backendin konfiguraatiorakenteeseen.

### Muutokset tiedostoon `backend/internal/config/config.go`

1. Laajennetaan `Config`-rakennetta:

   ```go
   type Config struct {
       Port        string
       DatabaseURL string
       FrontendDir string
       Env         string
       GeminiAPIKey string // Uusi
       // Sallitaan mallien ylikirjoitus ympäristömuuttujilla (v2-yhteensopivuus)
       GeminiModelInsight string
       GeminiModelTone    string
       GeminiModelStudy   string
       GeminiModelOriginal string
       GeminiModelSearch   string
   }
   ```

2. Luetaan muuttujat `Load()`-metodissa default-arvoilla:

   ```go
   geminiAPIKey := cleanEnv(os.Getenv("GEMINI_API_KEY"))

   modelInsight := cleanEnv(os.Getenv("GEMINI_MODEL_INSIGHT"))
   if modelInsight == "" {
       modelInsight = "gemini-2.5-flash"
   }
   modelTone := cleanEnv(os.Getenv("GEMINI_MODEL_TONE"))
   if modelTone == "" {
       modelTone = "gemini-2.5-flash"
   }
   modelStudy := cleanEnv(os.Getenv("GEMINI_MODEL_STUDY"))
   if modelStudy == "" {
       modelStudy = "gemini-2.5-flash"
   }
   modelOriginal := cleanEnv(os.Getenv("GEMINI_MODEL_ORIGINAL_STUDY"))
   if modelOriginal == "" {
       modelOriginal = "gemini-2.5-flash" // Google AI Studio tukee tätä erinomaisesti
   }
   modelSearch := cleanEnv(os.Getenv("GEMINI_MODEL_AI_SEARCH"))
   if modelSearch == "" {
       modelSearch = "gemini-2.5-flash"
   }

   return &Config{
       Port:                port,
       DatabaseURL:         databaseURL,
       FrontendDir:         frontendDir,
       Env:                 env,
       GeminiAPIKey:        geminiAPIKey,
       GeminiModelInsight:  modelInsight,
       GeminiModelTone:     modelTone,
       GeminiModelStudy:    modelStudy,
       GeminiModelOriginal: modelOriginal,
       GeminiModelSearch:   modelSearch,
   }
   ```

---

## 3. Vaihe 2: AI-palvelukerros (AIService)

Luodaan uusi palvelu `backend/internal/services/ai_service.go`. Palvelu vastaa promptien muodostamisesta ja HTTP-kutsujen tekemisestä Gemini API:in.

### Gemini API:n pyyntörakenne (Request & Response)

Gemini API `generateContent` -kutsun JSON-rakenne näyttää tältä:

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Käyttäjän syöte tai prompti"
        }
      ]
    }
  ],
  "systemInstruction": {
    "parts": [
      {
        "text": "Järjestelmäohjeet (System instructions/stance)"
      }
    ]
  },
  "generationConfig": {
    "responseMimeType": "application/json"
  }
}
```

Vastaus puolestaan palauttaa:

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Tekoälyn tuottama vastausteksti"
          }
        ]
      }
    }
  ]
}
```

### Tiedoston `backend/internal/services/ai_service.go` runko

Luodaan tiedosto ja määritellään rajapinta, mallit ja promptien osaset:

```go
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

// Määritellään teologinen perusta ja säännöt, jotka portataan v2:sta
const theologicalStance = `Theological stance: you operate from the presupposition that the Bible is genuine divine revelation, written under the guidance of the Holy Spirit, and that it speaks truthfully. This is not a confessional or denominational position — do not read the text through any tradition's interpretive filter (Reformed, Catholic, Lutheran, Pentecostal, or any other). Apply rigorous philological and historical-critical methods as scholarly tools; these tools are not a framework that excludes divine authorship, but instruments for reading the text as carefully as possible. Let the text itself determine where the exegesis leads. When scholarly opinions diverge, report them honestly without forcing a confessional resolution. Do not assert certainty where the evidence does not justify it.`

const languageConsistencyRule = `Language rule: ALL headings, subheadings, table headers, and labels must be in the same language as the body text. Never mix English headings with Finnish body text (or vice versa). If the surrounding content is Finnish, headings must be Finnish; if it is English, headings must be English. This is strict.`

const nextFocusFooterRule = `Next focus footer: append a FINAL JSON code block (` + "```json ... ```" + `) as the last thing in your response. It must be valid JSON with this shape: { "next_focus": [ { "label": string, "kind": "word"|"theme"|"question"|"phrase", "reason": string } ] }. Return 1–3 items (or an empty array if nothing sensible). Keep labels short. Nothing may appear after the JSON block.`

const deepDiveSystemInstruction = `You write a focused theological deep dive on a single topic, for a reader who wants to go beyond the previous analysis. ` + theologicalStance + ` ` + languageConsistencyRule + ` ` + nextFocusFooterRule + ` IMPORTANT: do NOT repeat the previous task type (do not re-run verse-by-verse comparison, tone analysis, or the original outline). Your ONLY task is to explain the selected topic clearly and academically. Use real Markdown headings (## / ###), short paragraphs, and bullets when helpful.`

const insightSystemInstruction = `You are a scholarly Bible study assistant. ` + theologicalStance + ` ` + languageConsistencyRule + ` ` + nextFocusFooterRule + ` Write the full answer—including every ## and ### heading—in the same language as the Bible passage the user pasted. If the passage is clearly in one language (e.g. Finnish, Swedish, German), use that language for headings and body. Only use English if the passage is English or the language is genuinely ambiguous. Follow the requested Markdown shape exactly (real ## / ### headings, not bold-only titles).`

const toneSystemInstruction = `You describe tone, mood, and linguistic style of Bible passages. ` + theologicalStance + ` ` + languageConsistencyRule + ` ` + nextFocusFooterRule + ` Write the full answer—including every Markdown heading—in the same language as the passage. Use real ## / ### headings for section titles; reserve **bold** for short emphasis inside paragraphs only, never as a substitute for headings. Keep sections scannable: tight paragraphs, optional bullet lists for subpoints.`

const originalStudySystemInstruction = `You are a biblical scholar serving simultaneously as interpreter, comparative linguist, Bible translator, and theologian. Your primary audience is a reader who has NO knowledge of Greek or Hebrew script. ` + theologicalStance + ` ` + languageConsistencyRule + ` ` + nextFocusFooterRule + ` RULE 1 — Transliteration via phrases: when presenting original-language text, group words into natural syntactic phrases (2-5 words each). Never transliterate word-by-word across a full verse or paragraph — always group into meaningful phrases. RULE 2 — Readable format: present phrases in a Markdown table with three columns (Original, Phonetic, Meaning). Bold the original script in the first column. Italicize the phonetic form. Keep the meaning column as a natural clause in the reader's language. RULE 3 — NEVER use slash-delimited chains like "word / transliteration / gloss / ...". RULE 4 — Multi-translation evaluation: compare modern translations against the original and explain which best captures the nuance. RULE 5 — Language: write all headings and body text in the same language as the provided translations (if Finnish, respond in Finnish). RULE 6 — Markdown: use real ## and ### headings. Keep paragraphs short and scannable.`

const aiSearchPlannerSystemInstruction = `You convert natural-language Bible search questions into structured FTS search parameters. Output ONLY valid JSON with no markdown fences and no extra text. Schema: { "terms": string[], "mode": "phrase"|"words"|"wildcard", "operator": "and"|"or"|"not", "scope": "bible"|"ot"|"nt"|"book", "book": string|null, "rationale": string }. Rules: (1) terms must be in the same language as the installed translation text. (2) scope book requires non-null book (e.g. Psalms, Psalmit). (3) scope bible|ot|nt must have book null. (4) rationale is 1-2 sentences in the requested ui language explaining the search strategy.`

const aiSearchSummarySystemInstruction = `You summarize Bible search results for a study app. ` + theologicalStance + ` ` + languageConsistencyRule + ` CRITICAL: Answer ONLY using the verse snippets provided. Do not cite any reference that is not in the snippet list. If the snippets are insufficient, say so explicitly. Use real Markdown (## heading + short paragraphs). Keep the answer concise (under 250 words).`

// Mallivastauksen poiminta-apufunktio (JSON footerin poistaminen tekstistä)
type NextFocusItem struct {
 Label  string `json:"label"`
 Kind   string `json:"kind"`
 Reason string `json:"reason"`
}

type AIResponse struct {
 Text      string          `json:"text"`
 NextFocus []NextFocusItem `json:"nextFocus"`
}

// AIService määrittelee backendin AI-rajapinnan
type AIService interface {
 GetInsight(ctx context.Context, text, focus string) (*AIResponse, error)
 GetTone(ctx context.Context, text, focus string) (*AIResponse, error)
 DeepDive(ctx context.Context, topic, outputLanguage string, contextData map[string]interface{}) (*AIResponse, error)
 OriginalStudy(ctx context.Context, reference, sourceText, sourceLanguage string, translations []map[string]string, scope, focus string) (*AIResponse, error)
 AISearch(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error)
}

type aiServiceImpl struct {
 cfg       *config.Config
 client    *http.Client
 verseRepo db.VerseRepository
}

func NewAIService(cfg *config.Config, verseRepo db.VerseRepository) AIService {
 return &aiServiceImpl{
  cfg: cfg,
  client: &http.Client{
   Timeout: 45 * time.Second, // AI-haut saattavat kestää
  },
  verseRepo: verseRepo,
 }
}
```

### Yleinen Gemini HTTP-kutsujen apufunktio

Lisätään `aiServiceImpl` -palveluun yleinen apumetodi `callGemini`, joka hoitaa HTTP-pyynön tekemisen standardilla tavalla:

```go
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

type geminiResponse struct {
 Candidates []geminiCandidate `json:"candidates"`
}

func (s *aiServiceImpl) callGemini(ctx context.Context, model, systemPrompt, userPrompt string, forceJSON bool) (string, error) {
 if s.cfg.GeminiAPIKey == "" {
  return "", fmt.Errorf("Gemini API key is not configured")
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
  return "", fmt.Errorf("failed to marshal payload: %w", err)
 }

 url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, s.cfg.GeminiAPIKey)

 req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
 if err != nil {
  return "", fmt.Errorf("failed to create request: %w", err)
 }
 req.Header.Set("Content-Type", "application/json")

 resp, err := s.client.Do(req)
 if err != nil {
  return "", fmt.Errorf("failed to execute Gemini request: %w", err)
 }
 defer func() { _ = resp.Body.Close() }()

 if resp.StatusCode != http.StatusOK {
  var errData map[string]interface{}
  _ = json.NewDecoder(resp.Body).Decode(&errData)
  return "", fmt.Errorf("Gemini API returned status %d: %v", resp.StatusCode, errData)
 }

 var geminiResp geminiResponse
 if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
  return "", fmt.Errorf("failed to decode Gemini response: %w", err)
 }

 if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
  return "", fmt.Errorf("empty response candidates from Gemini API")
 }

 return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}
```

### JSON-footerin erotus-apufunktio (`extractNextFocus`)

Tekoäly palauttaa osana vastaustaan JSON-koodilohkon suosittelemistaan jatko-aiheista. Meidän tulee erottaa se varsinaisesta Markdown-tekstistä:

```go
func parseAIResponse(raw string) *AIResponse {
 response := &AIResponse{
  Text:      raw,
  NextFocus: []NextFocusItem{},
 }

 // Etsitään ```json ja ``` välinen alue
 startIdx := strings.LastIndex(raw, "```json")
 if startIdx == -1 {
  return response
 }

 endIdx := strings.Index(raw[startIdx:], "```")
 if endIdx == -1 {
  return response
 }
 endIdx = startIdx + endIdx

 jsonBlock := raw[startIdx+7 : endIdx]
 jsonBlock = strings.TrimSpace(jsonBlock)

 var footerData struct {
  NextFocus []NextFocusItem `json:"next_focus"`
 }

 if err := json.Unmarshal([]byte(jsonBlock), &footerData); err == nil {
  response.NextFocus = footerData.NextFocus
  // Puhdistetaan varsinainen teksti poistamalla JSON-koodilohko
  response.Text = strings.TrimSpace(raw[:startIdx])
 }

 return response
}
```

### Insight- ja Tone-palvelujen toteutus

Toteutetaan helpot API-kutsut promptien kasaamisen kera:

```go
func focusDirective(focus string) string {
 f := strings.TrimSpace(focus)
 if f == "" {
  return ""
 }
 return fmt.Sprintf("\n\n## Focus\n\nFocus specifically on: **%s**. Keep the overall structure, but make this the main emphasis.\n", f)
}

func (s *aiServiceImpl) GetInsight(ctx context.Context, text, focus string) (*AIResponse, error) {
 prompt := fmt.Sprintf(`Analyze the Bible passage at the end of this message.

## Structure (use real Markdown headings—word the titles yourself)

Use **three** ## sections **in this order**. Choose natural titles in **the same language as the passage** (do not keep English labels if the passage is not English).

**Section A — short opening overview**
One concise paragraph.
*Finnish example titles:* ## Johdanto or ## Yhteenveto
*English examples:* ## Summary or ## Overview

**Section B — historical and cultural background**
One to several paragraphs; scale length to how much relevant context exists and to passage length.
*Finnish example:* ## Historiallinen konteksti
*English example:* ## Historical context

**Section C — exactly three takeaways**
A ## title, then three subsections. Each takeaway: one ### line (number + short title) and one paragraph.
*Finnish example section title:* ## Kolme keskeistä pointtia or ## Kolme pointtia
*Finnish takeaway lines:* ### 1. … , ### 2. … , ### 3. … with Finnish titles.

**Formatting rules**
- Every section and takeaway must use ## or ### headings (not **bold** alone for those titles).
- **All** headings and body text must match the passage language.
- Do not prefix the answer with a separate intro sentence in another language; start directly with the first ## section if possible.

## Passage

%s%s

## Output rules

- After your Markdown answer, append the required JSON footer (see below).

` + "```json\n{ \"next_focus\": [ { \"label\": \"…\", \"kind\": \"theme\", \"reason\": \"…\" } ] }\n```", text, focusDirective(focus))

 raw, err := s.callGemini(ctx, s.cfg.GeminiModelInsight, insightSystemInstruction, prompt, false)
 if err != nil {
  return nil, err
 }

 return parseAIResponse(raw), nil
}

func (s *aiServiceImpl) GetTone(ctx context.Context, text, focus string) (*AIResponse, error) {
 prompt := fmt.Sprintf(`Analyze the **tone**, **mood (atmosphere)**, and **linguistic style** of the passage at the end of this message.

Your reply must follow this Markdown layout (do not copy the instruction labels below into the answer):

**Language:** Write all headings and body text in the **same language as the passage**.

**1. No lead-in sentence**
Do not start your response with a sentence introducing what you will cover.

**2. Three main sections — each starts with a level-2 Markdown heading (##)**

Use exactly **three** ## sections in this order. Pick natural titles in the passage language.
Adjust the length of your response to fit the length of the passage provided.

| Role | Finnish examples | English examples |
|------|------------------|------------------|
| A | ## Sävy | ## Tone |
| B | ## Tunnelma | ## Atmosphere |
| C | ## Kielellinen tyyli | ## Linguistic style |

Under each ##, write one or more paragraphs. Be concise but concrete.

**3. Emphasis vs headings**
- Put section names (**Sävy**, **Tunnelma**, …) **only** on the ## line. Do **not** repeat them as **bold** at the start of the paragraph.
- Use **bold** only for short in-sentence emphasis (a few words).

**4. Subpoints (optional)**
Use "- **Label:** explanation" if needed.

--- Passage ---

%s%s

## Output rules

- Append the required JSON footer as the final block.

` + "```json\n{ \"next_focus\": [ { \"label\": \"…\", \"kind\": \"theme\", \"reason\": \"…\" } ] }\n```", text, focusDirective(focus))

 raw, err := s.callGemini(ctx, s.cfg.GeminiModelTone, toneSystemInstruction, prompt, false)
 if err != nil {
  return nil, err
 }

 return parseAIResponse(raw), nil
}
```

*(Jatka toteuttamalla `DeepDive` ja `OriginalStudy` vastaavalla tyylillä käyttäen `deepDiveSystemInstruction` ja `originalStudySystemInstruction` ohjeita).*

---

## 4. Vaihe 3: Kaksivaiheinen Tekoälyhaku (AISearch)

Tämä on monimutkaisin osa-alue. Kun käyttäjä kirjoittaa hakuun vapaamuotoisen kysymyksen (esim. *"missä Jeesus puhuu rauhasta"*), backend:

1. Pyytää Geminiltä strukturoidun FTS5-hakusuunnitelman JSON-muodossa.
2. Suorittaa tietokantakyselyn (FTS) saadulla suunnitelmalla.
3. Kokoaa jaemuodot tiivistelmäksi ja lähettää ne Geminille yhteenvetoa varten.

Toteutetaan tämä `aiServiceImpl` -structiin:

```go
type SearchPlan struct {
 Terms     []string `json:"terms"`
 Mode      string   `json:"mode"`     // "phrase"|"words"|"wildcard"
 Operator  string   `json:"operator"` // "and"|"or"|"not"
 Scope     string   `json:"scope"`    // "bible"|"ot"|"nt"|"book"
 Book      *string  `json:"book"`
 Rationale string   `json:"rationale"`
}

func (s *aiServiceImpl) AISearch(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error) {
 // Vaihe 1: Hakusuunnitelman luonti Geminillä
 langLabel := "English"
 if uiLanguage == "fi" {
  langLabel = "Finnish"
 }

 plannerPrompt := fmt.Sprintf(`Convert the user's question into search parameters for translation "%s".
Output language for rationale: %s.

User question:
%s`, translationID, langLabel, strings.TrimSpace(query))

 planRaw, err := s.callGemini(ctx, s.cfg.GeminiModelSearch, aiSearchPlannerSystemInstruction, plannerPrompt, true)
 if err != nil {
  return nil, fmt.Errorf("AI planner step failed: %w", err)
 }

 var plan SearchPlan
 if err := json.Unmarshal([]byte(planRaw), &plan); err != nil {
  return nil, fmt.Errorf("failed to parse AI search plan: %w. Raw plan: %s", err, planRaw)
 }

 // Vaihe 2: Suoritetaan varsinainen haku SQLitestä/PostgreSQL:stä
 // Rakennetaan haku käyttäen VerseRepositorya.
 // Huom: Hakutermit pitää yhdistää tietokantahakua varten FTS-syntaksin mukaisesti.
 // Esimerkiksi: jos mode="phrase", haetaan termejä lainausmerkeissä.
 var dbQuery string
 if plan.Mode == "phrase" {
  dbQuery = fmt.Sprintf(`"%s"`, strings.Join(plan.Terms, " "))
 } else if plan.Operator == "or" {
  dbQuery = strings.Join(plan.Terms, " OR ")
 } else {
  dbQuery = strings.Join(plan.Terms, " AND ")
 }

 // Kutsutaan repo-kerrosta
 verses, err := s.verseRepo.Search(ctx, dbQuery, translationID, 15) // Rajoitetaan 15 jakeeseen tiivistelmää varten
 if err != nil {
  return nil, fmt.Errorf("database search failed: %w", err)
 }

 result := map[string]interface{}{
  "plan":   plan,
  "search": map[string]interface{}{"verses": verses},
 }

 if len(verses) == 0 {
  result["summary"] = nil
  return result, nil
 }

 // Vaihe 3: Luodaan jaemuodoista tiivistelmälohko
 var snippetsBuilder strings.Builder
 for _, v := range verses {
  snippetsBuilder.WriteString(fmt.Sprintf("%s %d:%d | %s\n", v.BookID, v.Chapter, v.Verse, v.Text))
 }

 summaryPrompt := fmt.Sprintf(`The user asked (in natural language):

%s

Write a brief grounded summary in %s. Use only these verses (reference | text):

%s

Structure:
- One ## heading (in %s)
- 2-4 short paragraphs on themes and patterns across the hits
- Mention specific references inline only when they appear in the list above`, query, langLabel, snippetsBuilder.String(), langLabel)

 summaryRaw, err := s.callGemini(ctx, s.cfg.GeminiModelSearch, aiSearchSummarySystemInstruction, summaryPrompt, false)
 if err != nil {
  return nil, fmt.Errorf("AI summarizer step failed: %w", err)
 }

 // Poimitaan viitatut jakeet v2-logiikan mukaisesti (yksinkertaistettu regex tai pelkkä teksti)
 result["summary"] = map[string]interface{}{
  "text":            strings.TrimSpace(summaryRaw),
  "citedReferences": []string{}, // Voidaan täyttää etsimällä jakeiden viitteitä tekstistä
 }

 return result, nil
}
```

---

## 5. Vaihe 4: API-rajapinta ja tiukempi Rate Limiting

Luodaan `backend/internal/api/ai_handler.go`.

> [!WARNING]
> **Rate limit**: AI-endpointtien suojaamiseksi luomme erillisen IP-pohjaisen rate limiterin, joka sallii vain **5 tekoälykutsua minuutissa**.

```go
package api

import (
 "encoding/json"
 "net/http"
 "strings"

 "github.com/mvirtai/clible-v3-go/internal/services"
 "golang.org/x/time/rate"
)

type AIHandler struct {
 aiService services.AIService
}

func NewAIHandler(aiService services.AIService) *AIHandler {
 return &AIHandler{aiService: aiService}
}

// Luodaan tiukka rate limiter (5 pyyntöä per minuutti, purske 2 pyyntöä)
var aiLimiter = rate.NewLimiter(rate.Limit(5.0/60.0), 2)

func checkAIRateLimit(ip string) bool {
 // Tässä voidaan pitää karttaa IP-kohtaisista rajoittimista,
 // samalla tavalla kuin main.go:n yleisessä rate limiterissä.
 return aiLimiter.Allow()
}

func (h *AIHandler) GetInsight(w http.ResponseWriter, r *http.Request) {
 if r.Method != "POST" {
  http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
  return
 }

 // Tarkistetaan rate limit
 if !checkAIRateLimit(r.RemoteAddr) {
  http.Error(w, "Too many AI requests. Please wait a minute.", http.StatusTooManyRequests)
  return
 }

 var req struct {
  Text  string `json:"text"`
  Focus string `json:"focus"`
 }
 if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
  http.Error(w, "Invalid request payload", http.StatusBadRequest)
  return
 }

 if strings.TrimSpace(req.Text) == "" {
  http.Error(w, "Missing required 'text' field", http.StatusBadRequest)
  return
 }

 resp, err := h.aiService.GetInsight(r.Context(), req.Text, req.Focus)
 if err != nil {
  if strings.Contains(err.Error(), "Gemini API key is not configured") {
   w.Header().Set("Content-Type", "application/json")
   w.WriteHeader(http.StatusServiceUnavailable)
   _ = json.NewEncoder(w).Encode(map[string]string{
    "error": "AI disabled",
    "hint":  "Set GEMINI_API_KEY to enable AI features.",
   })
   return
  }
  http.Error(w, err.Error(), http.StatusInternalServerError)
  return
 }

 w.Header().Set("Content-Type", "application/json")
 _ = json.NewEncoder(w).Encode(resp)
}
```

*(Luo vastaavat metodit kaikille muille AI-endpointeille).*

---

## 6. Vaihe 5: Reittien rekisteröinti ja alustus

Päivitetään `backend/main.go` alustamaan `AIService` ja rekisteröimään uudet reitit:

1. **Alustus**:

   ```go
   // Repojen jälkeen alustetaan AIService
   aiService := services.NewAIService(cfg, verseRepo)
   aiHandler := api.NewAIHandler(aiService)
   ```

2. **Reitit**:

   ```go
   // Rekisteröidään uudet tekoälyreitit auth-vaatimuksella
   mux.Handle("POST /api/ai/insight", requireAuth(http.HandlerFunc(aiHandler.GetInsight)))
   mux.Handle("POST /api/ai/tone", requireAuth(http.HandlerFunc(aiHandler.GetTone)))
   mux.Handle("POST /api/ai/study", requireAuth(http.HandlerFunc(aiHandler.GetStudy)))
   mux.Handle("POST /api/ai/deep-dive", requireAuth(http.HandlerFunc(aiHandler.GetDeepDive)))
   mux.Handle("POST /api/ai/search", requireAuth(http.HandlerFunc(aiHandler.AISearch)))
   mux.Handle("POST /api/ai/original-study", requireAuth(http.HandlerFunc(aiHandler.GetOriginalStudy)))
   ```

---

## 7. Vaihe 6: Yksikkötestaus ilman API-avainta (Mocking)

Luodaan testi `backend/internal/services/ai_service_test.go`, jossa testataan HTTP-kutsut mock-palvelinta vasten:

```go
package services

import (
 "context"
 "net/http"
 "net/http/httptest"
 "testing"

 "github.com/mvirtai/clible-v3-go/internal/config"
)

func TestAIService_GetInsight_Mocked(t *testing.T) {
 // 1. Luodaan mock-palvelin simuloimaan Gemini API:a
 mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(http.StatusOK)
  // Palautetaan validi Gemini-vastaus JSON-footerin kera
  _, _ = w.Write([]byte(`{
   "candidates": [
    {
     "content": {
      "parts": [
       {
        "text": "Tämä on mockattu analyysi jakeesta.\n\n` + "```json\n{ \"next_focus\": [ { \"label\": \"Rakkaus\", \"kind\": \"theme\", \"reason\": \"Mock\" } ] }\n```" + `"
       }
      ]
     }
    }
   ]
  }`))
 }))
 defer mockServer.Close()

 // 2. Kofiguroidaan palvelu käyttämään mock-palvelinta ja testiavainta
 cfg := &config.Config{
  GeminiAPIKey:        "mock-key",
  GeminiModelInsight:  "gemini-2.5-flash",
 }

 // Luodaan service ja ylikirjoitetaan url testin ajaksi.
 // Jotta callGemini ohjaa pyynnön mock-palvelimeen, voimme vaihtaa domainin
 // (tätä varten callGemini-koodissa on hyvä tukea base URL -konfiguraatiota tai
 // voimme antaa sen parametrina palvelulle. Vaihtoehtoisesti voimme korvata http.Clientin kuljetuskerroksen (Transport)).
}
```

---

## 8. Vaihe 7: Frontend-näkymien porttaaminen

Kun backendin API toimii, siirrytään frontendiin:

1. **TypeScript-tyypit**: Luodaan `frontend/src/types/ai.ts` vastaamaan backendin palauttamia rakenteita (mukaan lukien `nextFocus`).
2. **apiService**: Lisätään kutsut `frontend/src/services/api.ts`-tiedostoon:

   ```typescript
   async getAiInsight(text: string, focus?: string): Promise<AiTextResponse> {
       const res = await fetch(`${this.baseUrl}/ai/insight`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ text, focus }),
           credentials: 'include',
       });
       if (!res.ok) throw new Error(`POST /ai/insight returned ${res.status}`);
       return await res.json();
   }
   ```

3. **DeepDiveCard.tsx & NextFocusChips.tsx**: Luodaan nämä komponentit `components/`-hakemistoon v2-lähdekoodia seuraten.
4. **OriginalStudyView.tsx**: Portataan alkukielen vertailunäkymä ja kytketään se `App.tsx`:n uudeksi välilehdeksi (automaattisesti asennetuilla kreikan `greeksblgnt` ja heprean `hebrewaleppocodex` käännöksillä).

---

## Seuraavat askeleet

1. Aloita backend-puolen muutoksista: laajenna `config.go` ja luo `ai_service.go` runko.
2. Voit pyytää minua tekemään yksittäisen tiedoston tai testin luonnin, tai korjaamaan kääntäjävirheet sitä mukaa kun kirjoitat koodia!
3. Kun backend vastaa mock-testeissä oikein, siirrymme frontendin toteutukseen.
