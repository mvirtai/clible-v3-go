# Yksityiskohtainen Toteutusohje: `/suggest`- ja `/themes`-komennot

Tämä opas sisältää yksityiskohtaiset ohjeet `/suggest`-komennon laajentamiseen sekä täysin uuden `/themes`-komennon toteuttamiseen backendissä ja frontendissä.

---

## 1. Backend: `/themes`-komennon Logiikka (`cli_service.go`)

### 1.1 `ThemeItem`-tietorakenne ja `ExtractThemes`-funktio

Tiedostossa `backend/internal/services/cli_service.go`:

```go
// ThemeItem edustaa uutettua teemasanaa ja sen esiintymiskertojen määrää.
type ThemeItem struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

// ExtractThemes analysoi tekstin, poistaa täytesanat ja palauttaa yleisimmät sanat taajuuksineen.
func ExtractThemes(text string, limit int) []ThemeItem {
	if limit <= 0 {
		limit = 10
	}

	reg, _ := regexp.Compile(`[^a-zA-ZäöÄÖåÅ\s]+`)
	cleaned := reg.ReplaceAllString(strings.ToLower(text), " ")

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
```

### 1.2 `executeThemesCommand`-metodi

```go
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
```

---

## 2. Frontend: UI-renderöinti (`CodeCell.tsx`)

### 2.1 `ThemesResult`-rajapinta ja `hasFreezeOption`

Tiedostossa `frontend/src/components/notebook/CodeCell.tsx`:

```typescript
interface ThemeItem {
  word: string;
  count: number;
}

interface ThemesResult {
  themes: ThemeItem[];
  limit: number;
  count: number;
}
```

Päivitetään `hasFreezeOption`:

```typescript
  const hasFreezeOption = cell.resultJson && 
    ['read', 'search', 'refs', 'suggest', 'themes'].includes(cell.resultJson.type);
```

### 2.2 Avainteemojen visualisointi JSX-trolla

```tsx
  {/* /themes tulos */}
  {result.type === 'themes' && (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-neutral-400 font-mono border-b border-neutral-800 pb-2">
        <span>Tunnistetut avainteemat</span>
        <span>{(result.data as ThemesResult).count || 0} teemaa</span>
      </div>
      
      {((result.data as ThemesResult).themes || []).length === 0 ? (
        <p className="text-neutral-500 text-sm italic">Ei tunnistettuja teemoja valituista soluista.</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {((result.data as ThemesResult).themes || []).map((t, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all hover:border-amber-500/60"
            >
              <span>{t.word}</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.2 rounded-full font-mono font-bold">
                {t.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
```

---

## 3. Frontend: Markdown-vienti (`frontend/src/utils/markdown.ts`)

Lisää `formatResultToMarkdown`-funktioon tuki tyypille `'themes'`:

```typescript
  if (type === 'themes') {
    const themes = (data as any).themes as Array<{ word: string; count: number }> || [];
    if (themes.length === 0) return '_Ei tunnistettuja teemoja._';
    
    let md = `### Tunnistetut teemat\n\n`;
    themes.forEach((t) => {
      md += `- **${t.word}** (${t.count})\n`;
    });
    return md;
  }
```

---

## 4. Manuaalinen Testausohje

Suorita muistikirjan koodisoluissa seuraavat komennot:

1. `/suggest --ref=down`
2. `/suggest --n=3p`
3. `/themes --n=3n --limit=10`
4. `/themes --n=2p --limit=5`
5. Paina jäädytyspainiketta ("Freeze to Markdown") ja varmista, että osio muuntuu markdown-listaksi siististi.
