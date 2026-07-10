# Kolme kriittistä korjausta: Referenssit, Tekstihaku & UI-ulkoasu

Kolme erillistä, mutta yhteiseen PR:ään sopivaa korjausta. Selitetään jokainen bugi juurisyyltään.

---

## Analyysi: Missä ongelmat ovat?

### Bugi 1 – Read by Reference: Kirjan nimi ei normalisoidu

**Juurisyy (backend + frontend -raja):**

`reference_parser.go` parsii referenssin ja palauttaa `bookName`-kentässä käyttäjän
syöttämän tekstin sellaisenaan (esim. `"jhn"`, `"john"`, `"Johannes"`, `"Joh."`).

`verse_repo.go` kutsuu `GetByReference(ctx, translationID, bookID, ...)` — `bookID`-parametri
menee suoraan SQL `WHERE book_id = ?` -lausekkeeseen. `book_id`-sarake kannassa on aina
kanonisessa muodossa: `JHN`, `MAT`, `REV` jne.

**`book_names.json` on olemassa frontendissä**, mutta sitä ei hyödynnetä syötteen validoinnissa
ennen API-kutsua. Käyttäjän syöte pitää normalisoida kanoniseen kirja-ID:hen **ennen**
kuin `getVerses()`-kutsu lähtee.

**Korjaus:**

Lisätään `bookNames.ts`:ään uusi funktio `resolveBookId(input: string): string | null`
joka rakentaa hakulistan kaikista tunnistetuista muodoista (kanoninen id, en-nimi, fi-nimi,
kaikki aliases_fi, abbr_fi) ja tekee case-insensitiven ja pisteiden/välilyöntien suhteen
tolerantin hakualgoritmin. `VerseReader.tsx` normalisoi syötteen tällä funktiolla,
korvaa `bookName`-osan viestissä kanonisella ID:llä, ja lähettää korjatun referenssin backendille.

---

### Bugi 2 – Text Search ei löydä tavallisia sanoja

**Juurisyy (backend):**

`api.ts`:ssa rivillä 38 lähetetään aina `&regex=false` tai `&regex=true`.

`bible_handler.go` rivillä 95:
```go
regex := r.URL.Query().Get("regex")
```

Tämä asettaa `regex`-muuttujan merkkijonoksi `"false"` tai `"true"`.

`verse_service.go` rivillä 88:
```go
params := db.SearchParams{
    FTSQuery:     ftsQuery,
    RegexPattern: regexPattern,  // ← asetetaan "false"-merkkijonolla!
}
```

`verse_repo.go` rivillä 99-104:
```go
if params.RegexPattern != "" {
    regex, err = regexp.Compile(params.RegexPattern)
    // regexp.Compile("false") onnistuu!
}
```

Go:n `regexp.Compile("false")` onnistuu (se on validi regex joka matchaa merkkijonon "false").
Sitten jokaisesta FTS5-tuloksesta filtteröidään ne, joissa teksti **ei sisällä sanaa "false"**.
Koska lähes yhtään jaetta ei sisällä sanaa "false", kaikki tulokset poistetaan.

Regex-tilassa (`"true"`) muuttujaan `FTSQuery` tulee `"light"` joka on myös validi regex,
joten FTS5 MATCH `"light"` toimii ja regex-filtteri `regexp.Compile("light")` matchaa
oikein sanojen "light" sisältävät jakeet. Tämä selittää sen mystisen eron.

**Korjaus (backend):**

`bible_handler.go`:ssa tulkitaan `regex`-parametri booleaniksi:

```go
useRegex := r.URL.Query().Get("regex") == "true"
```

ja välitetään se `SearchVerses`-kutsuun oikeana boolean-arvona. `verse_service.go` ottaa
boolean-parametrin ja asettaa `SearchParams.RegexPattern` vain silloin kun `useRegex == true`.

---

### Ongelma 3 – UI-ulkoasu ei vastaa Clible-v2:ta

**Havainto:**

v3-frontend käyttää purppura-pohjaista (`purple-600`) modernia glassmorphism-designia.
v2-frontendissä on täysin erilainen estetiikka:
- Pääväri `#D4A373` (kultainen/ruskea, "accent")
- Neutraali, minimalistinen background `#fdfcfb` (lähes valkoinen)
- Dark mode: syvä musta `#0f1113` / `#15181b` (ei sininen)
- `font-serif` jakeille, leveä typografia
- Kortit käyttävät `surface-2`/`border-soft` -värimuuttujia
- Pyöristetyt elementit ovat 3xl/full (ei squared)
- Header: pienemmät, hienostuneemmat napit ilman background-fill-hoversia

**Muutos:**

Uudelleenkirjoitetaan v3-frontendin CSS-design-system `index.css`:ssä v2:n
väripalettia ja tyylikieltä vastaavaksi. Päivitetään komponentit
(`App.tsx`, `VerseReader.tsx`, `VerseSearch.tsx`, `SearchHistory.tsx`,
`TranslationSelector.tsx`, `TranslationManager.tsx`) käyttämään CSS-muuttujia
ja v2:n tyylikieltä.

---

## User Review Required

> [!IMPORTANT]
> **Ulkoasu-muutos on laajin.** Kaikki komponentit saavat uuden tyylikielen.
> Kysymys: haluatko dark-mooden toteutettavan `prefers-color-scheme` -mediakyselyllä
> (automaattinen) vai manuaalisella vaihtonapilla (kuten v2)?
> Tässä suunnitelmassa toteutetaan **automaattinen media query**, koska v3:ssa ei ole
> SettingsPaneelia.

> [!WARNING]
> Bugi 1:n (referenssikorjaus) osalta: `resolveBookId` rakennetaan pelkästään frontendiin.
> Backend ei muutu. Tämä tarkoittaa että `/api/verses?ref=JHN+3:16` vaatii
> edelleen kanonisen kirja-ID:n — frontend tekee muunnoksen.

---

## Proposed Changes

### Bug 1 & Bug 2: Normalisointi + Regex-korjaus

---

#### [MODIFY] [bookNames.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/utils/bookNames.ts)

Lisätään `resolveBookId(raw: string): string | null` -funktio joka:

1. Normalisoi syötteen: lowercase, poistaa pisteet, normalisoi välilyönnit
2. Rakentaa hakuindeksin kaikista kirjan nimistä:
   - Kanoninen ID (`JHN` → vertaillaan case-insensitively)
   - `en`-nimi (`john`)
   - `fi`-nimi (`evankeliumi johanneksen mukaan`)
   - `aliases_fi`-kaikki alkiot
   - `abbr_fi` (`joh`)
3. Palauttaa kanonisen ID:n (esim. `"JHN"`) tai `null`

---

#### [MODIFY] [VerseReader.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/VerseReader.tsx)

Normalisoidaan käyttäjän referenssi ennen API-kutsua:

1. Parsitaan `bookPart` referenssistä (kaikki ennen numeroa)
2. Kutsutaan `resolveBookId(bookPart)`
3. Jos tunnistetussa muodossa → korvataan `bookPart` kanonisella ID:llä
4. Jos ei tunnisteta → annetaan referenssin mennä läpi (backend palauttaa virheen)

---

#### [MODIFY] [bible_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/bible_handler.go)

`SearchVerses`-handler:
```go
// Ennen:
regex := r.URL.Query().Get("regex")

// Jälkeen:
useRegex := r.URL.Query().Get("regex") == "true"
```

Ja `SearchVerses`-kutsuun välitetään `useRegex bool` eikä merkkijono.

---

#### [MODIFY] [verse_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/verse_service.go)

`SearchVerses(ctx, ftsQuery, useRegex bool, translationID)`:

```go
params := db.SearchParams{
    FTSQuery:      ftsQuery,
    TranslationID: translationID,
}
if useRegex {
    params.RegexPattern = ftsQuery
    params.FTSQuery = ""   // regex-tilassa ei FTS5-hakua
}
```

> [!NOTE]
> Odota: regex-tilassa onko tarkoitus tehdä FTS5-haku vai pelkkä regex? v2:ssä regex-tilassa
> haetaan kaikki jakeet ja filtteröidään regexillä. Tämä on hidas mutta tarkka. Nykyinen
> arkkitehtuuri tekee molemmat, mutta hankala. Ehdotan: **regex-tilassa** käytetään
> vain `LIKE '%pattern%'` tai koko taulujen skannausta Go-puolella,
> **fts-tilassa** käytetään FTS5 MATCH. Tämä on selkein jako.

Uudistettu `SearchParams`:
- `FTSQuery != ""` → FTS5 MATCH
- `RegexPattern != ""` → täysi tauluskannaus + Go regexp

---

#### [MODIFY] [verse_repo.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/verse_repo.go)

Muutetaan `Search()` käsittelemään kaksi erillistä haaraa:

```go
if params.FTSQuery != "" {
    // FTS5 MATCH-haku (nopea, koko sanaa)
    query = `SELECT ... FROM verses v JOIN verses_fts ON ... WHERE verses_fts MATCH ?`
} else if params.RegexPattern != "" {
    // Täysi tauluskannaus + Go regexp (tarkka)
    query = `SELECT ... FROM verses WHERE translation_id = ?`
}
```

---

### Bug 3: UI-ulkoasu Clible-v2:n mukaiseksi

---

#### [MODIFY] [index.css](file:///home/vivaldev/code/clible-v3-go/frontend/src/index.css)

Korvataan purppura-pohjaiset CSS-muuttujat v2:n neutraaleilla arvoilla:
- Accent: `#d4a373` (kultainen) / dark: `#e0b47f`
- Background: `#fdfcfb` / dark: `#0f1113`
- Surface: `#ffffff` / dark: `#15181b`
- Text: `#1a1a1a` / dark: `#f3f4f6`
- Border: `#e5e5e5` / dark: `rgba(255,255,255,0.12)`

---

#### [MODIFY] App.tsx, VerseReader.tsx, VerseSearch.tsx, SearchHistory.tsx, TranslationSelector.tsx, TranslationManager.tsx

Korvataan Tailwind `purple-*` / `slate-*` -luokat CSS-muuttujia käyttäviksi.
Typografia: jakeet fonttiluokkaan `font-serif`, otsikot `font-medium`.

---

## Verification Plan

### Automated Tests

```bash
cd backend && go test ./...
cd frontend && npm test
```

### Manual Verification

1. **Referenssi:** Kokeillaan `jhn 3:16`, `john 3:16`, `joh. 3:16`, `johannes 3:16`
   — kaikkien pitäisi hakea samat jakeet
2. **Tekstihaku:** Haetaan `"light"` ilman regex → tuloksia pitää tulla;
   `"light"` regexillä → samat tai enemmän tuloksia
3. **Ulkoasu:** Visuaalinen tarkistus — kultainen accent, minimalistinen typografia
