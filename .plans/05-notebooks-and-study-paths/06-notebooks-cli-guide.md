# Opetuksellinen opas: Clible CLI & Älykkäät toiminnot

Tämä dokumentti toimii oppaana ja arkkitehtonisena selityksenä Clible Notebooks -komentotulkin ja siihen liittyvien älykkäiden toimintojen toteuttamiseen. Opas auttaa ymmärtämään, miksi tietyt ratkaisut on valittu ja mitkä tiedostot vastaavat kustakin toiminnallisuudesta.

---

## 1. Miksi kevyt, räätälöity jäsennin? (Cobra vs. Custom)

Perinteisissä CLI-sovelluksissa käytetään usein kirjastoja kuten `spf13/cobra`. Cliblen komentotulkki ei kuitenkaan ajaudu suoraan päätelaitteessa (terminal), vaan se toimii osana stateless REST API -palvelua.

* **Verkkoystävällisyys:** Jokainen suoritus on yksittäinen HTTP-pyyntö (`POST /api/notebooks/{id}/cells/{cell_id}/execute`).
* **Suorituskyky:** Emme tarvitse interaktiivista komentohistorian hallintaa tai monimutkaisia alikomentoja. Tarvitsemme vain merkkijonon osituksen (tokenization) argumentteihin ja lippuihin (flags).
* **Turvallisuus:** Yksinkertainen, itse hallittu jäsennin estää komentojen injektointiriskit ja pitää muistinvarauksen O(1)-luokassa.

### Jäsennyksen toteutusmalli

Tämä logiikka kirjoitetaan uuteen backend-tiedostoon [backend/internal/services/cli_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/cli_service.go):

```go
package services

import (
 "strings"
)

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

 parts := strings.Fields(input) // Splits by any whitespace, handling multiple spaces nicely
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
   value := "true" // Default for boolean flags (e.g. --regex)
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
```

---

## 2. Dynaaminen ristiinviittaus (PostgreSQL Full-Text Search)

Ristiinviittausten toteuttamiseen valittiin dynaaminen, tekstiin perustuva haku (FTS). Tämä säästää tietokannan levytilaa ja välttää monimutkaisten ristiinviitetaulujen ylläpidon ja migraation.

PostgreSQL sisältää tehokkaan sisäänrakennetun tekstihakujärjestelmän (`tsvector` ja `tsquery`).

### Miten se toimii tietokantatasolla?

Kun haemme ristiinviitteitä jakeelle (esim. *John 3:16*):

1. Haemme lähdejakeen tekstin.
2. Suodatamme siitä pois yleiset sanat (stop-words).
3. Luomme jäljelle jääneistä sanoista hakulausekkeen (tsquery) käyttäen `OR` tai `AND` -konjunktioita.
4. Haemme parhaiten täsmäävät jakeet `ts_rank`-funktion avulla.

### Repository-kerroksen kyselymalli

Tämä kyselymetodi lisätään olemassa olevaan tiedostoon [backend/internal/db/verse_repo.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/verse_repo.go):

```go
package db

import (
 "context"
 "database/sql"
 "strings"
 
 "clible/internal/models"
)

// SearchByKeywords queries the database using PostgreSQL full-text search.
// It ranks the verses based on keyword frequency.
func (r *VerseRepository) SearchByKeywords(ctx context.Context, keywords []string, translationID string, limit int) ([]models.Verse, error) {
 if len(keywords) == 0 {
  return nil, nil
 }

 // Build a tsquery string, e.g. "love | world | son"
 // We use the OR operator (|) to find verses matching any of the main keywords.
 queryTerms := make([]string, len(keywords))
 for i, kw := range keywords {
  queryTerms[i] = kw + ":*" // Prefix matching (e.g. "lov" matches "love", "loved")
 }
 tsQuery := strings.Join(queryTerms, " | ")

 query := `
  SELECT id, translation_id, book_id, chapter, verse, text
  FROM verses
  WHERE translation_id = $1
    AND to_tsvector('english', text) @@ to_tsquery('english', $2)
  ORDER BY ts_rank(to_tsvector('english', text), to_tsquery('english', $2)) DESC
  LIMIT $3;
 `

 rows, err := r.db.QueryContext(ctx, query, translationID, tsQuery, limit)
 if err != nil {
  return nil, err
 }
 defer func() { _ = rows.Close() }()

 var results []models.Verse
 for rows.Next() {
  var v models.Verse
  if err := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text); err != nil {
   return nil, err
  }
  results = append(results, v)
 }

 return results, nil
}
```

---

## 3. Kontekstitietoinen `/suggest` ja Stop-words -suodatus

Komento `/suggest` vaatii notebookin aiemman tekstin analysointia. Jotta emme ehdota jakeita sanojen "ja", "hän" tai "se" perusteella, meidän on toteutettava stop-words -suodatus.

### Avainsanojen poiminta-algoritmi

Tämä apufunktio lisätään tiedostoon [backend/internal/services/cli_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/cli_service.go):

```go
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
```

---

## 4. REST-rajapinnan käsittelijä (API Handler) ja palvelukerros (Service Layer)

Koodisolun suorittamiseksi rajapintaan lisätään reitti `POST /api/notebooks/{id}/cells/{cell_id}/execute`. Kerrosarkkitehtuurin mukaisesti handleri ottaa vastaan pyynnön ja välittää sen eteenpäin `NotebookService`lle, joka vastaa varsinaisesta liiketoimintalogiikasta.

### API-handlerin toteutus

Tämä koodi lisätään tiedostoon [backend/internal/api/notebook_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/notebook_handler.go):

```go
// ExecuteCommand handles POST /api/notebooks/{id}/cells/{cell_id}/execute
// It executes a slash command within a specific notebook cell.
func (h *NotebookHandler) ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	notebookID := r.PathValue("id")
	cellID := r.PathValue("cell_id")
	if notebookID == "" || cellID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing notebook_id or cell_id"})
		return
	}

	// Read optional translation flag from query parameters (e.g. ?translation=biblia)
	translationID := r.URL.Query().Get("translation")
	if translationID == "" {
		translationID = "KJV" // Default fallback translation
	}

	// Delegate orchestration to the service layer (O(1) network pass-through rule)
	result, err := h.notebookService.ExecuteCellCommand(r.Context(), notebookID, cellID, userID, translationID)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(result)
}
```

### Palvelukerroksen (Service Layer) laajentaminen

Jotta API-handlerin kutsu toimii, lisätään tiedostoon [backend/internal/services/notebook_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/notebook_service.go) uusi metodi, joka yhdistää komentojen jäsentämisen ja solujen hallinnan.

*Huom: Varmista, että `NotebookService` saa alustuksessa tai metoditasolla viitteen `CLIService`en.*

```go
// ExecuteCellCommand retrieves the cell, parses the CLI slash command, executes it, 
// saves the result in cell.ResultJSON, and returns the structured CLIResult.
func (s *NotebookService) ExecuteCellCommand(ctx context.Context, notebookID, cellID, userID, translationID string) (*models.CLIResult, error) {
	// 1. Verify notebook ownership and retrieve cells
	notebook, err := s.repo.GetByID(ctx, notebookID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve notebook: %w", err)
	}
	if notebook == nil {
		return nil, errors.New("notebook not found")
	}
	if notebook.UserID != userID {
		return nil, errors.New("access denied")
	}

	// 2. Find the target cell
	var targetCell *models.Cell
	for i := range notebook.Cells {
		if notebook.Cells[i].ID == cellID {
			targetCell = &notebook.Cells[i]
			break
		}
	}
	if targetCell == nil {
		return nil, errors.New("cell not found in this notebook")
	}
	if targetCell.Type != models.CellTypeCode {
		return nil, errors.New("cannot execute non-code cells")
	}

	// 3. Parse command using custom ParseCLICommand
	cmd := ParseCLICommand(targetCell.Content)
	if cmd == nil {
		return nil, errors.New("invalid CLI command format (must start with '/')")
	}

	// 4. Execute parsed command using CLIService
	// Inject or call CLIService directly
	cliResult, err := s.cliService.ExecuteCommand(ctx, cmd, translationID)
	if err != nil {
		return nil, fmt.Errorf("execution error: %w", err)
	}

	// 5. Serialize result to JSON and save back to the repository
	resultBytes, err := json.Marshal(cliResult)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal result: %w", err)
	}
	
	targetCell.ResultJSON = string(resultBytes)
	err = s.repo.UpdateCellResult(ctx, cellID, targetCell.ResultJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to save execution result: %w", err)
	}

	return cliResult, nil
}
```

---

## 5. Frontend-integraatio: "Freeze to Markdown"

Kun käyttäjä haluaa "jäädyttää" koodisolun tuloksen, frontend luo uuden Markdown-solun ja asettaa sen nykyisen solun alapuolelle.

### Miten positiointi (Position) toimii tietokannassa?

Tietomalli määrittää, että solut on järjestetty `position`-sarakkeen mukaan (kokonaisluku). Kun uusi solu lisätään väliin:

1. Kaikkien niiden solujen, joiden `position > nykyinen_asema`, arvoa kasvatetaan yhdellä (`position = position + 1`).
2. Uusi solu lisätään arvolla `position = nykyinen_asema + 1`.
3. Tämä pidetään transaktion sisällä backendin palvelukerroksessa tiedostossa [backend/internal/services/notebook_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/notebook_service.go).

### Markdown-generaattori (TypeScript)

Luodaan uusi apufunktiotiedosto osoitteeseen [frontend/src/utils/markdown.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/utils/markdown.ts):

```typescript
interface CLIResultData {
  source: string;
  references?: Array<{ bookName: string; chapter: number; verse: number; text: string }>;
  verses?: Array<{ bookName: string; chapter: number; verse: number; text: string }>;
}

export function formatResultToMarkdown(type: string, data: CLIResultData, translation: string): string {
  let markdown = "";
  
  if (type === "read" && data.verses) {
    const first = data.verses[0];
    const last = data.verses[data.verses.length - 1];
    const ref = first.bookName === last.bookName && first.chapter === last.chapter
      ? `${first.bookName} ${first.chapter}:${first.verse}-${last.verse}`
      : `${first.bookName} ${first.chapter}:${first.verse} - ${last.bookName} ${last.chapter}:${last.verse}`;
      
    markdown = `> **${ref} (${translation.toUpperCase()})**\n>\n`;
    data.verses.forEach(v => {
      markdown += `> **${v.verse}** ${v.text}\n`;
    });
  } 
  
  else if (type === "refs" && data.references) {
    markdown = `### Cross-references for ${data.source}\n\n`;
    data.references.forEach(v => {
      markdown += `*   **${v.bookName} ${v.chapter}:${v.verse}** — *"${v.text}"*\n`;
    });
  }
  
  return markdown;
}
```

### Käyttöliittymäkytkentä (React)

Toimintopainike ja sen logiikka sijoitetaan koodisolun renderöijään tiedostossa [frontend/src/components/notebook/NotebookEditor.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/NotebookEditor.tsx) (tai erilliseen `CodeCell` -komponenttiin, jos sellainen luodaan).
