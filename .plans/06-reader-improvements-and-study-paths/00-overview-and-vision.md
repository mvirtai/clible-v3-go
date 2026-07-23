# Suunnitelma 06: Lukunäkymän parannukset ja lukusuunnitelmat (Study Paths)

## Visio

Clible-sovelluksen lukunäkymä (Reader) laajennetaan kontekstitietoiseksi Raamatun tutkimisympäristöksi, joka tukee **johdonmukaista lukemista** ja **ohjattuja opintopolkuja**. Tämän ansiosta käyttäjät voivat:

- Lukea Raamattua kirjoittain ja luvuittain sujuvasti, ilman turhia navigointikatkoksia
- Merkitä itselleen tärkeitä jakeita ja palata niihin nopeasti
- Seurata lukemisen etenemistä kirja- tai lukusuunnitelmakohtaisesti
- Edetä opintopolkuja (Study Paths) pitkin, jotka rakentuvat olemassa olevien Notebookien päälle
- Kirjoittaa omia muistiinpanoja suoraan Raamatun tekstin rinnalle

---

## Kehitysvaiheiden yleiskuva

```
Vaihe A: Lukunäkymän parannukset (1–2 viikkoa)
  ↓
Vaihe B: Lukusuunnitelmien (Study Paths) perusta (1–2 viikkoa)
  ↓
Vaihe C: Ensimmäiset valmiit lukusuunnitelmat (1 viikko)
```

---

## Vaihe A: Lukunäkymän parannukset

### Tavoite
Tehdä lukunäkymästä sujuvasti navigoitava ja henkilökohtaisempi, jotta Raamatun lukeminen onnistuu luonnollisesti eikä käyttäjän tarvitse jatkuvasti palata haku- tai valikkonäkymiin.

### Pääkomponentit

#### 1. Kontekstinavigaatio
- **Edellinen/seuraava luku** -painikkeet
  - Viimeisen jakeen jälkeen siirrytään automaattisesti seuraavaan lukuun
  - Ensimmäisestä jakeesta taaksepäin palataan edelliseen lukuun
- **Edellinen/seuraava kirja** -painikkeet
  - Nopea kirjanvaihto suoraan lukunäkymästä
- **Sijainnin ilmaisin (breadcrumb)**
  - Näkymä esimerkiksi "Johannes 3/21" (nykyinen luku / kirjan lukujen kokonaismäärä)
  - Klikattava pudotusvalikko, jolla voi hypätä suoraan haluttuun lukuun

#### 2. Jakeiden merkinnät ja muistiinpanot
- **Jaekohtaiset merkinnät** (uusi taulu `user_verse_annotations`)
  - Käyttäjä voi liittää jakeeseen värikoodin ja vapaan tekstikommentin
  - 4–5 valmista värikategoriaa: esim. "Tärkeä", "Kysymys", "Opetus", "Lupaus", "Muu"
  - Tallennetaan tietokantaan — selvitettävä, ovatko merkinnät käyttäjäkohtaisia yleisesti vai sidottuja yksittäiseen scopeen (ks. Riskit)
- **Merkinnät näkyvät lukunäkymässä**
  - Jae korostuu värikoodilla suoraan tekstissä
  - Kommentti näkyy hover- tai klikkaustilassa
- **Merkintöjen hallintapaneeli**
  - Sivupaneeli, josta näkee kaikki nykyisen kirjan merkinnät kerralla
  - Merkintää klikkaamalla siirrytään suoraan kyseiseen jakeeseen

#### 3. Lukumerkit (Bookmarks)
- **"Tallenna kohta"-painike**
  - Tallentaa kirjan, luvun ja jakeen sekä aikaleiman
  - Valinnainen oma nimi (esim. "Tähän jäin torstaina")
- **Lukumerkkilista**
  - Näyttää viimeisimmät tallennetut kohdat (5–10 kpl)
  - Klikkaus siirtää suoraan tallennettuun kohtaan
  - Merkin poistaminen ja uudelleennimeäminen
- **Tietomalli**
  - Uusi taulu `user_bookmarks` (`user_id`, `book_id`, `chapter`, `verse`, `name`, `created_at`)

#### 4. Lukemisen etenemisen seuranta
- **Kirjakohtainen etenemä**
  - Näkymä esimerkiksi "Olet lukenut 5/21 lukua"
  - Visuaalinen etenemispalkki kirjaa kohti
- **Viikkotavoite** (valinnainen ominaisuus)
  - Käyttäjä voi asettaa tavoitteen, esim. "5 lukua viikossa"
  - Kuluvan viikon edistyminen näkyvissä
- **Lukemistilastot**
  - Esim. "3 lukua tänään", "24 lukua viime viikolla"
  - Kevyt motivoiva elementti, ei pakollinen ensimmäisessä versiossa

---

## Vaihe B: Lukusuunnitelmien (Study Paths) perusta

### Tavoite
Rakentaa opintopolkujen perusta olemassa olevien Notebookien päälle. Käyttäjä voi aloittaa valmiin opintopolun, joka ohjaa hänet askel askeleelta läpi tietyn Raamatun tutkimusaiheen.

### Pääkomponentit

#### 1. Tietokantataulut

- **`study_paths`** — opintopolun perustiedot
  ```
  id UUID PRIMARY KEY
  title VARCHAR(255) NOT NULL
  description TEXT
  slug VARCHAR(255) UNIQUE
  category VARCHAR(50) -- 'characters', 'themes', 'books', 'topical'
  order_index INT
  is_template BOOLEAN -- true = järjestelmän tarjoama malli, false = käyttäjän oma
  created_by UUID NULL -- null = järjestelmä, muuten viittaus käyttäjään
  created_at TIMESTAMP
  updated_at TIMESTAMP
  ```

- **`study_path_notebooks`** — opintopolun ja notebookien linkitys
  ```
  id UUID PRIMARY KEY
  study_path_id UUID NOT NULL REFERENCES study_paths(id) ON DELETE CASCADE
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE
  order_index INT -- notebookin järjestys opintopolun sisällä
  ```

- **`user_study_progress`** — käyttäjän eteneminen opintopolulla
  ```
  id UUID PRIMARY KEY
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  study_path_id UUID NOT NULL REFERENCES study_paths(id)
  notebook_id UUID NOT NULL REFERENCES notebooks(id)
  status VARCHAR(50) -- 'in_progress', 'completed', 'paused'
  started_at TIMESTAMP
  completed_at TIMESTAMP NULL
  last_accessed_at TIMESTAMP
  ```

#### 2. Backend: palvelu- ja rajapintakerros

- **`StudyPathService`**
  - `GetTemplates()` — listaa kaikki saatavilla olevat mallipohjat
  - `GetBySlug(slug)` — hakee yksittäisen opintopolun tiedot
  - `CloneForUser(userID, studyPathID)` — kopioi mallipohjan notebookit käyttäjän omiksi
  - `GetUserProgress(userID)` — palauttaa käyttäjän aktiiviset ja valmiit opintopolut

- **`StudyPathRepository`**
  - CRUD-operaatiot tauluille `study_paths` ja `user_study_progress`
  - Kloonaus toteutetaan transaktiona (notebookien kopiointi + edistymän kirjaus samassa transaktiossa)

- **REST-rajapinta**
  - `GET /api/study-paths` — listaa kaikki saatavilla olevat opintopolut
  - `GET /api/study-paths/:slug` — hakee yksittäisen polun sisältöineen (notebook-tiedot)
  - `POST /api/study-paths/:slug/start` — käyttäjä aloittaa opintopolun (kloonaus)
  - `GET /api/study-paths/progress/:pathId` — käyttäjän eteneminen tietyllä polulla
  - `PUT /api/study-paths/progress/:pathId` — päivittää tilan (valmis / keskeytetty)
  - Ylläpito: `POST /api/study-paths` — uusien mallipohjien luonti (vaatii admin-oikeudet)

#### 3. Frontend: käyttöliittymä

- **Lukusuunnitelmat-välilehti**
  - Kategoriat: "Henkilöt", "Teemat", "Kirjat", "Aihepiirit"
  - Kuvauskortti kullekin opintopolulle
  - "Aloita"-painike käynnistää polun

- **Opintopolun näkymä**
  - Otsikko ja kuvausteksti
  - Osiot (notebookit) listattuna järjestyksessä
  - Kunkin osion tila näkyvissä: "Tulossa", "Kesken", "Valmis"
  - Osiota klikkaamalla avautuu vastaava Notebook (tai Reader, riippuen sisällöstä)

- **Etenemisen seuranta**
  - Visuaalinen etenemispalkki (esim. "3/7 osiota valmis")
  - Kun kaikki osiot on käyty läpi, näytetään onnittelu ("Opintopolku suoritettu!")

#### 4. Notebook-integraatio

- **Opintopolun mallinotebook**
  - Järjestelmän ylläpitämät mallinotebookit ovat käyttäjille vain luku -tilassa alkuperäisinä
  - Sisältävät Markdown-soluja (ohjeistus, konteksti) ja Code-soluja (CLI-komennot: `/read`, `/suggest` jne.)
- **Kloonausmekanismi**
  - `POST /api/study-paths/:slug/start` kopioi mallinotebookin kaikki solut käyttäjän omaan, muokattavaan notebookiin
  - Käyttäjä voi vapaasti jatkaa muokkaamista kloonatussa versiossa

---

## Vaihe C: Ensimmäiset valmiit lukusuunnitelmat

### Tavoite
Rakentaa 3–5 valmista opintopolkua, jotta sovelluksessa on konkreettista, käyttövalmista sisältöä alusta lähtien.

### Ehdotetut mallipohjat

#### 1. "Yhdeksän psalmia"
- Kategoria: Teemat
- 9 osiota, yksi psalmi per osio
- Osion rakenne:
  - Markdown: psalmin historiallinen konteksti
  - Code: `/read Ps XXX` (koko psalmi)
  - Markdown: tyhjä solu omille muistiinpanoille
- Tavoite: rukouksen ja hartaudenharjoituksen syventäminen

#### 2. "Paavalin matkat"
- Kategoria: Henkilöt
- 5 osiota (yksi per lähetysmatka)
- Osion rakenne:
  - Markdown: historiallinen konteksti ja karttaviittaus
  - Code: `/graph Paul` (henkilöverkoston visualisointi, kun toteutettu)
  - Code: `/read Apt 13:1-4` (esimerkki ensimmäisestä matkasta)
  - Markdown: tyhjä solu omille muistiinpanoille
- Tavoite: Paavalin elämän ja vaikutuksen ymmärtäminen

#### 3. "Jeesus neljässä evankeliumissa"
- Kategoria: Teemat
- 4 osiota (yksi per evankeliumi)
- Osion rakenne:
  - Markdown: evankeliumin erityispiirteet
  - Code: `/search Jeesus` rajattuna kyseiseen evankeliumiin
  - Markdown: vertailu ja pohdintakysymykset
- Tavoite: nähdä Jeesuksen kuva neljästä eri näkökulmasta

#### 4. "Raamatun suuret lupaukset"
- Kategoria: Teemat
- 7 osiota (eri lupaukset)
- Osion rakenne:
  - Markdown: lupauksen teologinen merkitys
  - Code: `/read` viittauksella kyseiseen jaksoon
  - Code: `/suggest` liittyvien jaksojen löytämiseksi
  - Markdown: henkilökohtainen soveltaminen
- Tavoite: nähdä Jumalan lupausten jatkumo läpi Raamatun

---

## Tekninen arkkitehtuuri

### Tietokantakerros
```
Uudet taulut:
- user_verse_annotations   (jaekohtaiset merkinnät)
- user_bookmarks           (lukumerkit)
- study_paths              (opintopolkujen mallipohjat)
- study_path_notebooks     (polun ja notebookien linkitys)
- user_study_progress      (käyttäjän eteneminen)
```

### Backend-kerrokset
```
Repository:
  - VerseAnnotationRepository  (luo, hae, poista)
  - BookmarkRepository         (CRUD)
  - StudyPathRepository        (CRUD + kyselyt)

Service:
  - VerseAnnotationService     (validointi, käyttöoikeudet)
  - BookmarkService            (validointi)
  - StudyPathService           (kloonaus, edistymän seuranta)

API:
  - reader_handler.go          (merkinnät, lukumerkit, kontekstitiedot)
  - study_path_handler.go      (uusi)
```

### Frontend-kerrokset
```
Komponentit:
  - ReaderContextNav.tsx    (edellinen/seuraava-navigaatio)
  - VerseAnnotationPanel.tsx (merkinnät)
  - BookmarksList.tsx       (lukumerkit)
  - ReadingProgress.tsx     (etenemismittari)
  - StudyPathsList.tsx      (opintopolkujen listaus)
  - StudyPathView.tsx       (yksittäisen polun näkymä)

Context/Hookit:
  - useReaderNavigation     (kontekstinavigaation tila)
  - useStudyPath            (opintopolun tila)
```

---

## Integraatiot olemassa olevaan koodiin

### Lukunäkymä (`VerseReader.tsx`)
- Kontekstinavigaatio lisätään näkymän ylätunnisteeseen
- Merkintäpaneeli sijoitetaan sivupalkkiin
- Etenemispalkki lisätään lukumäärän yhteyteen

### Notebook-komponentit
- Kun koodisolu suorittaa `/read`-komennon, tuloksesta voidaan siirtyä suoraan Readeriin
- Opintopolun tunniste välitetään notebookille konteksti-tiedoksi

### Reititys (`App.tsx`)
- Uusi reitti: `/study-paths`
- Uusi reitti: `/study-paths/:slug`
- Uusi reitti: `/study-paths/:slug/notebook/:notebookId`

### Työtilat (Scopes)
- Opintopolut voidaan valinnaisesti linkittää työtiloihin
- Selvitettävä, ovatko käyttäjän merkinnät yleisiä vai työtilakohtaisia

---

## Riippuvuudet ja riskit

### Riippuvuudet
- Notebooks-ominaisuus on valmis ja tuotannossa (kloonaus rakennetaan sen päälle)
- Lukunäkymä on olemassa ja toimiva (parannukset tehdään sen sisään)
- CLI-komennot (`/read`, `/search`, `/suggest`) ovat käytössä opintopolkujen soluissa

### Riskit ja avoimet kysymykset
1. **Merkintöjen laajuus** — Ovatko käyttäjän jaekohtaiset merkinnät yleisiä koko käyttäjätilille, vai sidottuja yksittäiseen työtilaan (scope)? Tämä ratkaisu vaikuttaa tietomalliin ja pitää päättää ennen toteutusta.
2. **Mallipohjien ylläpito** — Jos Raamatun sisältöä (käännöksiä, kirjoja) muutetaan, opintopolkujen mallipohjat pitää tarkistaa erikseen. Tarvitaan selkeä ylläpitoprosessi.
3. **Suorituskyky** — Jos merkinnät haetaan erikseen jokaiselle jakeelle, se voi hidastaa lukunäkymän latautumista suurilla luvuilla. Merkinnät kannattaa hakea kerralla koko luvulle.

---

## Testausstrategia

### Yksikkötestit
- `VerseAnnotationRepository` — CRUD-operaatiot
- `BookmarkRepository` — CRUD-operaatiot
- `StudyPathRepository` — kloonaus ja edistymän kirjaus
- `StudyPathService` — liiketoimintalogiikka

### Integraatiotestit
- Opintopolun kloonaus päästä päähän (notebookien solut kopioituvat oikein)
- Merkinnän tallennus ja hakeminen
- Lukumerkin tallennus ja siihen siirtyminen

### Manuaalinen/E2E-testaus
- Lukeminen kontekstinavigaation kautta läpi useamman luvun ja kirjan
- Merkinnän lisääminen ja sen näkyminen lukunäkymässä
- Opintopolun aloitus ja etenemisen seuraaminen osiosta toiseen

---

## Aikataulu-arvio

| Osa | Tehtävä | Kesto |
|-----|---------|-------|
| A1 | Kontekstinavigaatio (edellinen/seuraava) | 1–2 päivää |
| A2 | Lukumerkit (backend + frontend) | 2–3 päivää |
| A3 | Jaekohtaiset merkinnät (backend + frontend) | 3–4 päivää |
| A4 | Etenemismittari | 1–2 päivää |
| A5 | Testaus ja viilaus | 2–3 päivää |
| — | **Vaihe A yhteensä** | **~2 viikkoa** |
| B1 | Study Paths -taulut ja migraatio | 1 päivä |
| B2 | Backend-palvelu ja rajapinta | 2–3 päivää |
| B3 | Frontend-käyttöliittymä ja integraatio | 3–4 päivää |
| B4 | Testaus | 2–3 päivää |
| — | **Vaihe B yhteensä** | **~2 viikkoa** |
| C1 | Mallipohjien sisällön rakentaminen | 3–5 päivää |
| C2 | Mallipohjien testaus | 2–3 päivää |
| — | **Vaihe C yhteensä** | **~1 viikko** |

**Kokonaisaika-arvio: noin 5 viikkoa**, sisältäen katselmoinnit ja iteroinnin.

---

## Seuraavat vaiheet

1. **Overviewin hyväksyminen** — vastaako visio ja vaihejako tavoitteita?
2. **Yksityiskohtaiset suunnitelmat** — kirjoitetaan tarkka toteutussuunnitelma erikseen jokaiselle vaiheelle (A, B, C)
3. **Priorisoinnin vahvistus** — aloitetaanko Vaiheesta A, kuten alustavasti sovittu?

---

*Luotu: 2026-07-22*
