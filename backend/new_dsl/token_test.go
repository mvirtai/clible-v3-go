package newdsl

import (
	"strings"
	"testing"
)

func TestToken_String(t *testing.T) {
	tests := []struct {
		tok  Token
		want string // substring that must appear in the output
	}{
		{Token{Type: TokenAtOpen, Literal: "@(", Pos: 0}, `Token(@(, "@(", pos=0)`},
		{Token{Type: TokenDot, Literal: ".", Pos: 5}, `Token(., ".", pos=5)`},
		{Token{Type: TokenOutputInline, Literal: "=>", Pos: 20}, `Token(=>, "=>", pos=20)`},
		{Token{Type: TokenOutputBelow, Literal: ">>", Pos: 20}, `Token(>>, ">>", pos=20)`},
		{Token{Type: TokenIdent, Literal: "themes", Pos: 10}, `Token(IDENT, "themes", pos=10)`},
		{Token{Type: TokenString, Literal: "grace", Pos: 8}, `Token(STRING, "grace", pos=8)`},
		{Token{Type: TokenEOF, Literal: "", Pos: 30}, `Token(EOF, "", pos=30)`},
	}

	for _, tt := range tests {
		got := tt.tok.String()
		if !strings.Contains(got, tt.want) {
			t.Errorf("Token.String() = %q, want it to contain %q", got, tt.want)
		}
	}
}

// TestAllTokenTypes verifies that every exported TokenType constant is non-empty.
// This guards against accidental zero-value declarations.
func TestAllTokenTypes_NonEmpty(t *testing.T) {
	types := []TokenType{
		TokenEOF, TokenIllegal,
		TokenAtOpen, TokenParenOpen, TokenParenClose,
		TokenComma, TokenColon, TokenDash, TokenDot,
		TokenOutputInline, TokenOutputAbove, TokenOutputBelow,
		TokenSearch, TokenCaret, TokenHash,
		TokenIdent, TokenString, TokenNumber, TokenRegex,
	}
	for _, tt := range types {
		if tt == "" {
			t.Errorf("TokenType has empty string value — check token.go constants")
		}
	}
}
