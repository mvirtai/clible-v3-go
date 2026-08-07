# Kehitysohje: Muistikirjojen CLI-solukohdennus ja `/themes`-komento

Tämä opas ohjaa vaiheittain Muistikirjojen (Notebooks) CLI-komentotulkin laajentamista. Opas sisältää soluviittausten joustavan kohdentamislogiikan (`--ref`, `--dir`, `--n`) sekä uuden `/themes`-komennon toteutuksen backendissä ja frontendissä.

---

## 1. Arkkitehtuuri ja Solukohdennusperiaatteet

Muistikirja koostuu järjestetystä joukosta soluja (`Position`). Kun koodisolussa suoritetaan komento (esim. `/suggest` tai `/themes`), kohdeaineistoksi valitaan tietty määrä ylempänä (`up`/`prev`) tai alempana (`down`/`next`) olevia `markdown`-soluja.

### Tuetut liput ja syntaksi

1. `--ref=up` | `--ref=down` | `--ref=all`: Määrittää suunnan suhteessa nykyiseen soluun.
2. `--dir=up` | `--dir=down`: Suunnan vaihtoehtoinen määrittely.
3. `--n=<val>`: Valittavien solujen määrä sekä joustava pikakoodaus suunnalle:
   - `3n` tai `3d` -> 3 seuraavaa solua alaspäin (`next` / `down`)
   - `2p` tai `2u` -> 2 edeltävää solua ylöspäin (`prev` / `up`)
   - `3` -> 3 solua komennon oletussuuntaan (tai `--dir`/`--ref`-lipun mukaan)
4. `--limit=<n>`: `/themes`-komennossa näytettävien teemojen enimmäismäärä (oletus `10`).

---

## 2. Backend-muutokset (Go)

### Vaihe 2.1: Teemojen uuttaminen `internal/services/cli_service.go`

Lisää `cli_service.go`-tiedostoon tietorakenne `ThemeItem` ja funktio `ExtractThemes`:

```go
// ThemeItem represents a extracted word theme and its occurrence count.
type ThemeItem struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

// ExtractThemes analyzes text, removes stop words and non-letters,
// and returns the top limit most frequent words with their counts.
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

Päivitä `ExecuteCommand`-metodin switch-rakenne:

```go
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

### Vaihe 2.2: Solukohdennuslogiikka `internal/services/notebook_service.go`

Lisää `notebook_service.go`-tiedostoon solukohdennuksen jäsenninfunktio `ResolveCellContext`:

```go
// CellScopeOptions holds resolved direction and cell count limits.
type CellScopeOptions struct {
	Direction string // "up", "down", or "all"
	Count     int    // -1 means unlimited
}

// ParseCellScopeFlags parses --ref, --dir, --n and legacy --scope flags.
func ParseCellScopeFlags(cmd *CLICommand, defaultDir string, defaultCount int) CellScopeOptions {
	dir := defaultDir
	count := defaultCount

	// Check legacy scope flag
	if cmd.Flags["scope"] == "prev" {
		return CellScopeOptions{Direction: "up", Count: 1}
	}

	// Check explicit dir or ref flags
	if d, ok := cmd.Flags["dir"]; ok {
		d = strings.ToLower(d)
		if d == "down" || d == "next" || d == "d" {
			dir = "down"
		} else if d == "up" || d == "prev" || d == "u" {
			dir = "up"
		}
	}
	if r, ok := cmd.Flags["ref"]; ok {
		r = strings.ToLower(r)
		if r == "down" || r == "next" {
			dir = "down"
		} else if r == "up" || r == "prev" {
			dir = "up"
		} else if r == "all" {
			dir = "all"
		}
	}

	// Check --n flag with optional shorthand (e.g. 3n, 2p, 5)
	if nVal, ok := cmd.Flags["n"]; ok {
		nVal = strings.ToLower(strings.TrimSpace(nVal))
		re := regexp.MustCompile(`^(\d+)([a-z])?$`)
		matches := re.FindStringSubmatch(nVal)
		if len(matches) >= 2 {
			if parsedCount, err := strconv.Atoi(matches[1]); err == nil && parsedCount > 0 {
				count = parsedCount
			}
			if len(matches) == 3 && matches[2] != "" {
				suffix := matches[2]
				if suffix == "n" || suffix == "d" {
					dir = "down"
				} else if suffix == "p" || suffix == "u" {
					dir = "up"
				}
			}
		}
	}

	return CellScopeOptions{Direction: dir, Count: count}
}

// ResolveCellContext collects text from markdown cells based on CLI command flags.
func ResolveCellContext(cells []models.Cell, targetCellID string, cmd *CLICommand) string {
	targetIdx := -1
	for i, c := range cells {
		if c.ID == targetCellID {
			targetIdx = i
			break
		}
	}
	if targetIdx == -1 {
		return ""
	}

	defaultDir := "up"
	defaultCount := -1
	if cmd.Name == "/themes" {
		defaultDir = "down"
		defaultCount = 1
	}

	scopeOpts := ParseCellScopeFlags(cmd, defaultDir, defaultCount)

	var selectedTexts []string

	if scopeOpts.Direction == "all" {
		for i, c := range cells {
			if i != targetIdx && c.Type == models.CellTypeMarkdown && strings.TrimSpace(c.Content) != "" {
				selectedTexts = append(selectedTexts, c.Content)
			}
		}
	} else if scopeOpts.Direction == "up" {
		var upCells []string
		for i := targetIdx - 1; i >= 0; i-- {
			c := cells[i]
			if c.Type == models.CellTypeMarkdown && strings.TrimSpace(c.Content) != "" {
				upCells = append(upCells, c.Content)
				if scopeOpts.Count > 0 && len(upCells) >= scopeOpts.Count {
					break
				}
			}
		}
		// Preserve top-to-bottom reading order
		for i := len(upCells) - 1; i >= 0; i-- {
			selectedTexts = append(selectedTexts, upCells[i])
		}
	} else if scopeOpts.Direction == "down" {
		for i := targetIdx + 1; i < len(cells); i++ {
			c := cells[i]
			if c.Type == models.CellTypeMarkdown && strings.TrimSpace(c.Content) != "" {
				selectedTexts = append(selectedTexts, c.Content)
				if scopeOpts.Count > 0 && len(selectedTexts) >= scopeOpts.Count {
					break
				}
			}
		}
	}

	return strings.Join(selectedTexts, "\n\n")
}
```

Päivitä `ExecuteCellCommand`-metodi käyttämään uutta jäsennintä:

```go
	// 4. Collect context text for commands like /suggest and /themes
	var contextText string
	if cmd.Name == "/suggest" || cmd.Name == "/themes" {
		contextText = ResolveCellContext(notebook.Cells, cellID, cmd)
	}

	// 5. Execute command via CLI service
	result, err := s.cliService.ExecuteCommand(ctx, cmd, targetCell.TranslationID, contextText)
```

---

## 3. Frontend-muutokset (React & TypeScript)

### Vaihe 3.1: Paivita `frontend/src/utils/markdown.ts`

Lisää tuki tyypille `'themes'` `formatResultToMarkdown`-funktioon:

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

### Vaihe 3.2: Paivita `frontend/src/components/notebook/CodeCell.tsx`

1. Lisää `ThemesResult`-rajapinta:

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

1. Päivitä `hasFreezeOption`:

```typescript
  const hasFreezeOption = cell.resultJson && 
    ['read', 'search', 'refs', 'suggest', 'themes'].includes(cell.resultJson.type);
```

1. Lisää `/themes`-tuloksen visualisointi JSX-tason renderöintiin:

```tsx
  {/* 5. /themes tulos */}
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

## 4. Testaus ja Varmistus

1. **Yksikkötestit**:
   Aja backend-testit komennolla:
   `go test -v ./internal/services/...`

2. **Manuaalinen testaus**:
   - `/suggest --ref=down`
   - `/suggest --n=3p`
   - `/themes --n=3n --limit=10`
   - Testaa solun jäädyttäminen markdown-soluksi (`Freeze to Markdown`).
