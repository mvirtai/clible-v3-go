# 🔒 Tietoturva-auditointi — Tekoälysyventymisen polkukonteksti ja jatkoaiheet (AI Deepening Chain)

**Raportin tunniste:** `SECOPS-2026-11-05-001`  
**Kohde:** `feat/deepening-ai-features` -integraatiohaara (`POST /api/ai/deep-dive`, `useDeepDiveChain`, `NextFocusChips`)  
**Päivämäärä:** 2026-11-05  
**Auditoija:** Antigravity AI SecOps Agent & Kehittäjä  
**Raportin tila:** HYVÄKSYTTY (PASSED)  

---

## 1. Yhteenveto ja arvioinnin laajuus

Tietoturva-auditointi suoritettiin kohteelle **Tekoälysyventymisen polkukonteksti ja jatkoaiheet (AI Deepening Chain)**. Tarkastuksen tavoitteena oli varmistaa koodikannan vikasietoisuus, suojautuminen resurssien ehtymiseltä (DoS), syötteiden validointi sekä turvallinen tekoälykontekstin välitys ennen koodin yhdistämistä `main`-haaraan.

Tarkastelun kohteena olivat seuraavat osa-alueet:

1. **Autentikaatio ja autorisointi (CWE-285, CWE-862):**
   - Päätepiste `POST /api/ai/deep-dive` on suojattu backendin `RequireAuth`-middlewarella (`main.go`).
   - Käyttäjäkontekstin purkaminen ja käyttäjäkohtainen AI-kiintiöseuranta.

2. **Syötteiden validointi ja resurssienhallinta (CWE-400, CWE-20, CWE-770):**
   - `req.Context["path"]`-taulukon validointi ja sanitointi (`sanitizeDeepDivePath`).
   - Enimmäissyvyyden (5 tasoa) ja merkkimäärien (max 200 runea/aihe) ehdoton valvonta.
   - Suojaus muistin ylitäyttöä ja hallitsematonta token-kulutusta (Denial of Wallet / DoS) vastaan.

3. **Prompt-injektioiden ja kontekstin manipuloinnin esto (CWE-116):**
   - Polun elementtien tarkistus, tyhjien/valkoisten merkkien suodatus ja turvallinen liittäminen Gemini-järjestelmäkehotteeseen.
   - Mallin ohjeistus eksplisiittisellä `deepDiveSystemInstruction`-erottelulla.

4. **Käyttöliittymä ja selainturvallisuus (CWE-79):**
   - React 19:n automaattinen XSS-suojaus käyttäjälle renderöitävissä leivänmuruissa ja chippiteksteissä.
   - Saavutettavuus ja painiketilojen valvonta (`disabled`, `aria-busy`).

5. **Tietokantakerros ja riippuvuudet:**
   - Ominaisuus ei muuta SQL-skeemaa eikä lisää uusia ulkoisia riippuvuuksia.

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

- **Tarkasteltu:** Onko `POST /api/ai/deep-dive` suojattu kirjautumattomalta väärinkäytöltä?
- **Havainto:** Päätepiste vaatii todennetun käyttäjän (`RequireAuth(authService)`). Vieraspyynnöt hylätään koodilla `401 Unauthorized`. Käyttäjän pyynnöt lasketaan käyttäjäkohtaiseen token-kiintiöön.
- **Tila:** HYVÄKSYTTY (PASSED)

### 3.2 Syötteiden sanitointi ja DoS-suojaus (CWE-400, CWE-20)

- **Tarkasteltu:** Miten backend käsittelee asiakkaan toimittamaa `context.path`-taulukkoa?
- **Havainto:** `backend/internal/api/ai_handler.go`:ssa funktio `sanitizeDeepDivePath` suorittaa tiukan validoinnin:
  1. Hylkää pyynnön virheellä `400 Bad Request`, jos `path` ei ole taulukko (`[]interface{}`).
  2. Hylkää pyynnön, jos polussa on enemmän kuin 5 alkiota (`maxPathDepth = 5`).
  3. Hylkää ei-merkkijonot, tyhjät alkiot ja yli 200 runea pitkät aihenimet (`maxSegmentRunes = 200`).
  4. Tämä estää laajat prompt injection -hyökkäykset ja token-tulvat.
- **Tila:** HYVÄKSYTTY (PASSED)

### 3.3 Prompt-rakenteen eheys ja XSS-suojaus (CWE-116, CWE-79)

- **Tarkasteltu:** Miten polkuhierarkia toimitetaan kielimallille ja käyttöliittymään?
- **Havainto:** `backend/internal/services/ai_service.go` yhdistää sanitoidut alkiot muotoon `Aihe 1 → Aihe 2` osaksi erillistä kontekstiosiota ilman kontrollimerkkien tulkintaa. Käyttöliittymässä (`DeepDiveBreadcrumb`, `NextFocusChips`) tekstit renderöidään Reactin tekstisolmuina ilman `dangerouslySetInnerHTML`-kutsuja.
- **Tila:** HYVÄKSYTTY (PASSED)

---

## 4. Suoritetut työkalut ja tarkistuskomennot

- **Backend-laatuportti:**

  ```bash
  task backend:check
  ```

  Tulos: Kaikki yksikkö- ja taulukkotestit hyväksytty, linter puhdas, testikattavuus 77.6 %.
- **Frontend-laatuportti:**

  ```bash
  task frontend:check
  ```

  Tulos: TypeScript (`tsc -b`) 0 virhettä, ESLint 0 virhettä, Vitest 66 tiedostoa / 466 testiä hyväksytty.
- **Kokonaisvaltainen laatuportti:**

  ```bash
  task check
  ```

  Tulos: Kaikki järjestelmätestit läpäisty.

---

## 5. Johtopäätökset ja hyväksyntä

`feat/deepening-ai-features` täyttää Cliblen tiukat arkkitehtuuri- ja tietoturvavaatimukset. Päätepisteen syötevalidointi on suojattu DoS- ja injektioriskeiltä, ja käyttöliittymä noudattaa turvallista reaktiivista mallia. Muutos on valmis liitettäväksi tuotantoon.
