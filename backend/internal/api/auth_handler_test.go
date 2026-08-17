package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func setupAuthHandler(t *testing.T) (*api.AuthHandler, *services.AuthService, *db.UserRepository) {
	t.Helper()
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize db: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	userRepo := db.NewUserRepository(conn)
	authSvc := services.NewAuthService(userRepo, "test-jwt-secret-for-handler-tests-32!")
	handler := api.NewAuthHandler(authSvc, userRepo)
	return handler, authSvc, userRepo
}

func TestAuthHandler_Register(t *testing.T) {
	handler, _, _ := setupAuthHandler(t)

	t.Run("rejects non-POST method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/register", nil)
		rec := httptest.NewRecorder()

		handler.Register(rec, req)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405, got %d", rec.Code)
		}
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader([]byte("{invalid-json")))
		rec := httptest.NewRecorder()

		handler.Register(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("rejects empty email", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"email": "", "password": "Password123!"})
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.Register(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("rejects invalid email format", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"email": "not-an-email", "password": "Password123!"})
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.Register(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("rejects passwords not meeting complexity rules", func(t *testing.T) {
		weakPasswords := []string{
			"short",        // < 8 chars
			"nouppercase1!", // no uppercase
			"NoNumber!",    // no number
			"NoSpecial1",   // no special char
		}

		for _, pwd := range weakPasswords {
			body, _ := json.Marshal(map[string]string{"email": "user@example.com", "password": pwd})
			req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
			rec := httptest.NewRecorder()

			handler.Register(rec, req)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for password %q, got %d", pwd, rec.Code)
			}
		}
	})

	t.Run("successfully registers and sets JWT cookie", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"email": "newuser@example.com", "password": "StrongPassword123!"})
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.Register(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
		}

		// Verify cookie is set
		cookies := rec.Result().Cookies()
		var jwtCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == "jwt" {
				jwtCookie = c
				break
			}
		}
		if jwtCookie == nil || jwtCookie.Value == "" {
			t.Errorf("expected non-empty jwt cookie to be set")
		}

		// Verify response payload is user struct
		var user db.User
		if err := json.NewDecoder(rec.Body).Decode(&user); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if user.Email != "newuser@example.com" {
			t.Errorf("expected email newuser@example.com, got %s", user.Email)
		}
	})

	t.Run("rejects duplicate email registration", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"email": "newuser@example.com", "password": "StrongPassword123!"})
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.Register(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for duplicate registration, got %d", rec.Code)
		}
	})
}

func TestAuthHandler_Login(t *testing.T) {
	handler, authSvc, _ := setupAuthHandler(t)
	_, _ = authSvc.Register(context.Background(), "registered@example.com", "SecretPass123!")

	t.Run("rejects non-POST method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
		rec := httptest.NewRecorder()

		handler.Login(rec, req)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405, got %d", rec.Code)
		}
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader([]byte("{invalid-json")))
		rec := httptest.NewRecorder()

		handler.Login(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("rejects invalid credentials", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"email": "registered@example.com", "password": "WrongPassword123!"})
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.Login(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 for wrong password, got %d", rec.Code)
		}
	})

	t.Run("successfully logs in and sets cookie", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"email": "registered@example.com", "password": "SecretPass123!"})
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
		rec := httptest.NewRecorder()

		handler.Login(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
		}

		cookies := rec.Result().Cookies()
		var jwtCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == "jwt" {
				jwtCookie = c
				break
			}
		}
		if jwtCookie == nil || jwtCookie.Value == "" {
			t.Errorf("expected non-empty jwt cookie on login")
		}
	})
}

func TestAuthHandler_Logout(t *testing.T) {
	handler, _, _ := setupAuthHandler(t)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	rec := httptest.NewRecorder()

	handler.Logout(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", rec.Code)
	}

	cookies := rec.Result().Cookies()
	var jwtCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "jwt" {
			jwtCookie = c
			break
		}
	}
	if jwtCookie == nil || jwtCookie.MaxAge >= 0 {
		t.Errorf("expected expired jwt cookie on logout, got %v", jwtCookie)
	}
}

func TestAuthHandler_Me(t *testing.T) {
	handler, authSvc, userRepo := setupAuthHandler(t)
	user, _ := authSvc.Register(context.Background(), "me@example.com", "SecretPass123!")

	t.Run("returns 401 when cookie is missing", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		rec := httptest.NewRecorder()

		handler.Me(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("returns 401 when cookie is invalid", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.AddCookie(&http.Cookie{Name: "jwt", Value: "invalid-token"})
		rec := httptest.NewRecorder()

		handler.Me(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("returns 404 when user is not found in database", func(t *testing.T) {
		token, _ := authSvc.GenerateToken("non-existent-user-id")
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.AddCookie(&http.Cookie{Name: "jwt", Value: token})
		rec := httptest.NewRecorder()

		handler.Me(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", rec.Code)
		}
	})

	t.Run("returns 200 and user payload when authenticated", func(t *testing.T) {
		token, _ := authSvc.GenerateToken(user.ID)
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.AddCookie(&http.Cookie{Name: "jwt", Value: token})
		rec := httptest.NewRecorder()

		handler.Me(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
		}

		var fetchedUser db.User
		if err := json.NewDecoder(rec.Body).Decode(&fetchedUser); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if fetchedUser.ID != user.ID || fetchedUser.Email != user.Email {
			t.Errorf("user mismatch: got %+v, want %+v", fetchedUser, user)
		}
	})

	_ = userRepo
}
