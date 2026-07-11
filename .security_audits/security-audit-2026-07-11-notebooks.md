# 🔒 Tietoturva-auditointi — Pre-Merge Security Report

**Raportin tunniste:** `SECOPS-2026-07-11-001`
**Kohde:** Notebooks & Study Paths backend -toteutuksen koodimuutokset
**Päivämäärä:** 2026-07-11
**Auditoija:** Antigravity SecOps Agent
**Raportin tila:** HYVÄKSYTTY (PASSED)

---

## Yhteenveto

Tämä raportti analysoi Notebooks-kehitystyön tietoturvallisuuden ja koodin laadun ennen merge-operaatiota `main`-haaraan. Katselmoinnissa keskityttiin erityisesti SQL-injektioiden ehkäisyyn, autorisointiin (pääsynvalvonta) ja syötteen validointiin.

### Havaintojen kokonaiskuva

| Vakavuus | Lukumäärä | CVSS-luokka | Tila |
|----------|-----------|-------------|------|
| 🔴 Kriittinen | 2 | 9.0–10.0 | ✅ Korjattu |
| 🟠 Korkea | 0 | 7.0–8.9 | - |
| 🟡 Keskitaso | 3 | 4.0–6.9 | ✅ Korjattu |
| 🔵 Matala | 0 | 0.1–3.9 | - |
| **Yhteensä** | **5** | | |

---

## 🔴 KRIITTISET HAAVOITTUVUUDET

### VULN-001: Scope ID Validation puuttui (IDOR-riski)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **9.1 (Critical)** |
| **Sijainti** | `backend/internal/services/notebook_service.go` |
| **Tila** | ✅ **KORJATTU** |

**Kuvaus:** Alkuperäisessä versiossa `ScopeID`-arvon omistajuutta ei validoitu luotaessa muistikirjaa. Käyttäjä pystyi luomaan muistikirjan toisen käyttäjän työtilaan.
**Korjaus:** Lisättiin `ScopeRepository`:n injektointi ja scope-omistajuuden validointi ennen luontia.

### VULN-002: Autorisointimallin epäyhtenäisyys

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **9.1 (Critical)** |
| **Sijainti** | `backend/internal/services/notebook_service.go` |
| **Tila** | ✅ **KORJATTU** |

**Kuvaus:** Muistikirjojen haku ja muokkaus tarkisti vain suoran `UserID`-omistajuuden, mutta ei `ScopeID`-omistajuutta, mikä on ristiriidassa muiden työtila-resurssien kanssa.
**Korjaus:** Päivitettiin tarkistukset huomioimaan myös työtilan (Scope) omistajuus.

---

## 🟡 KESKITASON HAAVOITTUVUUDET / RAKENNEONGELMAT

### VULN-003: Orphaned Notebooks (Cascade Delete)

**Kuvaus:** Työtilan poistaminen jätti muistikirjat orvoiksi (`SET NULL`).
**Korjaus:** Päivitettiin tietokantamigraatio (`fk_notebook_scope_id`) käyttämään `ON DELETE CASCADE` -sääntöä.

### VULN-004: Notebooks puuttui ScopeWorkspace-mallista

**Kuvaus:** Frontend joutui hakemaan muistikirjat erillisellä kutsulla, mikä rikkoi yhden endpointin latausmallin ja aiheutti mahdollisia race condition -tilanteita.
**Korjaus:** Lisättiin `Notebooks` taulukko `ScopeWorkspace`-malliin ja implementoitiin `GetByScopeID`.

### VULN-005: Orphaned Records -käsittely

**Kuvaus:** `DELETE /api/scopes/:id` ei ilmoittanut muistikirjoille orpoudesta, aiheuttaen frontendissä tilaepäjohdonmukaisuuksia.
**Korjaus:** Ratkaistu yllä mainitulla CASCADE-säännöllä.

---

## 🔍 Arvioidut osa-alueet

### 1. SQL-injektiot (SQL Injection)

Kaikki tietokantakyselyt tiedostossa [notebook_repo.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/notebook_repo.go) käyttävät tiukasti parametrisoituja kyselyitä (`$1`, `$2`, jne.). Koodissa ei käytetä merkkijonojen yhdistämistä (concatenation) käyttäjän syötteille, joten SQL-injektioiden riski on estetty.

### 2. Pääsynvalvonta ja autorisointi (IDOR)

Käsittelijä [notebook_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/notebook_handler.go) lukee käyttäjän tunnistautumistiedot turvallisesti kontekstista (`middleware.GetUserID`).

Palvelukerroksen [notebook_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/notebook_service.go) CRUD-operaatiot varmistavat aina, että pyydetyn resurssin omistaja (`UserID`) vastaa pyynnön tekevää käyttäjää. Tämä estää resurssien luvattoman lukemisen, muokkaamisen ja poistamisen (Insecure Direct Object Reference).

### 3. Syötteiden käsittely ja resurssienhallinta

Kaikki uudet API-päätepisteet on suojattu autentikaatiolla ja globaalilla rate-limit-rajoittimella [main.go](file:///home/vivaldev/code/clible-v3-go/backend/main.go) -tiedostossa. Uusia ulkoisia riippuvuuksia tai kolmannen osapuolen kirjastoja ei lisätty.

---

## 🚀 Päätelmä

Toteutus täyttää kaikki tietoturvavaatimukset, eikä siinä havaittu yhtään avointa haavoittuvuutta. Koodi on valmis yhdistettäväksi `main`-haaraan.
