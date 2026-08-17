package dsl

import "fmt"

// TokenType represents the classification of a lexical token.
type TokenType string

const (
	TokenEOF     TokenType = "EOF"
	TokenIllegal TokenType = "ILLEGAL"

	// Symbols and operators
	TokenAt           TokenType = "@"  // Verse reference prefix (@Joh 3:16)
	TokenSearch       TokenType = "?"  // Search prefix (? "love") or Ternary condition
	TokenPipe         TokenType = "=>" // Pipeline projection / transform operator
	TokenColon        TokenType = ":"  // Ternary else delimiter or key-value separot (:card, limit:5)
	TokenCaret        TokenType = "^"  // Context scope referencing preceding cells (^, ^3)
	TokenHash         TokenType = "#"  // Function / tag indicator (#themes, #refs, #suggest)
	TokenBracketOpen  TokenType = "["  // List open delimiter [KR92, KJV]
	TokenBracketClose TokenType = "]"  // List close delimiter
	TokenParenOpen    TokenType = "("  // Parenthesis open delimiter
	TokenParenClose   TokenType = ")"  // Parenthesis close delimiter
	TokenComma        TokenType = ","  // Argument delimiter
	TokenDash         TokenType = "-"  // Range delimiter (8:1-5)

	// Literals and identifiers
	TokenIdent  TokenType = "IDENT"  // Joh, KR92, limit, cards
	TokenString TokenType = "STRING" // "love", "new covenant"
	TokenNumber TokenType = "NUMBER" // 3, 16, 5
	TokenRegex  TokenType = "REGEX"  // /righteousness.*/
)

// Token represent a single lexical token with type, literal value, and byte offset position.
type Token struct {
	Type    TokenType
	Literal string
	Pos     int
}

// String returns a formatted representation of the token for debugging
func (t Token) String() string {
	return fmt.Sprintf("Token(%s, %q, pos=%d)", t.Type, t.Literal, t.Pos)
}
