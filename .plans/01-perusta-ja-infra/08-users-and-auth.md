# Vaiheittainen ohje: Käyttäjähallinnan ja kirjautumislogiikan toteuttaminen

Tässä ohjeessa käydään läpi, miten toteutetaan käyttäjähallinta, suojattu salasanan hashaus (bcrypt), JWT-istunnot evästeillä (HttpOnly cookies) sekä React-reititys ja kirjautumislomakkeet.

---

## Esitiedot ja riippuvuudet

Ennen kuin aloitamme koodin kirjoittamisen, asennetaan tarvittavat kirjastot backendille ja frontendille.

### Backend

Asennetaan bcrypt-salasanakirjasto ja JWT-kirjasto:

```bash
# Suoritetaan backend-hakemistossa
go get golang.org/x/crypto/bcrypt
go get github.com/golang-jwt/jwt/v5
```

### Frontend

Asennetaan React Router v6 reitityksen hallintaa varten:

```bash
# Suoritetaan frontend-hakemistossa
pnpm add react-router-dom
pnpm add -D @types/react-router-dom
```

---

## 1. Tietokantakerros

### 1.1. Migraatio (`backend/migrations/008_add_users_and_auth.sql`)

Luodaan uusi SQL-migraatiotiedosto, joka luo `users`-taulun ja lisää käyttäjäviitteet olemassa oleviin tauluihin.

```sql
-- backend/migrations/008_add_users_and_auth.sql
-- Migration 008: Add users and authentication support

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Lisätään user_id sarakkeet olemassa oleviin tauluihin.
-- SQLite tukee ADD COLUMN:ia suoraan, ja sallitaan NULL-arvo taaksepäin yhteensopivuuden takaamiseksi.
ALTER TABLE scopes ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE search_history ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Luodaan indeksit haun optimoimiseksi
CREATE INDEX IF NOT EXISTS idx_scopes_user ON scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
```

### 1.2. Käyttäjä-malli ja UserRepository (`backend/internal/db/user_repo.go`)

Luodaan `User`-malli ja sille repositorio tietokantakyselyitä varten.

```go
// backend/internal/db/user_repo.go
package db

import (
 "context"
 "database/sql"
 "errors"
 "fmt"
 "time"
)

type User struct {
 ID           string    `json:"id"`
 Email        string    `json:"email"`
 PasswordHash string    `json:"-"` // Ei koskaan sarjallisteta JSONiksi
 CreatedAt    time.Time `json:"created_at"`
 UpdatedAt    time.Time `json:"updated_at"`
}

type UserRepository struct {
 db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
 return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *User) error {
 query := `
  INSERT INTO users (id, email, password_hash, created_at, updated_at)
  VALUES ($1, $2, $3, $4, $5)
 `
 now := time.Now()
 user.CreatedAt = now
 user.UpdatedAt = now

 _, err := r.db.ExecContext(ctx, query, user.ID, user.Email, user.PasswordHash, user.CreatedAt, user.UpdatedAt)
 if err != nil {
  return fmt.Errorf("failed to create user: %w", err)
 }
 return nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
 query := `
  SELECT id, email, password_hash, created_at, updated_at
  FROM users
  WHERE email = $1
 `
 var user User
 err := r.db.QueryRowContext(ctx, query, email).Scan(
  &user.ID,
  &user.Email,
  &user.PasswordHash,
  &user.CreatedAt,
  &user.UpdatedAt,
 )
 if errors.Is(err, sql.ErrNoRows) {
  return nil, nil // Käyttäjää ei löydy
 }
 if err != nil {
  return nil, fmt.Errorf("failed to get user by email: %w", err)
 }
 return &user, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*User, error) {
 query := `
  SELECT id, email, password_hash, created_at, updated_at
  FROM users
  WHERE id = $1
 `
 var user User
 err := r.db.QueryRowContext(ctx, query, id).Scan(
  &user.ID,
  &user.Email,
  &user.PasswordHash,
  &user.CreatedAt,
  &user.UpdatedAt,
 )
 if errors.Is(err, sql.ErrNoRows) {
  return nil, nil
 }
 if err != nil {
  return nil, fmt.Errorf("failed to get user by id: %w", err)
 }
 return &user, nil
}
```

### 1.3. Olemassa olevien repositorioiden päivitys (`user_id` suodatukset)

Jotta scopet ja hakuhistoria ovat käyttäjäkohtaisia, niitä pitää suodattaa `user_id`:n mukaan.

#### Esimerkki `ScopeRepository` muutoksesta

Päivitetään `scope_repo.go` metodit:

```go
// backend/internal/db/scope_repo.go muokkauskohteet

// Lisätään user_id parametri Create-metodiin
func (r *ScopeRepository) Create(ctx context.Context, scope *Scope, userID string) error {
 query := `
  INSERT INTO scopes (id, name, created_at, user_id)
  VALUES ($1, $2, $3, $4)
 `
 _, err := r.db.ExecContext(ctx, query, scope.ID, scope.Name, scope.CreatedAt, userID)
 // ...
}

// Suodatetaan GetAll käyttäjän mukaan
func (r *ScopeRepository) GetAll(ctx context.Context, userID string) ([]Scope, error) {
 query := `
  SELECT id, name, created_at
  FROM scopes
  WHERE user_id = $1
  ORDER BY name ASC
 `
 rows, err := r.db.QueryContext(ctx, query, userID)
 // ...
}
```

---

## 2. Palvelukerros (Services)

### 2.1. Autentikaatiopalvelu (`backend/internal/services/auth_service.go`)

Luodaan `AuthService`, joka käsittelee salasanan hashaamisen ja JWT-tokenin allekirjoittamisen.

```go
// backend/internal/services/auth_service.go
package services

import (
 "context"
 "errors"
 "fmt"
 "time"

 "github.com/golang-jwt/jwt/v5"
 "github.com/google/uuid"
 "golang.org/x/crypto/bcrypt"

 "github.com/mvirtai/clible-v3-go/internal/db"
)

var ErrInvalidCredentials = errors.New("invalid email or password")

type AuthService struct {
 userRepo  *db.UserRepository
 jwtSecret []byte
}

func NewAuthService(userRepo *db.UserRepository, jwtSecret string) *AuthService {
 return &AuthService{
  userRepo:  userRepo,
  jwtSecret: []byte(jwtSecret),
 }
}

type Claims struct {
 UserID string `json:"user_id"`
 jwt.RegisteredClaims
}

func (s *AuthService) Register(ctx context.Context, email, password string) (*db.User, error) {
 existingUser, err := s.userRepo.GetByEmail(ctx, email)
 if err != nil {
  return nil, err
 }
 if existingUser != nil {
  return nil, errors.New("email is already registered")
 }

 hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
 if err != nil {
  return nil, fmt.Errorf("failed to hash password: %w", err)
 }

 user := &db.User{
  ID:           uuid.New().String(),
  Email:        email,
  PasswordHash: string(hashedPassword),
 }

 if err := s.userRepo.Create(ctx, user); err != nil {
  return nil, err
 }

 return user, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*db.User, string, error) {
 user, err := s.userRepo.GetByEmail(ctx, email)
 if err != nil {
  return nil, "", err
 }
 if user == nil {
  return nil, "", ErrInvalidCredentials
 }

 err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
 if err != nil {
  return nil, "", ErrInvalidCredentials
 }

 token, err := s.GenerateToken(user.ID)
 if err != nil {
  return nil, "", err
 }

 return user, token, nil
}

func (s *AuthService) GenerateToken(userID string) (string, error) {
 expirationTime := time.Now().Add(24 * time.Hour)
 claims := &Claims{
  UserID: userID,
  RegisteredClaims: jwt.RegisteredClaims{
   ExpiresAt: jwt.NewNumericDate(expirationTime),
   IssuedAt:  jwt.NewNumericDate(time.Now()),
  },
 }

 token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
 tokenString, err := token.SignedString(s.jwtSecret)
 if err != nil {
  return "", fmt.Errorf("failed to sign token: %w", err)
 }

 return tokenString, nil
}

func (s *AuthService) ValidateToken(tokenString string) (string, error) {
 claims := &Claims{}
 token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
  if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
   return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
  }
  return s.jwtSecret, nil
 })

 if err != nil {
  return "", fmt.Errorf("token validation failed: %w", err)
 }

 if !token.Valid {
  return "", errors.New("invalid token")
 }

 return claims.UserID, nil
}
```

---

## 3. API-rajapinta ja Middleware (HTTP Layer)

### 3.1. Autentikaatio-middleware (`backend/internal/middleware/auth_middleware.go`)

Middleware suojaa reitit ja asettaa `user_id`:n kontekstiin.

```go
// backend/internal/middleware/auth_middleware.go
package middleware

import (
 "context"
 "net/http"

 "github.com/mvirtai/clible-v3-go/internal/services"
)

type contextKey string

const UserIDKey contextKey = "user_id"

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
   ctx := context.WithValue(r.Context(), UserIDKey, userID)
   next.ServeHTTP(w, r.WithContext(ctx))
  })
 }
}

// Apufunktio user_id:n hakemiseen kontekstista handlerissa
func GetUserID(ctx context.Context) (string, bool) {
 userID, ok := ctx.Value(UserIDKey).(string)
 return userID, ok
}
```

### 3.2. Autentikaatio-handlerit (`backend/internal/api/auth_handler.go`)

Luodaan rajapinnat rekisteröitymiseen, kirjautumiseen ja uloskirjautumiseen.

```go
// backend/internal/api/auth_handler.go
package api

import (
 "encoding/json"
 "errors"
 "net/http"
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

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
 if r.Method != http.MethodPost {
  http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
  return
 }

 var req authRequest
 if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
  http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
  return
 }

 if req.Email == "" || len(req.Password) < 6 {
  http.Error(w, `{"error":"invalid email or password too short (min 6 chars)"}`, http.StatusBadRequest)
  return
 }

 user, err := h.authService.Register(r.Context(), req.Email, req.Password)
 if err != nil {
  http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
  return
 }

 // Kirjataan käyttäjä suoraan sisään rekisteröitymisen jälkeen
 _, token, err := h.authService.Login(r.Context(), req.Email, req.Password)
 if err != nil {
  http.Error(w, `{"error":"registration succeeded but login failed"}`, http.StatusInternalServerError)
  return
 }

 h.setJWTCookie(w, token)
 w.WriteHeader(http.StatusCreated)
 _ = json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
 if r.Method != http.MethodPost {
  http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
  return
 }

 var req authRequest
 if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
  http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
  return
 }

 user, token, err := h.authService.Login(r.Context(), req.Email, req.Password)
 if err != nil {
  if errors.Is(err, services.ErrInvalidCredentials) {
   http.Error(w, `{"error":"invalid email or password"}`, http.StatusUnauthorized)
   return
  }
  http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
  return
 }

 h.setJWTCookie(w, token)
 _ = json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
 http.SetCookie(w, &http.Cookie{
  Name:     "jwt",
  Value:    "",
  Path:     "/",
  MaxAge:   -1,
  HttpOnly: true,
  Secure:   true, // Aseta true tuotannossa (HTTPS)
  SameSite: http.SameSiteLaxMode,
 })
 w.WriteHeader(http.StatusOK)
 _, _ = w.Write([]byte(`{"message":"logged out successfully"}`))
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
 cookie, err := r.Cookie("jwt")
 if err != nil {
  http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
  return
 }

 userID, err := h.authService.ValidateToken(cookie.Value)
 if err != nil {
  http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
  return
 }

 user, err := h.userRepo.GetByID(r.Context(), userID)
 if err != nil || user == nil {
  http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
  return
 }

 _ = json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) setJWTCookie(w http.ResponseWriter, token string) {
 http.SetCookie(w, &http.Cookie{
  Name:     "jwt",
  Value:    token,
  Path:     "/",
  Expires:  time.Now().Add(24 * time.Hour),
  HttpOnly: true,
  Secure:   false, // Kehityksessä HTTP riittää. Tuotannossa True (HTTPS).
  SameSite: http.SameSiteLaxMode,
 })
}
```

### 3.3. CORS & Main-tiedoston päivitykset (`backend/main.go`)

Jotta evästeet kulkevat frontendiltä backendille ristiin, CORS-asetusten pitää sallia `Access-Control-Allow-Credentials: true`.

#### Päivitetään CORS-middleware (`backend/internal/middleware/cors.go`)

Varmista, että CORS palauttaa headerin `Access-Control-Allow-Credentials: true` ja että sallittu `Origin` ei ole `*` (koska credentials vaatii tarkat origin-määrittelyt, esim. `http://localhost:5173`).

#### Rekisteröidään uudet reitit `backend/main.go`-tiedostossa

```go
// main.go:n sisällä (alustus)
jwtSecret := os.Getenv("JWT_SECRET")
if jwtSecret == "" {
    jwtSecret = "development-secret-key-replace-in-production"
}

userRepo := db.NewUserRepository(dbConn)
authService := services.NewAuthService(userRepo, jwtSecret)
authHandler := api.NewAuthHandler(authService, userRepo)

// Rekisteröidään reitit
mux.HandleFunc("POST /api/auth/register", authHandler.Register)
mux.HandleFunc("POST /api/auth/login", authHandler.Login)
mux.HandleFunc("POST /api/auth/logout", authHandler.Logout)
mux.HandleFunc("GET /api/auth/me", authHandler.Me)

// Kääritään suojatut reitit RequireAuth-middlewareen
requireAuth := middleware.RequireAuth(authService)

// Esimerkiksi Scopes ja History endpointit vaativat kirjautumisen:
mux.Handle("POST /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.CreateScope)))
mux.Handle("GET /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.GetScopes)))
mux.Handle("DELETE /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.DeleteScope)))
mux.Handle("POST /api/scopes/saved-searches", requireAuth(http.HandlerFunc(scopeHandler.SaveSearch)))
mux.Handle("POST /api/scopes/saved-analyses", requireAuth(http.HandlerFunc(scopeHandler.SaveAnalysis)))
mux.Handle("GET /api/scopes/workspace", requireAuth(http.HandlerFunc(scopeHandler.GetScopeWorkspace)))

mux.Handle("POST /api/history", requireAuth(http.HandlerFunc(historyHandler.AddSearch)))
mux.Handle("GET /api/history", requireAuth(http.HandlerFunc(historyHandler.GetRecentHistory)))
```

---

## 4. Frontend (React & TypeScript)

### 4.1. ApiServicen päivitys (`frontend/src/services/api.ts`)

Jotta evästeet (`jwt`) lähetetään ja vastaanotetaan jokaisessa kutsussa, asetetaan `credentials: 'include'` oletukseksi fetch-kutsuihin.

```typescript
// frontend/src/services/api.ts muokkaus
const fetchJson = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include', // Lähetetään evästeet mukana
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  const response = await fetch(url, mergedOptions);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};
```

### 4.2. Autentikaatio-konteksti (`frontend/src/context/AuthContext.tsx`)

Konteksti hallinnoi kirjautuneen käyttäjän tilaa läpi sovelluksen.

```tsx
// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiService } from '../services/api'; // Oletetaan, että ApiService tuo apufunktiot

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Tarkistetaan istunto heti sovelluksen käynnistyessä
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await ApiService.getMe(); // GET /api/auth/me
        setUser(currentUser);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    const loggedUser = await ApiService.login(email, password); // POST /api/auth/login
    setUser(loggedUser);
  };

  const register = async (email: string, password: string) => {
    const newUser = await ApiService.register(email, password); // POST /api/auth/register
    setUser(newUser);
  };

  const logout = async () => {
    await ApiService.logout(); // POST /api/auth/logout
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 4.3. React Router -reititys ja suojatut reitit (`frontend/src/main.tsx`)

Määritellään reititys siten, että suojaamattomat sivut (Login, Register) ja suojattu lukutila (`/` tai `/workspace`) ovat omilla poluillaan.

```tsx
// frontend/src/main.tsx tai erillinen Router-komponentti
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### 4.4. Kirjautumissivu (`frontend/src/pages/Login.tsx`)

Yksinkertainen, erittäin tyylikäs ja moderni kirjautumissivu, joka mukailee Clible-v3-kulta/warm-neutral -ilmettä.

```tsx
// frontend/src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md p-8 rounded-2xl border"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-full mb-3" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Clible Workspace
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Kirjaudu sisään jatkaaksesi työtilaasi
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm rounded-lg border bg-red-500/10 border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Sähköposti
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Salasana
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium tracking-wide transition-colors focus:outline-none cursor-pointer"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
            }}
          >
            {loading ? 'Kirjaudutaan...' : 'Kirjaudu sisään'}
          </button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--muted)' }}>
          Eikö sinulla ole tiliä?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }} className="hover:underline">
            Rekisteröidy tästä
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```
