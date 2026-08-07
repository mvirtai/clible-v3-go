# Yksityiskohtainen Toteutusohje: Solukohdennusmoottori (Cell Scoping Engine)

Tämä oppaan osio kuvaa tarkasti backendin solukohdennusmoottorin toteutuksen `backend/internal/services/notebook_service.go`-tiedostossa.

---

## 1. Periaate ja Luokat

Solukohdennusmoottori vastaa komennon lippujen jäsentämisestä (`--ref`, `--dir`, `--n`, `--scope`) ja oikeiden `markdown`-solujen valitsemisesta muistikirjan solulistasta (`cells []models.Cell`).

### `CellScopeOptions`-rakenne

```go
// CellScopeOptions määrittelee solujen hakuun käytettävät parametrit.
type CellScopeOptions struct {
	Direction string // "up", "down", tai "all"
	Count     int    // -1 tarkoittaa rajoittamatonta määrää
}
```

---

## 2. Lippujen Jäsennys `ParseCellScopeFlags`

Funktio jäsentää CLICommand-rakenteesta löytyvät liput ja palauttaa resolvoidun `CellScopeOptions`-olion.

```go
// ParseCellScopeFlags jäsentää liput --ref, --dir, --n ja vanhan --scope.
func ParseCellScopeFlags(cmd *CLICommand, defaultDir string, defaultCount int) CellScopeOptions {
	dir := defaultDir
	count := defaultCount

	// 1. Taaksepäin yhteensopivuus: --scope=prev
	if cmd.Flags["scope"] == "prev" {
		return CellScopeOptions{Direction: "up", Count: 1}
	}

	// 2. Eksplisiittinen dir- tai ref-lippu
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

	// 3. Joustava --n lippu (esim. 3n, 2p, 3d, 2u, 5)
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
```

---

## 3. Tekstikontekstin Kokoaminen `ResolveCellContext`

Metodi etsii kohdesolun indeksin, suodattaa markdown-solut halutussa suunnassa ja yhdistää tekstit tyhjin rivinvaihdoin.

```go
// ResolveCellContext kokoaa markdown-solujen tekstit komennon lippujen mukaisesti.
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
		// Säilytetään lukujärjestys ylhäältä alas
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

---

## 4. Integraatio `ExecuteCellCommand`-metodiin

Päivitetään `backend/internal/services/notebook_service.go`-tiedostossa sijaitsevan `ExecuteCellCommand`-metodin vaihe 4:

```go
	// 4. Kerätään aineistokonteksti komennolle /suggest ja /themes solukohdennusmoottorilla
	var contextText string
	if cmd.Name == "/suggest" || cmd.Name == "/themes" {
		contextText = ResolveCellContext(notebook.Cells, cellID, cmd)
	}

	// 5. Suoritetaan komento CLI-palvelussa
	cliResult, err := s.cliService.ExecuteCommand(ctx, cmd, translationID, contextText)
```

---

## 5. Yksikkötestaus

Lisätty kattavat yksikkötestit `backend/internal/services/notebook_service_test.go`-tiedostoon:

- `TestParseCellScopeFlags`:
  - Taaksepäin yhteensopivuus (`--scope=prev`)
  - Eksplisiittiset suunnat ja aliasnimitykset (`--dir=down`, `next`, `prev`)
  - Koko muistikirjan ref-lippu (`--ref=all`)
  - Joustavat `--n` sufiksit (`2p`, `4d`, `3n`)
- `TestResolveCellContext`:
  - `/suggest`-komennon oletus (kaikki edeltävät markdown-solut järjestyksessä)
  - Raami- ja suodatusrajaukset (`--n=1`, `--n=2d`)
  - `/themes`-komennon oletus (seuraava markdown-solu alaspäin)
  - `ref=all` kaikkien markdown-solujen keräämiseksi
  - Virhetilanne: ei löydy kohdesolua (palauttaa tyhjän merkkijonon)
