package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func setupAuthService(t *testing.T) *services.AuthService {
	t.Helper()
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize test db: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	userRepo := db.NewUserRepository(conn)
	return services.NewAuthService(userRepo, "test-jwt-secret-key-32-chars-long!")
}

func TestRequireAuth(t *testing.T) {
	authService := setupAuthService(t)
	authMiddleware := middleware.RequireAuth(authService)

	nextCalled := false
	var capturedUserID string
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		if uid, ok := middleware.GetUserID(r.Context()); ok {
			capturedUserID = uid
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	handler := authMiddleware(nextHandler)

	t.Run("missing cookie returns 401", func(t *testing.T) {
		nextCalled = false
		req := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
		if nextCalled {
			t.Errorf("downstream handler should not have been called")
		}
	})

	t.Run("invalid token returns 401 and clears cookie", func(t *testing.T) {
		nextCalled = false
		req := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
		req.AddCookie(&http.Cookie{
			Name:  "jwt",
			Value: "invalid.jwt.token",
		})
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
		if nextCalled {
			t.Errorf("downstream handler should not have been called")
		}

		// Verify cookie is cleared (MaxAge < 0)
		cookies := rec.Result().Cookies()
		var jwtCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == "jwt" {
				jwtCookie = c
				break
			}
		}
		if jwtCookie == nil || jwtCookie.MaxAge >= 0 {
			t.Errorf("expected expired jwt cookie, got %v", jwtCookie)
		}
	})

	t.Run("valid token propagates user ID in context", func(t *testing.T) {
		nextCalled = false
		capturedUserID = ""

		validToken, err := authService.GenerateToken("user-abc-123")
		if err != nil {
			t.Fatalf("failed to generate token: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
		req.AddCookie(&http.Cookie{
			Name:  "jwt",
			Value: validToken,
		})
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
		if !nextCalled {
			t.Errorf("expected downstream handler to be called")
		}
		if capturedUserID != "user-abc-123" {
			t.Errorf("expected user ID 'user-abc-123', got %q", capturedUserID)
		}
	})
}

func TestGetUserID(t *testing.T) {
	t.Run("retrieves user ID when present in context", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), ctxkeys.UserIDKey, "user-456")
		uid, ok := middleware.GetUserID(ctx)
		if !ok || uid != "user-456" {
			t.Errorf("expected ('user-456', true), got (%q, %v)", uid, ok)
		}
	})

	t.Run("returns false when context is empty", func(t *testing.T) {
		ctx := context.Background()
		uid, ok := middleware.GetUserID(ctx)
		if ok || uid != "" {
			t.Errorf("expected ('', false), got (%q, %v)", uid, ok)
		}
	})
}
