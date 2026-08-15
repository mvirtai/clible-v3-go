package dsl

import (
	"unicode"
	"strings"
)

// Lexer transforms a DSL expression string into a sequential token stream
type Lexer struct {
	input []rune
	pos int
}

// NewLexer construct a new Lexer initialized with input runes.
func NewLexer(input string) *Lexer {
	return &Lexer{
		input: []rune(input),
		pos: 0,
	}
}

// NextToken scans and returns the next lexical token from the input.
func (l *Lexer) NextToken() Token {
	l.skipWhitespace()

	if l.pos >= len(l.input) {
		return Token{Type: TokenEOF, Literal: "", Pos: l.pos}
	}

	startPos := l.pos
	ch := l.input[l.pos]

	switch ch {
	case '@':
		l.pos++
		return Token{Type: TokenAt, Literal: "@", Pos: startPos}
	case '?':
		l.pos++
		return Token{Type: TokenSearch, Literal: "?", Pos: startPos}
	case ':':
		l.pos++
		return Token{Type: TokenColon, Literal: ":", Pos: startPos}
	case '^':
		l.pos++
		return Token{Type: TokenCaret, Literal: "^", Pos: startPos}
	case '#':
		l.pos++
		return Token{Type: TokenHash, Literal: "#", Pos: startPos}
	case '[':
		l.pos++
		return Token{Type: TokenBracketOpen, Literal: "[", Pos: startPos}
	case ']':
		l.pos++
		return Token{Type: TokenBracketClose, Literal: "]", Pos: startPos}
	case '(': 
		l.pos++
		return Token{Type: TokenParenOpen, Literal: "(", Pos: startPos}
	case ')':
		l.pos++
		return Token{Type: TokenParenClose, Literal: ")", Pos: startPos}
	case ',':
		l.pos++
		return Token{Type: TokenComma, Literal: ",", Pos: startPos}
	case '=':
		if l.peek() == '>' {
			l.pos += 2
			return Token{Type: TokenPipe, Literal: "=>", Pos: startPos}
		}
		l.pos++
		return Token{Type: TokenIllegal, Literal: string(ch), Pos: startPos}
	case '"', '\'':
		return l.readString(ch)
	case '/':
		return l.readRegex()
	default:
		if unicode.IsDigit(ch) {
			return l.readNumber()
		}
		if isIdentRune(ch) {
			return l.readIdent()
		}
		l.pos++
		return Token{Type: TokenIllegal, Literal: string(ch), Pos: startPos}
	}
}

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

func (l *Lexer) readString(quote rune) Token {
	startPos := l.pos
	l.pos++
	var sb strings.Builder
	for l.pos < len(l.input) && l.input[l.pos] != quote {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	if l.pos < len(l.input) {
		l.pos++ // Skip closing quote
	}
	return Token{Type: TokenString, Literal: sb.String(), Pos: startPos}
}

func (l *Lexer) readNumber() Token {
	startPos := l.pos
	var sb strings.Builder
	for l.pos < len(l.input) && unicode.IsDigit(l.input[l.pos]) {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	return Token{Type: TokenNumber, Literal: sb.String(), Pos: startPos}
}

func (l *Lexer) readIdent() Token {
	startPos := l.pos
	var sb strings.Builder
	for l.pos < len(l.input) && (isIdentRune(l.input[l.pos]) || unicode.IsDigit(l.input[l.pos]) || l.input[l.pos] == '-' || l.input[l.pos] == '.') {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	return Token{Type: TokenIdent, Literal: sb.String(), Pos: startPos}
}

func (l *Lexer) readRegex() Token {
	startPos := l.pos
	l.pos++ // Skip opening '/'
	var sb strings.Builder
	for l.pos < len(l.input) && l.input[l.pos] != '/' {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	if l.pos < len(l.input) {
		l.pos++
	}
	return Token{Type: TokenRegex, Literal: sb.String(), Pos: startPos}
}

func isIdentRune(r rune) bool {
	return unicode.IsLetter(r) || r == '_' || r == 'ä' || r == 'ö' || r == 'å' || r == 'Ä' || r == 'Ö' || r == 'Å'
}