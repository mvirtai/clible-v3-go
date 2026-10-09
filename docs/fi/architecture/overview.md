# Arkkitehtuurin yleiskatsaus ja kerrokset

clible-v3-go on suunniteltu web-natiiviksi, tilattomaksi asiakas-palvelin-sovellukseksi. Erottamalla käyttöliittymän, tiedon prosessoinnin, ISLA-kyselymoottorin ja tallennuskerroksen toisistaan saavutetaan selkeät vastuurajat, korkea suorituskyky ja erinomainen pilvissiirrettävyys.

---

## Järjestelmäarkkitehtuuri

Ylätasolla järjestelmä koostuu React-verkkokäyttöliittymästä, joka kommunikoi HTTP:n yli Go REST API -monoliitin kanssa. Monoliitti hallitsee käyttäjien todennusta HTTP-only JWT -istunnoilla, koordinoi tekstianalyysejä, suorittaa ISLA v2 -kyselyitä ja integroituu ulkoiseen Gemini AI API -rajapintaan. Kaikki tuotantotiedot tallennetaan Neon PostgreSQL -tietokantaan. Paikallista SQLite-tietokantaa käytetään yksinomaan nopeisiin muistipohjaisiin yksikkötesteihin.

```mermaid
graph TD
    subgraph Frontend_App ["Frontend: Vite + React 19"]
        UI["UI-komponentit: NotebookEditor, Reader jne."]
        API_CLIENT["API-asiakas: ApiService.ts"]
    end

    subgraph Backend_App ["Backend: Go REST API -monoliitti"]
        MW_LAYER["Middleware: Auth, Logger, RateLimiter"]
        API_LAYER["API-kerros: internal/api"]
        SVC_LAYER["Palvelukerros: internal/services"]
        ISLA_ENGINE["ISLA-moottori: backend/new_dsl/"]
        REP_LAYER["Tietokantakerros: internal/db"]
        PRS_LAYER["Jäsenninkerros: internal/parsers"]
    end

    DB[("PostgreSQL: Neon")]
    AI["Gemini AI API"]

    UI --> API_CLIENT
    API_CLIENT -->|"HTTP / REST (JSON)"| MW_LAYER
    MW_LAYER --> API_LAYER
    API_LAYER --> SVC_LAYER
    API_LAYER --> ISLA_ENGINE
    SVC_LAYER --> REP_LAYER
    SVC_LAYER -->|"Jäsentää suoratoistoa"| PRS_LAYER
    SVC_LAYER -->|"Integroi tekoälyn"| AI
    ISLA_ENGINE -->|"VerseFetcher / VerseSearcher"| REP_LAYER
    REP_LAYER -->|"SQL / Kontekstitietoinen"| DB
```

---

## Arkkitehtuurikerrokset ja vastuut

Backend on jäsennelty viiteen kerrokseen, joilla on tiukat riippuvuussäännöt.

### 1. API-kerros (`internal/api/`)

Kaikkien HTTP-pyyntöjen sisääntulopiste. Määrittää päätepisteet, jäsentää parametrit, validoi JSON-pyynnöt ja kutsuu asianmukaisia palveluita tai ISLA-moottoria.

- **Vastuut**: Reititys, parametrien validointi, HTTP-tilakoodit, CORS ja JSON-vastausten kirjoitus.
- **Rajat**: Ei saa ottaa suoria tietokantayhteyksiä, kirjoittaa SQL-kyselyitä tai tehdä tiedostojärjestelmä-/verkkotoimintoja.
- **Optimointi**: Ylläpitää O(1) tilakompleksisuuden suoratoistamalla tiedostojen lataukset suoraan jäsenninkerrokselle ilman muistipuskurointia.

### 2. Palvelukerros (`internal/services/`)

Koordinoi sovelluksen liiketoimintalogiikkaa. Toimii siltana API-käsittelijöiden, tietokantakerroksen ja apupakettien (kuten XML-jäsentimien ja AI-integraation) välillä.

- **Vastuut**: Hakualgoritmit, monivaiheiset transaktiot, työtilojen (skoopit) hallinta, tekstianalytiikka ja käännösten tuonti.
- **Rajat**: Ei saa käsitellä HTTP-käsitteitä (ei `http.ResponseWriter`- tai `http.Request`-viitteitä).
- **Optimointi**: Käyttää 500 jakeen puskuroituja erälisäyksiä tehokkaaseen tietokantatallennukseen.

### 3. ISLA-moottori (`backend/new_dsl/`)

Itsenäinen Go-paketti, joka toteuttaa täyden ISLA v2 -kyselykielen. Käsittelee raa'at ISLA-lausekkeet nelivaiheisessa putkessa ja palauttaa jäsennellyt `models.CLIResult`-arvot.

- **Vastuut**: Raakasyötteen leksointi tokeneiksi, jäsentäminen tyypitetyksi AST:ksi, metodien kelpoisuuden validointi, kyselyiden ajo `VerseFetcher`- ja `VerseSearcher`-rajapintojen kautta sekä ketjutettujen metodien soveltaminen.
- **Rajat**: Riippuu **vain** paketeista `internal/models` ja `internal/parsers`. Ei suoraa riippuvuutta palvelu- tai API-kerroksiin.
- **Suorituskyky**: Deterministinen LL(1)-jäsennin alle 50 µs latenssilla. Syötteen pituus rajoitettu 2000 rune-merkkiin DoS-hyökkäysten estämiseksi.

Katso tarkempi kielioppi ja arkkitehtuuri sivulta [ISLA v2 -kielioppimäärittely](/fi/architecture/isla-specification).

### 4. Tietokantakerros (`internal/db/`)

Suora rajapinta tietokantaan (tukee sekä PostgreSQL:ää että SQLiteä).

- **Vastuut**: SQL-lauseiden suoritus, tulosrivien luku ja skannaus mallirakenteisiin.
- **Rajat**: Ei saa viitata palveluihin tai API-käsittelijöihin. Kaikki kyselyt ovat tiukasti parametrisoituja SQL-injektioiden estämiseksi.
- **Peruutussignaalin välitys**: Jokainen metodi ottaa vastaan `context.Context`-olion ja käyttää sitä kyselyissä (`QueryContext`, `ExecContext`). Asiakkaan katkaistessa yhteyden kysely keskeytetään tietokannassa välittömästi.

### 5. Jäsenninkerros (`internal/parsers/`)

Käsittelee raakojen käännöstiedostojen lukemisen.

- **Vastuut**: Rakenteellisten XML-tiedostojen (USFX, OSIS) luku ja kirjojen, lukujen ja jakeiden erottelu.
- **Rajat**: Ei yhteyksiä tietokantaan, palveluihin tai API-kerrokseen. Toimii ainoastaan `io.Reader`-rajapintaa vasten.
- **Optimointi**: O(1) suoratoistojäsennys `xml.Decoder`-työkalulla ilman koko tiedoston lataamista muistiin.

---

## Kerrosrajojen vartiointi

| Kutsuva kerros | Sallitut kohteet | Kielletyt kohteet |
|---|---|---|
| **API** | Palvelut, ISLA-moottori, Mallit, Konfiguraatio | Tietokanta, Jäsentimet, Raaka SQL |
| **Palvelut** | Tietokanta, Jäsentimet, Mallit | API-käsittelijät, ISLA-moottori, Raaka SQL, HTTP-tyypit |
| **ISLA-moottori** | Tietokanta (rajapintojen kautta), Mallit, Jäsentimet | Palvelut, API-käsittelijät, suora `*sql.DB` |
| **Tietokanta** | Mallit, Tietokantayhteys (`*sql.DB`) | Palvelut, API-käsittelijät, Jäsentimet, Verkko-I/O |
| **Jäsentimet** | `io.Reader` | Palvelut, Tietokanta, API, Mallit |
