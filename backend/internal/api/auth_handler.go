// backend/internal/api/auth_handler.go
package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"os"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

type AuthHandler struct {
	authService *services.AuthService
	userRepo    *db.UserRepository
}

func NewAuthHandler(authService *services.AuthService, userRepo *db.UserRepository) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userRepo:    userRepo,
	}
}

type authRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" {
		writeJSONError(w, http.StatusBadRequest, "email is required")
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	if err := validatePassword(req.Password); err != nil {
		slog.Warn("Password validation failed during registration", "error", err)
		writeJSONError(w, http.StatusBadRequest, "registration failed: password does not meet strength requirements")
		return
	}

	user, err := h.authService.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		slog.Warn("Registration failed", "email", req.Email, "error", err)
		writeJSONError(w, http.StatusBadRequest, "registration failed")
		return
	}

	// Kirjataan käyttäjä suoraan sisään rekisteröitymisen jälkeen
	_, token, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		slog.Error("Registration succeeded but login failed", "email", req.Email, "error", err)
		writeJSONError(w, http.StatusInternalServerError, "registration succeeded but login failed")
		return
	}

	h.setJWTCookie(w, token)
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, token, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		slog.Warn("Login failed", "email", req.Email, "error", err)
		writeJSONError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	h.setJWTCookie(w, token)
	_ = json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	isProduction := os.Getenv("ENV") == "production"
	http.SetCookie(w, &http.Cookie{
		Name:     "jwt",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isProduction,
		SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "logged out successfully"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	cookie, err := r.Cookie("jwt")
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userID, err := h.authService.ValidateToken(cookie.Value)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	_ = json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) setJWTCookie(w http.ResponseWriter, token string) {
	isProduction := os.Getenv("ENV") == "production"
	http.SetCookie(w, &http.Cookie{
		Name:     "jwt",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   isProduction,
		SameSite: http.SameSiteLaxMode,
	})
}

func validatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}

	var hasUpper, hasNumber, hasSpecial bool
	for _, r := range password {
		switch {
		case r >= 'A' && r <= 'Z':
			hasUpper = true
		case r >= '0' && r <= '9':
			hasNumber = true
		case r >= 'a' && r <= 'z':
			// Lowercase
		default:
			// Special characters (not alphanumeric)
			hasSpecial = true
		}
	}

	if !hasUpper {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !hasNumber {
		return errors.New("password must contain at least one number")
	}
	if !hasSpecial {
		return errors.New("password must contain at least one special character")
	}

	return nil
}
