# 🔒 Tietoturva-auditointi — ISLA v2 Objekti-Metodi DSL ja Tulosoperaattorit

**Raportin tunniste:** `SECOPS-2026-09-08-001`  
**Kohde:** `feat/isla-v2-object-model` -integraatiohaara (ISLA v2 -kielioppi, lekseri, parseri, suoritin, tulosoperaattorit `=>`, `>`, `>>`, palveluintegraatiot ja käyttöliittymäkomponentit)  
**Päivämäärä:** 2026-09-08  
**Auditoija:** Antigravity AI SecOps Agent  
**Raportin tila:** HYVÄKSYTTY (PASSED) — 0 kriittistä, 0 korkeaa, 0 keskitason haavoittuvuutta  

---

## 1. Yhteenveto ja arvioinnin laajuus

Tietoturva-auditointi suoritettiin ISLA v2 -arkkitehtuurin kokonaisuudelle, joka käsittää uuden kielenkääntäjän (`backend/new_dsl/`), taustajärjestelmän orkestroinnin (`CLIService`, `NotebookService`), REST API -rajapinnat ja frontend-toteutuksen (`islaLexer.ts`, `ISLABlock.tsx`, `i18n.ts`).

Tarkastelun kohteena olivat seuraavat kriittiset osa-alueet:

1. **Parserin ja lekserin vikasietoisuus ja ReDoS/DoS-suojaus (CWE-400, CWE-770, CWE-1333):**
   - Äärelliset silmukat ja tilakoneen lineaarisuus.
   - Säännöllisten lausekkeiden suorituskyky ja ReDoS-riskit.
   - Puskurien koot ja rekursioriskit.

2. **Tietokantakyselyiden turvallisuus ja SQL-injektiot (CWE-89):**
   - Dynaamisten metodien (`.at()`, `.use()`, `.search()`, `.range()`) parametrointi.
   - Kirjalyhenteiden ja jakeiden validointi ennen SQL-suoritusta.

3. **Pääsynhallinta ja solujen injektio (CWE-285, CWE-862):**
   - Tulosoperaattorien `>` ja `>>` aiheuttama solujen luonti kantaan.
   - Muistikirjan omistajuuden tarkistukset ja monen käyttäjän eristys.

4. **Käyttöliittymä ja XSS-altistus (CWE-79, CWE-116):**
   - Tulosoperaattorien slug- ja otsikkomuotojen (`#slug`, `"Otsikko"`) renderöinti DOM:iin.
   - Markdown-prosessointi ja React 19 -yhteensopivuus.

---

## 2. Havaintojen yhteenvetotaulukko

| Vakavuus | Lukumäärä | CVSS v3.1 -luokka | Tila |
| :--- | :---: | :---: | :--- |
| 🔴 **Kriittinen (Critical)** | 0 | 9.0–10.0 | — |
| 🟠 **Korkea (High)** | 0 | 7.0–8.9 | — |
| 🟡 **Keskitaso (Medium)** | 0 | 4.0–6.9 | — |
| 🔵 **Matala / Info (Low/Info)** | 0 | 0.1–3.9 | Kaikki tarkistukset hyväksytty |
| **Yhteensä** | **0** | | |

---

## 3. Yksityiskohtaiset arviointikohteet ja analyysi

### 3.1 Parserin ja lekserin resurssienhallinta (CWE-400, CWE-1333)

* **Tarkasteltu:** Voiko syöte aiheuttaa hallitsematonta muistinkulutusta, äärettömiä silmukoita tai ReDoS-hyökkäyksiä?
* **Havainto:**
  * `new_dsl/lexer.go`:
    - Lekseri etenee tiukasti lineaarisesti (`l.pos++`). Jokaisessa lukijassa (`readString`, `readRegex`, `readNumber`, `readIdent`, `readVerseRef`) on eksplisiittinen rajatarkistus `l.pos < len(l.input)`.
    - Säännöllisten lausekkeiden kääntämisessä käytetään Go:n standardikirjaston `regexp`-pakettia, joka perustuu Googlen RE2-moottoriin. RE2 takaa lineaarisen $O(N)$ aikavaativuuden eikä salli eksponentiaalista backtrackingia (ReDoS-immuniteetti).
  * `new_dsl/parser.go`:
    - Parseri käsittelee token-virtaa ilman rekursiivisia funktiokutsuja, mikä eliminoi pino-ylivuodon (stack overflow) mahdollisuuden.
    - Metodien pisteketjutus (`.method()`) ja argumenttien parsinta on rajattu token-virran pituuteen.
    - Semanttinen validointi hylkää epäyhteensopivat tai virheelliset metodikutsut ennen suoritinta.
  * API-tasolla `DSLHandler.EvalDSL` rajaa saapuvan HTTP-pyynnön rungon maksimissaan 1 megatavuun (`http.MaxBytesReader`), mikä estää muistikuormitushyökkäykset.
* **Tulos:** **TURVALLINEN (SECURE)**.

### 3.2 SQL-injektioiden esto (CWE-89)

* **Tarkasteltu:** Välittyvätkö käyttäjän syöttämät hakusanat, jaeviitteet tai skoopit suoraan tietokantakyselyihin?
* **Havainto:**
  * `new_dsl/executor.go` ei muodosta yhtäkään suoraa SQL-merkkijonoliitosta.
  * Kaikki hakuoperaatiot välitetään repositoriotason funktioille (`VerseRepository.GetByReference`, `VerseRepository.SearchFTS`, `VerseRepository.SearchByKeywords`), joissa kaikki parametrit sidotaan SQL-kyselyihin eksplisiittisinä parametreina (`$1`, `$2`, ...).
  * Jaeviitteet ja kirjatunnukset normalisoidaan ja tarkistetaan hyväksyttyjen kirjojen listaa vasten ennen tietokantaan lähettämistä.
* **Tulos:** **TURVALLINEN (SECURE)**.

### 3.3 Autorisointi ja solujen luonti tulosoperaattoreilla (CWE-285, CWE-862)

* **Tarkasteltu:** Voiko tulosoperaattorien `>` (cell_above) tai `>>` (cell_below) kautta luoda soluja toisen käyttäjän muistikirjaan tai manipuloida järjestelmän tilaa luvattomasti?
* **Havainto:**
  * [backend/internal/services/notebook_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/notebook_service.go#L383-L392) tarkistaa poikkeuksetta muistikirjan omistajuuden (`notebook.UserID != userID`) ennen komennon suorittamista:
    ```go
    if notebook.UserID != userID {
        return nil, errors.New("access denied")
    }
    ```
  * Uudet solut luodaan eksplisiittisesti samalla `notebookID`:llä ja validoidaan repositorion kautta.
  * Solujen positiot numeroidaan eheästi uudelleen ilman riskiä törmäyksistä tai negatiivisista indekseistä.
* **Tulos:** **TURVALLINEN (SECURE)**.

### 3.4 XSS ja tulosteiden sanointi (CWE-79, CWE-116)

* **Tarkasteltu:** Voiko tulosoperaattorin nimi (`> #slug` tai `> "Otsikko"`) sisältää haitallista HTML/JavaScript-koodia, joka suorittuisi selaimessa?
* **Havainto:**
  * [frontend/src/components/notebook/isla/ISLABlock.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/isla/ISLABlock.tsx) renderöi `outputOp.name`-arvon suoraan Reactin tekstiturvallisena solmuna `{outputOp.name}`.
  * Sovelluksessa ei käytetä `dangerouslySetInnerHTML`-kutsuja tulosoperaattorien metatiedoille.
  * MarkdownCell käyttää `react-markdown`-komponenttia remark-GFM-liitännäisellä, joka estää haitallisten skriptien injektoitumisen DOM:iin.
* **Tulos:** **TURVALLINEN (SECURE)**.

---

## 4. Laatuporttien ja staattisen analyysin tulokset

* **Go Vet:** `go vet ./...` läpäisi 0 virheellä.
* **Backend Linter:** `golangci-lint run ./...` — 0 huomautusta.
* **Frontend Linter:** `eslint .` — 0 virhettä.
* **Automaattiset testit:**
  - Backend: 100 % läpäisy (statement coverage 78.1 %, `new_dsl` 70.5 %).
  - Frontend: 30 testitiedostoa, 201 testiä (100 % läpäisy).

---

## 5. Johtopäätös

Muutokset täyttävät kaikki Clible-projektin tietoturva- ja laatuvaatimukset. Haara `feat/isla-v2-object-model` on valmis tuotantovientiin ja yhdistettäväksi `main`-haaraan.
