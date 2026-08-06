# 🔒 Tietoturva-auditointi — Cloud Run & Domain `clible.fi` -siirto

**Raportin tunniste:** `SECOPS-2026-08-06-001`  
**Kohde:** `clible-v3-go` (Backend & Tekoälyominaisuudet domain-siirtoa varten)  
**Päivämäärä:** 2026-08-06  
**Auditoija:** Antigravity AI SecOps Agent  
**Raportin tila:** VALMIS — ✅ Kaikki tietoturvakorjaukset toteutettu & mergetty (PR 055)  

---

## Yhteenveto

Sovelluksen `clible-v3-go` tietoturva auditointiin liittyen verkkotunnuksen `clible.fi` siirtoon ja GCP Cloud Run -ympäristöön siirtymiseen.

Kokonaisuudessaan sovelluksen perustietoturva (autentikaatio, salasanaehdot, SQL-injektiosuojaus, JWT-salaisuuksien hallinta ja tekoälyintegraation `SystemInstruction`-rakenne) on **erittäin korkeatasoinen**.

Ennen kuin domain `clible.fi` otetaan tuotantokäyttöön, havaittiin **3 tärkeää kohtaa** (CORS-domain, Cloud Run IP rate limiting proxy-ohitus sekä AI-syötteiden kokorajoitus), jotka tulee korjata toimivuuden ja tietoturvan varmistamiseksi.

---

### Havaintojen kokonaiskuva

| Vakavuus | Lukumäärä | CVSS-luokka | Tila |
|----------|-----------|-------------|------|
| 🔴 Kriittinen | 0 | 9.0–10.0 | — |
| 🟠 Korkea | 1 | 7.0–8.9 | ✅ Korjattu (PR 055) |
| 🟡 Keskitaso | 2 | 4.0–6.9 | ✅ Korjattu (PR 055) |
| 🔵 Matala | 2 | 0.1–3.9 | ✅ Korjattu (PR 055) |
| **Yhteensä** | **5** | | |

---

## 🟠 KORKEAN VAKAVUUDEN HAVAINNOT

### VULN-001: CORS Domain Puuttuu — `clible.fi` pyynnöt estyvät selaimessa

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **7.5 (High)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` |
| **Sijainti** | [`backend/internal/middleware/cors.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/middleware/cors.go#L5-L8) |
| **Tila** | ✅ **Korjattu (PR 055)** |

**Kuvaus:**
Kooditiedostossa `cors.go` on sallittujen `Origin`-otsakkeiden kartta kovakoodattuna vain paikallisiin osoitteisiin:
```go
var allowedOrigins = map[string]bool{
    "http://localhost:5173": true,
    "http://localhost:8080": true,
}
```
Kun sovellus siirretään osoitteeseen `https://clible.fi` (tai `https://www.clible.fi`), selain tekee rajapintapyyntöjä kyseisestä originista. Palvelin ei aseta `Access-Control-Allow-Origin` -otsaketta `clible.fi`-osoitteelle, jolloin selain estää vastauksien lukemisen ja käyttöliittymä rikkoutuu.

**Suositus:**
Konfiguroi CORS lukemaan sallitut domainit dynaamisesti ympäristömuuttujasta `ALLOWED_ORIGINS` (tai lisää `https://clible.fi` ja `https://www.clible.fi` sallittuihin originoihin):
```go
var allowedOrigins = map[string]bool{
    "http://localhost:5173": true,
    "http://localhost:8080": true,
    "https://clible.fi":     true,
    "https://www.clible.fi": true,
}
```

---

## 🟡 KESKITASON HAVAINNOT

### VULN-002: Rate Limiter lukee IP-osoitteen väärin Cloud Run -ympäristössä (Proxy IP issue)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **6.5 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H` |
| **Sijainti** | [`backend/internal/middleware/ratelimit.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/middleware/ratelimit.go#L80-L84) |
| **Tila** | ✅ **Korjattu (PR 055)** |

**Kuvaus:**
Koodissa `RateLimitMiddleware` päättelee asiakkaan IP-osoitteen suoraan `r.RemoteAddr`-kentästä:
```go
ip, _, err := net.SplitHostPort(r.RemoteAddr)
```
GCP Cloud Runissa kaikki saapuvat HTTP-pyynnöt kulkevat Google Cloud Load Balancerin / Cloud Run -käänteiskontrollerin kautta. Tällöin `r.RemoteAddr` sisältää Cloud Runin sisäisen proxy-IP:n.

Tämä aiheuttaa kaksi vakavaa ongelmaa:
1. **Kaikki sovelluksen käyttäjät jakavat saman Rate Limit -kiintiön (esim. 15 tekoälypyyntöä/tunti).** Kun yksi käyttäjä tekee 5 pyyntöä, kaikkien muidenkin käyttäjien tekoälypyynnöt lukittuvat virheellä `HTTP 429 Too Many Requests`.
2. Asiakaskohtainen IP-rajoitus ei toimi oikeasti.

**Suositus:**
Muokkaa `ratelimit.go`-middlewarea tarkistamaan ensin `X-Forwarded-For`-otsake (joka sisältää asiakkaan todellisen julkisen IP-osoitteen GCP LB:n takana) tai vaihtoehtoisesti rajoittamaan tekoälyrajapinnat tunnistautuneen käyttäjän `user_id`:n perusteella.

---

### VULN-003: Tekoälyrajapintojen Pyyntökokojen (Payload Size Limit) Puute

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **5.3 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L` |
| **Sijainti** | [`backend/internal/api/ai_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/ai_handler.go#L37-L220) |
| **Tila** | ✅ **Korjattu (PR 055)** |

**Kuvaus:**
AI-endpointit (`POST /api/ai/insight`, `/tone`, `/deep-dive`, `/original-study`, `/search`, `/compare`) eivät rajoita saapuvan pyynnön body-kokoa (`http.MaxBytesReader`) eivätkä syötekentän `text` / `topic` merkkimäärää.

Hyökkääjä tai virheellisesti toimiva asiakassovellus voisi lähettää esim. 20 MB tekstisyötteen. Tämä johtaisi:
- Suurena muistinkulutuksena Go-palvelimella
- Gemini API -tokenkiintiöiden ja maksimikonteksti-ikkunan ylittämiseen
- Mahdollisiin turhiin GCP API -kustannuspiikkeihin

**Suositus:**
Lisää pyynnön koon rajoitus `ai_handler.go`-tiedostoon:
```go
r.Body = http.MaxBytesReader(w, r.Body, 100*1024) // max 100 KB per AI-pyyntö
```
sekä tarkista merkkijonon pituus koodissa (esim. `if len(req.Text) > 10000 { ... }`).

---

## 🔵 MATALAN VAKAVUUDEN HAVAINNOT & SUOSITUKSET

### VULN-004: JWT Cookie `Secure`-lippu riippuu muuttujasta `ENV=production`

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **3.7 (Low)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | [`backend/internal/api/auth_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/auth_handler.go#L114) |
| **Tila** | ✅ **Tarkistettu & Varmistettu (PR 055)** |

**Kuvaus:**
JWT Cookie asetetaan `Secure: true` ainoastaan silloin, kun `os.Getenv("ENV") == "production"`. Jos Cloud Run -ympäristömuuttujissa lukee esim. `ENV=prod` tai se jätetään tyhjäksi, eväste lähetetään ilman `Secure`-lippua.

**Suositus:**
Varmista Cloud Run -konfiguraatiossa (Terraform / Console), että `ENV=production` on määritelty, tai muuta koodia tukemaan myös `r.Header.Get("X-Forwarded-Proto") == "https"`.

---

### VULN-005: HTTP Tietoturva-otsakkeiden (Security Headers) Puute

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **3.4 (Low)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N` |
| **Sijainti** | [`backend/main.go`](file:///home/vivaldev/code/clible-v3-go/backend/main.go#L170-L175) |
| **Tila** | ✅ **Korjattu (PR 055)** |

**Kuvaus:**
Palvelin ei aseta vastauksiin standardeja HTTP-tietoturvaotsakkeita.

**Suositus:**
Lisää middleware, joka asettaa seuraavat otsakkeet kaikkiin HTTP-vastauksiin:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS `clible.fi`:lle)
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 🌟 POSITIIVISET TIETOTURVALÖYDÖKSET & WAF/AI-TURVALLISUUS

1. **🔒 Erinomainen JWT Secret -valvonta (`main.go`):** Sovellus kieltäytyy käynnistymästä, jos `JWT_SECRET` puuttuu tai on alle 32 merkkiä pitkä.
2. **🛡️ 100 % SQL-injektiosuojaus (`internal/db`):** Kaikki tietokantahaot on toteutettu parametrisoiduilla kyselyillä (`$1`, `$2`).
3. **🤖 Gemini System Instruction -erottelu (`ai_service.go`):** Tekoälypyynnöissä käytetään Geminin virallista `systemInstruction`-rakennetta JSON API:ssa, mikä suojaa tekoälyä prompt injection -hyökkäyksiltä ja ohjeiden ohittamiselta.
4. **🔑 Ei kovakoodattuja avaimia:** API-avaimet (`GEMINI_API_KEY`) ja tietokantayhteydet luetaan puhtaasti ympäristömuuttujista.
