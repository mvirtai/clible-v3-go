# Clible-v3-go — Projektin kokonaissuunnitelma ja kehityskartta

> Tämä dokumentti toimii projektin yhteisenä kehityskarttana. Jokainen osio
> edustaa yhtä tai useampaa itsenäistä branchin aihetta. Ruksittakaa kohdat
> valmiiksi sitä mukaa kuin ne mergetään `main`-haaraan.

---

## Tila-merkinnät

- `[x]` Valmis ja mergetty
- `[ ]` Tekemättä
- `[~]` Osittain tehty / kesken

---

## 1. Infrastruktuuri ja projektin perusta

- [x] **Go-moduuli ja hakemistorakenne** — `backend/` + `frontend/` monorepo-jako
- [x] **Taskfile.yml** — Kehittäjätaskien automatisointi (`backend:dev`, `check`, `git:pr` jne.)
- [x] **SQLite-yhteys ja migraatiorunko** — `InitializeDB` + `RunMigrations` + `_migrations`-seurantataulukko
- [x] **golangci-lint integraatio** — Nollatoleranssi virheille (`errcheck`, `staticcheck` jne.)
- [x] **Vite + React + TypeScript** — Frontendin kehitysympäristö pystyssä
- [x] **CORS-middleware** — Frontendin ja backendin välinen kommunikaatio sallittu
- [x] **Logger-middleware** — Rakenteinen JSON-lokitus (`log/slog`)
- [x] **Recovery-middleware** — Paniikin hallinta HTTP-palvelimessa
- [x] **Graceful shutdown** — SIGTERM-käsittely + `http.Server.Shutdown(ctx)`

---

## 2. Tietokantakerros (Migraatiot ja repositoriot)

### 2A. Migraatiot

- [x] **001** — Placeholder-alustus
- [x] **002** — Pääarkkitehtuuri: `books`, `translations`, `verses`
- [x] **003** — `verses_fts` FTS5-hakutaulukko
- [x] **004** — Poistetaan vanhentunut tekstiindeksi
- [x] **005** — `scopes` ja `saved_results`
- [x] **006** — `search_history`
- [x] **007** — 66 kanonisen raamatunkirjan siemennys (`books`-taulu)

### 2B. Repositoriot

- [x] `TranslationRepository` — `GetAll`, `Create`, `Exists`, `Delete`
- [x] `VerseRepository` — `BulkInsert`, `GetByReference`, `Search` (FTS5 + regex)
- [x] `SearchHistoryRepository` — `Save`, `GetLatest`
- [x] `ScopeRepository` — `Create`, `GetAll`, `Delete`
- [x] `SavedRepository` — `SaveSearch`, `GetSearchesByScope`, `SaveAnalysis`, `GetAnalysesByScope`
- [x] **`BookRepository`** — `GetAll`, `GetByID`

---

## 3. Palvelukerros (Services)

- [x] **`VerseService.GetVerses`** — Jakeen haku viittausmerkkijonolla (`John 3:16`, `Gen 1`) luku- ja kirjatarkkuudella
- [x] **`VerseService.SearchVerses`** — FTS5-tekstihaku + valinnainen regex-suodatin
- [x] **`SeedService.ParseStreamShortcut`** — HTTP-striimistä SQLiteen, kanoninen kirjavalidointi + apokryfien ohitus
- [x] **`SeedService.SeedTranslationFromFile`** — Tiedostopoluista operoiminen (testaus- ja CLI-käyttö)
- [x] **`AnalyticService`** — Tokenointi, stopword-suodatus, n-grammi-analyysi, käännösvertailu
- [x] **`SearchHistoryService`** — Lisäys ja haku
- [x] **`ScopeService`** — Workspacen hallinta ja tallennetut tulokset

### Puuttuvat / kesken

- [x] **`VerseService.GetVerses` — luku- ja kirjataso** — `ScopeChapter` ja `ScopeBook` täysin toteutettu
- [x] **Oletuskäännösten dynaaminen resolvointi** — Käännös resolvoitetaan dynaamisesti (käyttäjän asennetut käännökset tai fallback `"web"`)
- [x] **`BookService`** — Kirjaluettelon palvelukerros

---

## 4. API-rajapinta (REST Endpoints)

### 4A. Toteutetut endpointit

- [x] `GET /api/verses?ref=&translation=` — Jakeiden haku viittauksella
- [x] `GET /api/search?q=&regex=&translation=` — FTS5-tekstihaku
- [x] `GET /api/translations` — Asennettujen käännösten luettelo
- [x] `POST /api/translations/import` — Streaming XML-tuonti (multipart/form-data)
- [x] `POST /api/history` — Hakuhistorian tallennus
- [x] `GET /api/history` — Viimeisimmät haut
- [x] `POST /api/scopes` — Uusi workspace-scope
- [x] `GET /api/scopes` — Kaikkien scopejen listaus
- [x] `DELETE /api/scopes?id=` — Scopen poisto (+ cascade)
- [x] `POST /api/scopes/saved-searches` — Tallennettu haku scopeen
- [x] `POST /api/scopes/saved-analyses` — Tallennettu analyysi scopeen
- [x] `GET /api/scopes/workspace` — Koko workspace (scopes + saved)
- [x] `POST /api/analytics/analyze` — Tekstiparametrien laskenta
- [x] `POST /api/analytics/compare` — Käännösvertailu

### 4B. Puuttuvat endpointit

- [x] `GET /api/books` — Kanonisen kirjaluettelon tarjoaminen frontendille (valikot, navigaatio)
- [x] `GET /api/books/:id` — Yksittäisen kirjan tiedot (nimi, luku-/jaemäärät)
- [x] `DELETE /api/translations/link` — Käännöksen poisto/aktivoinnin peruminen hallintapaneelista
- [ ] `GET /api/translations/:id` — Yksittäisen käännöksen metadata (Backlog)
- [ ] `GET /api/verses/random` — Satunnainen jae (Backlog)
- [x] `POST /api/analytics/analyze` — Laskee ja palauttaa n-grammit analytiikkaa varten

---

## 5. XML-parserin laajentaminen

- [x] USFX-formaatin tuki (container-tagit `<v>`, `<ve/>`, self-closing `<v/>`)
- [x] Alaviitteiden (`<f>`) ja ristiviittausten (`<x>`) suodatus
- [x] Ei-kanonisten kirjojen ohitus (apokryfit, esipuheet, sanastot)
- [ ] **OSIS-formaatin täydellinen tuki** — Tällä hetkellä perustuki on, mutta laajempia OSIS-kirjarakenteita ei ole testattu tuotantodatalla
- [ ] **Suomenkielisen raamatun (fin-1992) tuonti** — Löydetään ja testataan sopiva XML-lähde (USFX tai OSIS)
- [ ] **Virheiden palautus tuonnissa** — Jos tuonti epäonnistuu kesken, tulisi jo lisätyt jakeet poistaa (transaktionaalinen rollback koko tuonnille)

---

## 6. Testikattavuus

### Nykyinen tila (viimeisin `task check`)

| Paketti | Kattavuus |
| --- | --- |
| `internal/api` | ~68% |
| `internal/config` | 100% |
| `internal/db` | ~51% |
| `internal/middleware` | 100% |
| `internal/parsers` | ~90% |
| `internal/services` | ~63% |

### Tavoitteet

- [x] **`internal/api`** — Lisää testit `scope_handler.go`:n puuttuviin endpointteihin
- [x] **`internal/db`** — Lisää `ScopeRepository`- ja `SavedRepository`-testit
- [x] **`internal/services`** — `ScopeService`- ja `SeedService.SeedTranslationFromFile`-testit
- [x] **Luku- ja kirjatason haun testit** — Toteutettu luku- ja kirjatason testauksilla
- [x] **`TranslationRepository.Delete`-testi** — Testattu

---

## 7. Frontend (React + TypeScript)

### Nykytila

Frontendin perusta ja keskeiset ydinominaisuudet on toteutettu (PR #16 ja PR #17). Sovelluksessa on Clible-v2-teeman mukainen tyylikäs, kultaisella aksentilla ja warm-neutral -sävyillä varustettu käyttöliittymä, jossa on toimiva lukutila, haku (FTS5 + regex) sekä käännösten hallintapaneeli.

### Prioriteetti 1 — Perusta ja design-järjestelmä

- [x] **Tyylijärjestelmä** (`index.css`) — TailwindCSS v4 + CSS custom properties (kulta-teema, Georgia serif, automaattinen light/dark mode)
- [x] **Reititys** — React Router v6 (sisäänkirjautuminen Login/Register eristetty omiksi sivuikseen, työtila-näkymä hallinnoi sisäistä tilaa)
- [x] **API-asiakaskerros** — `fetch`-wrapperi `ApiService` + TypeScript-tyypit
- [x] **Komponenttikirjasto** — Yksilölliset, laadukkaat komponentit (`VerseReader`, `VerseSearch`, `TranslationSelector`, `TranslationManager`, `SearchHistory`)

### Prioriteetti 2 — Ydinominaisuudet

- [x] **Hakukomponentti** — FTS5-hakukenttä, regex-kytkin ja tuloslistaus
- [x] **Jakeenhaku-näkymä** — Älykäs alias-normalisointi (`resolveBookId`), joka tukee useita kirjoitusmuotoja (esim. `1. Moos`, `1 Moos`, `joh.`)
- [x] **Käännösvalikko** — Headerissa oleva asennettujen käännösten valitsin
- [x] **Hakuhistoria-paneeli** – Sidebar-paneeli, joka näyttää viimeisimmät haut hakumoodin ja hakutulosten määrän kera

### Prioriteetti 3 — Analytiikka ja workspacet

- [x] **Analytiikkanäkymä** — Tekstiparametrien visualisointi (sanataajuudet, n-grammit) frontendissä
- [x] **Käännösvertailunäkymä** — Kahden käännöksen rinnakkaisvertailunäkymä frontendissä
- [x] **Workspace-/scope-hallinta** — Scopejen luonti, tallennetut haut ja analyysit frontendissä
- [x] **Tuontinäkymä** (admin) — Drag-and-drop XML-tuonti sekä valmiit presets-latauskortit (Biblia, WEB, KJV) suoratoistolla GitHubista

### Prioriteetti 4 — Viimeistely

- [x] **Virhekäsittely ja tyhjät tilat** — XML-tuonnin virhepalautteet, tyhjän tilan asennus-CTA
- [x] **Responsiivisuus** — Mobiili- ja tablettituki (perusrakenne 3-sarakkeisella gridillä tehty)
- [ ] **Saavutettavuus (a11y)** — WCAG-standardit, näppäimistönavigointi (Backlog)
- [ ] **SEO** — Metatagit, title-tagit (Backlog)

---

## 8. Kehitysympäristö ja DevOps

- [x] **`.env`-tiedoston hallinta** — Ympäristömuuttujat dokumentoitu ja `.env.example`-malli luotu
- [x] **Docker-konfiguraatio** — `Dockerfile` backendille + `docker-compose.yml` koko stackille
- [x] **CI/CD — GitHub Actions** — `task check` ja Docker-käännöstesti sekä automaattinen WIF CD-putki
- [x] **Tuotantobuildi** — Go binary-buildi + Vite-tuotantobundle + staattiset tiedostot
- [x] **Tietokantavarmuuskopiot** — Hallinnoitu pilvessä automaattisesti (Neon PostgreSQL)
- [x] **GCP- ja Terraform-pilvitoteutus** — IaC GCP-resurssit (Cloud Run, GCS FUSE, Secret Manager)


---

## 9. Dokumentaatio

- [ ] **`README.md`** — Projektin kuvaus, pika-aloitusohje, arkkitehtuurikuvaus
- [ ] **API-dokumentaatio** — Endpointit, parametrit, vastausformaatit
- [ ] **Kehittäjäopas** — Käännösten lisääminen, parserin laajentaminen
- [ ] **Arkkitehtuurikaavio** — Kerrosarkkitehtuurin visualisointi

---

## 10. Pitkän aikavälin ominaisuudet (Backlog)

- [ ] **Monimuotohaku** — Yhdistelmähaku (viittaus + teksti + regex yhtenä kyselynä)
- [ ] **Käyttäjätilit ja autentikaatio** — JWT tai session-pohjainen kirjautuminen, scopes per käyttäjä
- [ ] **Käännösten vertailusivut** — Sama jae usealla käännöksellä rinnakkain
- [ ] **Morfologinen analyysi** — Heprean/kreikan alkukielen sanojen jäsennys
- [ ] **Konkordanssi** — Sanan esiintymiskertojen luettelointi koko raamatusta
- [ ] **Export-toiminnot** — Jakeiden vienti PDF:ksi, CSV:ksi tai tekstiksi
- [ ] **Offline-tuki (PWA)** — Service worker, tietokannan välimuisti selaimessa
- [ ] **Lokalisointi** — Käyttöliittymä suomeksi ja englanniksi

---

*Päivitetty: 2026-06-27. Päivitä tiloja sitä mukaa kuin PR:t mergetään.*
