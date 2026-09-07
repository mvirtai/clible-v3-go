package newdsl

import "fmt"

// TokenType classifies a single lexical token.
type TokenType string

const (
	TokenEOF     TokenType = "EOF"
	TokenIllegal TokenType = "ILLEGAL"

	// -- Structural symbols ---------------------------------------------------

	// TokenAtOpen is the verse-reference object opener: @(
	// The opening parenthesis is consumed together with @ so the the parser
	// receives the reference contents as a plain string until the closing ).
	TokenAtOpen TokenType = "@("

	TokenParenOpen  TokenType = "("
	TokenParenClose TokenType = ")"
	TokenComma      TokenType = ","
	TokenColon      TokenType = ":" // Chapter/verse separator: 1:1, 3:16
	TokenDash       TokenType = "-" // Verse range separator: 3:16-18

	// TokenDot is the chain-call separator (method.call or method.cell)
	TokenDot TokenType = "."

	// -- Output operators -----------------------------------------------------

	// TokenOutputInline renders the result into the current cell (replaces line).
	TokenOutputInline TokenType = "=>"

	// TokenOutputAbove adds the result as a new cell above the current line
	TokenOutputAbove TokenType = ">"

	// TokenOutputBelow adds the result as a new cell below the current line
	TokenOutputBelow TokenType = ">>"

	// -- Object shorthand tokens ------------------------------------------------

	// TokenSearch is the shorthand prefix for search(): ? "grace"
	TokenSearch TokenType = "?"

	// TokenCaret is the cell-context object prefix: ^, ^3, ^all
	TokenCaret TokenType = "^"

	// -- Cell naming ----------------------------------------------------------

	// TokenHash start an output cell slug name: #torah-themes
	TokenHash TokenType = "#"

	// -- Literals and identifiers -----------------------------------------------

	// TokenIdent covers keywords and unquoted names: range, search, use, K492, Joh, epistles
	TokenIdent TokenType = "IDENT"

	// TokenString is a double-quoted string for search queries: "grace", "trust"
	TokenString TokenType = "STRING"

	// TokenNumber is an integer: 3, 5, 10, 40
	TokenNumber TokenType = "NUMBER"

	// TokenRegex matches a Perl-style regex literal: /pattern/flags
	TokenRegex TokenType = "REGEX"
)

// Token is a single lexical token with type, literal value, and byte offset.
type Token struct {
	Type    TokenType
	Literal string
	Pos     int // byte offset from the start of the input
}

// String returns a human-readable representation useful for debugging.
func (t Token) String() string {
	return fmt.Sprintf("Token(%s, %q, pos=%d)", t.Type, t.Literal, t.Pos)
}
