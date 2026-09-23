# 🔒 Tietoturva-auditointi — AI-tokentelemetria, käyttäjäprofiili ja asetukset

**Raportin tunniste:** `SECOPS-2026-09-22-002`  
**Kohde:** PR #94, PR #97, PR #98, PR #99 (`feat/ai-token-usage-tracking`, `feat/user-settings-and-profile-view`, `feat/user-menu-and-ai-usage-mobile-optimization`)  
**Päivämäärä:** 2026-09-22  
**Auditoijat:** Clible v3 Solution Architect & Antigravity AI SecOps Agent  
**Raportin tila:** 🟢 HYVÄKSYTTY (PASS) — 0 kriittistä, 0 korkeaa, 0 keskitasoa, 0 matalaa (Kaikki 3 löydöstä korjattu ja verifioitu)  

---

## 1. Johdanto ja auditoinnin laajuus

Tämä tietoturva-auditointi kattaa Clible v3 -ekosysteemiin toteutetut tekoälytokeneiden kulutuksen seurantaan, käyttäjäprofiiliin ja -asetuksiin sekä käyttäjävalikon optimointeihin liittyvät muutokset (PR #94, #97, #98 ja #99).

Tarkastelun kohteena olivat:

1. **HTTP-rajapinnat ja reititykset:**
   - `GET /api/ai/usage/me` ja `GET /api/ai/usage/summary` (`AiUsageHandler`)
   - `GET /api/user/settings`, `PUT /api/user/settings` ja `PUT /api/user/password` (`UserSettingsHandler`)
2. **Käyttöoikeuksien valvonta ja autentikaatio (CWE-285, CWE-862):**
   - Istuntokontekstin purku (`ctxkeys.GetUserID`)
   - IDOR-haavoittuvuuksien esto ja vieraskäyttäjien tietoturva
3. **Virheenkäsittely ja tietovuotojen esto (CWE-209 / OWASP A04:2021):**
   - Sisäisten virheiden ja tietokantayhteyksien vuotaminen asiakkaalle (`err.Error()`)
4. **Syötteiden validointi ja resurssienhallinta (CWE-20, CWE-400):**
   - Syötemerkkijonojen pituusrajaukset ja arvojoukot (whitelist-tarkistukset)
   - DoS-riskit ja aggregaatiokyselyiden kuormitus
5. **Käyttöliittymä ja frontend-turvallisuus (CWE-79):**
   - React 19.2 -komponentit (`AiTokenUsageModal.tsx`, `UserMenuDropdown.tsx`, `TranslationManager.tsx`)
   - XSS-suojaus, DOM-turvallisuus ja tilanhallinta

---

## 2. Havaintojen yhteenveto

| ID | Vakavuus | CWE | Kuvaus | Tila |
| :--- | :---: | :---: | :--- | :--- |
| **SEC-01** | 🟡 **Keskitaso (Medium)** | CWE-209 | Raaka tietokantavirheen vuoto (`err.Error()`) `GetSettings`-käsittelijässä | 🟢 **KORJATTU (Resolved)** |
| **SEC-02** | 🟡 **Keskitaso (Medium)** | CWE-862 | `GET /api/ai/usage/summary` on julkisesti saavutettavissa ilman admin-roolia | 🟢 **KORJATTU (Resolved)** |
| **SEC-03** | 🔵 **Matala (Low)** | CWE-20 | `DisplayName`-syötteen ylärajapituuden puute `UpdateSettings`-metodissa | 🟢 **KORJATTU (Resolved)** |
| **SEC-04** | 🟢 **Hyväksytty (Pass)** | CWE-89 | Kaikki SQL-kyselyt parametrisoituja (`$1, $2`) | Kunnossa |
| **SEC-05** | 🟢 **Hyväksytty (Pass)** | CWE-285 | `GetMyUsage` ja salasanamuutos suojattuja, IDOR estetty | Kunnossa |
| **SEC-06** | 🟢 **Hyväksytty (Pass)** | CWE-79 | Frontend-komponentit eivät käytä `dangerouslySetInnerHTML`, renderöinti puhdasta | Kunnossa |

---

## 3. Yksityiskohtainen analyysi ja toteutetut korjaukset

### 3.1 SEC-01: Raakavirheen vuoto asiakkaalle `GetSettings`-metodissa (CWE-209)

- **Sijainti:** [`backend/internal/api/user_settings_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/user_settings_handler.go)
- **Tila:** 🟢 **KORJATTU (Resolved)**
- **Kuvaus:**  
  Käsiteltäessä virhetilannetta `GetSettings`-metodissa virheviesti palautettiin aiemmin suoraan selaimelle (`"failed to load settings: "+err.Error()`), mikä saattoi vuotaa tietokannan sisäistä tilaa ja taulujen nimiä.
- **Toteutettu toimenpide:**  
  Tietokantavirhe kirjataan nyt turvallisesti palvelimen sisäiseen lokiin (`slog.Error("failed to load user settings", "error", err, "userId", userID)`), ja asiakkaalle palautetaan ainoastaan geneerinen virheviesti `"failed to load settings"`.

---

### 3.2 SEC-02: Globaalin AI-yhteenvedon julkinen saatavuus ilman admin-oikeuksia (CWE-862)

- **Sijainti:** [`backend/main.go`](file:///home/vivaldev/code/clible-v3-go/backend/main.go) ja [`backend/internal/api/ai_usage_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/ai_usage_handler.go)
- **Tila:** 🟢 **KORJATTU (Resolved)**
- **Kuvaus:**  
  Reitti `GET /api/ai/usage/summary` oli kytketty `optionalAuth`-kääreellä, jolloin alustan kokonaislukemat (käyttäjä- ja vierasjakaumat, ominaisuustilastot) olivat saavutettavissa julkisesti.
- **Toteutettu toimenpide:**  
  1. Reititys suojattiin `backend/main.go`:ssa `requireAuth`-middlewarella.
  2. Käsittelijään lisättiin lisäksi "defense-in-depth" -varmistus (`ctxkeys.GetUserID`), joka palauttaa `401 Unauthorized` mikäli pyyntö ei ole todennettu.
  3. Yksikkötestit (`TestAiUsageHandler_GetSummary`) päivitettiin kattamaan sekä luvattoman pyynnön esto (401) että todennetun pyynnön hyväksyminen (200).

---

### 3.3 SEC-03: `DisplayName`-kentän pituusrajoituksen puute (CWE-20)

- **Sijainti:** [`backend/internal/api/user_settings_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/user_settings_handler.go)
- **Tila:** 🟢 **KORJATTU (Resolved)**
- **Kuvaus:**  
  `UpdateSettings`-metodissa syötekenttää `input.DisplayName` trimmattiin, mutta sen enimmäispituutta ei ollut rajoitettu.
- **Toteutettu toimenpide:**  
  Lisättiin tiukka pituusvalidointi `len(input.DisplayName) > 100`, joka palauttaa `400 Bad Request` virheilmoituksella `"display name too long (max 100 characters)"`. Lisätty kattava yksikkötesti `TestUserSettingsHandler_UpdateSettings/display_name_exceeding_100_characters_returns_400`.

---

## 4. Vahvuudet ja hyvät käytännöt (Strengths)

1. **SQL-injektioturva (CWE-89):**  
   Kaikki `ai_usage_repo.go`- ja `user_repo.go`-tietokantakyselyt käyttävät tiukasti parametrisoituja lausekkeita (`$1, $2, ...`). Injektiouhkaa ei ole.
2. **Käyttäjien välinen eristys (IDOR-suojaus):**  
   Omakohtainen telemetria (`/api/ai/usage/me`) ja käyttäjäasetukset (`/api/user/settings`) lukevat aina käyttäjän tunnisteen luotettavasti JWT/istuntokontekstista (`ctxkeys.GetUserID`). Asiakkaan antamaa käyttäjä-ID:tä ei käytetä suodattimena.
3. **Salasananhallinta (CWE-521, CWE-916):**  
   `UpdatePassword` vaatii nykyisen salasanan todentamisen (`bcrypt.CompareHashAndPassword`), uuden salasanan monimutkaisuustarkistuksen (`validatePassword`) ja käyttää vahvaa kustannuskerrointa 12 (`bcrypt.GenerateFromPassword(..., 12)`).
4. **Vieras- ja käyttäjärajapintojen erotus (PR #99):**  
   `AiTokenUsageModal.tsx` ei enää vuoda alustan kokonaislukemia vieraskäyttäjille, vaan näyttää sisäänkirjautumiskehotteen ilman tarpeettomia API-kutsuja.

---

## 5. Laatuportit ja verifiointi

Kaikki korjaukset on auditoitu ja varmistettu Clible-laatuporteilla:

- **Backend-testit ja linter:** `task backend:check` (Go mod tidy, lint, 76.4% test coverage — kaikki testit läpi)
- **Frontend-tarkistukset:** `task frontend:check` (ESLint puhdas, Vitest 330 testiä läpi)
- **Kokonaislaatuportti:** `task check` läpäisty 100% virheettömästi.
