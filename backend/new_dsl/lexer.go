package newdsl

import (
	"fmt"
	"strings"
	"unicode"
)

// MaxInputLength is the maximum allowed ISLA expression length in runes (security limit).
const MaxInputLength = 2000

// Lexer transforms a raw ISLA expression string into a sequential stream of tokens.
// Call NextToken() repeatedly until TokenEOF is returned.
type Lexer struct {
	input []rune
	pos   int
}

// NewLexer constructs a Lexer from the raw input string.
//
// It strips the optional leading "!" trigger prefix and the "isla " keyword if
// present, so the caller does not need to pre-process the input.
//
// Returns an error if the input exceeds MaxInputLength runes.
func NewLexer(input string) (*Lexer, error) {
	s := strings.TrimSpace(input)

	// Strip "!" trigger prefix.
	if strings.HasPrefix(s, "!") {
		s = strings.TrimSpace(s[1:])
	}
	// Strip optional "isla " keyword prefix.
	if strings.HasPrefix(strings.ToLower(s), "isla ") {
		s = strings.TrimSpace(s[5:])
	}

	runes := []rune(s)
	if len(runes) > MaxInputLength {
		return nil, fmt.Errorf("isla: input exceeds maximum length of %d runes", MaxInputLength)
	}
	return &Lexer{input: runes}, nil
}

// NextToken scans and returns the next lexical token.
// Returns TokenEOF when the input is exhausted.
func (l *Lexer) NextToken() Token {
	l.skipWhitespace()

	if l.pos >= len(l.input) {
		return Token{Type: TokenEOF, Pos: l.pos}
	}

	start := l.pos
	ch := l.input[l.pos]

	switch {
	// ── @( — verse reference opener ──────────────────────────────────────────
	case ch == '@':
		if l.peek() == '(' {
			l.pos += 2 // consume @(
			return l.readVerseRef(start)
		}
		l.pos++
		return Token{Type: TokenIllegal, Literal: "@", Pos: start}

	// ── >> vs > — output operators ────────────────────────────────────────────
	case ch == '>':
		if l.peek() == '>' {
			l.pos += 2
			return Token{Type: TokenOutputBelow, Literal: ">>", Pos: start}
		}
		l.pos++
		return Token{Type: TokenOutputAbove, Literal: ">", Pos: start}

	// ── => — inline output operator ───────────────────────────────────────────
	case ch == '=':
		if l.peek() == '>' {
			l.pos += 2
			return Token{Type: TokenOutputInline, Literal: "=>", Pos: start}
		}
		l.pos++
		return Token{Type: TokenIllegal, Literal: "=", Pos: start}

	// ── .. vs . — range operator vs method chain separator ───────────────────
	case ch == '.':
		if l.peek() == '.' {
			l.pos += 2
			return Token{Type: TokenDotDot, Literal: "..", Pos: start}
		}
		l.pos++
		return Token{Type: TokenDot, Literal: ".", Pos: start}


	// ── ? — search shorthand ─────────────────────────────────────────────────
	case ch == '?':
		l.pos++
		return Token{Type: TokenSearch, Literal: "?", Pos: start}

	// ── ^ — cell context object ──────────────────────────────────────────────
	case ch == '^':
		l.pos++
		return Token{Type: TokenCaret, Literal: "^", Pos: start}

	// ── # — cell name slug start ─────────────────────────────────────────────
	case ch == '#':
		l.pos++
		return Token{Type: TokenHash, Literal: "#", Pos: start}

	// ── Structural delimiters ─────────────────────────────────────────────────
	case ch == '(':
		l.pos++
		return Token{Type: TokenParenOpen, Literal: "(", Pos: start}
	case ch == ')':
		l.pos++
		return Token{Type: TokenParenClose, Literal: ")", Pos: start}
	case ch == ',':
		l.pos++
		return Token{Type: TokenComma, Literal: ",", Pos: start}
	case ch == ':':
		l.pos++
		return Token{Type: TokenColon, Literal: ":", Pos: start}
	case ch == '-':
		l.pos++
		return Token{Type: TokenDash, Literal: "-", Pos: start}

	// ── String literals ───────────────────────────────────────────────────────
	case ch == '"' || ch == '\'':
		return l.readString(ch)

	// ── Regex literals ────────────────────────────────────────────────────────
	case ch == '/':
		return l.readRegex()

	// ── Numbers ───────────────────────────────────────────────────────────────
	case unicode.IsDigit(ch):
		return l.readNumber()

	// ── Identifiers and keywords ──────────────────────────────────────────────
	case isIdentStart(ch):
		return l.readIdent()

	default:
		l.pos++
		return Token{Type: TokenIllegal, Literal: string(ch), Pos: start}
	}
}

// ── Private helpers ───────────────────────────────────────────────────────────

func (l *Lexer) peek() rune {
	if l.pos+1 >= len(l.input) {
		return 0
	}
	return l.input[l.pos+1]
}

func (l *Lexer) skipWhitespace() {
	for l.pos < len(l.input) && unicode.IsSpace(l.input[l.pos]) {
		l.pos++
	}
}

// readVerseRef reads everything between @( and the matching ) as a single
// TokenAtOpen token whose Literal contains the raw reference string.
func (l *Lexer) readVerseRef(start int) Token {
	var sb strings.Builder
	depth := 1
	for l.pos < len(l.input) {
		ch := l.input[l.pos]
		if ch == ')' {
			depth--
			if depth == 0 {
				l.pos++ // consume closing )
				break
			}
		}
		if ch == '(' {
			depth++
		}
		sb.WriteRune(ch)
		l.pos++
	}
	return Token{Type: TokenAtOpen, Literal: sb.String(), Pos: start}
}

func (l *Lexer) readString(quote rune) Token {
	start := l.pos
	l.pos++ // skip opening quote
	var sb strings.Builder
	for l.pos < len(l.input) && l.input[l.pos] != quote {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	if l.pos >= len(l.input) {
		return Token{Type: TokenIllegal, Literal: fmt.Sprintf("unterminated string literal starting with %c", quote), Pos: start}
	}
	l.pos++ // skip closing quote
	return Token{Type: TokenString, Literal: sb.String(), Pos: start}
}

func (l *Lexer) readRegex() Token {
	start := l.pos
	l.pos++ // skip opening '/'
	var sb strings.Builder
	for l.pos < len(l.input) && l.input[l.pos] != '/' {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	if l.pos >= len(l.input) {
		return Token{Type: TokenIllegal, Literal: "unterminated regex literal starting with /", Pos: start}
	}
	l.pos++ // skip closing '/'
	return Token{Type: TokenRegex, Literal: sb.String(), Pos: start}
}

func (l *Lexer) readNumber() Token {
	start := l.pos
	var sb strings.Builder
	for l.pos < len(l.input) && unicode.IsDigit(l.input[l.pos]) {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	return Token{Type: TokenNumber, Literal: sb.String(), Pos: start}
}

// readIdent reads a keyword or unquoted name.
// NOTE: dots are NOT included — they are always TokenDot in v2.
func (l *Lexer) readIdent() Token {
	start := l.pos
	var sb strings.Builder
	for l.pos < len(l.input) && isIdentContinue(l.input[l.pos]) {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	return Token{Type: TokenIdent, Literal: sb.String(), Pos: start}
}

func isIdentStart(r rune) bool {
	return unicode.IsLetter(r) || r == '_'
}

func isIdentContinue(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' || r == '-'
}
