# Suunnitelma Clible-v3-go:n laajentamiseksi (v2-ominaisuuksien porttaus)

Tässä dokumentissa kartoitetaan vaihtoehdot Clible-v2:n ominaisuuksien kääntämiseksi ja laajentamiseksi uuteen Go-pohjaiseen Clible-v3:een. GCP-integraation ja CI/CD-putken valmistuttua voimme siirtyä kehittämään itse sovellusta.

Seuraavassa on esitelty neljä mahdollista kehityspolkua. Suositeltu polku on **Polku A**, sillä se viimeistelee lukukoneen ytimen ja korjaa nykyiset runtime-rajoitukset.

---

## Kehityspolut

### Polku A: Lukukoneen ytimen viimeistely (Suositeltu)

* **Mitä:** Toteutetaan tuki koko luvun (`ScopeChapter`) ja koko kirjan (`ScopeBook`) hakemiselle sekä luodaan kirjaluettelon rajapinnat (`GET /api/books` ja `GET /api/books/:id`).
* **Miksi:** Tällä hetkellä haku luku- tai kirjatarkkuudella (esim. pelkkä `Joh. 3` tai `Genesis`) palauttaa backendistä vain raa'an "not yet integrated" -virheen. Kirjalistan saaminen backendistä mahdollistaa myös paremman navigaation ja valitsimet käyttöliittymässä.
* **Arkkitehtoniset muutokset:**
  * **Repository:** Lisätään `BookRepository` hoitamaan `books`-taulun kyselyt. Laajennetaan `VerseRepository` hakemaan jakeita ilman )jakeen alkamis- ja päättymisrajoja.
  * **Service:** Toteutetaan `BookService` ja viimeistellään `VerseService.GetVerses` puuttuvat skoopit.
  * **API Handler:** Luodaan `GET /api/books` ja `GET /api/books/:id`.
  * **Frontend:** Kytketään kirjalista ja lukutilan automaattinen luku-/kirjahaku käyttöliittymään.

### Polku B: Tekstianalyysi ja käännösvertailu käyttöliittymään

* **Mitä:** Portataan v2:n `AnalyticsView` ja `CompareView` React-frontendin puolelle.
* **Miksi:** Go-backendissä on jo täysin toimivat analytiikka- ja vertailupalvelut (`AnalyticsService`, `POST /api/analytics/analyze`, `POST /api/analytics/compare`), mutta ne eivät ole vielä lainkaan kytkettyinä React-käyttöliittymään.
* **Arkkitehtoniset muutokset:**
  * **Frontend:** Toteutetaan sanapilvi- (`WordCloud`), tilasto- (`AnalyticsView`) ja rinnakkaisvertailukomponentit (`CompareView`) käyttäen TailwindCSS v4:ää.
  * **API:** Hyödynnetään jo olemassa olevia endpointteja.

### Polku C: Työtilat ja tallennetut haut (Scopes)

* **Mitä:** Portataan v2:n workspace-hallinta (scopet, tallennetut haut ja analyysit) React-frontendin puolelle.
* **Miksi:** Go-backendissä on jo valmiina kattavat workspace-rajapinnat (`/api/scopes`, `/api/scopes/saved-searches` jne.), mutta käyttöliittymästä puuttuu sidebar ja logiikka työtilojen luomiseen ja hallintaan.
* **Arkkitehtoniset muutokset:**
  * **Frontend:** Toteutetaan työtilanäkymä, tallennettujen hakujen listaukset ja työtilan vaihto.

### Polku D: Gemini AI -integraatio Go-backendiin

* **Mitä:** Portataan v2:n Gemini-tekoälyominaisuudet Go-kielelle.
* **Miksi:** v2 sisältää erittäin rikkaita AI-ominaisuuksia, kuten tone-analyysi, jaekohtaiset selitykset (insights), alkukielianalyysi interlineaarisella käännösvertailulla ja luonnollisen kielen haku (NL → FTS + grounded summary).
* **Arkkitehtoniset muutokset:**
  * **Backend:** Lisätään Go Gemini SDK (tai suorat REST-kutsut Google AI Studioon) ja luodaan tekoälylle omat palvelukerrokset ja handlerit (`/api/ai/insight`, `/api/ai/tone`, `/api/ai/study`, `/api/ai/search`).
  * **Frontend:** Portataan v2:n AI-näkymät, kuten `OriginalStudyView` ja `DeepDiveCard`.

---

## Suositeltu etenemissuunnitelma: Polku A

Toteutetaan ensimmäisenä **Polku A**, koska se korjaa nykyisen lukukoneen puutteet.

### Vaihe 1: Backend-tietokanta ja -palvelukerros

1. Luodaan `BookRepository` (`backend/internal/db/book_repo.go`), joka tarjoaa:
   * `GetAll(ctx)`: Palauttaa kaikki 66 kanonista kirjaa järjestettynä (`position ASC`).
   * `GetByID(ctx, id)`: Palauttaa yksittäisen kirjan metadatat (nimi, testamentti, lukujen määrä).
2. Laajennetaan `VerseRepository` (`backend/internal/db/verse_repo.go`):
   * Lisätään joustavuutta `GetByReference` tai luodaan `GetByChapter` ja `GetByBook` -metodit koko luvun tai kirjan jakeiden tehokkaaseen hakemiseen.
3. Luodaan `BookService` (`backend/internal/services/book_service.go`) hoitamaan kirjojen listaukset.
4. Viimeistellään `VerseService.GetVerses` (`backend/internal/services/verse_service.go`):
   * Toteutetaan `ScopeChapter`-haara kutsumalla uutta repository-metodia.
   * Toteutetaan `ScopeBook`-haara kutsumalla uutta repository-metodia.
   * Lisätään dynaaminen oletuskäännöksen resolvointi (`TranslationRepository.GetAll` kautta), jos `translationID` on tyhjä.

### Vaihe 2: API-rajapinta ja testit

1. Luodaan `BookHandler` (`backend/internal/api/book_handler.go`):
   * `GET /api/books`: Palauttaa kirjaluettelon JSON-muodossa.
   * `GET /api/books/{id}`: Palauttaa yksittäisen kirjan tiedot.
2. Rekisteröidään uudet reitit tiedostossa `backend/main.go`.
3. Kirjoitetaan yksikkötestit (`book_repo_test.go`, `book_service_test.go`, `book_handler_test.go`) varmistamaan rajapintojen toimivuus.

### Vaihe 3: Frontend-päivitykset

1. Päivitetään React-sovelluksen `apiService` tukemaan uutta `/api/books` -endpointia.
2. Varmistetaan, että lukukone (`VerseReader`) pystyy hakemaan ja näyttämään kokonaisia lukuja ja kirjoja ilman virheitä.
3. (Valinnainen) Luodaan yksinkertainen navigaatiovalikko tai kirjavalitsin (`BookPicker`), jolla käyttäjä voi valita kirjan ja luvun suoraan listasta.
