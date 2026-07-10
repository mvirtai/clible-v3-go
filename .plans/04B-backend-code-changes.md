# Ohjeet ja konteksti: Go-backendin koodimuutokset (Vaihe 2)

Tämä tiedosto sisältää yksityiskohtaiset ohjeet ja arkkitehtoniset selitykset Go-backendin muokkaamiseksi siten, että se osaa tarjota React-frontendin staattiset tiedostot SPA-yhteensopivasti sekä sisältää rate limiting -suojauksen Gemini API -kutsuille.

---

## Vaihe 2.1: Konfiguraation laajentaminen (`config.go`)

Ensimmäinen vaihe on lisätä `FRONTEND_DIR`-ympäristömuuttuja sovelluksen konfiguraatioluokkaan, jotta palvelin tietää, mistä kansiosta staattiset tiedostot ladataan.

### Muutokset tiedostoon [config.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/config/config.go)

Korvaa nykyinen [config.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/config/config.go) seuraavalla koodilla:

```go
package config

import "os"

// Config holds all environmental runtime settings for the application
type Config struct {
 Port        string
 DBPath      string
 FrontendDir string
}

// Load read configuration from environment variables or applies fallback defaults.
func Load() *Config {
 port := os.Getenv("PORT")
 if port == "" {
  port = "8080"
 }

 dbPath := os.Getenv("DATABASE_PATH")
 if dbPath == "" {
  dbPath = "clible.db"
 }

 frontendDir := os.Getenv("FRONTEND_DIR")
 if frontendDir == "" {
  frontendDir = "../frontend/dist" // Kehitysaikainen oletus
 }

 return &Config{
  Port:        port,
  DBPath:      dbPath,
  FrontendDir: frontendDir,
 }
}
```

### Miksi teimme tämän muutoksen?

- Paikallisessa kehitysympäristössä Go-backend pyörii `backend/`-kansiosta käsin, jolloin käännetty frontend löytyy suhteellisesta polusta `../frontend/dist`.
- Tuotantotilassa Docker-kontin sisällä frontend kopioidaan polkuun `/app/frontend/dist`, joten meidän on voitava ylikirjoittaa tämä polku ympäristömuuttujan `FRONTEND_DIR` avulla.

---

## Vaihe 2.2: Staattisen React-frontendin tarjoaminen ja SPA-fallback (`main.go`)

Koska React-sovelluksemme on Single Page Application (SPA), se käyttää asiakaspuolen reititystä (React Router). Jos käyttäjä lataa selaimella osoitteen `http://localhost:8080/scopes` suoraan, palvelin yrittää etsiä tiedostoa nimeltä `scopes` dist-kansiosta. Sitä ei tietenkään löydy.

Jotta reititys toimisi oikein, palvelimen on tällaisessa tilanteessa palautettava `index.html`-tiedosto, ja annettava Reactin hoitaa sivu JavaScriptillä.

### Muutokset tiedostoon [main.go](file:///home/vivaldev/code/clible-v3-go/backend/main.go)

1. Lisää `import`-lohkoon `"os"` (jos puuttuu), `"path/filepath"` ja `"strings"`.
2. Etsi tiedostosta kohta, jossa reititin alustetaan (`mux := http.NewServeMux()`) ja jossa API-endpointit rekisteröidään.
3. Rekisteröi API-endpointtien jälkeen `catch-all`-handleri `/`-polulle staattisia tiedostoja ja SPA-fallbackia varten.

Lisää seuraava koodi `mux.HandleFunc` -kutsujen ja `var handler http.Handler = mux` -määrittelyn väliin:

```go
 // --- Staattisen React-frontendin tarjoaminen SPA-fallbackilla ---
 fs := http.FileServer(http.Dir(cfg.FrontendDir))
 mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
  // Jos pyyntö alkaa /api/, mutta se ei osunut aiempiin reitteihin, palautetaan 404 API-virhe
  if strings.HasPrefix(r.URL.Path, "/api/") {
   http.Error(w, "API endpoint not found", http.StatusNotFound)
   return
  }

  // Muodostetaan täysi polku pyydetylle tiedostolle
  filePath := filepath.Join(cfg.FrontendDir, r.URL.Path)
  info, err := os.Stat(filePath)

  // Jos tiedostoa ei ole olemassa tai se on kansio (esim. juuripolku /), tarjotaan index.html (SPA Fallback)
  if os.IsNotExist(err) || info.IsDir() {
   http.ServeFile(w, r, filepath.Join(cfg.FrontendDir, "index.html"))
   return
  }

  // Muussa tapauksessa tarjotaan pyydetty staattinen tiedosto (esim. JS/CSS/kuva)
  fs.ServeHTTP(w, r)
 })
```

---

## Vaihe 2.3: Rate Limiting Middleware (`ratelimit.go`)

Gemini API -avaimen suojaamiseksi ja turhien pilvikustannusten välttämiseksi tarvitsemme rate limiterin. Käytämme tähän Go standardikirjaston rinnalla julkaistavaa virallista rinnakkaisuuspakettia `golang.org/x/time/rate`, joka toteuttaa tehokkaan **Token Bucket** -algoritmin suoraan muistissa ilman Redis-tietokantariippuvuuksia.

### Uusi tiedosto [ratelimit.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/middleware/ratelimit.go)

Luo uusi tiedosto polkuun `backend/internal/middleware/ratelimit.go` ja aseta sen sisällöksi seuraava:

```go
package middleware

import (
 "net"
 "net/http"
 "sync"
 "time"

 "golang.org/x/time/rate"
)

// client represents a rate limiter state for a single visitor
type client struct {
 limiter  *rate.Limiter
 lastSeen time.Time
}

// IPRateLimiter manages IP-based rate limiters in a thread-safe map
type IPRateLimiter struct {
 sync.RWMutex
 ips      map[string]*client
 r        rate.Limit
 b        int
 lifetime time.Duration
}

// NewIPRateLimiter creates a new instance of IPRateLimiter.
// r: limit of requests per second (e.g. rate.Every(time.Second))
// b: burst size (maximum tokens allowed initially)
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
 limiter := &IPRateLimiter{
  ips:      make(map[string]*client),
  r:        r,
  b:        b,
  lifetime: 10 * time.Minute, // Siivotaan käyttäjät, joita ei ole nähty 10 minuuttiin
 }

 // Käynnistetään taustaprosessi siivoamaan vanhat IP-osoitteet muistivuotojen estämiseksi
 go limiter.cleanupVisitorMap()

 return limiter
}

// GetLimiter returns or creates a rate limiter for the given IP address
func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
 i.Lock()
 defer i.Unlock()

 c, exists := i.ips[ip]
 if !exists {
  limiter := rate.NewLimiter(i.r, i.b)
  i.ips[ip] = &client{
   limiter:  limiter,
   lastSeen: time.Now(),
  }
  return limiter
 }

 c.lastSeen = time.Now()
 return c.limiter
}

func (i *IPRateLimiter) cleanupVisitorMap() {
 for {
  time.Sleep(1 * time.Minute)
  i.Lock()
  for ip, c := range i.ips {
   if time.Since(c.lastSeen) > i.lifetime {
    delete(i.ips, ip)
   }
  }
  i.Unlock()
 }
}

// RateLimitMiddleware returns a middleware handler that limits incoming API traffic
func RateLimitMiddleware(limiter *IPRateLimiter) func(http.Handler) http.Handler {
 return func(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
   // Otetaan IP-osoite ilman porttinumeroa
   ip, _, err := net.SplitHostPort(r.RemoteAddr)
   if err != nil {
    ip = r.RemoteAddr
   }

   // Haetaan tai luodaan tälle IP:lle oma rajoitin
   lim := limiter.GetLimiter(ip)
   if !lim.Allow() {
    http.Error(w, "Too Many Requests - quota exceeded", http.StatusTooManyRequests)
    return
   }

   next.ServeHTTP(w, r)
  })
 }
}
```

---

## Vaihe 2.4: Rate Limiterin käyttöönotto (`main.go`)

Nyt otamme luodun rate limiterin käyttöön `main.go`-palvelimessamme ja määritämme rajoitukset.

### Muutokset tiedostoon [main.go](file:///home/vivaldev/code/clible-v3-go/backend/main.go)

1. Lisää `"golang.org/x/time/rate"` importteihin (jos puuttuu, yleensä VS Code tai gopls lisää sen automaattisesti tai voimme ajaa `go get golang.org/x/time/rate`).
2. Määritetään sopiva rate limit. Esimerkiksi sallitaan 1 pyyntö per sekunti per IP, ja 10 pyynnön hetkellinen purske (burst).
3. Sovelletaan rate limiteriä vain `/api/`-alkuisiin pyyntöihin, jotta se ei turhaan rajoita staattisten tiedostojen (kuten JS/CSS/kuvat) lataamista, joiden on tultava nopeasti.

Etsi kohta, jossa middlewaret otetaan käyttöön:

```go
 var handler http.Handler = mux
 handler = middleware.Logger(handler)
 handler = middleware.CORS(handler)
 handler = middleware.Recovery(handler)
```

Muuta se seuraavasti:

```go
 // --- Alustetaan IP-pohjainen rate limiter ---
 // 2 pyyntöä sekunnissa, max 10 pyynnön purske (burst)
 limiter := middleware.NewIPRateLimiter(rate.Limit(2), 10)

 var handler http.Handler = mux
 handler = middleware.RateLimitMiddleware(limiter)(handler) // Lisätään rate limiter middleware ketjuun
 handler = middleware.Logger(handler)
 handler = middleware.CORS(handler)
 handler = middleware.Recovery(handler)
```

*(Huomautus: go.mod täytyy ehkä päivittää ajamalla `go get golang.org/x/time/rate` backend-hakemistossa, jotta riippuvuus asentuu oikein.)*
