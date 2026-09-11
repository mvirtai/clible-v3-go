package middleware

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"
)

func TestFormatSQL(t *testing.T) {
	query := "SELECT id, translation_id, book_id, chapter, verse, text FROM verses WHERE to_tsvector('simple', text) @@ to_tsquery('simple', $1) AND translation_id = $2 AND book_id IN (SELECT id FROM books WHERE testament = 'NT') ORDER BY book_id ASC, chapter ASC, verse ASC"

	// 1. Without color
	noColor := FormatSQL(query, false)
	if !strings.Contains(noColor, "\nFROM verses") {
		t.Errorf("expected newline before FROM, got %q", noColor)
	}
	if !strings.Contains(noColor, "\nWHERE") {
		t.Errorf("expected newline before WHERE, got %q", noColor)
	}
	if !strings.Contains(noColor, "\n  AND translation_id") {
		t.Errorf("expected newline and indent before AND, got %q", noColor)
	}
	if !strings.Contains(noColor, "\nORDER BY") {
		t.Errorf("expected newline before ORDER BY, got %q", noColor)
	}

	// 2. With color
	colored := FormatSQL(query, true)
	if !strings.Contains(colored, colorBoldCyan) {
		t.Errorf("expected colorBoldCyan for keywords, got %q", colored)
	}
	if !strings.Contains(colored, colorBoldYellow+"$1"+colorReset) {
		t.Errorf("expected colorBoldYellow for parameter $1, got %q", colored)
	}
	if !strings.Contains(colored, colorGreen+"'simple'"+colorReset) {
		t.Errorf("expected colorGreen for string literal 'simple', got %q", colored)
	}
	if !strings.Contains(colored, colorBoldMagenta+"@@"+colorReset) {
		t.Errorf("expected colorBoldMagenta for operator @@, got %q", colored)
	}

	// 3. Empty query
	if FormatSQL("", false) != "" {
		t.Errorf("expected empty string for empty query")
	}
}

func TestConsoleHandler_ISLASQL(t *testing.T) {
	var buf bytes.Buffer
	handler := NewConsoleHandler(&buf, &ConsoleHandlerOptions{
		Level: slog.LevelInfo,
		Color: true,
	})

	record := slog.NewRecord(time.Date(2026, 9, 11, 1, 42, 34, 0, time.UTC), slog.LevelInfo, "🔍 [ISLA SQL]", 0)
	record.Add(
		slog.String("query", "SELECT id, text FROM verses WHERE translation_id = $1"),
		slog.Any("args", []any{"fin-1992"}),
	)

	err := handler.Handle(context.Background(), record)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	if !strings.Contains(out, "🔍 [ISLA SQL]") {
		t.Errorf("missing SQL header in output: %s", out)
	}
	if !strings.Contains(out, "SQL:") {
		t.Errorf("missing SQL label: %s", out)
	}
	if !strings.Contains(out, "ARGS:") {
		t.Errorf("missing ARGS label: %s", out)
	}
	if !strings.Contains(out, "fin-1992") {
		t.Errorf("missing arg value: %s", out)
	}
}

func TestConsoleHandler_ISLACommand(t *testing.T) {
	var buf bytes.Buffer
	handler := NewConsoleHandler(&buf, &ConsoleHandlerOptions{
		Level: slog.LevelInfo,
		Color: true,
	})

	record := slog.NewRecord(time.Date(2026, 9, 11, 1, 42, 48, 0, time.UTC), slog.LevelInfo, "⚡ [ISLA Command]", 0)
	record.Add(
		slog.String("query", "?(armo).at(UT).limit(10) => #ut-armo"),
		slog.String("translationId", "fin-1992"),
	)

	err := handler.Handle(context.Background(), record)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	if !strings.Contains(out, "⚡ [ISLA Command]") {
		t.Errorf("missing command header: %s", out)
	}
	if !strings.Contains(out, "?(armo).at(UT).limit(10) => #ut-armo") {
		t.Errorf("missing query text: %s", out)
	}
	if !strings.Contains(out, "fin-1992") {
		t.Errorf("missing translation: %s", out)
	}
}

func TestConsoleHandler_HTTPLogs(t *testing.T) {
	var buf bytes.Buffer
	handler := NewConsoleHandler(&buf, &ConsoleHandlerOptions{
		Level: slog.LevelInfo,
		Color: true,
	})

	// Start log
	startRec := slog.NewRecord(time.Now(), slog.LevelInfo, "→ PUT /api/notebooks/123/cells", 0)
	if err := handler.Handle(context.Background(), startRec); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(buf.String(), "→ PUT /api/notebooks/123/cells") {
		t.Errorf("missing start log in %s", buf.String())
	}

	// Done log
	buf.Reset()
	doneRec := slog.NewRecord(time.Now(), slog.LevelInfo, "✅ POST /api/dsl/eval  [200]  121ms", 0)
	doneRec.Add(slog.Int("status", 200))
	if err := handler.Handle(context.Background(), doneRec); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(buf.String(), "✅ POST /api/dsl/eval") {
		t.Errorf("missing done log in %s", buf.String())
	}
}

func TestConsoleHandler_WithAttrsAndGroup(t *testing.T) {
	var buf bytes.Buffer
	handler := NewConsoleHandler(&buf, &ConsoleHandlerOptions{
		Level: slog.LevelInfo,
		Color: false,
	})

	subHandler := handler.WithAttrs([]slog.Attr{slog.String("service", "bible")})
	subHandler = subHandler.WithGroup("perf")

	if !subHandler.Enabled(context.Background(), slog.LevelInfo) {
		t.Errorf("expected level info to be enabled")
	}
	if subHandler.Enabled(context.Background(), slog.LevelDebug) {
		t.Errorf("expected level debug to be disabled")
	}

	rec := slog.NewRecord(time.Now(), slog.LevelInfo, "system ready", 0)
	rec.Add(slog.String("version", "v3"))
	if err := subHandler.Handle(context.Background(), rec); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	if !strings.Contains(out, "system ready") || !strings.Contains(out, "service=\"bible\"") {
		t.Errorf("expected output to contain attrs: %s", out)
	}
}
