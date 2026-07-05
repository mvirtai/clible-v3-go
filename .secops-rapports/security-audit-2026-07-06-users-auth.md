# 🔒 Tietoturva-auditointi — Pre-Merge Security Report

**Raportin tunniste:** `SECOPS-2026-07-06-001`
**Kohde:** `feat/users-and-auth` -haaran 34 uncommitted muutosta
**Päivämäärä:** 2026-07-06
**Auditoija:** Antigravity SecOps Agent
**Raportin tila:** PRE-MERGE REVIEW

---

## Yhteenveto

Tämä raportti analysoi `feat/users-and-auth` -kehityshaaran kaikki tietoturvallisuuteen liittyvät haavoittuvuudet ennen merge-operaatiota. Haavoittuvuudet on arvioitu CVSS v3.1 -standardilla ja luokiteltu vakavuusasteittain.

### Havaintojen kokonaiskuva

| Vakavuus | Lukumäärä | CVSS-luokka |
|----------|-----------|-------------|
| 🔴 Kriittinen | 2 | 9.0–10.0 |
| 🟠 Korkea | 3 | 7.0–8.9 |
| 🟡 Keskitaso | 4 | 4.0–6.9 |
| 🔵 Matala | 3 | 0.1–3.9 |
| **Yhteensä** | **12** | |

---

## 🔴 KRIITTISET HAAVOITTUVUUDET

---

### VULN-001: Kovakoodattu JWT-salaisuus (Hardcoded Secret Fallback)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **9.8 (Critical)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` |
| **Sijainti** | `backend/main.go` rivit 55–58 |
| **Kiireellisyys** | 🚨 **VÄLITÖN — Estää tuotantoon viennin** |

**Kuvaus:**

Jos ympäristömuuttujaa `JWT_SECRET` ei ole asetettu, sovellus käyttää kovakoodattua fallback-arvoa `"development-secret-key-replace-in-production"`. Tämä tarkoittaa, että:

- Hyökkääjä voi generoida mielivaltaisia JWT-tokeneita mille tahansa käyttäjälle
- Kaikki autentikaatio on ohitettavissa triviaalisti
- Käyttäjätilien täydellinen haltuunotto on mahdollista

```go
jwtSecret := os.Getenv("JWT_SECRET")
if jwtSecret == "" {
    jwtSecret = "development-secret-key-replace-in-production" // ⚠️ KRIITTINEN
}
```

**Korjausehdotus:**

```go
jwtSecret := os.Getenv("JWT_SECRET")
if jwtSecret == "" {
    slog.Error("FATAL: JWT_SECRET environment variable is not set")
    os.Exit(1)
}
if len(jwtSecret) < 32 {
    slog.Error("FATAL: JWT_SECRET must be at least 32 characters")
    os.Exit(1)
}
```

**Korjauksen työmäärä:** ⚡ Triviaali (~5 min, 5 riviä muutosta). Ei riko mitään olemassa olevaa toiminnallisuutta. Kehitysympäristössä `.env`-tiedostoon lisätään `JWT_SECRET=<random-32-char-string>`.

---

### VULN-002: Tietokantakredenttialit versionhallinnassa (.env vuotanut)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **9.1 (Critical)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` |
| **Sijainti** | `.env` |
| **Kiireellisyys** | 🚨 **VÄLITÖN** |

**Kuvaus:**

Tiedosto `.env` sisältää Neon PostgreSQL -tietokannan täydelliset yhteystiedot (mukaan lukien salasana):

```
DATABASE_URL="postgresql://neondb_owner:npg_***@ep-long-fog-***-pooler..."
```

Vaikka `.env` on `.gitignore`-tiedostossa, se on nähtävissä paikallisesti. Jos tiedosto on koskaan ollut commitoituna tai jos työtila jaetaan, tietokanta on suoraan hyökkäyskelpoinen.

> **VAROITUS:** Tarkista git-historiasta, onko `.env` koskaan joutunut committiin. Jos kyllä, rotoi Neon-salasana välittömästi.

**Korjausehdotus:**

1. Varmista `git log --all --full-history -- .env` -komennolla, että tiedostoa ei ole koskaan commitoitu
2. Jos on, rotoi Neon-tietokannan salasana: Neon Dashboard → Settings → Reset Password
3. Harkitse env-muuttujien hallintaan Doppler, Infisical tai vastaava secrets manager -ratkaisu tuotantoympäristöön

**Korjauksen työmäärä:** ⚡ Triviaali (~15 min, salasanan vaihto + tarkistus). Ei vaadi koodimuutoksia.

---

## 🟠 KORKEAN VAKAVUUDEN HAAVOITTUVUUDET

---

### VULN-003: CORS-politiikka heijastaa minkä tahansa originin (Origin Reflection)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **8.1 (High)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N` |
| **Sijainti** | `backend/internal/middleware/cors.go` rivit 8–13 |
| **Kiireellisyys** | 🔶 **Korkea — Korjaa ennen tuotantoon vientiä** |

**Kuvaus:**

CORS-middleware heijastaa pyynnön `Origin`-headerin suoraan takaisin ja asettaa samalla `Access-Control-Allow-Credentials: true`. Tämä yhdistelmä on erittäin vaarallinen:

```go
origin := r.Header.Get("Origin")
if origin != "" {
    w.Header().Set("Access-Control-Allow-Origin", origin) // ⚠️ Heijastaa kaiken
}
w.Header().Set("Access-Control-Allow-Credentials", "true") // ⚠️ Credentials mukana
```

Hyökkääjä voi luoda phishing-sivuston (esim. `evil.com`), joka tekee autentikoituja pyyntöjä sovelluksen API:iin uhrin selaimesta. Koska evästeet (JWT) lähetetään mukana ja origin hyväksytään, hyökkääjä pääsee käyttämään uhrin tiliä (CSRF via CORS misconfiguration).

**Korjausehdotus:**

```go
var allowedOrigins = map[string]bool{
    "http://localhost:5173": true,
    "http://localhost:8080": true,
    // Tuotannossa: "https://clible.example.com": true,
}

func CORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        if allowedOrigins[origin] {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Credentials", "true")
        }
        // ... muu logiikka
    })
}
```

**Korjauksen työmäärä:** 🔧 Pieni (~20 min, ~15 riviä). Ei riko olemassa olevaa frontend-kehitystä, kunhan localhost-originit lisätään listaan.

---

### VULN-004: JWT-evästeen `Secure`-lippu on pois päältä

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **7.4 (High)** |
| **Vektori** | `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N` |
| **Sijainti** | `backend/internal/api/auth_handler.go` rivit 139–148 ja 103–111 |
| **Kiireellisyys** | 🔶 **Korkea — Korjaa ennen tuotantoon vientiä** |

**Kuvaus:**

JWT-evästeet asetetaan ilman `Secure: true` -lippua:

```go
http.SetCookie(w, &http.Cookie{
    Secure:   false, // ⚠️ Token kulkee HTTP:n yli ilman salausta
})
```

Tämä tarkoittaa, että JWT-token voidaan kaapata man-in-the-middle -hyökkäyksellä, koska eväste lähetetään myös salaamattomien HTTP-pyyntöjen mukana.

Koodissa on kommentti: `"Kehityksessä HTTP riittää. Tuotannossa True (HTTPS)."` — mutta ympäristöpohjaista kytkentää ei ole toteutettu.

**Korjausehdotus:**

```go
isProduction := os.Getenv("ENV") == "production"

func (h *AuthHandler) setJWTCookie(w http.ResponseWriter, token string) {
    http.SetCookie(w, &http.Cookie{
        Name:     "jwt",
        Value:    token,
        Path:     "/",
        Expires:  time.Now().Add(24 * time.Hour),
        HttpOnly: true,
        Secure:   isProduction, // Dynaamisesti ympäristöstä
        SameSite: http.SameSiteLaxMode,
    })
}
```

**Korjauksen työmäärä:** ⚡ Triviaali (~10 min, ~5 riviä). Config-rakenteeseen lisätään `IsProduction bool` -kenttä.

---

### VULN-005: Suojaamaton käännösten tuontiväylä (Unauthenticated Import)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **7.5 (High)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N` |
| **Sijainti** | `backend/main.go` rivi 99, `translation_handler.go` rivit 39–106 |
| **Kiireellisyys** | 🔶 **Korkea** |

**Kuvaus:**

`POST /api/translations/import` -endpoint ei vaadi autentikaatiota. Kuka tahansa voi:

- Lähettää haitallisia XML-tiedostoja palvelimelle
- Ylikirjoittaa olemassa olevia käännöksiä (`exists → delete → create`)
- Mahdollisesti aiheuttaa palvelimen muistinkäytön kasvun suurilla tiedostoilla

Lisäksi `POST /api/analytics/analyze` ja `POST /api/analytics/compare` ovat suojaamattomia.

**Korjausehdotus:**

```go
// main.go: Lisää requireAuth kääreen näihin endpointteihin
mux.Handle("POST /api/translations/import",
    requireAuth(http.HandlerFunc(translationHandler.ImportTranslation)))
mux.Handle("POST /api/analytics/analyze",
    requireAuth(http.HandlerFunc(analyticsHandler.Analyze)))
mux.Handle("POST /api/analytics/compare",
    requireAuth(http.HandlerFunc(analyticsHandler.Compare)))
```

**Korjauksen työmäärä:** ⚡ Triviaali (~5 min, 3 riviä muutosta `main.go`:ssa). Ei riko mitään, kunhan frontend lähettää evästeet (`credentials: 'include'` on jo paikallaan).

---

## 🟡 KESKITASON HAAVOITTUVUUDET

---

### VULN-006: Virheilmoitukset paljastavat sisäistä logiikkaa (Error Message Leakage)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **5.3 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | `backend/internal/api/auth_handler.go` rivit 54 ja 60 |
| **Kiireellisyys** | 🟡 Keskitaso |

**Kuvaus:**

Virheviestit paljastavat suoraan sisäisen virheen rakenteen:

```go
http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
```

Tämä paljastaa hyökkääjälle:

- Salasanavalidoinnin tarkat säännöt (rivi 54: `validatePassword` error → "password must contain at least one uppercase letter")
- Rekisteröitymisen yhteydessä: "email is already registered" → käyttäjien sähköpostiosoitteiden **enumerointihyökkäys** (user enumeration)

**Korjausehdotus:**

```go
// Rekisteröitymisvirheille geneerinen viesti
if err != nil {
    http.Error(w, `{"error":"registration failed"}`, http.StatusBadRequest)
    return
}
```

> **Huom:** Salasanan vahvuusvaatimukset voidaan näyttää frontendissa (kuten nyt tehdään `Register.tsx`:ssä), mutta backendin tulee palauttaa geneerisiä viestejä.

**Korjauksen työmäärä:** 🔧 Pieni (~30 min). Vaatii ~10 kohtaa auth_handler.go:sta ja scope/history handlereista. Ei riko frontentia, koska frontend validoi jo itse salasanasäännöt.

---

### VULN-007: Puuttuu JSON Content-Type header auth-vastauksista

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **5.3 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | `backend/internal/api/auth_handler.go` — kaikki handlerit |
| **Kiireellisyys** | 🟡 Keskitaso |

**Kuvaus:**

`AuthHandler`-funktiot (Register, Login, Me, Logout) eivät aseta `Content-Type: application/json` -headeria ennen `http.Error()` kutsuja. Tämä voi johtaa:

- MIME sniffing -hyökkäyksiin vanhemmissa selaimissa
- Virheelliseen virheiden parsintaan frontendissä
- `http.Error()` asettaa `text/plain` Content-Typen, mutta vastauksen sisältö on JSON-muotoista

Vertaa: `history_handler.go` ja `scope_handler.go` tekevät tämän oikein asettamalla `w.Header().Set("Content-Type", "application/json")` alussa.

**Korjausehdotus:**

Lisää jokaiseen auth_handler-funktioon alussa:

```go
w.Header().Set("Content-Type", "application/json")
```

Ja vaihda `http.Error()` -kutsut `w.WriteHeader()` + `json.NewEncoder()` -yhdistelmään kuten muissa handlereissa.

**Korjauksen työmäärä:** 🔧 Pieni (~25 min). Mekaaninen refaktorointi, ~20 riviä muutosta. Ei riko mitään.

---

### VULN-008: Puuttuva `limit`-parametrin yläraja history-hauissa

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **5.3 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` |
| **Sijainti** | `backend/internal/api/history_handler.go` rivit 105–111 |
| **Kiireellisyys** | 🟡 Keskitaso |

**Kuvaus:**

`GET /api/history?limit=999999` hyväksyy minkä tahansa positiivisen kokonaisluvun. Massiivinen limit-arvo voi aiheuttaa:

- Tietokantakyselyn hidastumisen (full table scan)
- Suuren muistinkulutuksen palvelimella
- Mahdollisen DoS-hyökkäyksen autentikoidulta käyttäjältä

```go
if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
    limit = parsedLimit // ⚠️ Ei ylärajaa
}
```

**Korjausehdotus:**

```go
const maxHistoryLimit = 100

if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
    limit = parsedLimit
    if limit > maxHistoryLimit {
        limit = maxHistoryLimit
    }
}
```

**Korjauksen työmäärä:** ⚡ Triviaali (~3 min, 3 riviä). Ei riko mitään.

---

### VULN-009: JWT-tokenissa ei ole `Issuer`- eikä `Audience`-claimeja

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **4.3 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N` |
| **Sijainti** | `backend/internal/services/auth_service.go` rivit 85–101 |
| **Kiireellisyys** | 🟡 Keskitaso |

**Kuvaus:**

JWT-claimsissa puuttuvat standardin mukaiset `iss` (Issuer) ja `aud` (Audience) -kentät. Jos tulevaisuudessa samalla JWT-secretillä allekirjoitetaan tokeneita useammalle palvelulle, tokenit ovat ristiin käytettäviä (token confusion attack).

```go
claims := &Claims{
    UserID: userID,
    RegisteredClaims: jwt.RegisteredClaims{
        ExpiresAt: jwt.NewNumericDate(expirationTime),
        IssuedAt:  jwt.NewNumericDate(time.Now()),
        // ⚠️ Puuttuu: Issuer, Audience, Subject
    },
}
```

**Korjausehdotus:**

```go
RegisteredClaims: jwt.RegisteredClaims{
    ExpiresAt: jwt.NewNumericDate(expirationTime),
    IssuedAt:  jwt.NewNumericDate(time.Now()),
    Issuer:    "clible-v3-api",
    Audience:  jwt.ClaimStrings{"clible-v3-web"},
    Subject:   userID,
},
```

Validoinnissa lisätään myös tarkistus:

```go
jwt.ParseWithClaims(tokenString, claims, keyFunc,
    jwt.WithIssuer("clible-v3-api"),
    jwt.WithAudience("clible-v3-web"),
)
```

**Korjauksen työmäärä:** 🔧 Pieni (~15 min, ~10 riviä). Ei riko mitään — vanhat tokenit vain invalidoituvat (odotettu käytös).

---

## 🔵 MATALAN VAKAVUUDEN HAAVOITTUVUUDET

---

### VULN-010: Puuttuva tilin lukitsemismekanismi (Account Lockout)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **3.7 (Low)** |
| **Vektori** | `AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | `backend/internal/api/auth_handler.go` rivit 76–100 |
| **Kiireellisyys** | 🔵 Matala |

**Kuvaus:**

Login-endpoint ei rajoita epäonnistuneita kirjautumisyrityksiä per käyttäjä. Vaikka IP-pohjainen rate limiter on paikallaan (2 req/s, burst 10), se ei suojaa:

- Hajautettuja brute-force -hyökkäyksiä (useita IP-osoitteita)
- Credential stuffing -hyökkäyksiä

**Korjausehdotus:**

Lisää `failed_login_attempts` ja `locked_until` -sarakkeet `users`-tauluun. Lukitse tili 5 epäonnistuneen yrityksen jälkeen 15 minuutiksi.

**Korjauksen työmäärä:** 🔨 Keskisuuri (~2-3 h). Vaatii uusi SQL-migraatio, user_repo:n muutoksia, ja auth_service-logiikkaa. Ei riko olemassa olevaa toiminnallisuutta, mutta lisää kompleksisuutta.

---

### VULN-011: ScopeWorkspace-endpoint ei tarkista omistajuutta (IDOR)

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **3.5 (Low)** |
| **Vektori** | `AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | `backend/internal/api/scope_handler.go` rivit 191–212 |
| **Kiireellisyys** | 🔵 Matala |

**Kuvaus:**

`GET /api/scopes/workspace?id=...` hakee workspace-datan pelkän scope ID:n perusteella ilman käyttäjän omistajuuden tarkistusta. Autentikoitu käyttäjä voi lukea toisen käyttäjän workspace-dataa arvaamalla scope-ID:n (UUID).

```go
// ⚠️ Ei tarkisteta, onko scope pyytäjän omistama
workspace, err := h.scopeService.GetScopeWorkspace(ctx, id)
```

**Korjausehdotus:**

```go
userID, ok := middleware.GetUserID(ctx)
if !ok { ... }

workspace, err := h.scopeService.GetScopeWorkspace(ctx, id, userID)
// Service/repo tarkistaa: WHERE id = $1 AND user_id = $2
```

**Korjauksen työmäärä:** 🔧 Pieni (~20 min). Lisätään userID-parametri `GetScopeWorkspace()`-ketjuun (service → repo). Vaatii SQL-kyselyn muutosta. Pieni riski rikkoa frontend-kutsuja, jos scope ID:t eivät täsmää käyttäjään.

---

### VULN-012: Salasanan bcrypt-kustannus käyttää oletusarvoa

| Kenttä | Arvo |
|--------|------|
| **CVSS v3.1** | **2.6 (Low)** |
| **Vektori** | `AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | `backend/internal/services/auth_service.go` rivi 45 |
| **Kiireellisyys** | 🔵 Matala |

**Kuvaus:**

```go
bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost) // DefaultCost = 10
```

`bcrypt.DefaultCost` (10) oli riittävä 2015-luvulla, mutta nykylaitteistolla (2026) cost 12–14 on suositeltavampi. Tämä ei ole akuutti uhka, mutta heikentää hashin brute-force -vastustuskykyä, mikäli tietokanta vuotaa.

**Korjausehdotus:**

```go
const bcryptCost = 12
bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
```

**Korjauksen työmäärä:** ⚡ Triviaali (~2 min, 1 rivi). Ei riko mitään — vanhoja hasheja voi edelleen validoida, koska cost on tallennettu hash-merkkijonon sisään.

---

## 📊 Prioriteettitaulukko — Korjausjärjestys

| # | Haavoittuvuus | CVSS | Kiireellisyys | Työmäärä | Rikkooko koodia? |
|---|--------------|------|---------------|----------|------------------|
| 1 | VULN-001 JWT Secret | 9.8 | 🚨 Välitön | ⚡ 5 min | ❌ Ei |
| 2 | VULN-002 .env vuoto | 9.1 | 🚨 Välitön | ⚡ 15 min | ❌ Ei |
| 3 | VULN-003 CORS Origin | 8.1 | 🔶 Korkea | 🔧 20 min | ❌ Ei |
| 4 | VULN-004 Secure flag | 7.4 | 🔶 Korkea | ⚡ 10 min | ❌ Ei |
| 5 | VULN-005 Import auth | 7.5 | 🔶 Korkea | ⚡ 5 min | ❌ Ei |
| 6 | VULN-006 Error leaks | 5.3 | 🟡 Keski | 🔧 30 min | ❌ Ei |
| 7 | VULN-007 Content-Type | 5.3 | 🟡 Keski | 🔧 25 min | ❌ Ei |
| 8 | VULN-008 Limit cap | 5.3 | 🟡 Keski | ⚡ 3 min | ❌ Ei |
| 9 | VULN-009 JWT claims | 4.3 | 🟡 Keski | 🔧 15 min | ⚠️ Tokenien invalidointi |
| 10 | VULN-010 Lockout | 3.7 | 🔵 Matala | 🔨 2–3 h | ❌ Ei |
| 11 | VULN-011 Scope IDOR | 3.5 | 🔵 Matala | 🔧 20 min | ⚠️ API-muutos |
| 12 | VULN-012 bcrypt cost | 2.6 | 🔵 Matala | ⚡ 2 min | ❌ Ei |

---

## 🛡️ Yhteenveto ja suositukset

### Ennen mergeä PAKOLLISESTI korjattavat (Merge Blockers)

1. **VULN-001**: Poista JWT fallback-secret. Pakota ympäristömuuttuja.
2. **VULN-002**: Varmista, ettei `.env` ole git-historiassa. Rotoi salasana tarvittaessa.
3. **VULN-003**: Implementoi CORS origin whitelist.
4. **VULN-004**: Tee Secure-flag ympäristöpohjaiseksi.
5. **VULN-005**: Suojaa import- ja analytics-endpointit autentikaatiolla.

### Mergen jälkeen priorisoitavat

6. **VULN-006 – VULN-009**: Virheviestien sanitointi, Content-Type -korjaus, limit-katto, JWT claims.

### Tulevaisuuden backlogiin

7. **VULN-010 – VULN-012**: Account lockout, IDOR-korjaus, bcrypt cost.

### Kokonaistyömääräarvio merge-estäville korjauksille

> **~55 minuuttia** koodaustyötä, ~40 riviä muutosta, **0 % riski rikkoa olemassa olevaa toiminnallisuutta**.

---

## ✅ Positiiviset havainnot

Kaikki ei ole huonosti! Tässä branchissa on tehty useita hyviä tietoturvaratkaisuja:

| ✅ Hyvä käytäntö | Sijainti |
|-----------------|---------|
| `HttpOnly: true` JWT-evästeissä — estää XSS-varastelun | `auth_handler.go` |
| `SameSite: Lax` — perus CSRF-suoja | `auth_handler.go` |
| `json:"-"` PasswordHash-kentässä — hash ei vuoda API-vastauksissa | `user_repo.go` |
| bcrypt salasanojen hashaukseen — teollisuustandardi | `auth_service.go` |
| Parametrisoidut SQL-kyselyt (`$1, $2`) — SQL injection estetty | `user_repo.go` |
| UUID-pohjainen user ID — ei ennustettavissa | `auth_service.go` |
| IP-pohjainen rate limiting — perus DoS-suoja | `ratelimit.go` |
| Recovery-middleware paniikin hallintaan | `recovery.go` |
| Non-root Docker-käyttäjä | `Dockerfile` |
| Context-pohjainen peruutus (QueryContext, ExecContext) | `user_repo.go` |
| Token-allekirjoitusalgoritmin validointi (HMAC-tarkistus) | `auth_service.go` |
| Salasanan vahvuusvaatimukset (8+ merkkiä, iso kirjain, numero, erikoismerkki) | `auth_handler.go` |

---

*Raportin loppu. Tämä dokumentti on tarkoitettu sisäiseen käyttöön eikä sitä saa jakaa ulkopuolisille tahoille.*
