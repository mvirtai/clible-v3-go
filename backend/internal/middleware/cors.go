package middleware

import "net/http"

var allowedOrigins = map[string]bool{
	"http://localhost:5173": true,
	"http://localhost:8080": true,
	"https://clible.fi":     true,
	"https://www.clible.fi": true,
}

// CORS injects basic loose safety standard access headers required for React frontend decoupling.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")

		// Handle preflight OPTIONS requests cleanly without hitting downstream DB stacks
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
