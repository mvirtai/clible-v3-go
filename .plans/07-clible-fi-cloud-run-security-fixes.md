# 🛠️ Valmisteluohje: Clible.fi & Cloud Run -tietoturvakorjaukset

Tämä ohje sisältää vaiheittaiset ohjeet ja koodimuutosehdotukset sovelluksen `clible-v3-go` valmistelemiseksi turvallisesti domainille `clible.fi` ja Google Cloud Run -ympäristöön suoritetun katselmoinnin [`security-audit-2026-08-06-clible-fi-cloud-run-domain-migration.md`](file:///home/vivaldev/code/clible-v3-go/.security_audits/security-audit-2026-08-06-clible-fi-cloud-run-domain-migration.md) pohjalta.

---

## 📋 Yhteenveto tarvittavista toimenpiteistä

1. **CORS-asetusten päivittäminen (`backend/internal/middleware/cors.go`)**
2. **Cloud Run IP-rajoituksen korjaus `X-Forwarded-For`-otsakkeelle (`backend/internal/middleware/ratelimit.go`)**
3. **AI-rajapintojen pyyntökokorajoitus (`backend/internal/api/ai_handler.go`)**
4. **Tietoturva-otsakkeet (`backend/internal/middleware/security_headers.go`)**
5. **GCP Cloud Run Ympäristömuuttujien tarkistuslista**

---

## Vaihe 1: CORS Domain-tuki (`cors.go`) — ✅ Toteutettu & Korjattu

Katso tiedosto: [`backend/internal/middleware/cors.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/middleware/cors.go)

Sallitut originit on päivitetty tukemaan tuotantodomainia:

```go
var allowedOrigins = map[string]bool{
	"http://localhost:5173": true,
	"http://localhost:8080": true,
	"https://clible.fi":     true,
	"https://www.clible.fi": true,
}
```

---

## Vaihe 2: Cloud Run Rate Limiting IP-tunnistus (`ratelimit.go`) — ✅ Toteutettu

Katso tiedosto: [`backend/internal/middleware/ratelimit.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/middleware/ratelimit.go#L100-L116)

`RateLimitMiddleware` käyttää `getClientIP(r)`-funktiota, joka lukee ensimmäisen IP-osoitteen `X-Forwarded-For`-otsakkeesta GCP Load Balancerin takana:

```go
func getClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		clientIP := strings.TrimSpace(parts[0])
		if clientIP != "" {
			return clientIP
		}
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
```

---

## Vaihe 3: AI-rajapintojen Pyyntökokorajoitus (`ai_handler.go`) — ✅ Toteutettu

Katso tiedosto: [`backend/internal/api/ai_handler.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/ai_handler.go)

AI-endpointteissa on rajoitettu saapuvan pyynnön koko 100 KB:iin (`http.MaxBytesReader`) ja syötteiden maksimipituus 15 000 merkkiin:

```go
r.Body = http.MaxBytesReader(w, r.Body, 100*1024)

if len(req.Text) > 15000 {
	http.Error(w, "Input text exceeds maximum allowed length (15 000 characters)", http.StatusBadRequest)
	return
}
```

---

## Vaihe 4: Tietoturva-otsakkeet (`security_headers.go`) & Cloud Run -muuttujat — ✅ Toteutettu

### 4.1 Tietoturva-otsakkeiden middleware (`backend/internal/middleware/security_headers.go`)

Luotu ja rekisteröity `main.go`-tiedostoon kaikkiin HTTP-vastauksiin standardit tiukat tietoturvaotsakkeet:

```go
package middleware

import "net/http"

// SecurityHeaders injects standard HTTP security headers into all outgoing responses.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		next.ServeHTTP(w, r)
	})
}
```

Rekisteröinti [`backend/main.go`](file:///home/vivaldev/code/clible-v3-go/backend/main.go#L170-L176):
```go
handler = middleware.SecurityHeaders(handler)
```

### 4.2 GCP Cloud Run Ympäristömuuttujien Tarkistuslista

Varmista GCP Cloud Run Service -asetuksista (tai GCP Console / gcloud / Terraform):

- [x] `ENV=production` *(varmistaa HTTP Cookie `Secure: true` -lipun aktivoitumisen)*
- [x] `JWT_SECRET=<vähintään 32 merkkiä pitkä satunnainen merkkijono>`
- [x] `GEMINI_API_KEY=<GCP Secret Managerista haettu Gemini API-avain>`
- [x] `DATABASE_URL=<Neon PostgreSQL yhteysosoite SSL-tuntemuksella>`
- [x] `PORT=8080` *(tai Cloud Runin dynaamisesti tarjoama portti)*

---

## 🚀 Verifiointi korjausten jälkeen

1. Aja backend-yksikkö- ja integraatiotestit:
   ```bash
   task backend:test
   ```
2. Rakenna tuotantobinaari:
   ```bash
   task backend:build
   ```
