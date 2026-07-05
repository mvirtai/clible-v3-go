package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// ---------------------------------------------------------------------------
// statusEmoji
// ---------------------------------------------------------------------------

func TestStatusEmoji(t *testing.T) {
	cases := []struct {
		code int
		want string
	}{
		{200, "✅"},
		{201, "✅"},
		{299, "✅"},
		{301, "↪️ "},
		{304, "↪️ "},
		{400, "⚠️ "},
		{404, "⚠️ "},
		{422, "⚠️ "},
		{500, "🔥"},
		{502, "🔥"},
		{503, "🔥"},
	}

	for _, c := range cases {
		got := statusEmoji(c.code)
		if got != c.want {
			t.Errorf("statusEmoji(%d) = %q, want %q", c.code, got, c.want)
		}
	}
}

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

func TestFormatDuration(t *testing.T) {
	cases := []struct {
		d    time.Duration
		want string
	}{
		{500 * time.Microsecond, "500µs"},
		{999 * time.Microsecond, "999µs"},
		{1 * time.Millisecond, "1ms"},
		{42 * time.Millisecond, "42ms"},
		{999 * time.Millisecond, "999ms"},
		{1 * time.Second, "1.00s"},
		{1500 * time.Millisecond, "1.50s"},
		{10 * time.Second, "10.00s"},
	}

	for _, c := range cases {
		got := formatDuration(c.d)
		if got != c.want {
			t.Errorf("formatDuration(%v) = %q, want %q", c.d, got, c.want)
		}
	}
}

// ---------------------------------------------------------------------------
// isStaticAsset
// ---------------------------------------------------------------------------

func TestIsStaticAsset(t *testing.T) {
	staticPaths := []string{
		"/app.js",
		"/bundle.min.js",
		"/styles/main.css",
		"/favicon.ico",
		"/logo.png",
		"/font.woff2",
		"/icon.svg",
		"/app.js.map",
	}
	for _, p := range staticPaths {
		if !isStaticAsset(p) {
			t.Errorf("isStaticAsset(%q) = false, want true", p)
		}
	}

	nonStaticPaths := []string{
		"/api/verses",
		"/api/search",
		"/api/translations/import",
		"/",
		"/index.html",
	}
	for _, p := range nonStaticPaths {
		if isStaticAsset(p) {
			t.Errorf("isStaticAsset(%q) = true, want false", p)
		}
	}
}

// ---------------------------------------------------------------------------
// Logger middleware – behavioral tests with slog output capture
// ---------------------------------------------------------------------------

// captureLogger swaps slog.Default for a buffer-backed handler for the duration
// of the test, restoring the original on cleanup. This avoids global state leaks
// between parallel tests.
func captureLogger(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	orig := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})))
	t.Cleanup(func() { slog.SetDefault(orig) })
	return &buf
}

func TestLogger_EmitsStartAndDoneLines(t *testing.T) {
	buf := captureLogger(t)

	handler := Logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/verses", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	output := buf.String()

	// Expect a → start line and a ✅ done line.
	if !strings.Contains(output, "→ GET /api/verses") {
		t.Errorf("expected start log line containing '→ GET /api/verses', got:\n%s", output)
	}
	if !strings.Contains(output, "✅ GET /api/verses") {
		t.Errorf("expected done log line containing '✅ GET /api/verses', got:\n%s", output)
	}
}

func TestLogger_ReflectsStatusCodeInDoneLine(t *testing.T) {
	cases := []struct {
		status  int
		wantPfx string
	}{
		{http.StatusOK, "✅"},
		{http.StatusNotFound, "⚠️ "},
		{http.StatusInternalServerError, "🔥"},
	}

	for _, c := range cases {
		buf := captureLogger(t)

		handler := Logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(c.status)
		}))

		req := httptest.NewRequest(http.MethodGet, "/api/search", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if !strings.Contains(buf.String(), c.wantPfx) {
			t.Errorf("status %d: expected log to contain %q, got:\n%s", c.status, c.wantPfx, buf.String())
		}
	}
}

func TestLogger_SkipsStaticAssets(t *testing.T) {
	buf := captureLogger(t)

	handler := Logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	// Static assets must not produce any log output at all.
	if got := buf.String(); got != "" {
		t.Errorf("expected no log output for static asset, got:\n%s", got)
	}
	// But the downstream handler must still be called (status 200).
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200 for static asset passthrough, got %d", rec.Code)
	}
}

func TestLogger_DoneLineContainsDurationField(t *testing.T) {
	buf := captureLogger(t)

	handler := Logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/translations/import", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !strings.Contains(buf.String(), "duration_ms=") {
		t.Errorf("expected structured 'duration_ms' field in log output, got:\n%s", buf.String())
	}
}

func TestLogger_DelegatesStatusCodeCorrectly(t *testing.T) {
	handler := Logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot) // 418
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/verses", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusTeapot {
		t.Errorf("expected delegated status 418, got %d", rec.Code)
	}
}
