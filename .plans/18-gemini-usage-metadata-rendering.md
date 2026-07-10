# Ohjeet: Gemini Token-käyttötietojen (usageMetadata) renderöinti käyttöliittymään

Tässä ohjeessa käydään läpi tarvittavat muutokset Gemini API:n palauttamien `usageMetadata`-tietojen (kuten `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) noutamiseen backendissä ja niiden näyttämiseen React-frontendissä.

---

## 1. Backend-muutokset (Go)

### 1.1 `backend/internal/services/ai_service.go`

1. **Määrittele uudet tietorakenteet:**
   Lisää `GeminiUsageMetadata`-rakenne ja päivitä `geminiResponse` sekä `AIResponse` vastaamaan uutta kenttää.

```go
// GeminiUsageMetadata edustaa Gemini API:n palauttamaa token-käyttöä
type GeminiUsageMetadata struct {
 PromptTokenCount     int `json:"promptTokenCount"`
 CandidatesTokenCount int `json:"candidatesTokenCount"`
 TotalTokenCount      int `json:"totalTokenCount"`
}

type geminiResponse struct {
 Candidates    []geminiCandidate   `json:"candidates"`
 UsageMetadata GeminiUsageMetadata `json:"usageMetadata"` // Uusi kenttä
}

type AIResponse struct {
 Text          string               `json:"text"`
 NextFocus     []NextFocusItem      `json:"nextFocus"`
 UsageMetadata *GeminiUsageMetadata `json:"usageMetadata,omitempty"` // Uusi kenttä
}
```

1. **Muokkaa `callGemini`-funktiota:**
   Muuta funktio palauttamaan myös `*GeminiUsageMetadata`.

```go
func (s *aiServiceImpl) callGemini(ctx context.Context, model, systemPrompt, userPrompt string, forceJSON bool) (string, *GeminiUsageMetadata, error) {
    // ... aiempi koodi pyynnön valmisteluun ja suorittamiseen ...

    var geminiResp geminiResponse
    if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
        return "", nil, fmt.Errorf("failed to decode Gemini API response: %w", err)
    }

    if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
        return "", nil, fmt.Errorf("received empty candidates from Gemini API")
    }

    return geminiResp.Candidates[0].Content.Parts[0].Text, &geminiResp.UsageMetadata, nil
}
```

1. **Päivitä kaikki `callGemini`-kutsut:**
   Päivitä palvelun metodit (`GetInsight`, `GetTone`, `DeepDive`, `OriginalStudy`, `GetComparison`) ottamaan vastaan uusi paluuarvo ja sijoittamaan se palautettavaan `AIResponse`-olioon.

   *Esimerkki (`GetInsight`):*

```go
func (s *aiServiceImpl) GetInsight(ctx context.Context, text, focus string) (*AIResponse, error) {
    // ...
    raw, usage, err := s.callGemini(ctx, s.cfg.GeminiModelInsight, insightSystemInstruction, prompt, false)
    if err != nil {
        return nil, err
    }

    resp := parseAIResponse(raw)
    resp.UsageMetadata = usage
    return resp, nil
}
```

1. **Kombinoi token-käyttö kahdesta API-kutsusta `AISearch`-metodissa:**
   Koska `AISearch` tekee kaksi erillistä kutsua (Planner ja Summarizer), lasketaan niiden tokenit yhteen.

```go
func (s *aiServiceImpl) AISearch(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error) {
    // ...
    planRaw, usagePlanner, err := s.callGemini(ctx, s.cfg.GeminiModelSearch, aiSearchPlannerSystemInstruction, plannerPrompt, true)
    if err != nil {
        return nil, fmt.Errorf("AI search planner phase failed: %w", err)
    }
    // ...
    summaryRaw, usageSummarizer, err := s.callGemini(ctx, s.cfg.GeminiModelSearch, aiSearchSummarySystemInstruction, summaryPrompt, false)
    if err != nil {
        return nil, fmt.Errorf("AI search summarizer phase failed: %w", err)
    }
    // ...
    
    // Yhdistä token-määrät
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
```

---

## 2. Frontend-muutokset (TypeScript & React)

### 2.1 Määrittele tyypit (`frontend/src/types/`)

1. **Päivitä `frontend/src/types/ai.ts`:**

```typescript
export interface GeminiUsageMetadata {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
}

export interface AiTextResponse {
    text: string;
    nextFocus: NextFocusItem[];
    usageMetadata?: GeminiUsageMetadata;
}
```

1. **Päivitä `frontend/src/types/aiSearch.ts`:**

```typescript
import type { GeminiUsageMetadata } from "./ai";

export interface AiSearchResponse {
    plan: AiSearchPlan;
    search: {
        verses: Array<{
            id: string;
            translationId: string;
            bookId: string;
            chapter: number;
            verse: number;
            text: string;
        }>;
    };
    summary: AiSearchSummary | null;
    usageMetadata?: GeminiUsageMetadata;
}
```

### 2.2 Luo yhteinen komponentti token-tietojen näyttämiseen

Luodaan uusi pieni komponentti token-tietojen siistiä renderöintiä varten tiedostoon `frontend/src/components/GeminiUsage.tsx`.

```tsx
import React from 'react';
import type { GeminiUsageMetadata } from '../types/ai';

interface GeminiUsageProps {
    usage?: GeminiUsageMetadata;
}

export const GeminiUsage: React.FC<GeminiUsageProps> = ({ usage }) => {
    if (!usage) return null;

    return (
        <div className="mt-4 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-muted-foreground/60 select-none">
            <span>Malli: Gemini</span>
            <div className="flex gap-3">
                <span>Prompt: {usage.promptTokenCount} tkn</span>
                <span>Vastaus: {usage.candidatesTokenCount} tkn</span>
                <span className="font-semibold text-muted-foreground/80">Yhteensä: {usage.totalTokenCount} tkn</span>
            </div>
        </div>
    );
};
```

### 2.3 Renderöi token-tiedot käyttöliittymän eri osissa

Lisää `<GeminiUsage usage={...} />` asianmukaisiin paneeleihin:

1. **Insight & Tone (Sävy- ja tyylianalyysi):**
   Tiedostossa `frontend/src/components/AnalyticsView.tsx` etsi sävy- ja insight-tulosten renderöintikohta ja sijoita `<GeminiUsage>` sinne.

2. **Käännösvertailu:**
   Tiedostossa `frontend/src/components/CompareView.tsx` etsi kohta, jossa AI-vertailu renderöidään, ja lisää `<GeminiUsage usage={compareResult?.usageMetadata} />`.

3. **Alkukielen analyysi (OriginalStudyView):**
   Tiedostossa `frontend/src/components/OriginalStudyView.tsx` renderöi token-tiedot `originalStudyResult?.usageMetadata`.

4. **Tekoälyhaku (VerseSearch):**
   Tiedostossa `frontend/src/components/VerseSearch.tsx` renderöi token-tiedot haun tulososion alareunassa: `<GeminiUsage usage={searchResponse?.usageMetadata} />`.
