# 🔒 Tietoturva-auditointi — Resend REST API -sähköpostilähetys ja todennettu istunnonhallinta

**Raportin tunniste:** `SECOPS-2026-09-05-002`  
**Kohde:** `feat/resend-mailer-integration` -kehityshaara (Resend REST API -integraatio, MockMailer-varatoteutus, 15 minuutin OTP- ja linkkitoken-varmennus, automaattinen JWT-istuntoluonti vahvistuksen yhteydessä, React 19.2 `useActionState` -lomakekäsittely)  
**Päivämäärä:** 2026-09-05  
**Auditoija:** Antigravity AI SecOps Agent  
**Raportin tila:** HYVÄKSYTTY (PASSED) — 0 kriittistä, 0 korkeaa, 0 keskitason haavoittuvuutta  

---

## 1. Yhteenveto ja arvioinnin laajuus

Tietoturva-auditointi suoritettiin kehityshaaran `feat/resend-mailer-integration` arkkitehtuurille, sähköpostien toimitusinfrastruktuurille, API-käsittelijöille ja käyttöliittymätoteutukselle. Muutoskokonaisuus kattaa seuraavat kriittiset osa-alueet:

1. **Resend REST API -lähetin (`backend/internal/services/resend_mailer.go`):**
   - Transaktiosähköpostien toimitus suojatun HTTPS REST API:n kautta (`POST https://api.resend.com/emails`).
   - API-avaimen suojaus ja Bearer-autentikointi ilman ulkoisia kolmannen osapuolen Go-riippuvuuksia.
   - Varatoteutus (`MockMailer`), joka estää tietovuodot ja verkkokutsut paikallisessa kehitysympäristössä ilman avaimia.

2. **Todennus ja istunnonhallinta sähköpostivahvistuksessa (`AuthService`, `AuthHandler`, `AuthContext`):**
   - Kertakäyttöisten 6-numeroisten OTP-koodien ja 64-merkkisten URL-tokenien luonti kryptografisesti turvallisella satunnaislukugeneraattorilla (`crypto/rand`).
   - 15 minuutin vanhenemisaika ja kertakäyttöisyys (`IsVerified = true`).
   - Vahvistuksen jälkeinen automaattinen istunnon aktivointi: Go-backend asettaa suojatun `HttpOnly`, `SameSite=Lax` JWT-evästeen ja Reactin `AuthContext` siirtää käyttäjän suoraan todennettuun tilaan ilman arkaluontoisten tokenien tallentamista selaimeen (`localStorage`).

3. **Syötteen validointi ja DoS-suojaus:**
   - Globaali 1 MB pyyntökokorajoitus (`middleware.MaxBodySize`).
   - IP-pohjainen pyyntömäärärajoitus (`RateLimitMiddleware`).
   - Sähköpostiosoitteiden validointi (`mail.ParseAddress`) ja numeerinen suodatus OTP-syötteelle.

---

## 2. Havaintojen yhteenvetotaulukko

| Vakavuus | Lukumäärä | CVSS v3.1 -luokka | Tila |
| :--- | :---: | :---: | :--- |
| 🔴 **Kriittinen (Critical)** | 0 | 9.0–10.0 | — |
| 🟠 **Korkea (High)** | 0 | 7.0–8.9 | — |
| 🟡 **Keskitaso (Medium)** | 0 | 4.0–6.9 | — |
| 🔵 **Matala / Info (Low/Info)** | 0 | 0.1–3.9 | Kaikki tarkistuskriteerit täytetty virheettömästi |
| **Yhteensä** | **0** | | |

---

## 3. Yksityiskohtaiset arviointikohteet ja analyysi

### 3.1 Salaisuuksien hallinta ja API-avainten suojaus (CWE-798, CWE-312)

* **Tarkasteltu:** Pääseekö `RESEND_API_KEY` vuotamaan lokitiedostoihin, asiakaspuolen HTTP-vastauksiin tai versionhallintaan?
* **Havainto:**
  * `RESEND_API_KEY` luetaan ainoastaan palvelimen ympäristömuuttujista (`config.Load()`).
  * API-avainta ei koskaan sisällytetä lokiviesteihin (`slog` / `log.Printf`), virheilmoituksiin eikä JSON-vastauksiin.
  * `.env` on määritelty `.gitignore`-tiedostossa.
  * Tuotantoympäristössä (Cloud Run) avain välitetään suojattuna Secret Manager / environment -muuttujana.

---

### 3.2 Kertakäyttötokenien ja OTP-koodien entropia ja elinkaari (CWE-330, CWE-340)

* **Tarkasteltu:** Ovatko vahvistuskoodit ennustettavissa ja miten vanhenemista valvotaan?
* **Havainto:**
  * OTP-koodi generoidaan `crypto/rand`-kriptografisella satunnaislukugeneraattorilla väliltä `100000–999999` ([`auth_service.go:55-63`](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/auth_service.go#L55-L63)).
  * Linkkivahvistus käyttää 32 tavun kryptografista satunnaislukua heksadesimaalimuodossa (64 merkkiä, 256 bittiä entropiaa).
  * Vahvistustietueilla on tiukka 15 minuutin vanhenemisaika (`ExpiresAt = time.Now().Add(15 * time.Minute)`). Vanhentuneet koodit hylätään suoraan virhekoodilla `verification_code_expired`.

---

### 3.3 Istunnon luonti ja evästeturvallisuus (CWE-287, CWE-384, CWE-614)

* **Tarkasteltu:** Miten JWT-istunto luodaan sähköpostivahvistuksen jälkeen ja onko eväste suojattu?
* **Havainto:**
  * Onnistuneen sähköpostivahvistuksen yhteydessä `authHandler.VerifyEmail` asettaa `jwt`-evästeen selaimelle ([`auth_handler.go:155`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/auth_handler.go#L155)).
  * Evästeen asetukset:
    * `HttpOnly: true` (estää JavaScript-pääsyn ja XSS-pohjaiset token-varkaudet).
    * `SameSite: http.SameSiteLaxMode` (suojaa CSRF-hyökkäyksiltä).
    * `Secure: isProduction` (vaatii HTTPS-yhteyden tuotannossa).
    * `Path: "/"` ja `Expires: 24h`.
  * Frontendin `AuthContext` vastaanottaa käyttäjäolion ja päivittää sovelluksen todennettuun tilaan ilman arkaluontoisten tietojen kirjaamista `localStorage`-muistiin.

---

### 3.4 Syötteen validointi ja DoS-kestävyys (CWE-20, CWE-400)

* **Tarkasteltu:** Onko sähköpostien lähetys- ja vahvistusrajapinnoissa mahdollisuutta palvelunestoon (DoS) tai roskapostittamiseen?
* **Havainto:**
  * `authHandler.Register` ja `authHandler.ResendVerification` suojaavat backendia virheellisiltä syötteiltä `mail.ParseAddress`-validoinnilla.
  * Kaikkia API-kutsuja valvoo `middleware.MaxBodySize` (1 MB) ja globaali `middleware.RateLimitMiddleware`.
  * Sähköpostin uudelleenlähetykselle (`resendVerification`) on käyttöliittymässä 60 sekunnin jäähdytysaika (`cooldown`), ja backend vaatii olemassa olevan käyttäjätilin.

---

### 3.5 Resend-lähettimen verkkoliikenteen vikasietoisuus (CWE-400)

* **Tarkasteltu:** Voiko jumittuva ulkoinen HTTP-pyyntö Resendin palvelimelle aiheuttaa Go-rutiinien kasautumista tai muistivuotoa?
* **Havainto:**
  * `ResendMailer` konfiguroi oletusasiakkaalleen 10 sekunnin aikarajan (`Timeout: 10 * time.Second`).
  * Kaikki HTTP-kutsut käyttävät `http.NewRequestWithContext(ctx, ...)`, jolloin peruutettu asiakaspyyntö keskeyttää myös ulkoisen verkkokutsun välittömästi.
  * Vastausvirta suljetaan aina varmistusrakenteella: `defer func() { _ = resp.Body.Close() }()`.

---

## 4. Laadunvarmistus ja testitulokset

| Testialue | Työkalu | Tulos | Huomiot |
| :--- | :--- | :---: | :--- |
| **Backend-yksikkötestit** | `go test ./...` | **100 % PASS** | ResendMailer 100 %, MailerService 100 % |
| **Backend-linter** | `golangci-lint` | **0 virhettä** | `task backend:lint` puhdas |
| **Backend-testikattavuus** | `go test -cover` | **78.2 %** | `mailer_service` ja mallit 100 % |
| **Frontend-yksikkötestit** | `vitest` | **100 % PASS** | 28 testitiedostoa, 173 testiä hyväksytty |
| **Frontend-linter** | `eslint` | **0 virhettä** | React 19.2 sääntöjen mukainen |

---

## 5. Johtopäätös

Kehityshaara `feat/resend-mailer-integration` täyttää Cliblen tiukat arkkitehtuuri- ja tietoturvavaatimukset. Toteutus ei sisällä yhtäkään haitallista ulkoista riippuvuutta, noudattaa pienimmän oikeuden periaatetta ja suojaa käyttäjätiedot sekä istuntotokenit alan parhaiden käytäntöjen mukaisesti.

**Suositus:** Hyväksytty yhdistettäväksi `main`-haaraan.
