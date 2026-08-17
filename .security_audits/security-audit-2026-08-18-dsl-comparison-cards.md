# 🔒 Tietoturva-auditointi — DSL Ternary Comparison & Side-by-Side Cards

**Raportin tunniste:** `SECOPS-2026-08-18-001`
**Kohde:** `feat/dsl-comparison-cards` -haara (Backend DSL, Notebook UI, Testikattavuus)
**Päivämäärä:** 2026-08-18
**Auditoija:** Antigravity AI SecOps Agent
**Raportin tila:** VALMIS — ⚠️ Avoimia havaintoja, joista 1 korkean vakavuuden

---

## Yhteenveto

Tietoturva-auditointi kattaa `feat/dsl-comparison-cards` -haaraan tehdyt muutokset (36 tiedostoa, +2 149 / −44 LOC), jotka sisältävät:

- DSL-lexerin, parserin ja executorin ternary comparison -tuki
- Notebook-UI:n side-by-side comparison cards -renderöinti
- Backend-testikattavuuden nosto **82,1 %:iin** (statements)

Sovelluksen ydin-tietoturva (autentikaatio, JWT, SQL-parametrisointi, Gemini system instructions) on edelleen **erittäin korkeatasoinen**. Aikaisemmassa auditissa (SECOPS-2026-08-06-001) havaitut ongelmat (CORS, rate limiter proxy, AI payload, security headers, JWT Secure -lippu) on korjattu ja varmistettu toimiviksi.

**Uudet löydökset** koskevat pääasiassa Go-standardikirjaston tunnettuja haavoittuvuuksia (go1.26.2 → go1.26.6 päivitystarve) sekä muutamia informaatiotason havaintoja API-virheviestien paljastamisessa.

---

### Havaintojen kokonaiskuva

| Vakavuus | Lukumäärä | CVSS-luokka | Tila |
| ---------- | ----------- | ------------- | ------ |
| 🔴 Kriittinen | 0 | 9.0–10.0 | — |
| 🟠 Korkea | 1 | 7.0–8.9 | ⚠️ Avoin — vaatii Go-version päivityksen |
| 🟡 Keskitaso | 2 | 4.0–6.9 | ⚠️ Avoimia |
| 🔵 Matala | 3 | 0.1–3.9 | ℹ️ Informatiiviset |
| **Yhteensä** | **6** | | |

---

## 🟠 KORKEAN VAKAVUUDEN HAVAINNOT

### VULN-001: Go 1.26.5 standardikirjaston haavoittuvuudet (6 kpl)

| Kenttä | Arvo |
| -------- | ------ |
| **CVSS v3.1** | **7.5 (High)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H` |
| **Sijainti** | Koko sovellus — [`go.mod`](file:///home/vivaldev/code/clible-v3-go/backend/go.mod#L3) (`go 1.25.0`, runtime go1.26.5) |
| **Tila** | ⚠️ **Avoin — go1.26.6 ei ole vielä julkaistu, seurataan julkaisua** |

**Kuvaus:**
`govulncheck ./...` löysi **6 haavoittuvuutta** Go 1.26.5 standardikirjaston paketeista. Kaikki korjaukset vaativat version **go1.26.6**, jota **ei ole vielä julkaistu**. Alkuperäisessä skannauksessa (go.mod `go 1.25.0`, alustava toolchain go1.26.2) haavoittuvuuksia oli 13, mutta go1.26.5 korjasi niistä 7.

| ID | Paketti | Vaikutus | Polku sovelluksessa |
| ---- | --------- | ---------- | --------------------- |
| GO-2026-6218 | `net/url` | Neliöllinen kompleksisuus `resolvePath`:ssa (ReDoS) | `ai_service.go → http.Client.Do` |
| GO-2026-6090 | `crypto/tls` | Rajoittamaton post-handshake -viestien vastaanotto | `verse_repo.go`, `main.go`, `auth_service.go` |
| GO-2026-6089 | `net/http` | `ReadHeaderTimeout` ei sovellu salaamattomaan HTTP/2 | `main.go:240 → ListenAndServe` |
| GO-2026-6088 | `encoding/xml` | Rekursiosyvyyden puute XML-dekoodauksessa (DoS) | `xml_parser.go:67 → xml.Decoder.Token` |
| GO-2026-5972 | `encoding/asn1` | Rekursion syvyysrajoituksen puute | `main.go:244 → signal.Notify` |
| GO-2026-5026 | `net/http` | Punycode-etiketin ohitus | `ai_service.go → http.Client.Do` |

**Erityishuomiot:**

- **GO-2026-6088** (`encoding/xml`) on erityisen relevantti, koska sovelluksen XML-parseri (`xml_parser.go`) lukee potentiaalisesti ulkoisista lähteistä peräisin olevaa XML-dataa `SeedTranslationFromFile`-toiminnolla.
- Aikaisemmin havaitut `net/mail`-haavoittuvuudet (GO-2026-4986/4977) ovat **korjautuneet go1.26.5:ssä**.

**Suositus:**
Päivitä Go-versio versioon **go1.26.6** heti kun se julkaistaan. Siihen asti go1.26.5 on uusin saatavilla oleva versio. Päivitä `go.mod` vastaamaan nykyistä toolchainia:

```bash
cd backend && go mod edit -go=1.26.5 && go mod tidy
```

> **Huom:** go1.26.6 ei ole vielä julkaistu (tarkistettu 2026-08-18). Seuraa julkaisua: https://go.dev/dl/

---

## 🟡 KESKITASON HAVAINNOT

### VULN-002: SPA Fallback -logiikassa potentiaalinen Path Traversal -riski

| Kenttä | Arvo |
| -------- | ------ |
| **CVSS v3.1** | **5.3 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | [`backend/main.go`](file:///home/vivaldev/code/clible-v3-go/backend/main.go#L156-L171) |
| **Tila** | ⚠️ **Avoin — suositellaan korjattavaksi** |

**Kuvaus:**
SPA fallback -käsittelijässä käyttäjän antama `r.URL.Path` yhdistetään suoraan `filepath.Join`:lla:

```go
filePath := filepath.Join(cfg.FrontendDir, r.URL.Path)
info, err := os.Stat(filePath)
```

Vaikka `filepath.Join` normalisoi polun (poistaa `../`-segmentit), Go:n `net/http` -mux dekoodaa URL:n ennen reitittämistä. Yhdistelmä `%2e%2e%2f` tai muista URL-enkoodauksista voisi teoriassa johtaa tilanteeseen, jossa `os.Stat` tarkistaa polkua frontendDir-hakemiston ulkopuolella.

Todellinen riski on **rajoitettu**, koska:

1. `filepath.Join` puhdistaa `..`-segmentit
2. `http.FileServer` (`fs.ServeHTTP`) käyttää omaa turvallista logiikkaansa

**Suositus:**
Lisää eksplisiittinen polun validointi varmistamaan, ettei lopullinen polku osoita `cfg.FrontendDir`:n ulkopuolelle:

```go
cleanPath := filepath.Clean(r.URL.Path)
filePath := filepath.Join(cfg.FrontendDir, cleanPath)
absPath, _ := filepath.Abs(filePath)
absBase, _ := filepath.Abs(cfg.FrontendDir)
if !strings.HasPrefix(absPath, absBase) {
    http.Error(w, "Forbidden", http.StatusForbidden)
    return
}
```

---

### VULN-003: Non-AI -handlereista puuttuu `http.MaxBytesReader` (Body Size Limit)

| Kenttä | Arvo |
| -------- | ------ |
| **CVSS v3.1** | **4.3 (Medium)** |
| **Vektori** | `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` |
| **Sijainti** | Useita handlereita — esim. [`scope_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/scope_handler.go), [`notebook_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/notebook_handler.go), [`auth_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/auth_handler.go), [`analytics_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/analytics_handler.go) |
| **Tila** | ⚠️ **Avoin — suositellaan korjattavaksi** |

**Kuvaus:**
AI-handlereissa (`ai_handler.go`) on erinomainen `http.MaxBytesReader(w, r.Body, 100*1024)` -suojaus jokaisessa endpointissa. **Muista** handlereista tämä kuitenkin **puuttuu kokonaan**:

- `POST /api/auth/register` / `POST /api/auth/login` — Hyökkääjä voisi lähettää erittäin suuren JSON-bodyn
- `POST /api/scopes` — Rajattoman JSON-bodyn riski
- `POST /api/scopes/saved-searches` — `resultJson`-kenttä voi sisältää suuria hakutuloksia
- `POST /api/scopes/saved-analyses` — `resultJson`-kenttä voi sisältää suuria analyysituloksia
- `PUT /api/notebooks/{id}/cells` — Solulista voi olla hyvin suuri
- `POST /api/analytics/analyze` / `POST /api/analytics/compare` — Rajattoman bodyn riski

Tunnistautuminen (`requireAuth` middleware) suojaa suurimman osan näistä, mutta auth-endpointit ovat julkisia ja haavoittuvampia.

**Suositus:**
Lisää globaali body size limit middleware-tasolle (esim. 1 MB kaikille pyynnöille) tai lisää `MaxBytesReader` jokaiseen POST/PUT-handleriin:

```go
// Option A: Global middleware (suositeltava)
func MaxBodySize(maxBytes int64) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
            next.ServeHTTP(w, r)
        })
    }
}

// main.go middleware stack:
handler = MaxBodySize(1 * 1024 * 1024)(handler) // 1 MB global
```

---

## 🔵 MATALAN VAKAVUUDEN HAVAINNOT & SUOSITUKSET

### VULN-004: API-virheviesteissä paljastuu sisäisiä virhetietoja

| Kenttä | Arvo |
| -------- | ------ |
| **CVSS v3.1** | **3.1 (Low)** |
| **Vektori** | `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | Useita API-handlereita ([`ai_handler.go:33`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/ai_handler.go#L33), [`scope_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/scope_handler.go#L72), [`analytics_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/analytics_handler.go#L66)) |
| **Tila** | ℹ️ Informatiivinen |

**Kuvaus:**
Useissa endpointeissa palautetaan `err.Error()` suoraan JSON-vastauksessa. Tämä voi paljastaa:

- Tietokantayhteyden tietoja tai taulunimia
- Sisäisten funktioiden pinoja (`failed to evaluate...`)
- Gemini API -virheilmoituksia (HTTP-statuskoodit, rate limit -viestit)

Erityisesti `ai_handler.go:33` palauttaa suoraan `err.Error()` HTTP-vastauksessa:

```go
http.Error(w, err.Error(), http.StatusInternalServerError)
```

**Suositus:**
Korvaa `err.Error()` geneerisellä "internal server error" -viestillä HTTP 500 -tapauksissa. Lokita todellinen virhe palvelinpuolella `slog.Error`:lla. Käyttäjäystävälliset virheet (kuten validointivirheet) voivat sisältää kuvauksen.

---

### VULN-005: DSL-lexer/parser-syöte ei ole erikseen rajoitettu

| Kenttä | Arvo |
| -------- | ------ |
| **CVSS v3.1** | **2.4 (Low)** |
| **Vektori** | `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` |
| **Sijainti** | [`backend/internal/dsl/lexer.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/dsl/lexer.go), [`backend/internal/dsl/parser.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/dsl/parser.go), [`backend/internal/dsl/executor.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/dsl/executor.go) |
| **Tila** | ℹ️ Informatiivinen |

**Kuvaus:**
Uusi DSL-parseri käsittelee käyttäjän antamia merkkijonoja ilman eksplisiittistä pituusrajoitusta. Vaikka DSL-komennot kulkevat autentikoidun reitin kautta (notebook endpoint vaatii `requireAuth`), teoriassa erittäin pitkä DSL-merkkijono voisi kuormittaa parseria.

**Riski on matala**, koska:

1. DSL-komennot tulevat notebook-soluista, jotka ovat aina autentikoidun käyttäjän luomia
2. Parseri on lineaarinen `O(n)` eikä sisällä backtracking-logikkaa

**Suositus:**
Lisää yksinkertainen pituustarkistus ennen parserin kutsua (esim. max 2000 merkkiä DSL-komennolle).

---

### VULN-006: Gemini API-avain kulkee URL:n query-parametrissa

| Kenttä | Arvo |
| -------- | ------ |
| **CVSS v3.1** | **2.0 (Low)** |
| **Vektori** | `AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:N/A:N` |
| **Sijainti** | [`backend/internal/services/ai_service.go:205`](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/ai_service.go#L205) |
| **Tila** | ℹ️ Informatiivinen — Googlen oma API-konventio |

**Kuvaus:**
Gemini API -kutsuissa API-avain lähetetään URL:n query-parametrina:

```go
url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, s.cfg.GeminiAPIKey)
```

Tämä on **Google Gemini API:n dokumentoima tapa**, mutta API-avain voi tallentua:

- Go:n `http.Client` -virhelokeihin (jos pyyntö epäonnistuu)
- CDN/proxy-välimuisteihin (ei sovellettavissa HTTPS-liikenteeseen)

**Suositus:**
Tiedostettu suunnittelupäätös — seurataan Googlen virallista API-konventiota. Varmista kuitenkin, ettei virheilmoituksissa (`fmt.Errorf`) URL:ää paljasteta end-userille (jo suojattu `handleError`-apufunktiolla, lukuun ottamatta AI-handlerin rivin 33 suoraa `err.Error()`-palautusta, joka on dokumentoitu kohdassa VULN-004).

---

## 🌟 POSITIIVISET TIETOTURVALÖYDÖKSET

1. **🔒 Erinomainen JWT-arkkitehtuuri:** Issuer, Audience, Subject, expiry-validointi `jwt.ParseWithClaims`:lla. 32-merkin minimisalaisuuspituus. bcrypt cost 12.
2. **🛡️ 100 % SQL-parametrisointi:** Kaikki tietokantahaut käyttävät `$1`, `$2` placeholder-syntaksia. Yhtään `fmt.Sprintf`-pohjaista SQL:ää ei ole suorilla käyttäjäsyötteillä.
3. **🤖 System Instruction -erottelu:** Gemini-pyynnöissä käytetään `systemInstruction`-kenttää erottamaan järjestelmän ohjeistus käyttäjän syötteestä (prompt injection -suojaus).
4. **🔑 Ei kovakoodattuja salaisuuksia:** API-avaimet ja JWT-salaisuudet luetaan ympäristömuuttujista.
5. **📡 X-Forwarded-For -tuki:** Rate limiter lukee oikein proxy-takaisen asiakkaan IP:n.
6. **🧱 Security Headers -middleware:** `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `Referrer-Policy` kattavasti.
7. **🔄 Recovery middleware:** Panic-tilanteet eivät kaada palvelinta ja palauttavat geneerisen virheen.
8. **🧪 82,1 % testikattavuus:** Vahva regressiosuojaus kaikissa kerroksissa (API, Service, DB, Middleware).
9. **✅ AI-endpointtien body size limit:** Kaikki 6 AI-endpointtia rajoittavat bodyn 100 KB:iin ja tekstin 15 000 merkkiin.
10. **📐 CORS allow-list:** Vain tunnetut originit sallitaan (ei wildcard `*`).

---

## 📋 TARKISTUSLISTAAN PERUSTUVA YHTEENVETO

| # | Tarkistuskohde | Tulos |
| --- | ---------------- | ------- |
| 1 | SQL-injektiosuojaus (parametrisointi) | ✅ 100 % |
| 2 | Ei kovakoodattuja avaimia | ✅ OK |
| 3 | JWT-validoinnin vahvuus | ✅ Erinomainen |
| 4 | bcrypt-salasanatiivistys | ✅ cost=12 |
| 5 | CORS-konfiguraatio | ✅ Allow-list |
| 6 | Security headers | ✅ HSTS, X-Frame, nosniff |
| 7 | Rate limiter proxy-IP | ✅ X-Forwarded-For |
| 8 | AI body size limit | ✅ 100 KB / 15k merkkiä |
| 9 | Yleinen body size limit (non-AI) | ⚠️ Puuttuu |
| 10 | Go-standardikirjaston versio | ⚠️ go1.26.5 → odottaa go1.26.6 (ei vielä julkaistu) |
| 11 | SPA path traversal -suojaus | ⚠️ Ei eksplisiittistä validointia |
| 12 | Error message -paljastus | ⚠️ `err.Error()` näkyy vastauksissa |
| 13 | XML-parserin rekursiosuojaus | ⚠️ Riippuu Go-päivityksestä |
| 14 | DSL-syötteen pituusrajoitus | ℹ️ Ei kriittinen, auth-suojattu |

---

## 🔧 SUOSITELLUT KORJAUSTOIMENPITEET (PRIORITEETTIJÄRJESTYS)

1. **🟠 SEURATAAN:** Päivitä Go versioon **go1.26.6** heti kun julkaistaan — poistaa 6 tunnettua haavoittuvuutta (go1.26.5 korjasi jo 7/13)
2. **🟡 SUOSITELTAVA:** Lisää globaali `MaxBodySize` middleware (1 MB)
3. **🟡 SUOSITELTAVA:** Lisää SPA fallback -polun eksplisiittinen validointi
4. **🔵 HYVÄ KÄYTÄNTÖ:** Korvaa `err.Error()` geneerisellä viestillä HTTP 500 -vastauksissa
5. **🔵 HYVÄ KÄYTÄNTÖ:** Lisää DSL-syötteen pituusrajoitus (esim. 2000 merkkiä)
