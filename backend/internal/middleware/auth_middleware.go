// backend/internal/middleware/auth_middleware.go
package middleware

import (
	"context"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

// UserIDKey is re-exported here for backward compatibility with existing API tests
const UserIDKey = ctxkeys.UserIDKey

func RequireAuth(authService *services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("jwt")
			if err != nil {
				http.Error(w, `{"error":"unauthorized, token missing"}`, http.StatusUnauthorized)
				return
			}

			userID, err := authService.ValidateToken(cookie.Value)
			if err != nil {
				// Tyhjennetään virheellinen eväste
				http.SetCookie(w, &http.Cookie{
					Name:     "jwt",
					Value:    "",
					Path:     "/",
					MaxAge:   -1,
					HttpOnly: true,
				})
				http.Error(w, `{"error":"unauthorized, invalid token"}`, http.StatusUnauthorized)
				return
			}

			// Asetetaan user_id pyynnön kontekstiin
			ctx := context.WithValue(r.Context(), ctxkeys.UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID retrieves the user_id from the context if available.
func GetUserID(ctx context.Context) (string, bool) {
	return ctxkeys.GetUserID(ctx)
}
