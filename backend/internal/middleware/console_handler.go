package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"regexp"
	"strings"
	"sync"
)

// ANSI color escape codes for terminal formatting
const (
	colorReset       = "\033[0m"
	colorDim         = "\033[90m"
	colorRed         = "\033[31m"
	colorBoldRed     = "\033[1;31m"
	colorGreen       = "\033[32m"
	colorBoldGreen   = "\033[1;32m"
	colorYellow      = "\033[33m"
	colorBoldYellow  = "\033[1;33m"
	colorBlue        = "\033[34m"
	colorBoldBlue    = "\033[1;34m"
	colorMagenta     = "\033[35m"
	colorBoldMagenta = "\033[1;35m"
	colorCyan        = "\033[36m"
	colorBoldCyan    = "\033[1;36m"
	colorWhite       = "\033[37m"
	colorBoldWhite   = "\033[1;37m"
)

// ConsoleHandlerOptions configures the ConsoleHandler.
type ConsoleHandlerOptions struct {
	Level slog.Leveler
	Color bool
}

// ConsoleHandler is a custom slog.Handler that produces readable,
// colorized terminal output with dedicated SQL syntax highlighting.
type ConsoleHandler struct {
	opts   ConsoleHandlerOptions
	mu     *sync.Mutex
	w      io.Writer
	attrs  []slog.Attr
	groups []string
}

// NewConsoleHandler creates a new ConsoleHandler writing to w.
func NewConsoleHandler(w io.Writer, opts *ConsoleHandlerOptions) *ConsoleHandler {
	if opts == nil {
		opts = &ConsoleHandlerOptions{
			Level: slog.LevelInfo,
			Color: true,
		}
	}
	return &ConsoleHandler{
		opts: *opts,
		mu:   &sync.Mutex{},
		w:    w,
	}
}

func (h *ConsoleHandler) Enabled(_ context.Context, level slog.Level) bool {
	minLevel := slog.LevelInfo
	if h.opts.Level != nil {
		minLevel = h.opts.Level.Level()
	}
	return level >= minLevel
}

func (h *ConsoleHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]slog.Attr, len(h.attrs)+len(attrs))
	copy(newAttrs, h.attrs)
	copy(newAttrs[len(h.attrs):], attrs)
	return &ConsoleHandler{
		opts:   h.opts,
		mu:     h.mu,
		w:      h.w,
		attrs:  newAttrs,
		groups: h.groups,
	}
}

func (h *ConsoleHandler) WithGroup(name string) slog.Handler {
	newGroups := make([]string, len(h.groups)+1)
	copy(newGroups, h.groups)
	newGroups[len(h.groups)] = name
	return &ConsoleHandler{
		opts:   h.opts,
		mu:     h.mu,
		w:      h.w,
		attrs:  h.attrs,
		groups: newGroups,
	}
}

func (h *ConsoleHandler) Handle(_ context.Context, r slog.Record) error {
	var buf bytes.Buffer
	useColor := h.opts.Color

	// Timestamp (HH:MM:SS)
	timeStr := r.Time.Format("15:04:05")
	if useColor {
		buf.WriteString(colorDim + timeStr + colorReset + " ")
	} else {
		buf.WriteString(timeStr + " ")
	}

	// Extract attributes
	attrsMap := make(map[string]any)
	for _, a := range h.attrs {
		attrsMap[a.Key] = a.Value.Any()
	}
	r.Attrs(func(a slog.Attr) bool {
		attrsMap[a.Key] = a.Value.Any()
		return true
	})

	msg := r.Message

	// 1. Specialized formatting for SQL queries: 🔍 [ISLA SQL]
	if msg == "🔍 [ISLA SQL]" {
		h.formatISLASQL(&buf, attrsMap, useColor)
		h.writeOutput(buf.Bytes())
		return nil
	}

	// 2. Specialized formatting for ISLA Commands: ⚡ [ISLA Command]
	if msg == "⚡ [ISLA Command]" {
		h.formatISLACommand(&buf, attrsMap, useColor)
		h.writeOutput(buf.Bytes())
		return nil
	}

	// 3. Specialized formatting for HTTP logs
	if strings.HasPrefix(msg, "→ ") {
		// HTTP Request Start
		if useColor {
			// Dim background notebook cell autosaves to reduce noise
			if strings.Contains(msg, "/cells") {
				buf.WriteString(colorDim + msg + colorReset)
			} else {
				buf.WriteString(colorCyan + msg + colorReset)
			}
		} else {
			buf.WriteString(msg)
		}
		buf.WriteByte('\n')
		h.writeOutput(buf.Bytes())
		return nil
	}

	if strings.HasPrefix(msg, "✅ ") || strings.HasPrefix(msg, "⚠️ ") ||
		strings.HasPrefix(msg, "🔥 ") || strings.HasPrefix(msg, "↪️ ") {
		// HTTP Request Done
		h.formatHTTPRequestDone(&buf, msg, attrsMap, useColor)
		buf.WriteByte('\n')
		h.writeOutput(buf.Bytes())
		return nil
	}

	// 4. Default log line formatting
	h.formatDefaultLog(&buf, r.Level, msg, attrsMap, useColor)
	buf.WriteByte('\n')
	h.writeOutput(buf.Bytes())
	return nil
}

func (h *ConsoleHandler) writeOutput(b []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	_, _ = h.w.Write(b)
}

func (h *ConsoleHandler) formatISLASQL(buf *bytes.Buffer, attrs map[string]any, color bool) {
	if color {
		buf.WriteString(colorBoldCyan + "🔍 [ISLA SQL]" + colorReset + "\n")
	} else {
		buf.WriteString("🔍 [ISLA SQL]\n")
	}

	rawQuery, _ := attrs["query"].(string)
	formattedSQL := FormatSQL(rawQuery, color)

	// Indent the SQL query cleanly
	lines := strings.Split(formattedSQL, "\n")
	for i, line := range lines {
		if i == 0 {
			if color {
				buf.WriteString("  " + colorBoldWhite + "SQL:" + colorReset + "  " + line + "\n")
			} else {
				buf.WriteString("  SQL:  " + line + "\n")
			}
		} else {
			buf.WriteString("        " + line + "\n")
		}
	}

	// Format arguments
	if args, ok := attrs["args"]; ok {
		argsJSON, err := json.Marshal(args)
		if err == nil {
			if color {
				buf.WriteString("  " + colorBoldGreen + "ARGS:" + colorReset + " " + colorGreen + string(argsJSON) + colorReset + "\n")
			} else {
				buf.WriteString("  ARGS: " + string(argsJSON) + "\n")
			}
		}
	}
}

func (h *ConsoleHandler) formatISLACommand(buf *bytes.Buffer, attrs map[string]any, color bool) {
	query, _ := attrs["query"].(string)
	transID, _ := attrs["translationId"].(string)

	if color {
		buf.WriteString(colorBoldYellow + "⚡ [ISLA Command]" + colorReset + " ")
		buf.WriteString(colorBoldWhite + query + colorReset)
		if transID != "" {
			buf.WriteString("  " + colorDim + "(" + colorReset + colorCyan + transID + colorReset + colorDim + ")" + colorReset)
		}
		buf.WriteByte('\n')
	} else {
		fmt.Fprintf(buf, "⚡ [ISLA Command] %s (%s)\n", query, transID)
	}
}

func (h *ConsoleHandler) formatHTTPRequestDone(buf *bytes.Buffer, msg string, attrs map[string]any, color bool) {
	if !color {
		buf.WriteString(msg)
		return
	}

	// Example: "✅ POST /api/dsl/eval  [200]  121ms"
	status, _ := attrs["status"].(int)
	if status == 0 {
		if s, ok := attrs["status"].(int64); ok {
			status = int(s)
		}
	}

	statusColor := colorGreen
	if status >= 400 && status < 500 {
		statusColor = colorYellow
	} else if status >= 500 {
		statusColor = colorBoldRed
	}

	// Colorize status code if bracketed in message
	coloredMsg := msg
	if status > 0 {
		bracketed := fmt.Sprintf("[%d]", status)
		coloredBracketed := fmt.Sprintf("[%s%d%s]", statusColor, status, colorReset)
		coloredMsg = strings.Replace(coloredMsg, bracketed, coloredBracketed, 1)
	}

	buf.WriteString(coloredMsg)
}

func (h *ConsoleHandler) formatDefaultLog(buf *bytes.Buffer, level slog.Level, msg string, attrs map[string]any, color bool) {
	levelStr := level.String()
	if color {
		switch level {
		case slog.LevelDebug:
			buf.WriteString(colorDim + levelStr + colorReset + " ")
		case slog.LevelInfo:
			buf.WriteString(colorBlue + levelStr + colorReset + " ")
		case slog.LevelWarn:
			buf.WriteString(colorYellow + levelStr + colorReset + " ")
		case slog.LevelError:
			buf.WriteString(colorBoldRed + levelStr + colorReset + " ")
		}
	} else {
		buf.WriteString(levelStr + " ")
	}

	buf.WriteString(msg)

	// Extra attributes
	for k, v := range attrs {
		if k == "query" || k == "args" || k == "method" || k == "path" || k == "status" || k == "duration_ms" || k == "remote_addr" {
			continue
		}
		valBytes, _ := json.Marshal(v)
		if color {
			fmt.Fprintf(buf, " %s%s%s=%s", colorDim, k, colorReset, string(valBytes))
		} else {
			fmt.Fprintf(buf, " %s=%s", k, string(valBytes))
		}
	}
}

// Regex patterns for SQL formatting and syntax highlighting
var (
	sqlClauseBreakRegex = regexp.MustCompile(`(?i)\b(FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|JOIN)\b`)
	sqlConditionRegex   = regexp.MustCompile(`(?i)\b(AND|OR)\b`)
	sqlKeywordsRegex    = regexp.MustCompile(`(?i)\b(SELECT|FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|ASC|DESC|IN|NOT|LIKE|ILIKE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|UNION|ALL|CASE|WHEN|THEN|ELSE|END|BETWEEN|EXISTS|IS|NULL|VALUES|INSERT|INTO|UPDATE|SET|DELETE)\b`)
	sqlFunctionsRegex   = regexp.MustCompile(`(?i)\b(to_tsvector|to_tsquery|count|lower|upper|coalesce|max|min|sum|avg)\b`)
	sqlParamRegex       = regexp.MustCompile(`\$\d+`)
	sqlStringRegex      = regexp.MustCompile(`'[^']*'`)
	sqlOperatorRegex    = regexp.MustCompile(`(@@|!=|<>|<=|>=|=|<|>)`)
)

// FormatSQL cleans up, multi-line indents, and colorizes a SQL query for console display.
func FormatSQL(rawQuery string, color bool) string {
	clean := strings.Join(strings.Fields(strings.TrimSpace(rawQuery)), " ")
	if clean == "" {
		return ""
	}

	// 1. Add newlines before major SQL clauses for structured readability
	formatted := sqlClauseBreakRegex.ReplaceAllStringFunc(clean, func(match string) string {
		return "\n" + strings.ToUpper(match)
	})

	// Add newlines and indent for AND / OR inside WHERE clauses
	formatted = sqlConditionRegex.ReplaceAllStringFunc(formatted, func(match string) string {
		return "\n  " + strings.ToUpper(match)
	})

	if !color {
		return formatted
	}

	// 2. Apply ANSI syntax highlighting
	// Strings first (to avoid colorizing keywords inside string literals)
	var stringPlaceholders []string
	formatted = sqlStringRegex.ReplaceAllStringFunc(formatted, func(str string) string {
		idx := len(stringPlaceholders)
		stringPlaceholders = append(stringPlaceholders, colorGreen+str+colorReset)
		return fmt.Sprintf("___STR_TOKEN_%d___", idx)
	})

	// Parameters ($1, $2)
	formatted = sqlParamRegex.ReplaceAllStringFunc(formatted, func(p string) string {
		return colorBoldYellow + p + colorReset
	})

	// SQL Functions (to_tsvector, to_tsquery)
	formatted = sqlFunctionsRegex.ReplaceAllStringFunc(formatted, func(fn string) string {
		return colorYellow + strings.ToLower(fn) + colorReset
	})

	// Operators (@@, =, etc.)
	formatted = sqlOperatorRegex.ReplaceAllStringFunc(formatted, func(op string) string {
		return colorBoldMagenta + op + colorReset
	})

	// SQL Keywords (SELECT, FROM, WHERE, etc.)
	formatted = sqlKeywordsRegex.ReplaceAllStringFunc(formatted, func(kw string) string {
		return colorBoldCyan + strings.ToUpper(kw) + colorReset
	})

	// Restore string literals
	for idx, s := range stringPlaceholders {
		token := fmt.Sprintf("___STR_TOKEN_%d___", idx)
		formatted = strings.Replace(formatted, token, s, 1)
	}

	return formatted
}
