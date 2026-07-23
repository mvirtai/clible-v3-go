# Suunnitelma 06A: Lukunäkymän (Reader) parannukset

Tämä dokumentti kuvaa yksityiskohtaisesti Vaihe A:n toteutuksen: kontekstinavigaation, lukumerkit, jaekohtaiset merkinnät ja lukemisen etenemisen seurannan. Suunnitelma on kirjoitettu Clible-v3-go:n olemassa olevaa kerrosarkkitehtuuria (Repository → Service → API → Frontend) noudattaen.

---

## Lähtökohta: nykytila

- Lukunäkymä on komponentissa `frontend/src/components/VerseReader.tsx`. Se hakee jakeita `apiService.getVerses(reference, translation)`-kutsulla, joka kutsuu backendin `GET /api/verses?ref=&translation=` -rajapintaa.
- `VerseService.GetVerses` (`backend/internal/services/verse_service.go`) tulkitsee viittauksen (`parser.ParseReference`) ja hakee joko yksittäisen jakeen, kokonaisen luvun (`ScopeChapter`) tai kokonaisen kirjan (`ScopeBook`).
- `models.Book` (`backend/internal/models/types.go`) sisältää jo kentän `Chapters int`, joten kirjan lukumäärä on valmiiksi saatavilla — tätä käytetään kontekstinavigaatiossa suoraan, ei tarvita uutta migraatiota tälle osalle.
- Jae-data (`models.Verse`) ei sisällä tietoa siitä, monesko jae on luvun viimeinen. Tämä pitää joko päätellä frontendissä (jakeiden lukumäärästä) tai lisätä kevyt backend-tuki (`GetChapterCount`).
- Reader ei tällä hetkellä tiedä, mikä on "seuraava" tai "edellinen" luku/kirja — tämä pääteltävä `book_id` + `chapter`-parista käyttäen kirjaluetteloa (`GET /api/books`).
- `App.tsx` välittää `VerseReader`-komponentille propsit `translation`, `activeReference`, `activeScopeId`, `onWorkspaceUpdated`, `loadedSavedInsight`, `loadedSavedDeepDive`. Uudet ominaisuudet integroidaan samaan propsi-rajapintaan tarvittavin lisäyksin.

---

## Osa 1: Kontekstinavigaatio (edellinen/seuraava luku ja kirja)

### Tavoite
Käyttäjä voi siirtyä lukunäkymässä suoraan seuraavaan tai edelliseen lukuun/kirjaan avaamatta hakukenttää.

### Toteutus — Frontend (ei vaadi uutta backend-rajapintaa)

Koska `GET /api/books` palauttaa jo kaikki kirjat `position`- ja `chapters`-kenttineen, kontekstinavigaatio voidaan toteuttaa kokonaan frontendissä:

1. **Uusi apuohjelma `frontend/src/utils/readerNavigation.ts`**
   - `getNextChapterRef(books, currentBookId, currentChapter): string | null`
     - Jos `currentChapter < book.chapters` → palauttaa `{bookId} {currentChapter + 1}`
     - Jos viimeinen luku → siirtyy seuraavaan kirjaan `position + 1`, luku 1
     - Jos viimeinen kirja viimeisellä luvulla → palauttaa `null`
   - `getPreviousChapterRef(books, currentBookId, currentChapter): string | null`
     - Symmetrinen logiikka taaksepäin; edellisen kirjan viimeinen luku selviää sen `chapters`-kentästä
   - `getNextBookRef` / `getPreviousBookRef` — suoraviivainen `position`-pohjainen haku

2. **Uusi hook `frontend/src/hooks/useReaderNavigation.ts`**
   - Lataa kirjaluettelon kerran (`apiService.getBooks()`, jos ei jo saatavilla kontekstissa — tarkistettava, onko olemassa jaettu `BooksContext`; jos ei, kirjat voidaan hakea täällä ja välimuistittaa `useRef`/`useState`-tasolla)
   - Palauttaa `{ nextChapterRef, prevChapterRef, nextBookRef, prevBookRef, currentBook, currentChapter }` annetulle `reference`-merkkijonolle
   - Tulkitsee nykyisen viittauksen `parseReferenceForDisplay`-tyyppisellä logiikalla (samaa periaatetta kuin `bookNames.ts`:ssä käytetään)

3. **`VerseReader.tsx`-muutokset**
   - Otsikkorivin (data && ...) yhteyteen lisätään navigaatiorivi:
     - Vasemmalla: "‹ Edellinen luku" -painike (piilotettu/disabloitu, jos `prevChapterRef` on `null`)
     - Oikealla: "Seuraava luku ›" -painike
     - Painikkeiden klikkaus kutsuu olemassa olevaa `fetchVerses(ref)`-funktiota
   - "Sijainti"-alueelle (nyt `displayRef?.subLabel`) lisätään klikattava breadcrumb, esim. `Johannes · 3/21`
     - Klikkaus avaa pienen pudotusvalikon (`<select>` tai kevyt custom-dropdown), josta voi valita suoraan minkä tahansa luvun 1…`book.chapters`
   - Kirjatason vaihto (edellinen/seuraava kirja) sijoitetaan toisen rivin painikkeisiin tai pitkän painalluksen/erillisen kuvakkeen taakse, jotta käyttöliittymä ei ruuhkaudu

### Testaus
- Yksikkötestit `readerNavigation.test.ts`:lle: kirjan sisäinen siirtymä, kirjan rajan ylitys (esim. Johannes 21 → Apostolien teot 1), koko Raamatun rajat (1. Mooseksen kirja 1 taaksepäin = `null`, Ilmestyskirja 22 eteenpäin = `null`)
- Komponenttitesti: navigaatiopainikkeiden näkyminen/piilotus reunatapauksissa, klikkaus laukaisee oikean `fetchVerses`-kutsun

### Ei vaadittavia backend-muutoksia
Tämä osa ei tarvitse uutta migraatiota eikä REST-rajapintaa — kaikki tarvittava data on jo `GET /api/books`-vastauksessa.

---

## Osa 2: Lukumerkit (Bookmarks)

### Tavoite
Käyttäjä voi tallentaa nykyisen lukukohdan ja palata siihen myöhemmin nopeasti.

### Tietokantakerros

**Uusi migraatio: `backend/migrations/013_user_bookmarks.sql`**

```sql
-- Up
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR(10) NOT NULL REFERENCES books(id),
    chapter INT NOT NULL,
    verse INT NULL,
    translation_id VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_bookmarks_user ON user_bookmarks(user_id, created_at DESC);

-- Down
DROP TABLE IF EXISTS user_bookmarks;
```

Huomioita:
- `verse` on nullable, koska lukumerkki voi osoittaa kokonaiseen lukuun eikä vain yksittäiseen jakeeseen
- `translation_id` tallennetaan, jotta lukumerkkiä avattaessa käytetään samaa käännöstä kuin tallennushetkellä (käyttäjä voi vaihtaa aktiivista käännöstä sillä välin)
- Ei viittausta `scopes`-tauluun — lukumerkit ovat käyttäjäkohtaisia, eivät työtilakohtaisia (samaa periaatetta kuin Notebooks-ominaisuudessa, ks. `NOTEBOOK_DESIGN_NOTES.md`)

### Backend-kerrokset

**`backend/internal/models/bookmark.go`** (uusi)
```go
type Bookmark struct {
    ID            string    `json:"id" db:"id"`
    UserID        string    `json:"userId" db:"user_id"`
    BookID        string    `json:"bookId" db:"book_id"`
    Chapter       int       `json:"chapter" db:"chapter"`
    Verse         *int      `json:"verse,omitempty" db:"verse"`
    TranslationID string    `json:"translationId" db:"translation_id"`
    Name          string    `json:"name" db:"name"`
    CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}
```

**`backend/internal/db/bookmark_repo.go`** (uusi)
- `Create(ctx, bookmark *models.Bookmark) error`
- `GetByUser(ctx, userID string, limit int) ([]models.Bookmark, error)` — palauttaa uusimmat ensin
- `Delete(ctx, id, userID string) error` — `userID` mukana WHERE-lauseessa IDOR-suojauksen vuoksi (samaa periaatetta kuin `NotebookService`:ssä)

**`backend/internal/services/bookmark_service.go`** (uusi)
- `CreateBookmark(ctx, userID, bookID string, chapter int, verse *int, translationID, name string) (*models.Bookmark, error)`
  - Validoi, että `bookID` on olemassa kirjaluettelossa ja `chapter` on järkevissä rajoissa (1…book.Chapters)
- `GetUserBookmarks(ctx, userID string) ([]models.Bookmark, error)`
- `DeleteBookmark(ctx, userID, bookmarkID string) error`

**`backend/internal/api/bookmark_handler.go`** (uusi)
- `POST /api/bookmarks` — luo uusi lukumerkki (body: `bookId`, `chapter`, `verse?`, `translationId`, `name?`)
- `GET /api/bookmarks` — listaa käyttäjän lukumerkit
- `DELETE /api/bookmarks/{id}` — poistaa lukumerkin

Rekisteröidään `main.go`:ssa `requireAuth`-middlewaren kanssa, samaan tyyliin kuin `notebookHandler`.

### Frontend-kerros

**`frontend/src/components/BookmarksList.tsx`** (uusi)
- Kompakti sivupaneelikomponentti (samaan tyyliin kuin `SearchHistory.tsx`)
- Listaa viimeisimmät 5–10 lukumerkkiä: kirja, luku, valinnainen nimi, aikaleima
- Klikkaus kutsuu `onSelectBookmark(bookId, chapter, verse)` -callbackia, joka `App.tsx`:ssä asettaa `activeReference`
- Poistopainike per rivi

**`VerseReader.tsx`-muutokset**
- "Tallenna kohta" -painike näkymän header-alueelle (samantyylinen kuin olemassa oleva "Tallenna hakutulos työtilaan" -lohko)
- Avaa pienen inline-lomakkeen (nimi, valinnainen) — noudattaa samaa UX-mallia kuin olemassa oleva `showSaveForm`-tila jaetun haun tallennuksessa

**`apiService`-laajennus** (`frontend/src/services/api.ts`)
- `createBookmark(payload)`, `getBookmarks()`, `deleteBookmark(id)`

### Testaus
- `bookmark_repo_test.go` — CRUD, käyttäjäkohtainen eristys (toisen käyttäjän lukumerkkiä ei voi poistaa)
- `bookmark_service_test.go` — validointilogiikka (virheellinen luku, olematon kirja)
- `bookmark_handler_test.go` — HTTP-tason integraatiotestit, 401 kirjautumattomalle
- Frontend: `BookmarksList.test.tsx` — renderöinti, klikkaus, poisto

---

## Osa 3: Jaekohtaiset merkinnät (Verse Annotations)

### Tavoite
Käyttäjä voi merkitä jakeita värikoodilla ja lyhyellä kommentilla, ja nämä merkinnät näkyvät suoraan lukunäkymässä.

### Avoin kysymys ratkaistavaksi ennen toteutusta

Overview-dokumentissa nostettu kysymys: ovatko merkinnät käyttäjäkohtaisia yleisesti, vai sidottuja työtilaan (scope)?

**Suositus:** merkinnät ovat **käyttäjäkohtaisia yleisesti** (ei scope-sidottuja), samalla periaatteella kuin lukumerkit ja Notebooks-ownership-malli. Perustelu: käyttäjä lukee samaa Raamattua eri työtilojen välillä, ja merkintä jakeeseen on luonteeltaan pysyvä henkilökohtainen huomio, ei työtilakohtainen tutkimustulos (toisin kuin tallennetut haut/analyysit). Tämä pidetään suunnitelman oletuksena, mutta se kannattaa vahvistaa ennen toteutusta.

### Tietokantakerros

**Uusi migraatio: `backend/migrations/014_user_verse_annotations.sql`**

```sql
-- Up
CREATE TABLE user_verse_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR(10) NOT NULL REFERENCES books(id),
    chapter INT NOT NULL,
    verse INT NOT NULL,
    translation_id VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT 'default',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, book_id, chapter, verse, translation_id)
);

CREATE INDEX idx_verse_annotations_lookup
    ON user_verse_annotations(user_id, book_id, chapter, translation_id);

-- Down
DROP TABLE IF EXISTS user_verse_annotations;
```

Huomioita:
- `UNIQUE`-rajoite estää duplikaattimerkinnät samaan jakeeseen samasta käännöksestä — päivitys tehdään `UPSERT`-logiikalla (`ON CONFLICT DO UPDATE`)
- Indeksi optimoitu juuri sille kyselymallille, jota lukunäkymä käyttää: "hae kaikki tämän käyttäjän merkinnät kirjan X luvusta Y tietyllä käännöksellä" — tämä haetaan **kerralla koko luvulle**, ei jae kerrallaan (ks. Riskit-osio overview-dokumentissa, suorituskykysyy)
- `color` on vapaa merkkijono (ei enum), jotta värikategorioiden lisäys/muokkaus onnistuu puhtaasti frontendin puolella ilman migraatiota

### Backend-kerrokset

**`backend/internal/models/annotation.go`** (uusi)
```go
type VerseAnnotation struct {
    ID            string    `json:"id" db:"id"`
    UserID        string    `json:"userId" db:"user_id"`
    BookID        string    `json:"bookId" db:"book_id"`
    Chapter       int       `json:"chapter" db:"chapter"`
    Verse         int       `json:"verse" db:"verse"`
    TranslationID string    `json:"translationId" db:"translation_id"`
    Color         string    `json:"color" db:"color"`
    Note          string    `json:"note" db:"note"`
    CreatedAt     time.Time `json:"createdAt" db:"created_at"`
    UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
}
```

**`backend/internal/db/annotation_repo.go`** (uusi)
- `Upsert(ctx, a *models.VerseAnnotation) error` — luo tai päivittää `ON CONFLICT`-lausekkeella
- `GetByChapter(ctx, userID, bookID string, chapter int, translationID string) ([]models.VerseAnnotation, error)` — pääasiallinen hakumetodi lukunäkymälle
- `Delete(ctx, id, userID string) error`

**`backend/internal/services/annotation_service.go`** (uusi)
- `SaveAnnotation(ctx, userID, bookID string, chapter, verse int, translationID, color, note string) (*models.VerseAnnotation, error)`
- `GetChapterAnnotations(ctx, userID, bookID string, chapter int, translationID string) ([]models.VerseAnnotation, error)`
- `DeleteAnnotation(ctx, userID, annotationID string) error`

**`backend/internal/api/annotation_handler.go`** (uusi)
- `POST /api/annotations` — luo/päivittää merkinnän (body: `bookId`, `chapter`, `verse`, `translationId`, `color`, `note`)
- `GET /api/annotations?bookId=&chapter=&translation=` — hakee kaikki merkinnät nykyiselle luvulle (kutsutaan samassa yhteydessä kun `VerseReader` lataa luvun sisällön)
- `DELETE /api/annotations/{id}` — poistaa merkinnän

### Frontend-kerros

**`frontend/src/components/VerseAnnotationPanel.tsx`** (uusi)
- Pieni popover/paneeli, joka avautuu jakeen sup-numeroa tai itse jaetta klikattaessa (nykyinen `onClick={() => handleVerseClick(v)}` -logiikka pitää eriyttää: normaali klikkaus = navigointi, pitkä painallus tai erillinen "merkitse"-kuvake = annotaatiopaneeli)
  - Vaihtoehtoisesti: lisätään pieni kynän/tägin kuvake jakeen viereen hover-tilassa, joka avaa paneelin — tämä on selkeämpi UX ja välttää konfliktin nykyisen klikkaus-navigoinnin kanssa
- Värivalitsin (4–5 nappia) + tekstialue kommentille + Tallenna/Peruuta

**`VerseReader.tsx`-muutokset**
- Kun luku latautuu, haetaan rinnakkain `apiService.getAnnotations(bookId, chapter, translation)`
- Jaeteksti renderöidään ehdollisella taustavärillä, jos jakeelle löytyy merkintä (`style={{ background: annotationColorMap[color] }}`)
- Hover näyttää tooltipin, jossa kommentti näkyy lyhyesti

**`frontend/src/utils/annotationColors.ts`** (uusi, pieni apuohjelma)
- Määrittää värikategoriat ja niiden CSS-muuttaja-arvot (`var(--annotation-important)`, jne.) — noudattaa projektin CSS custom properties -käytäntöä (`index.css`)

### Testaus
- `annotation_repo_test.go` — Upsert-logiikka (duplikaatin päivitys), `GetByChapter`-suodatus
- `annotation_service_test.go` — validointi
- `annotation_handler_test.go` — HTTP-integraatio, käyttäjäeristys
- Frontend: merkinnän näkyminen jaetekstissä, paneelin avaus/sulkeutuminen, tallennuksen jälkeinen päivitys

---

## Osa 4: Lukemisen etenemisen seuranta

### Tavoite
Käyttäjä näkee, kuinka pitkälle on edennyt tietyn kirjan lukemisessa.

### Suunnitteluvalinta: yksinkertainen versio ensin

Overview-dokumentin kolmesta ehdotuksesta (kirjakohtainen etenemä, viikkotavoite, lukemistilastot) toteutetaan Vaihe A:ssa **vain kirjakohtainen etenemä**. Viikkotavoite ja tilastot ovat gamification-elementtejä, joiden arvo on epävarma ja jotka voidaan lisätä myöhemmin ilman, että ne estävät perustan valmistumista — tämä noudattaa projektin omaa periaatetta "mieluummin yksi toimiva ominaisuus kuin monta puolitekoista" (ks. `05-notebooks-and-study-paths/00-notebooks-roadmap.md`).

### Tietomalli: johdettu data, ei uutta taulua

Etenemä voidaan päätellä suoraan lukumerkeistä ja/tai merkinnöistä: "pisimmälle edennyt luku, jota käyttäjä on avannut kussakin kirjassa". Yksinkertaisin ja kevyin ratkaisu:

**Uusi migraatio: `backend/migrations/015_reading_progress.sql`**

```sql
-- Up
CREATE TABLE user_reading_progress (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR(10) NOT NULL REFERENCES books(id),
    last_chapter_read INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, book_id)
);

-- Down
DROP TABLE IF EXISTS user_reading_progress;
```

Tämä on tarkoituksella minimaalinen: ei erillistä lukuhistoriaa jokaisesta käynnistä, vain "pisimmälle luettu luku per kirja". Riittää kirjakohtaisen palkin näyttämiseen ("5/21 lukua käyty läpi" = tässä tapauksessa "olet edennyt lukuun 5/21").

### Backend-kerrokset

**`backend/internal/db/reading_progress_repo.go`** (uusi)
- `UpsertProgress(ctx, userID, bookID string, chapter int) error` — päivittää vain, jos `chapter > last_chapter_read` (suojaa taaksepäin-navigointia turmelemasta etenemää)
- `GetProgressForUser(ctx, userID string) (map[string]int, error)` — palauttaa `bookID → last_chapter_read`

**Integrointi `VerseService.GetVerses`-kutsuun tai erilliseen kevyeen endpointtiin**
- Vaihtoehto A: `VerseReader` kutsuu erillistä `POST /api/reading-progress` -endpointia jokaisen onnistuneen luvun latauksen jälkeen (yksinkertaisin, selkeä vastuunjako)
- **Suositus: Vaihtoehto A**, koska se pitää `VerseService.GetVerses`-metodin puhtaana sivuvaikutuksista ja lukemisen seuranta on selkeästi eri vastuualue

**`backend/internal/api/reading_progress_handler.go`** (uusi)
- `POST /api/reading-progress` — body: `bookId`, `chapter` — kirjaa edistymän (fire-and-forget-tyylinen kutsu frontendistä)
- `GET /api/reading-progress` — palauttaa kaikki käyttäjän kirjakohtaiset etenemät kerralla

### Frontend-kerros

**`frontend/src/components/ReadingProgress.tsx`** (uusi)
- Pieni palkki/indikaattori lukunäkymän otsikon alla: `[████░░░░░] 5/21 lukua`
- Näytetään vain, kun luku on ladattu onnistuneesti kirjan kontekstissa (ei näy hakutuloksissa tai jaevälilehdillä, joissa kirjakonteksti ei ole selkeä)

**`VerseReader.tsx`-muutokset**
- Onnistuneen `fetchVerses`-kutsun jälkeen (kun kyseessä on luku- tai jaetason näkymä), kutsutaan taustalla `apiService.recordReadingProgress(bookId, chapter)` — ei odoteta vastausta UI:n kannalta kriittisenä

### Testaus
- `reading_progress_repo_test.go` — Upsert ei taannu (chapter 5 → chapter 3 ei muuta arvoa; chapter 5 → chapter 8 muuttaa)
- Frontend: `ReadingProgress.test.tsx` — palkin leveys lasketaan oikein `chapter / book.chapters`

---

## Yhteenveto: uudet tiedostot

### Backend
```
backend/migrations/013_user_bookmarks.sql
backend/migrations/014_user_verse_annotations.sql
backend/migrations/015_reading_progress.sql
backend/internal/models/bookmark.go
backend/internal/models/annotation.go
backend/internal/db/bookmark_repo.go
backend/internal/db/annotation_repo.go
backend/internal/db/reading_progress_repo.go
backend/internal/services/bookmark_service.go
backend/internal/services/annotation_service.go
backend/internal/api/bookmark_handler.go
backend/internal/api/annotation_handler.go
backend/internal/api/reading_progress_handler.go
```

### Frontend
```
frontend/src/utils/readerNavigation.ts
frontend/src/utils/annotationColors.ts
frontend/src/hooks/useReaderNavigation.ts
frontend/src/components/BookmarksList.tsx
frontend/src/components/VerseAnnotationPanel.tsx
frontend/src/components/ReadingProgress.tsx
```

### Muokattavat tiedostot
```
backend/main.go                          (uudet reitit)
frontend/src/components/VerseReader.tsx  (navigaatio, merkinnät, lukumerkit, etenemä)
frontend/src/services/api.ts             (uudet API-kutsut)
frontend/src/utils/i18n.ts               (uudet käännösavaimet FI/EN)
```

---

## Toteutusjärjestys (suositeltu)

Osat on suunniteltu toisistaan riippumattomiksi lukuun ottamatta yhteistä pohjaa (kirjaluettelo), joten ne voidaan toteuttaa ja katselmoida erillisinä pull requesteina:

1. **PR 1 — Kontekstinavigaatio** (Osa 1). Ei backend-muutoksia, nopea toteuttaa ja arvioida, antaa välittömän käyttäjäkokemusparannuksen.
2. **PR 2 — Lukumerkit** (Osa 2). Pieni, itsenäinen tietomalli. Hyvä "lämmittely"-PR ennen monimutkaisempaa merkintäominaisuutta.
3. **PR 3 — Jaekohtaiset merkinnät** (Osa 3). Suurin ja monimutkaisin osa; hyötyy siitä, että Osat 1–2 ovat jo vakiinnuttaneet kuvion (uusi taulu → repo → service → handler → frontend-paneeli).
4. **PR 4 — Lukemisen etenemisen seuranta** (Osa 4). Kevyin osa, sopii viimeiseksi kokoavaksi silaukseksi.

Kunkin PR:n jälkeen ajetaan `task check` ja päivitetään `pr_stories/`-kansioon vastaava dokumentti projektin vakiintuneen käytännön mukaisesti.

---

## Avoimet kysymykset ennen toteutuksen aloitusta

1. **Merkintöjen laajuus** (Osa 3) — vahvistetaanko käyttäjäkohtainen (ei-scope-sidottu) malli, kuten suositeltu?
2. **Annotaatiopaneelin avaustapa** — hover-kuvake vai pitkä painallus? Vaikuttaa mobiilikäytettävyyteen.
3. **Kirjatason navigointi (Osa 1)** — riittääkö toissijainen sijainti (esim. kuvake) vai halutaanko yhtä näkyvä kuin luku-navigaatio?
4. **Lukumerkkien enimmäismäärä** — rajoitetaanko esim. 50 kappaleeseen käyttäjää kohti, jotta lista pysyy hallittavana?

---

*Luotu: 2026-07-22*
