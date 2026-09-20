# 🔒 Tietoturva-auditointi — AI Token Telemetria, Käyttäjäavatarit ja Keskitetty Käyttäjävalikko

**Raportin tunniste:** `SECOPS-2026-09-20-001`  
**Kohde:** `feat/ai-token-usage-tracking` -integraatiohaara (PR #94: `ai_token_usage.sql`, `ai_usage_repo.go`, `ai_usage_service.go`, `ai_usage_handler.go`, `ai_service.go`, `UserAvatar.tsx`, `UserMenuDropdown.tsx`, `AiTokenUsageModal.tsx`, `AppHeader.tsx`, `avatars.tsx`)  
**Päivämäärä:** 2026-09-20  
**Auditoija:** Antigravity AI SecOps Agent & Kehittäjä  
**Raportin tila:** HYVÄKSYTTY (PASSED) — 0 kriittistä, 0 korkeaa, 0 keskitason haavoittuvuutta  

---

## 1. Yhteenveto ja arvioinnin laajuus

Tietoturva-auditointi suoritettiin Clible v3.5.0 -julkaisuhaaran (`feat/ai-token-usage-tracking`, PR #94) arkkitehtuurikokonaisuudelle. Tarkastuksen tavoitteena oli varmistaa taustajärjestelmän tietokantamuutosten, telemetrian tallennuksen, HTTP-rajapintojen, käyttöoikeustarkistusten sekä käyttöliittymäkomponenttien turvallisuus, vikasietoisuus ja suorituskyky ennen koodin yhdistämistä `main`-haaraan.

Tarkastelun kohteena olivat seuraavat osa-alueet:

1. **Autentikaatio ja käyttöoikeuksien valvonta (CWE-285, CWE-862):**
   - Käyttäjäkontekstin purkaminen (`ctxkeys.GetUserID`) suojatuissa reiteissä.
   - Pääsynhallinta omakohtaiseen telemetriaan (`GET /api/ai/usage/me`) vs. julkiseen yhteenvetoon (`GET /api/ai/usage/summary`).
   - IDOR-haavoittuvuuksien (Insecure Direct Object Reference) esto ja vierastilan (Guest Explorer) eristys.

2. **Tietokantakyselyiden turvallisuus ja SQL-injektiot (CWE-89):**
   - Kyselyiden parametrisointi (`$1, $2`) repository-kerroksessa (`ai_usage_repo.go`).
   - Dual-driver -yhteensopivuus (Neon PostgreSQL tuotannossa ja SQLite muistitesteissä).
   - Tietokantamigraation eheyden ja viite-eheyden (`ON DELETE SET NULL`) varmistus.

3. **Syötteiden validointi ja resurssienhallinta (CWE-400, CWE-770):**
   - Rajapinnan aikaraja- ja hakuparametrien (`days`) validointi ja rajaus.
   - Muistin ja suorittimen $O(1)$-lineaarisuus tilastokyselyissä ilman palvelunestoriskiä (DoS).
   - Taustajärjestelmän telemetriatallennuksen vikasietoisuus ydinpalveluiden (Gemini API) suorituskyvyn takaamiseksi.

4. **Käyttöliittymä ja DOM/XSS-turvallisuus (CWE-79, CWE-116):**
   - SVG-avatarvektorien ja nimikirjainten (monogrammien) turvallinen renderöinti selaimessa.
   - Zero-`useEffect` -arkkitehtuuri ja modaalin eristys `createPortal(..., document.body)` -mallilla.
   - Kaksikielisyyden (`i18n.ts`) ja saavutettavuuden (WCAG, ARIA-roolit) toteutus.

5. **Riippuvuuksien ja toimitusketjun tarkistus (CWE-1395):**
   - Moduuli- ja pakettimuutokset (`go.mod`, `package.json`).

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

## 3. Yksityiskohtaiset havainnot ja analyysi

### 3.1 Autentikaatio, käyttöoikeuksien tarkistus ja IDOR-suojaus (CWE-285, CWE-862)

* **Tarkasteltu:** Ovatko uudet rajapinnat ja telemetriatoiminnot asianmukaisesti suojattuja, ja voiko käyttäjä päästä käsiksi toisen käyttäjän telemetriatietoihin?
* **Havainto:**
  * **Reitityssuojaus (`backend/main.go`):**
    - `GET /api/ai/usage/me` on suojattu `requireAuth`-middlewarella.
    - `GET /api/ai/usage/summary` on suojattu `optionalAuth`-middlewarella, jolloin se palvelee sekä kirjautuneita käyttäjiä että vierailijoita.
  * **IDOR-suojaus (`backend/internal/api/ai_usage_handler.go`):**
    - `GetMyUsage`-käsittelijässä käyttäjän ID luetaan suoraan kryptografisesti todennetusta JWT-kontekstista: `userID, ok := ctxkeys.GetUserID(r.Context())`.
    - Mikäli tunniste puuttuu tai ei ole validi, pyyntö hylätään välittömästi tilakoodilla `401 Unauthorized`.
    - Käsittelijä ei ota vastaan eikä luota mihinkään URL- tai body-parametrinä toimitettuun käyttäjätunnukseen. Näin ollen IDOR-haavoittuvuus on poissuljettu.
  * **Tietosuojan toteutuminen yhteenvedossa (`GetSummary`):**
    - Julkinen koontikysely palauttaa ainoastaan aggregoituja kokonaislukuja (`TotalCalls`, `TotalPromptTokens`, `TotalCandTokens`, `TotalTokens`, `CachedTokens`) ja toimintokohtaisia ryhmittelyitä (`ByFeature`).
    - Yksittäisten käyttäjien sähköpostiosoitteita, käyttäjätunnuksia tai kehotetekstejä ei koskaan palauteta rajapinnasta.
  * **Telemetrian sidonta (`backend/internal/services/ai_service.go`):**
    - `recordUsage`-metodi liittää todennetun käyttäjän ID:n tietueeseen (`u.UserID = &userID`). Jos kutsujana on vierailija tai tunnistetta ei ole, tietue merkitään anonyymiksi (`u.GuestID = &guest`, `u.UserID = nil`).
    - Telemetrian tallennusvirheet lokitetaan varoituksena (`slog.Warn`), jolloin mahdollinen telemetriavirhe ei keskeytä käyttäjän ydinpyyntöä.
* **Tila:** HYVÄKSYTTY

### 3.2 SQL-parametrisointi, tietokantakerros ja migraatio (CWE-89)

* **Tarkasteltu:** Käytetäänkö kaikissa kyselyissä parametreja ja onko tietokantamigraatio turvallinen?
* **Havainto:**
  * **Repository-kerros (`backend/internal/db/ai_usage_repo.go`):**
    - Kaikki tietokantakyselyt (`RecordUsage`, `GetUserStats`, `GetGuestStats`, `GetGlobalSummary`) käyttävät poikkeuksetta paikkamerkkejä (`$1, $2, ...`) ja `database/sql`-kirjaston parametrisoituja metodeja (`ExecContext`, `QueryRowContext`, `QueryContext`).
    - Dynaamista merkkijonoyhdistämistä (`fmt.Sprintf`) ei käytetä missään kyselyssä. SQL-injektioriski on 0 %.
    - Kaikki tietokantakutsut välittävät `context.Context`-olion, jolloin haku keskeytyy välittömästi asiakkaan sulkiessa yhteyden.
    - Tietokantatulosten vapautus on suojattu asianmukaisesti: `defer func() { _ = rows.Close() }()` ja rivien läpikäynnin virhetarkistus `rows.Err()`.
  * **Tietokantamigraatio (`backend/migrations/016_ai_token_usage.sql`):**
    - Luotu taulu `ai_token_usage` ja tarvittavat indeksit (`user_id`, `guest_id`, `feature`, `created_at`).
    - Viiteavain `user_id TEXT REFERENCES users(id) ON DELETE SET NULL` takaa, että käyttäjätilin poistamisen yhteydessä telemetriahistoria säilyy anonyyminä ilman eheysvirheitä tai orpoja tietueita.
* **Tila:** HYVÄKSYTTY

### 3.3 Syötteiden validointi ja resurssienhallinta (CWE-400, CWE-770)

* **Tarkasteltu:** Rajoitetaanko käyttäjän syötteitä ja onko järjestelmä suojattu resurssien ylikulutukselta (DoS)?
* **Havainto:**
  * **Kyselyparametrin sanitointi (`ai_usage_handler.go`):**
    - Aikarajausparametri `days` parsitaan numeerisesti `strconv.Atoi`-funktiolla.
    - Parametrin arvo on tiukasti rajattu välille 1–365 päivää (`parsed > 0 && parsed <= 365`). Virheelliset tai rajat ylittävät arvot korvataan turvallisella oletusarvolla (30 päivää).
    - Tämä estää negatiiviset aikasiirtymät ja kohtuuttoman raskaat historiahaut.
  * **Muistinkäytön rajat:**
    - Vastaukset sarjallistetaan virtaavasti (`json.NewEncoder(w).Encode`), mikä minimoi keon allokaatiot.
    - Koontitilastojen tulosjoukko on pienikokoinen ja rajattu AI-toimintojen määrään (7 toimintoa), joten muistinkulutus on vakio $O(1)$.
* **Tila:** HYVÄKSYTTY

### 3.4 Käyttöliittymä, DOM/XSS-turvallisuus ja React 19.2 -arkkitehtuuri (CWE-79, CWE-116)

* **Tarkasteltu:** Voivatko käyttäjän antamat tiedot (nimet, sähköpostit) tai SVG-vektorit johtaa selaimen skripti-injektioihin (XSS)?
* **Havainto:**
  * **XSS- ja DOM-turvallisuus (`UserAvatar.tsx`, `avatars.tsx`, `UserMenuDropdown.tsx`):**
    - Missään käyttöliittymäkomponentissa ei käytetä `dangerouslySetInnerHTML`-metodia.
    - Kaikki käyttäjän syötteet (kuten `user.name` ja `user.email`) renderöidään Reactin sisäänrakennetun automaattisen tekstisolmun kautta.
    - Nimikirjainten parsinta (`getUserInitials`) sisältää tiukat tyyppivahvistukset ja suojaukset (`!name || typeof name !== 'string'`).
    - Kaikki 10 teema-avataria (`avatars.tsx`) on määritelty puhtaina, kovakoodattuina SVG JSX -elementteinä ilman dynaamista HTML-injektiomahdollisuutta.
    - Deterministinen hash-funktio (`getAvatarIndex`) on turvallinen eikä aiheuta sivuvaikutuksia.
  * **React 19.2 -arkkitehtuuristandardit:**
    - `AiTokenUsageModal` käyttää `useActionState`- ja `startTransition`-koukkuja asynkroniseen datanhakuun.
    - `UserMenuDropdown` toteuttaa taustan sulkemisen puhtaalla deklaratiivisella peittokomponentilla ilman epäpuhtaita `useEffect`-tapahtumakuuntelijoita.
    - Modaali ankkuroidaan turvallisesti `createPortal(..., document.body)` -mallilla, mikä estää leikkautumis- ja z-index-ongelmat.
  * **Kaksikielisyys (`i18n.ts`) & Saavutettavuus:**
    - Kaikki tekstit, työkaluvihjeet ja ARIA-määritteet (`role="dialog"`, `role="menu"`, `aria-label`) on lokalisoitu sekä suomeksi (`fi`) että englanniksi (`en`).
* **Tila:** HYVÄKSYTTY

### 3.5 Riippuvuudet ja toimitusketju (CWE-1395)

* **Tarkasteltu:** Onko integraatiohaarassa otettu käyttöön uusia kolmannen osapuolen kirjastoja tai aiheutettu toimitusketjuriskejä?
* **Havainto:**
  * `go.mod`-tiedostoon ei ole lisätty uusia riippuvuuksia. Taustajärjestelmä käyttää Go-standardikirjastoa ja projektin jo hyväksyttyjä perusriippuvuuksia (`github.com/google/uuid`).
  * `frontend/package.json`-tiedostoon ei ole lisätty uusia npm-riippuvuuksia; ainoastaan versionumero päivitettiin arvoon `3.5.0`.
* **Tila:** HYVÄKSYTTY

---

## 4. Suoritetut työkalut ja tarkistuskomennot

1. **Täysi laatuporttitarkistus (Backend & Frontend):**
   ```bash
   task check
   ```
   *Tulos:* Kaikki laatuportit läpäisty puhtaasti (Go mod tidy, backend lint, frontend lint, backend testit, frontend testit).

2. **Backend-yksikkötestit ja testikattavuus:**
   ```bash
   task backend:test
   ```
   *Tulos:* Kaikki testit läpäisty, mukaan lukien `TestAiUsageRepository_RecordAndAggregate`, `TestAiUsageHandler_GetMyUsage`, `TestAiUsageHandler_GetSummary` ja `TestAIService_UsageTracking`. Lausekekattavuus: **77.3 %** (`.cov/backend/coverage.txt`).

3. **Frontend-testit (Vitest):**
   ```bash
   task frontend:test
   ```
   *Tulos:* **36 testitiedostoa, 300 testiä läpäisty 100 % puhtaasti** (0 virhettä, 0 epäonnistumista).

---

## 5. Johtopäätös ja toimenpiteet

Kaikki kriittiset, korkean ja keskitason riskikohteet on auditoitu, analysoitu ja todennettu. Haaran `feat/ai-token-usage-tracking` (PR #94) muutokset noudattavat tarkasti Clible-arkkitehtuurin tiukimpia tietoturva-, vikasietoisuus- ja koodausstandardeja.

Haarassa ei ole tunnettuja haavoittuvuuksia tai tietoturvaesteitä, ja se on **turvallista yhdistää (merge) `main`-haaraan**.
