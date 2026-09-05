# 🔒 Tietoturva-auditointi — Väliaikaiset vierasmuistikirjat, ISLA DSL -arviointi ja kehitystyökalujen välimuisti

**Raportin tunniste:** `SECOPS-2026-09-05-001`  
**Kohde:** `feat/guest-mode-ephemeral-notebooks` -kehityshaara (Vierasmuistikirjojen localStorage-tallennus, TTL-istunnonhallinta, avoin ISLA DSL -evaluointi, Taskfile-tarkistussummat, riippuvuuspäivitykset)  
**Päivämäärä:** 2026-09-05  
**Auditoija:** Antigravity AI SecOps Agent  
**Raportin tila:** HYVÄKSYTTY (PASSED) — 0 kriittistä, 0 korkeaa, 0 keskitason haavoittuvuutta  

---

## 1. Yhteenveto ja arvioinnin laajuus

Tietoturva-auditointi suoritettiin kehityshaaran `feat/guest-mode-ephemeral-notebooks` arkkitehtuurille, API-muutoksille ja käyttöliittymätoteutukselle. Muutoskokonaisuus kattaa seuraavat osa-alueet:

1. **Väliaikaiset vierasmuistikirjat (Client-Side Ephemeral Notebooks):**
   - Selaimen `localStorage`-pohjainen tallennus ilman palvelinpään tietokantakuormitusta (`guestNotebookStorage.ts`).
   - 1 tunnin aikaraja (TTL) ja automaattinen vanhenemisen tarkistus ja nollaus.
   - Pääsyn eristäminen: vierasmuistikirjojen ID:t on etuliitetty `guest-`-tunnisteella, ja REST API:n `/api/notebooks/*`-reitit pysyvät suojattuina `requireAuth`-middlewarella.
2. **ISLA DSL -arviointirajapinta (`POST /api/dsl/eval`):**
   - Pakollisen käyttäjätunnistevaatimuksen poistaminen `DSLHandler.EvalDSL`-käsittelijästä.
   - Julkisen Raamatun tekstin tutkimisen mahdollistaminen vierailijoille ilman istuntoa.
   - Käännösten eristystarkistukset (`VerseService.GetVerses` / `IsGlobal`).
3. **Kehitystyökalujen välimuisti ja suoritus (`Taskfile.yml`):**
   - Tiedostojen tarkistussummiin (`checksum`) perustuva taskien välimuistitus.
   - `SKIP_CHECK=1` -ohitusvipu ja `task clip` -leikepöytätyökalu.
4. **Riippuvuusturvallisuus (Dependency Audits & Overrides):**
   - Pnpm-riippuvuuksien turvallisuuskorjaukset (`brace-expansion`, `browserslist`, `nanoid`, `postcss`).

---

## 2. Havaintojen yhteenvetotaulukko

| Vakavuus | Lukumäärä | CVSS v3.1 -luokka | Tila |
| :--- | :---: | :---: | :--- |
| 🔴 **Kriittinen (Critical)** | 0 | 9.0–10.0 | — |
| 🟠 **Korkea (High)** | 0 | 7.0–8.9 | — |
| 🟡 **Keskitaso (Medium)** | 0 | 4.0–6.9 | — |
| 🔵 **Matala / Info (Low/Info)** | 0 | 0.1–3.9 | Kaikki havainnot korjattu ja todennettu |
| **Yhteensä** | **0** | | |

---

## 3. Yksityiskohtaiset arviointikohteet ja analyysi

### 3.1 Pääsynhallinta ja käännösten tietosuoja (CWE-285, CWE-862)

* **Tarkasteltu:** Aiheuttaako autentikoimattoman pääsyn salliminen `/api/dsl/eval`-reitille riskin siitä, että vieraskäyttäjä voisi lukea muiden käyttäjien henkilökohtaisia, ei-julkisia käännöksiä?
* **Havainto:**
  * `cliService.ExecuteDSL` kutsuu `VerseService.GetVerses`- ja `VerseService.SearchVerses`-metodeja.
  * [backend/internal/services/verse_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/verse_service.go#L88-L97) sisältää tiukan pääsynhallinnan unauthenticated-pyynnöille:
    ```go
    } else {
        // In guest mode (unauthenticated), all global preset translations are accessible
        isGlobal, err := s.translationRepo.IsGlobal(ctx, tid)
        if err != nil {
            return nil, fmt.Errorf("failed to verify translation accessibility: %w", err)
        }
        if !isGlobal {
            return nil, fmt.Errorf("translation %q is not accessible", tid)
        }
    }
    ```
  * Mikäli vierailija yrittää kohdistaa DSL-kyselyn (esim. `@Joh 3:16 ? private-trans : web`) ei-globaaliin käännökseen, pyyntö estetään välittömästi tietokantatasolla.
  * Tekoälyreitit (`/api/ai/*`), työtilat (`/api/scopes/*`) ja palvelinmuistikirjat (`/api/notebooks/*`) vaativat edelleen poikkeuksetta vahvan JWT-autentikaation.
* **Tulos:** **TURVALLINEN (SECURE)**.

### 3.2 Selaimen paikallinen tallennus ja XSS-altistus (CWE-79, CWE-922)

* **Tarkasteltu:** Onko selaimen `localStorage`-tallennuksessa injektio- tai vuotoriskejä?
* **Havainto:**
  * Vierasmuistikirjojen tallennustila (`clible_guest_notebooks`) säilyttää vain väliaikaisia muistiinpanoja ja solurakenteita. Siellä **ei koskaan** säilytetä JWT-tunnisteita, salasanoja tai henkilötietoja (JWT säilytetään suojatuissa `HttpOnly; SameSite=Lax; Secure` -evästeissä).
  * [frontend/src/utils/guestNotebookStorage.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/utils/guestNotebookStorage.ts#L24-L49) validoi JSON-rakenteen ja tyypityksen tiukasti purkamisen yhteydessä. Jos JSON on korruptoitunutta tai tyypit poikkeavat skeemasta, varasto tyhjennetään automaattisesti ilman poikkeuksia.
  * Markdown-solujen sisältö renderöidään `react-markdown`-komponentilla ilman `dangerouslySetInnerHTML`-kutsuja, mikä estää DOM-pohjaiset XSS-hyökkäykset.
* **Tulos:** **TURVALLINEN (SECURE)**.

### 3.3 Syötteen validointi ja resurssienhallinta (CWE-400, CWE-770)

* **Tarkasteltu:** Voiko `/api/dsl/eval`-reittiä ylikuormittaa suurilla pyyntökuormilla?
* **Havainto ja toimenpide:**
  * [backend/internal/api/dsl_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/dsl_handler.go#L34-L37) -handler suojattiin rajoittamalla saapuvan HTTP-pyynnön rungon koko enintään 1 megatavuun:
    ```go
    if r.Body != nil {
        r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
    }
    ```
  * Mikäli pyynnön koko ylittää 1 megatavun, Go:n `MaxBytesReader` keskeyttää lukemisen ja JSON-dekooderi palauttaa virheen hyläten pyynnön (`400 Bad Request`), mikä estää muistin ylikuormituksen ja DoS-hyökkäykset.
  * Toiminta todennettiin automaattisella yksikkötestillä `TestDSLHandler_EvalDSL/Rejects_request_body_exceeding_max_size` tiedostossa [backend/internal/api/dsl_handler_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/dsl_handler_test.go).
* **Tila:** **KORJATTU (RESOLVED)**.

### 3.4 Riippuvuustarkistus ja haavoittuvuuksien eliminointi (CWE-1395)

* **Tarkasteltu:** Pnpm-riippuvuuksien haavoittuvuustilanne.
* **Havainto:**
  * Aiemmin raportoidut haavoittuvuudet (`brace-expansion` ReDoS-riski) korjattiin määrittelemällä [frontend/package.json](file:///home/vivaldev/code/clible-v3-go/frontend/package.json#L52-L65) -tiedostoon pakolliset korvaussäännöt:
    ```json
    "pnpm": {
      "overrides": {
        "brace-expansion": "^5.0.9",
        "browserslist": "^4.28.7",
        "nanoid": "^3.3.18",
        "postcss": "^8.5.23"
      }
    }
    ```
  * Riippuvuudet on lukittu `pnpm-lock.yaml`-tiedostoon ja asennukset ovat vakaita.
* **Tulos:** **KORJATTU (RESOLVED)**.

---

## 4. Kehitystyökalujen ja skriptien tarkastelu

* **`task clip` -työkalu (`Taskfile.yml`):**
  * Skripti suoritetaan kehittäjän omassa koneessa paikallisessa komentotulkissa.
  * Tiedoston olemassaolo varmistetaan (`[ ! -f "$FILE" ]`), ja rivivälin formaatti sanitoitiin (`tr '-' ',' | tr ':' ','`) ennen `sed`-kutsua.
  * Ei muodosta riskiä tuotantoympäristölle.
* **Tarkistussummien välimuisti (`method: checksum`):**
  * `.task`- ja `.cov`-hakemistot on rajattu pois git-seurannasta (`.gitignore`), joten paikalliset tarkistussummat eivät vuoda versionhallintaan.

---

## 5. Johtopäätös ja hyväksyntä

Katselmoinnissa ei havaittu yhtään kriittistä (Critical), korkeaa (High) tai keskitason (Medium) tietoturvaongelmaa. Kaikki vierastilatoiminnot ja avoimet ISLA-evaluoinnit noudattavat järjestelmän pääsynhallintaperiaatteita ja säilyttävät käyttäjätietojen ja yksityisten käännösten eristyksen.

**Tietoturvakatselmoinnin lopputulos:** ✅ **HYVÄKSYTTY (PASSED)**  
Kehityshaara `feat/guest-mode-ephemeral-notebooks` on tietoturvan puolesta valmis yhdistettäväksi `main`-haaraan.
