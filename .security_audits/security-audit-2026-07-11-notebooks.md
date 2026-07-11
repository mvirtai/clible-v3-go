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
| 🔴 Kriittinen | 0 | 9.0–10.0 | - |
| 🟠 Korkea | 0 | 7.0–8.9 | - |
| 🟡 Keskitaso | 0 | 4.0–6.9 | - |
| 🔵 Matala | 0 | 0.1–3.9 | - |
| **Yhteensä** | **0** | | |

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
