package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestCORS verifies that cross-origin preflights and standard headers inject correctly.
func TestCORS(t *testing.T) {
	// Create a dummy downstream handler to verify invocation chaining
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("downstream_success"))
	})

	corsHandler := CORS(nextHandler)

	t.Run("Allowed origin is echoed back in ACAO header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "http://localhost/api/verses", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		rec := httptest.NewRecorder()

		corsHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rec.Code)
		}
		if origin := rec.Header().Get("Access-Control-Allow-Origin"); origin != "http://localhost:5173" {
			t.Errorf("expected Access-Control-Allow-Origin to be http://localhost:5173, got %q", origin)
		}
		if body := rec.Body.String(); body != "downstream_success" {
			t.Errorf("expected body 'downstream_success', got %s", body)
		}
	})

	t.Run("Disallowed origin returns no header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "http://localhost/api/verses", nil)
		req.Header.Set("Origin", "http://malicious.com")
		rec := httptest.NewRecorder()

		corsHandler.ServeHTTP(rec, req)

		if rec.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Errorf("expected empty Access-Control-Allow-Origin for disallowed origin, got %s", rec.Header().Get("Access-Control-Allow-Origin"))
		}
	})

	t.Run("OPTIONS preflight request handles context intercept and bypasses downstream", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "http://localhost/api/verses", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		rec := httptest.NewRecorder()

		corsHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rec.Code)
		}
		// Body must be empty because OPTIONS should return immediately without executing nextHandler
		if body := rec.Body.String(); body != "" {
			t.Errorf("expected empty body for OPTIONS preflight, got %s", body)
		}
	})
}

// TestRecovery verifies that critical run-time errors are trapped without destroying the server.
func TestRecovery(t *testing.T) {
	// Create a bad downstream handler that intentionally triggers a panic
	panickingHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("database connection dropped un-expectantly")
	})

	recoveryHandler := Recovery(panickingHandler)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/verses", nil)
	rec := httptest.NewRecorder()

	// Ensure the test suite runner itself doesn't crash if the middleware fails
	defer func() {
		if err := recover(); err != nil {
			t.Fatalf("The recovery middleware allowed a panic to escape into the runtime: %v", err)
		}
	}()

	recoveryHandler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", rec.Code)
	}

	expectedJSON := `{"error":"Internal Server Error"}`
	if rec.Body.String() != expectedJSON {
		t.Errorf("expected JSON payload %q, got %q", expectedJSON, rec.Body.String())
	}
}

// TestLogger ensures the log decorator passes metrics down without destroying payloads.
func TestLogger(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot) // 418 I'm a teapot
	})

	loggerHandler := Logger(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/verses", nil)
	rec := httptest.NewRecorder()

	loggerHandler.ServeHTTP(rec, req)

	// Verify that the custom ResponseWriter delegated the custom status code perfectly
	if rec.Code != http.StatusTeapot {
		t.Errorf("expected status 418, got %d", rec.Code)
	}
}

// TestSecurityHeaders verifies standard security headers are injected into HTTP responses.
func TestSecurityHeaders(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	secHandler := SecurityHeaders(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/verses", nil)
	rec := httptest.NewRecorder()

	secHandler.ServeHTTP(rec, req)

	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Errorf("expected X-Content-Type-Options nosniff, got %q", rec.Header().Get("X-Content-Type-Options"))
	}
	if rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Errorf("expected X-Frame-Options DENY, got %q", rec.Header().Get("X-Frame-Options"))
	}
	if rec.Header().Get("Referrer-Policy") != "strict-origin-when-cross-origin" {
		t.Errorf("expected Referrer-Policy strict-origin-when-cross-origin, got %q", rec.Header().Get("Referrer-Policy"))
	}
	if rec.Header().Get("Strict-Transport-Security") != "max-age=31536000; includeSubDomains" {
		t.Errorf("expected HSTS header, got %q", rec.Header().Get("Strict-Transport-Security"))
	}
}

