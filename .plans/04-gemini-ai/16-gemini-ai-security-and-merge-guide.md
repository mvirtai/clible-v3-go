# Kehityssuunnitelma & Ohje: Gemini AI -Integraatio ja Tietoturva (Kehityspolku D)

Tämä dokumentti kuvaa Clible-v3-go -projektin **Gemini AI -tekoälyintegraation** arkkitehtuuria, tiedonkulkuja sekä tietoturvallisuuden varmistamista (security checkpoints) ennen haaran mergeämistä `main`-haaraan.

---

## 1. Arkkitehtuuri ja Integraation Kulku (Architecture Overview)

Tekoälytoiminnot (Passage Insight, Sävyanalyysi, Käännösvertailu ja Alkukielitutkimus) on toteutettu Go-standardikirjaston ja Google Gemini API:n avulla ilman raskaiden ulkoisten kirjastojen tuomista backendiin.

```mermaid
graph TD
    subgraph Frontend (React & TS)
        UI[Käyttöliittymäkomponentit] -->|apiService.getAi*| API_Client[api.ts]
    end

    subgraph Backend (Go REST API)
        API_Client -->|HTTP POST + Auth JWT| Router[main.go / ServeMux]
        Router -->|1. requireAuth| Limit[Rate Limiter middleware]
        Limit -->|2. ipRateLimit| Handler[ai_handler.go]
        Handler -->|3. GetComparison/Insight/etc| Service[ai_service.go]
        Service -->|4. callGemini / models/*| Google_API[Google Gemini API]
    end
    
    subgraph Database
        Service -->|5. DB-hakujen suunnittelu & suoritus| SQLite[(PostgreSQL / SQLite fallback)]
    end
```

### Tiedonkulun vaiheet

1. **Frontend-kutsut**: Komponentit (kuten [VerseReader.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/VerseReader.tsx) tai [CompareView.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/CompareView.tsx)) kutsuvat [api.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/services/api.ts) -tiedostoon määriteltyjä metodeja.
2. **Backend-suojaus**: Pyynnöt saapuvat palvelimen [main.go](file:///home/vivaldev/code/clible-v3-go/backend/main.go) -tiedostoon, jossa ne ohjataan kahden väliohjelman läpi:
   - `requireAuth`: Varmistaa, että käyttäjällä on voimassa oleva istuntotunniste (JWT-cookie).
   - `aiRateLimit`: Rajoittaa IP-kohtaiset kutsut arvoon 15 kutsua / tunti.
3. **Käsittelijäkerros (`ai_handler.go`)**: Käsittelijä lukee JSON-pyynnön, tarkistaa syötteiden oikeellisuuden ja kutsuu AI-palvelukerrosta.
4. **Palvelukerros (`ai_service.go`)**: Muodostaa Gemini-promptit vakiomuotoisten persoonien ja sääntöjen (kuten `theologicalStance` ja `languageConsistencyRule`) mukaisesti ja tekee suoran HTTP POST -kutsun Googlen päätepisteeseen.
5. **Työtilatallennus**: Käyttäjän tallentaessa analyysin, se tallennetaan työtilan tietokantaan aggregated-muodossa (esim. `{ stats, tone, deepDive }`), jotta se voidaan palauttaa sivupalkista yhdellä kyselyllä ilman uutta Gemini-kuormitusta.

---

## 2. Tietoturva ja Laadunvarmistus (Security Checkpoints)

Tekoälyrajapinnat ovat alttiita sekä väärinkäytöksille (kustannuspiikit) että tietovuodoille (API-avaimet). Tässä ovat kriittisimmät tarkistuspisteet ennen mergen suorittamista:

### A. API-avaimien ja Salaisuuksien hallinta (Secret Management)
>
> [!CAUTION]
> **ÄLÄ KOSKAAN committoi tai puske API-avaimia Git-repositorioihin!**
> Varmista, että `.env` -tiedosto on edelleen `.gitignore` -listalla eikä kehitysavaintasi (`GEMINI_API_KEY`) ole lisätty Gitin seurantaan (`git status`).

- **Paikallinen kehitys**: Avain säilytetään ainoastaan paikallisessa `backend/.env` -tiedostossa muodossa:

  ```env
  GEMINI_API_KEY=AIzaSy...
  ```

- **Tuotantoympäristö (GCP Cloud Run / Neon)**:
  - Tuotantoympäristössä tekoälyavainta **ei syötetä** Cloud Runin ympäristömuuttujiin suoraan selkokielisenä tekstinä.
  - Avain tallennetaan **Google Cloud Secret Manageriin** salaisuudeksi (esim. nimellä `gemini-api-key`).
  - Secret Manager -salaisuus liitetään Cloud Run -konttiin ympäristömuuttujana `GEMINI_API_KEY` (aivan kuten aiemmin tehtiin JWT-salaisuudelle ja tietokannan osoitteelle).

### B. Kustannusten hallinta ja Rate Limiting (Rate Limiter)

Maksullisten tekoälyrajapintojen väärinkäyttö voi johtaa suuriin yllätyskustannuksiin.

- **IP-kohtainen rajoitin**: `/api/ai/*` -reitit on suojattu `middleware.NewIPRateLimiter(rate.Limit(15.0/3600.0), 5)` -rajoittimella. Tämä tarkoittaa, että yksittäinen IP-osoite voi tehdä enintään 15 kutsua tunnissa (sallien lyhyen 5 kutsun purskeen).
- **Tehokkaat mallit**: Oletusmalliksi on asetettu `gemini-3.1-flash-lite`, joka on huomattavasti edullisempi ja nopeampi kuin täysikokoinen `pro`-malli, mutta tarjoaa silti riittävän teologisen analyysilaadun.

### C. Käyttäjien valtuutus ja Eristys (Auth & Workspace Isolation)

- **JWT-suojaus**: Mikään tekoälyominaisuus ei ole julkisesti saatavilla. Kaikki reitit vaativat onnistuneen JWT-tunnistautumisen.

- **Työtilojen rajaus**: Kun tekoälytuloksia tallennetaan työtilaan (`apiService.saveAnalysis`), backend varmistaa, että tallennus liittyy valittuun `scopeId` -työtilaan, johon pyynnön tekevällä käyttäjällä on oikeus. Käyttäjät eivät voi nähdä tai muokata muiden käyttäjien työtiloihin tallennettuja analyysejä.

### D. Virheiden hallinta ja 503-tilat (Graceful Degradation)

Jos `GEMINI_API_KEY` puuttuu tai Google palauttaa virheen (esim. kiintiö täynnä), backend palauttaa siistin `503 Service Unavailable` JSON-virheen:

```json
{
  "error": "Gemini API key is not configured"
}
```

Käyttöliittymä osaa käsitellä tämän tilan näyttämällä ystävällisen ilmoituksen käyttökatkoksesta tai puuttuvasta avaimesta sen sijaan, että sovellus kaatuisi tai jäisi ikuiseen lataustilaan.

---

## 3. Merge-tarkistuslista Kehittäjälle (Merge Checklist)

Suorita seuraavat vaiheet ennen kuin yhdistät kehityshaaran `feat/gemini-ai-integration` päähaaraan (`main`):

- [ ] **Varmista Git-tila**: Aja `git status` ja tarkista, ettei `.env` tai mikään väliaikaistiedosto ole menossa committiin.
- [ ] **Suorita backend-yksikkötestit**:

  ```bash
  go test ./...
  ```

  Varmista, että kaikki testit (mukaan lukien uudet `ai_service_test.go` ja `ai_handler_test.go` mock-kuljetuksilla) menevät onnistuneesti läpi.
- [ ] **Suorita frontend-tyyppitarkastus ja build**:

  ```bash
  pnpm run build
  ```

  Varmista, ettei TypeScript-kääntäjä tai linter anna varoituksia tai virheitä.
- [ ] **Määritä salaisuudet Secret Manageriin**:
  - Tallenna tuotantoavaimesi Google Cloud Consoleen.
  - Varmista, että Terraform-skriptit tai manuaaliset Cloud Run -asetukset injektoivat `GEMINI_API_KEY` -muuttujan Secret Managerista.
- [ ] **Tee Squash ja Merge**: Kun kaikki tarkistukset ovat vihreänä, luo pull request ja suorita *Squash and Merge* siistin, lineaarisen Git-historian ylläpitämiseksi.
