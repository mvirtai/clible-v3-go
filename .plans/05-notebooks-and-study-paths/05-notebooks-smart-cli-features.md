# Suunnitelma 05E: Clible Notebooks — Älykkäät CLI-toiminnot ja integraatiot

Tämä dokumentti ohjaa Clible CLI -komentotulkin älykkäiden lisäominaisuuksien toteuttamista. Ominaisuudet parantavat muistiinpanojen tekemistä ja tutkimustyötä tuomalla peruskyselyiden päälle älykkäitä automaatioita.

---

## 1. Hakutulosten jäädyttäminen (Freeze to Markdown)

Hakutulosten muuntaminen staattiseksi Markdown-tekstiksi antaa käyttäjälle mahdollisuuden muokata ja kommentoida haettuja jakeita suoraan osana muistiinpanojaan.

### Frontend-toteutus

Koodisolun tulosalueelle (`CodeCell` / `NotebookEditor`) lisätään "Convert to Markdown" -pikatoiminto, kun koodisolu on suoritettu ja se sisältää jakeita (tyyppi `read` tai `search`).

#### Markdown-tekstin generointilogiikka

Kun toimintoa klikataan, frontend muodostaa jäsennellyn Markdown-tekstin:

```typescript
interface Verse {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  translationId: string;
}

export function generateMarkdownFromVerses(verses: Verse[]): string {
  if (verses.length === 0) return "";
  
  // Group verses by book, chapter and translation to create a clean title
  const first = verses[0];
  const last = verses[verses.length - 1];
  const translation = first.translationId.toUpperCase();
  
  let reference = `${first.bookName} ${first.chapter}:${first.verse}`;
  if (verses.length > 1) {
    if (first.bookName === last.bookName && first.chapter === last.chapter) {
      reference += `-${last.verse}`;
    } else {
      reference += ` - ${last.bookName} ${last.chapter}:${last.verse}`;
    }
  }
  
  let markdown = `> **${reference} (${translation})**\n>\n`;
  verses.forEach((v) => {
    markdown += `> **${v.verse}** ${v.text}\n`;
  });
  
  return markdown;
}
```

#### Solun lisäysprosessi (UI Integration)

1. Käyttäjä painaa "Convert to Markdown".
2. Frontend tekee pyynnön `POST /api/notebooks/{notebook_id}/cells` uuden solun luomiseksi.
3. Solun parametrit:
   - `cell_type`: `'markdown'`
   - `content`: generoitu Markdown-teksti
   - `position`: nykyisen koodisolun `position + 1`
4. Backend siirtää muiden solujen positioita eteenpäin ja tallentaa uuden solun.
5. Frontend päivittää notebookin solut.

---

## 2. Ristiinviitteiden haku (`/refs <viite>`)

Komento `/refs` auttaa käyttäjää löytämään valittuun jakeeseen liittyviä muita teologisesti merkittäviä jakeita.

### Tietokantarakenne (PostgreSQL & SQLite)

Luodaan uusi migraatiotiedosto `backend/migrations/013_cross_references.sql`, joka tukee ristiinviittausten tallentamista:

```sql
CREATE TABLE IF NOT EXISTS cross_references (
    id TEXT PRIMARY KEY,
    source_book_id TEXT NOT NULL,
    source_chapter INTEGER NOT NULL,
    source_verse INTEGER NOT NULL,
    target_book_id TEXT NOT NULL,
    target_chapter INTEGER NOT NULL,
    target_verse INTEGER NOT NULL,
    confidence REAL DEFAULT 1.0,
    FOREIGN KEY (source_book_id) REFERENCES books(id),
    FOREIGN KEY (target_book_id) REFERENCES books(id),
    UNIQUE (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse)
);

CREATE INDEX IF NOT EXISTS idx_cross_refs_source ON cross_references(source_book_id, source_chapter, source_verse);
```

### Backend-toteutus

#### `CLIService.go` -jäsentimen ja komennon lisäys

Lisätään `/refs`-komento tuettujen komentojen listaan:

```go
// internal/services/cli_service.go

func (s *CLIService) ExecuteCommand(ctx context.Context, cmd *CLICommand, translationID string) (*CLIResult, error) {
 switch cmd.Name {
 case "/refs":
  return s.executeRefsCommand(ctx, cmd, translationID)
 // ... muut komennot ...
 }
 return nil, ErrUnknownCommand
}

func (s *CLIService) executeRefsCommand(ctx context.Context, cmd *CLICommand, translationID string) (*CLIResult, error) {
 if len(cmd.Args) == 0 {
  return nil, errors.New("missing verse reference (e.g. /refs John 3:16)")
 }
 
 refStr := strings.Join(cmd.Args, " ")
 ref, err := parseVerseReference(refStr) // Olemassa oleva viitteen jäsennysfunktio
 if err != nil {
  return nil, err
 }

 // Haetaan ristiinviitteet repositoryn kautta
 refs, err := s.verseRepo.GetCrossReferences(ctx, ref.BookID, ref.Chapter, ref.Verse, translationID)
 if err != nil {
  return nil, err
 }

 return &CLIResult{
  Type: "refs",
  Data: map[string]interface{}{
   "source":     refStr,
   "references": refs,
  },
 }, nil
}
```

---

## 3. Kontekstitietoiset ehdotukset (`/suggest`)

Komento `/suggest` analysoi nykyisen notebookin aiempia muistiinpanoja ja ehdottaa niihin liittyviä teemoja tai jakeita.

### Backend-suunnittelu

Toteutetaan backend-logiikka, joka lukee saman notebookin Markdown-solujen sisällöt, erottelee avainsanat ja tekee niillä haun.

#### Algoritmi (Go-palvelukerros)

1. Haetaan kaikki nykyisen notebookin solut, joiden tyyppi on `markdown` ja sijainti on ennen nykyistä koodisolua.
2. Yhdistetään solujen tekstisisältö yhdeksi tekstiksi.
3. Puhdistetaan teksti (poistetaan erikoismerkit, numerot, muutetaan pieniksi kirjaimiksi).
4. Suodatetaan yleisimmät suomen- ja englanninkieliset stop-sanat (kuten "ja", "se", "on", "the", "and").
5. Lasketaan jäljelle jääneiden sanojen frekvenssit ja valitaan 3–5 yleisintä sanaa avainsanoiksi.
6. Suoritetaan FTS-haku (Full-Text Search) kyseisillä avainsanoilla `verses`-tauluun.
7. Palautetaan 3 parasta hakutulosta, joita ei ole vielä mainittu notebookin muissa soluissa.

#### Koodiesimerkki avainsanojen suodatuksesta

```go
// internal/services/cli_service.go

func extractKeywords(text string) []string {
 stopWords := map[string]bool{
  "ja": true, "se": true, "on": true, "että": bool, "kuin": true, "mutta": true,
  "the": true, "and": true, "that": true, "shall": true, "unto": true, "for": true,
 }

 reg, _ := regexp.Compile("[^a-zA-ZäöÄÖåÅ]+")
 processedString := reg.ReplaceAllString(strings.ToLower(text), " ")
 words := strings.Fields(processedString)

 wordCounts := make(map[string]int)
 for _, w := range words {
  if len(w) > 3 && !stopWords[w] {
   wordCounts[w]++
  }
 }

 // Sort words by frequency
 type wordFreq struct {
  word  string
  count int
 }
 var freqs []wordFreq
 for w, c := range wordCounts {
  freqs = append(freqs, wordFreq{w, c})
 }
 
 sort.Slice(freqs, func(i, j int) bool {
  return freqs[i].count > freqs[j].count
 })

 var keywords []string
 for i := 0; i < len(freqs) && i < 5; i++ {
  keywords = append(keywords, freqs[i].word)
 }
 return keywords
}
```

---

## 4. Testaus ja laadunvarmistus

1. **Yksikkötestit:**
   - Testataan `generateMarkdownFromVerses`-apuohjelma frontendissä erilaisilla jaeryhmillä.
   - Testataan `extractKeywords`-algoritmi backendissä erilaisilla testi-Markdown-syötteillä varmistaen, että stop-sanat suodattuvat oikein.
2. **Integraatiotestit:**
   - Testataan `/refs`- ja `/suggest`-komentojen HTTP-kutsut rajapinnassa `POST /api/notebooks/{id}/cells/{cell_id}/execute`.
   - Varmistetaan ristiinviitteiden oikeellisuus testidatalla (SQLite in-memory testit).
