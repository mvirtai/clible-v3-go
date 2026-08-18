package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"golang.org/x/time/rate"
)

func TestIPRateLimiter_GetLimiter(t *testing.T) {
	limiter := NewIPRateLimiter(rate.Every(time.Second), 3)

	lim1 := limiter.GetLimiter("192.168.1.100")
	if lim1 == nil {
		t.Fatalf("expected non-nil rate limiter")
	}

	lim2 := limiter.GetLimiter("192.168.1.100")
	if lim1 != lim2 {
		t.Errorf("expected same rate limiter instance for same IP")
	}

	lim3 := limiter.GetLimiter("192.168.1.200")
	if lim3 == lim1 {
		t.Errorf("expected different rate limiter instance for different IP")
	}
}

func TestRateLimitMiddleware_LocalhostBypass(t *testing.T) {
	// Zero token limit to immediately block any non-bypassed requests
	limiter := NewIPRateLimiter(rate.Limit(0), 0)
	mw := RateLimitMiddleware(limiter)

	nextCalled := false
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	})

	handler := mw(nextHandler)

	for _, ip := range []string{"127.0.0.1", "::1"} {
		t.Run("bypass for "+ip, func(t *testing.T) {
			nextCalled = false
			req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
			if ip == "::1" {
				req.RemoteAddr = "[::1]:12345"
			} else {
				req.RemoteAddr = ip + ":12345"
			}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Errorf("expected 200 for %s, got %d", ip, rec.Code)
			}
			if !nextCalled {
				t.Errorf("expected nextHandler to be called for %s", ip)
			}
		})
	}
}

func TestRateLimitMiddleware_Throttling(t *testing.T) {
	// 1 request token total, zero refill during test
	limiter := NewIPRateLimiter(rate.Limit(0), 1)
	mw := RateLimitMiddleware(limiter)

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	handler := mw(nextHandler)

	// First request succeeds
	req1 := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req1.RemoteAddr = "203.0.113.10:54321"
	rec1 := httptest.NewRecorder()

	handler.ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusOK {
		t.Errorf("expected 200 on first request, got %d", rec1.Code)
	}

	// Second immediate request exceeds burst limit (1) -> 429
	req2 := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req2.RemoteAddr = "203.0.113.10:54321"
	rec2 := httptest.NewRecorder()

	handler.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429 on second request, got %d", rec2.Code)
	}
}

func TestGetClientIP(t *testing.T) {
	t.Run("extracts from X-Forwarded-For single IP", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("X-Forwarded-For", "203.0.113.195")
		req.RemoteAddr = "10.0.0.1:1234"

		ip := getClientIP(req)
		if ip != "203.0.113.195" {
			t.Errorf("expected 203.0.113.195, got %s", ip)
		}
	})

	t.Run("extracts first IP from X-Forwarded-For chain", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("X-Forwarded-For", "203.0.113.195, 198.51.100.10, 10.0.0.1")
		req.RemoteAddr = "10.0.0.1:1234"

		ip := getClientIP(req)
		if ip != "203.0.113.195" {
			t.Errorf("expected 203.0.113.195, got %s", ip)
		}
	})

	t.Run("falls back to RemoteAddr host when X-Forwarded-For is empty", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "192.0.2.1:8080"

		ip := getClientIP(req)
		if ip != "192.0.2.1" {
			t.Errorf("expected 192.0.2.1, got %s", ip)
		}
	})

	t.Run("falls back to raw RemoteAddr if SplitHostPort fails", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "invalid_remote_addr_without_port"

		ip := getClientIP(req)
		if ip != "invalid_remote_addr_without_port" {
			t.Errorf("expected raw remote addr, got %s", ip)
		}
	})
}
