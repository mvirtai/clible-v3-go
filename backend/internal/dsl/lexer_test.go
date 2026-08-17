package dsl

import (
	"testing"
)

func TestLexer_NextToken(t *testing.T) {
	input := `@Joh 3:16 => KR92 ? "love" : 'faith' ^3 #themes [KR92, KJV] (test) /grace.*/`

	tests := []struct {
		expectedType    TokenType
		expectedLiteral string
	}{
		{TokenAt, "@"},
		{TokenIdent, "Joh"},
		{TokenNumber, "3"},
		{TokenColon, ":"},
		{TokenNumber, "16"},
		{TokenPipe, "=>"},
		{TokenIdent, "KR92"},
		{TokenSearch, "?"},
		{TokenString, "love"},
		{TokenColon, ":"},
		{TokenString, "faith"},
		{TokenCaret, "^"},
		{TokenNumber, "3"},
		{TokenHash, "#"},
		{TokenIdent, "themes"},
		{TokenBracketOpen, "["},
		{TokenIdent, "KR92"},
		{TokenComma, ","},
		{TokenIdent, "KJV"},
		{TokenBracketClose, "]"},
		{TokenParenOpen, "("},
		{TokenIdent, "test"},
		{TokenParenClose, ")"},
		{TokenRegex, "grace.*"},
		{TokenEOF, ""},
	}

	lexer, err := NewLexer(input)
	if err != nil {
		t.Fatalf("NewLexer failed: %v", err)
	}

	for i, tt := range tests {
		tok := lexer.NextToken()

		if tok.Type != tt.expectedType {
			t.Fatalf("tests[%d] - token type wrong. expected=%q, got=%q (literal=%q)",
				i, tt.expectedType, tok.Type, tok.Literal)
		}

		if tok.Literal != tt.expectedLiteral {
			t.Fatalf("tests[%d] - literal wrong. expected=%q, got=%q",
				i, tt.expectedLiteral, tok.Literal)
		}
	}
}

func TestLexer_UnicodeFinnish(t *testing.T) {
	input := `@Room 8:28 => "Kaikki yhdessä vaikuttaa"`

	lexer, err := NewLexer(input)
	if err != nil {
		t.Fatalf("NewLexer failed: %v", err)
	}

	expected := []struct {
		expectedType    TokenType
		expectedLiteral string
	}{
		{TokenAt, "@"},
		{TokenIdent, "Room"},
		{TokenNumber, "8"},
		{TokenColon, ":"},
		{TokenNumber, "28"},
		{TokenPipe, "=>"},
		{TokenString, "Kaikki yhdessä vaikuttaa"},
		{TokenEOF, ""},
	}

	for i, tt := range expected {
		tok := lexer.NextToken()
		if tok.Type != tt.expectedType {
			t.Fatalf("test[%d] - type wrong: expected=%q, got=%q", i, tt.expectedType, tok.Type)
		}
		if tok.Literal != tt.expectedLiteral {
			t.Fatalf("test[%d] - literal wrong: expected=%q, got=%q", i, tt.expectedLiteral, tok.Literal)
		}
	}
}

func TestLexer_RangeDash(t *testing.T) {
	input := `@Room 8:1-5 ? KR92 : KR38`
	lexer, err := NewLexer(input)
	if err != nil {
		t.Fatalf("NewLexer failed: %v", err)
	}

	expected := []struct {
		expectedType    TokenType
		expectedLiteral string
	}{
		{TokenAt, "@"},
		{TokenIdent, "Room"},
		{TokenNumber, "8"},
		{TokenColon, ":"},
		{TokenNumber, "1"},
		{TokenDash, "-"},
		{TokenNumber, "5"},
		{TokenSearch, "?"},
		{TokenIdent, "KR92"},
		{TokenColon, ":"},
		{TokenIdent, "KR38"},
		{TokenEOF, ""},
	}

	for i, tt := range expected {
		tok := lexer.NextToken()
		if tok.Type != tt.expectedType {
			t.Fatalf("test[%d] - type wrong: expected=%q, got=%q", i, tt.expectedType, tok.Type)
		}
		if tok.Literal != tt.expectedLiteral {
			t.Fatalf("test[%d] - literal wrong: expected=%q, got=%q", i, tt.expectedLiteral, tok.Literal)
		}
	}
}
