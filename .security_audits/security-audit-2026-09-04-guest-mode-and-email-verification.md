# 🔒 Tietoturva-auditointi — Vierastila & Sähköpostivahvistusjärjestelmä

**Raportin tunniste:** `SECOPS-2026-09-04-001`  
**Kohde:** `feat/guest-mode-and-email-verification-system` -kehityshaara (Autentikaatio, OTP-vahvistus, vierastila, käännösten pääsynhallinta, evästeet)  
**Päivämäärä:** 2026-09-04  
**Auditoija:** Antigravity AI SecOps Agent  
**Raportin tila:** HYVÄKSYTTY (PASSED) — 0 kriittistä, 0 korkeaa, 0 keskitason haavoittuvuutta  

---

## 1. Yhteenveto ja arvioinnin laajuus

Tietoturva-auditointi suoritettiin kehityshaaran `feat/guest-mode-and-email-verification-system` arkkitehtuurille ja lähdekoodille. Muutoskokonaisuus kattaa seuraavat keskeiset osa-alueet:

1. **Sähköpostivahvistusputki (Email Verification Pipeline):**
   - Kaksivaiheinen vahvistus: 6-numeroinen OTP-koodi käyttöliittymään sekä suora 64-merkkinen kertakäyttöinen URL-vahvistustoken.
   - 15 minuutin aikaraja (TTL) ja vanhenemistarkistus (`ErrVerificationExpired`).
   - Atominen käyttäjätilin aktivointi tietokantatransaktiossa (`MarkUserVerified`).
   - Kirjautumisen estäminen vahvistamattomilta käyttäjiltä (`ErrEmailNotVerified`, HTTP 403 Forbidden).

2. **Vierastilan pääsynhallinta (Guest Mode & Optional Auth):**
   - `OptionalAuthMiddleware`: sallii pyyntöjen läpimenon vierailijoina, mikäli JWT-evästettä ei ole tai se on virheellinen.
   - Käännösten ja jakeiden pääsyn rajaus: vierailijat saavat hakea ja lukea ainoastaan globaaleja julkisia käännöksiä (`is_global = true`). Yksityiset ja toisten käyttäjien omat käännökset pysyvät tiukasti eristettyinä (`IsGlobal`- ja `IsAccessible`-suojaukset).
   - Kirjoitusoperaatiot (muistikirjat, työtilat, tallennetut haut) vaativat todennetun ja vahvistetun käyttäjätunnuksen.

3. **Käyttöliittymä ja istunnonhallinta:**
   - Turvalliset `HttpOnly; SameSite=Lax; Secure` -evästeet JWT-tunnisteille.
   - XSS-suojaus: ei `dangerouslySetInnerHTML`-kutsuja, syötteiden sanitointi ja tyyppiturvallinen React 19.2 -renderöinti.

---

## 2. Havaintojen yhteenvetotaulukko

| Vakavuus | Lukumäärä | CVSS v3.1 -luokka | Tila |
| :--- | :---: | :---: | :--- |
| 🔴 **Kriittinen (Critical)** | 0 | 9.0–10.0 | — |
| 🟠 **Korkea (High)** | 0 | 7.0–8.9 | — |
| 🟡 **Keskitaso (Medium)** | 0 | 4.0–6.9 | — |
| 🔵 **Matala / Info (Low/Info)** | 1 | 0.1–3.9 | Huomioitu: OTP-koodien brute-force -rajoitus rate-limiterillä |
| **Yhteensä** | **1** | | |

---

## 3. Yksityiskohtaiset arviointikohteet ja analyysi

### 3.1 Salaus ja satunnaislukujen laatu (CWE-330, CWE-338)

* **OTP-koodin luonti (`GenerateOTP`):**
  * Koodissa hyödynnetään Go-kielen standardikirjaston kryptografisesti vahvaa satunnaislukugeneraattoria (`crypto/rand.Reader`) yhdessä `math/big.NewInt(1000000)` -metodin kanssa.
  * Tämä takaa tasaisen todennäköisyysjakauman lukualueella `000000–999999` ilman modulo-operaation aiheuttamaa harhaa (modulo bias).
* **URL-tokenin luonti (`GenerateURLToken`):**
  * Luodaan 32 tavun (256 bittiä) kryptografinen satunnaismerkkijono, joka heksakoodataan 64-merkkiseksi tokeniksi (`hex.EncodeToString`).
  * Entropia on erittäin korkea, mikä tekee tunnisteen arvaamisesta mahdotonta.

### 3.2 Käännösten eristys ja vierastilan aukot (CWE-285, CWE-862)

* **Tarkasteltu:** Estääkö järjestelmä vieraskäyttäjää lukemasta toisten käyttäjien henkilökohtaisia käännöksiä?
* **Havainto:**
  * `VerseService.GetVerses` ja `VerseService.SearchVerses` suorittavat autentikoimattomalle pyynnölle `s.translationRepo.IsGlobal(ctx, tid)` -tarkistuksen.
  * Jos käännös ei ole merkitty globaaliksi (`is_global = TRUE`), pyyntö hylätään välittömästi (`translation %q is not accessible`).
  * `TranslationHandler.ListTranslations` palauttaa vierailijalle vain `GetGlobalTranslations(ctx)` -tulokset.
  * SQL-kyselyt on parametrisoitu (`WHERE id = $1`), joten SQL-injektio on estetty.

### 3.3 Transaktioiden eheys ja rinnakkaisuus (CWE-362, CWE-662)

* **`MarkUserVerified`:**
  * Käyttäjän `is_verified = TRUE` ja vahvistustietueen `verified_at = NOW()` päivitetään saman tietokantatransaktion (`tx.Commit()`) sisällä.
  * Mikäli jompikumpi operaatio epäonnistuu, koko toimenpide peruutetaan automaattisesti (`tx.Rollback()`).
  * Idempotenssi: jo vahvistetun tilin uudelleenvahvistus hyväksytään hallitusti tuottamatta virhetilannetta.

### 3.4 Istunnonhallinta ja evästeet (CWE-614, CWE-1004)

* **JWT-evästeet (`setJWTCookie`):**
  * `HttpOnly = true` estää JavaScript-pohjaisen evästeen lukemisen selaimessa (XSS-suojaus).
  * `SameSite = http.SameSiteLaxMode` suojaa CSRF-hyökkäyksiltä ristiinpyynnöissä.
  * `Secure = isProduction` aktivoi HTTPS-pakotuksen tuotantoympäristössä.

---

## 4. Matala havainto & Huomiot

### SECOPS-2026-09-04-INFO-01: OTP-koodien brute-force -suojaus

* **Sijainti:** `backend/internal/api/auth_handler.go:VerifyEmail`
* **Riski:** 6-numeroisessa OTP-koodissa on 1 000 000 permutaatiota. 15 minuutin voimassaoloaikana nopea hyökkääjä voisi teoriassa yrittää brute-force -arvauksia, mikäli pyyntömäärää ei rajoiteta.
* **Nykytila ja lievennys:**
  * Clible-arkkitehtuurissa on käytössä globaali ja IP-kohtainen rate-limiter -middleware (`internal/middleware/rate_limit.go`), joka rajoittaa pyyntötiheyttä per IP-osoite.
  * Lisäksi vahvistustoken URL-linkissä on 256-bittinen avain, johon brute-force ei pure.
* **Suositus tulevaisuuteen:** Voidaan lisätä epäonnistuneiden OTP-yritysten laskuri (esim. max 5 väärää koodia per sähköpostiosoite ennen tilapäistä lukitusta).
* **CVSS v3.1:** 2.1 (Low) — `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N`

---

## 5. Johtopäätös

Muutokset täyttävät kaikki Clible-projektin tiukat tietoturvakriteerit:
- Autentikaatio ja autorisointi toimivat vikasietoisesti ja turvallisesti.
- Vierastilasta ei vuoda yksityisiä käännöksiä tai käyttäjätietoja.
- Koodi on 100 % parametrisoitu ja suojattu injektioilta.
- Kaikki backend- ja frontend-laaduntarkistukset (`task check`) menevät läpi 100 % onnistumisella.
