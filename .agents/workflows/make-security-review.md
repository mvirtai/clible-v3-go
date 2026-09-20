---
description: Työnkulku tietoturvakatselmoinnin (Security Review) suorittamiseen ja raportointiin
---

# 🔒 Tietoturvakatselmointi (Security Review Workflow)

Tämä työnkulku ohjaa, miten kehityshaaroille ja koodimuutoksille suoritetaan tietoturvakatselmointi (Security Review) ja miten havaitut haavoittuvuudet raportoidaan ja korjataan ennen kuin koodi yhdistetään (merge) `main`-haaraan.

---

## 📅 Milloin tietoturvakatselmointi tehdään?

Katselmointi on pakollinen kaikille pull requesteille (PR), jotka muuttavat tai lisäävät:
1. **Autentikaatiota ja autorisointia** (esim. JWT, kirjautuminen, salasanat, roolit/scopet).
2. **Tietokantakyselyitä** (SQL-injektioiden riski, suorat SQL-kutsut repo-kerroksessa).
3. **Syötteen validointia ja parserointia** (XML/JSON ingestion, tiedostokoot, buffer-overflow, resurssien kulutus O(1)-vaatimusten osalta).
4. **Rajapintoja (API)** (CORS-asetukset, uudet endpointit, herkkien tietojen vuotaminen).
5. **Riippuvuuksia (Dependencies)** (uudet kirjastot, haavoittuvuuspäivitykset).

---

## 🔍 Vaihe 1: Muutosten analysointi ja skannaukset

Ennen raportin kirjoittamista suoritetaan seuraavat vaiheet:

1. **Riippuvuuksien tarkistus (Go):**
   ```bash
   govulncheck ./...
   ```
   *(Asenna tarvittaessa ajamalla `go install golang.org/x/vuln/cmd/govulncheck@latest`)*

2. **Koodin staattinen analyysi:**
   * Tarkista repo-kerroksen tietokantahakujen parametrisointi.
   * Varmista, ettei missään ole kovakoodattuja API-avaimia tai JWT-salaisuuksia (salaisuudet luetaan aina ympäristömuuttujista).
   * Varmista, että parserit lukevat virtaa (stream) rajoitetusti eivätkä lataa koko syötettä muistiin (dos-suojaus).

3. **Laaduntarkistukset:**
   ```bash
   task check
   ```

---

## 📝 Vaihe 2: Raportin luominen

Luo uusi raporttitiedosto kansioon `.security_audits/` käyttäen mallipohjaa `.security_audits/templates/SECURITY_AUDIT_TEMPLATE.md` noudattaen kaavaa `security-audit-YYYY-MM-DD-<ominaisuuden-nimi>.md`.

Raportissa on oltava vähintään seuraavat osiot:

### 1. Perustiedot
* **Raportin tunniste:** (muodossa `SECOPS-YYYY-MM-DD-XXX`)
* **Kohde:** Kehityshaara ja tarkasteltavat tiedostot
* **Päivämäärä:** Katselmoinnin suorituspäivä
* **Auditoija:** Katselmoinnin tekijä

### 2. Yhteenvetotaulukko
Luokittele havainnot CVSS v3.1 -asteikon mukaisesti:
* 🔴 **Kriittinen (Critical):** 9.0–10.0 (Estää mergen ja tuotantoviennin)
* 🟠 **Korkea (High):** 7.0–8.9 (Korjattava ennen mergeä)
* 🟡 **Keskitaso (Medium):** 4.0–6.9 (Suositellaan korjattavaksi ennen mergeä)
* 🔵 **Matala (Low):** 0.1–3.9 (Voidaan korjata jälkikäteen)

### 3. Yksityiskohtaiset havainnot
Jokaisesta havainnosta on ilmoitettava:
* **CVSS v3.1 -pisteet ja vektori**
* **Sijainti koodissa** (tiedosto ja rivinumerot linkkinä)
* **Kuvaus ja riskin kuvaus**
* **Suositus korjaustoimenpiteeksi**

---

## 🛠️ Vaihe 3: Haavoittuvuujen korjaaminen ja verifiointi

1. **Korjaa havainnot:**
   * Kaikki 🔴 *Kriittiset* ja 🟠 *Korkeat* havainnot on korjattava ennen merge-hyväksyntää.
2. **Uudelleenskannaus:**
   * Aja tarkistukset ja testit uudelleen.
3. **Raportin päivitys:**
   * Päivitä havaintojen tilaksi `KORJATTU` (Resolved) raporttitiedostoon ja lisää lyhyt kuvaus siitä, miten asia korjattiin.

---

## 🚀 Vaihe 4: Merge ja arkistointi

* Kun katselmointi on valmis ja kriittiset havainnot korjattu, raportti committoidaan kehityshaaraan osana PR-aineistoa.
* Mainitse suoritetusta tietoturvakatselmoinnista ja sen tuloksista myös PR-tarinassa (`pr_stories/`).
