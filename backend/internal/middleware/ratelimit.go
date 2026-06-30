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
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}

			lim := limiter.GetLimiter(ip)
			if !lim.Allow() {
				http.Error(w, "Too Many Requests - quota exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
