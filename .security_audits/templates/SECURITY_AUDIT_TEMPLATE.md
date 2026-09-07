# 🔒 Tietoturva-auditointi — [Ominaisuuden tai haaran nimi]

**Raportin tunniste:** `SECOPS-YYYY-MM-DD-001`  
**Kohde:** `[feat/korjaus/haara]` -integraatiohaara (tiedostot ja komponentit)  
**Päivämäärä:** YYYY-MM-DD  
**Auditoija:** Antigravity AI SecOps Agent & Kehittäjä  
**Raportin tila:** HYVÄKSYTTY (PASSED) / VAATII TOIMENPITEITÄ (ACTION REQUIRED)  

---

## 1. Yhteenveto ja arvioinnin laajuus

Tietoturva-auditointi suoritettiin kohteelle `[haaran tai ominaisuuden nimi]`. Tarkastuksen tavoitteena oli varmistaa koodikannan vikasietoisuus, oikeaoppinen pääsynhallinta ja parametrisointi ennen koodin yhdistämistä `main`-haaraan.

Tarkastelun kohteena olivat seuraavat osa-alueet:

1. **Autentikaatio ja autorisointi (CWE-285, CWE-862):**
   - Käyttäjäkontekstin purkaminen (`ctxkeys.GetUserID` / `middleware.GetUserID`).
   - Vierastilan eristys ja kirjoitusoperaatioiden suojaus.

2. **Tietokantakyselyiden turvallisuus ja SQL-injektiot (CWE-89):**
   - Kyselyiden parametrisointi (`$1, $2`) repository-kerroksessa.
   - Dynaamisten hakuehtojen sanitointi ja validointi.

3. **Syötteiden validointi ja resurssienhallinta (CWE-400, CWE-770, CWE-1333):**
   - $O(1)$-virtausmuotoinen XML/JSON-ingestion ilman puskurointia keskusmuistiin.
   - Säännöllisten lausekkeiden (RegEx) ReDoS-suojaus (RE2-lineaarisuus).

4. **Käyttöliittymä ja selainturvallisuus (CWE-79, CWE-116):**
   - DOM-injektioiden ja XSS-altistumisen esto React 19 -komponenteissa.
   - Kaksikielisyyden ja syötteiden turvallinen renderöinti.

5. **Riippuvuuksien haavoittuvuudet:**
   - Go-moduulien ja npm-pakettien tunnetut haavoittuvuudet.

---

## 2. Havaintojen yhteenvetotaulukko

| Vakavuus | Lukumäärä | CVSS v3.1 -luokka | Tila |
| :--- | :---: | :---: | :--- |
| 🔴 **Kriittinen (Critical)** | 0 | 9.0–10.0 | Estää mergen välittömästi |
| 🟠 **Korkea (High)** | 0 | 7.0–8.9 | Korjattava ennen mergeä |
| 🟡 **Keskitaso (Medium)** | 0 | 4.0–6.9 | Suositellaan korjattavaksi |
| 🔵 **Matala / Info (Low/Info)** | 0 | 0.1–3.9 | Seurannassa / Informatiivinen |
| **Yhteensä** | **0** | | |

---

## 3. Yksityiskohtaiset havainnot ja analyysi

### 3.1 Autentikaatio ja käyttöoikeuksien tarkistus (CWE-285)
* **Tarkasteltu:** Onko endpoint suojattu oikealla middlewarella?
* **Havainto:** [Kuvaus koodista ja suojauksesta]
* **Tila:** KORJATTU / HYVÄKSYTTY

### 3.2 SQL-parametrisointi ja tietokantakerros (CWE-89)
* **Tarkasteltu:** Käytetäänkö kaikissa kyselyissä parametreja eikä merkkijonojen yhdistämistä?
* **Havainto:** [Kuvaus toteutuksesta]
* **Tila:** KORJATTU / HYVÄKSYTTY

### 3.3 Syötteiden virtaus ja resurssienhallinta (CWE-400)
* **Tarkasteltu:** Rajoitetaanko syötekokoja ja käsitelläänkö dataa virtaavasti?
* **Havainto:** [Kuvaus toteutuksesta]
* **Tila:** KORJATTU / HYVÄKSYTTY

---

## 4. Suoritetut työkalut ja tarkistuskomennot

1. **Riippuvuusskannaus:**
   ```bash
   govulncheck ./...
   ```
   *Tulos:* Ei tunnettuja haavoittuvuuksia tuotantoriippuvuuksissa.

2. **Koodin staattinen analyysi ja testit:**
   ```bash
   task check
   ```
   *Tulos:* Kaikki backend- ja frontend-testit sekä linterit läpäisty puhtaasti.

---

## 5. Johtopäätös ja toimenpiteet

Kaikki kriittiset ja korkean riskin kohteet on auditoitu ja varmistettu. Koodimuutokset täyttävät Clible-arkkitehtuurin tietoturvavaatimukset ja haara on turvallista yhdistää `main`-haaraan.
