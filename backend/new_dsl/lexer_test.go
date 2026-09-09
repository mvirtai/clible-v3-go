package newdsl

import (
	"reflect"
	"testing"
)

func tokenStream(t *testing.T, input string) []Token {
	t.Helper()
	l, err := NewLexer(input)
	if err != nil {
		t.Fatalf("NewLexer(%q) error: %v", input, err)
	}
	var tokens []Token
	for {
		tok := l.NextToken()
		if tok.Type == TokenEOF {
			break
		}
		tokens = append(tokens, tok)
	}
	return tokens
}

func tokenTypes(t *testing.T, input string) []TokenType {
	t.Helper()
	var types []TokenType
	for _, tok := range tokenStream(t, input) {
		types = append(types, tok.Type)
	}
	return types
}

// ── @( verse reference ────────────────────────────────────────────────────────

func TestLexer_VerseRef(t *testing.T) {
	tokens := tokenStream(t, `@(Joh 3:16)`)
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d: %v", len(tokens), tokens)
	}
	if tokens[0].Type != TokenAtOpen {
		t.Errorf("Type = %q, want TokenAtOpen", tokens[0].Type)
	}
	if tokens[0].Literal != "Joh 3:16" {
		t.Errorf("Literal = %q, want %q", tokens[0].Literal, "Joh 3:16")
	}
}

func TestLexer_VerseRefWithSpaces(t *testing.T) {
	tok := tokenStream(t, `@(1. Kor 13:4-8)`)[0]
	if tok.Literal != "1. Kor 13:4-8" {
		t.Errorf("Literal = %q, want %q", tok.Literal, "1. Kor 13:4-8")
	}
}

// ── Output operators ──────────────────────────────────────────────────────────

func TestLexer_OutputOperators(t *testing.T) {
	tests := []struct {
		input    string
		wantType TokenType
	}{
		{"=>", TokenOutputInline},
		{">", TokenOutputAbove},
		{">>", TokenOutputBelow},
	}
	for _, tt := range tests {
		got := tokenTypes(t, tt.input)
		if len(got) != 1 || got[0] != tt.wantType {
			t.Errorf("tokenTypes(%q) = %v, want [%s]", tt.input, got, tt.wantType)
		}
	}
}

// ── Dot separator ─────────────────────────────────────────────────────────────

func TestLexer_DotSeparator(t *testing.T) {
	got := tokenTypes(t, ".themes(5)")
	want := []TokenType{TokenDot, TokenIdent, TokenParenOpen, TokenNumber, TokenParenClose}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

// ── Full expression ───────────────────────────────────────────────────────────

func TestLexer_FullExpression_SearchAtCount(t *testing.T) {
	// search("grace").at(epistles).count(verses) =>
	got := tokenTypes(t, `search("grace").at(epistles).count(verses) =>`)
	want := []TokenType{
		TokenIdent,        // search
		TokenParenOpen,    // (
		TokenString,       // "grace"
		TokenParenClose,   // )
		TokenDot,          // .
		TokenIdent,        // at
		TokenParenOpen,    // (
		TokenIdent,        // epistles
		TokenParenClose,   // )
		TokenDot,          // .
		TokenIdent,        // count
		TokenParenOpen,    // (
		TokenIdent,        // verses
		TokenParenClose,   // )
		TokenOutputInline, // =>
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("\ngot:  %v\nwant: %v", got, want)
	}
}

func TestLexer_FullExpression_RangeWithNamedCell(t *testing.T) {
	// range(GEN, DEU).themes(5) >> #torah-themes
	got := tokenTypes(t, "range(GEN, DEU).themes(5) >> #torah-themes")
	want := []TokenType{
		TokenIdent, TokenParenOpen,
		TokenIdent, TokenComma, TokenIdent,
		TokenParenClose,
		TokenDot, TokenIdent, TokenParenOpen, TokenNumber, TokenParenClose,
		TokenOutputBelow,
		TokenHash, TokenIdent,
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("\ngot:  %v\nwant: %v", got, want)
	}
}

// ── Prefix stripping ──────────────────────────────────────────────────────────

func TestLexer_StripsBangPrefix(t *testing.T) {
	// "! @(Joh 3:16)" should produce the same as "@(Joh 3:16)"
	a := tokenTypes(t, "! @(Joh 3:16) =>")
	b := tokenTypes(t, "@(Joh 3:16) =>")
	if !reflect.DeepEqual(a, b) {
		t.Errorf("Bang prefix not stripped correctly:\n%v\n%v", a, b)
	}
}

// ── Error cases ───────────────────────────────────────────────────────────────

func TestLexer_IllegalToken(t *testing.T) {
	tokens := tokenStream(t, "@without_paren")
	if len(tokens) == 0 || tokens[0].Type != TokenIllegal {
		t.Errorf("expected TokenIllegal for bare @, got %v", tokens)
	}
}

func TestLexer_UnterminatedString(t *testing.T) {
	tokens := tokenStream(t, `search("armo" AND "rauha)`)
	hasIllegal := false
	for _, tok := range tokens {
		if tok.Type == TokenIllegal {
			hasIllegal = true
			break
		}
	}
	if !hasIllegal {
		t.Errorf("expected TokenIllegal for unterminated string, got %v", tokens)
	}
}

func TestLexer_UnterminatedRegex(t *testing.T) {
	tokens := tokenStream(t, `? /unclosed`)
	hasIllegal := false
	for _, tok := range tokens {
		if tok.Type == TokenIllegal {
			hasIllegal = true
			break
		}
	}
	if !hasIllegal {
		t.Errorf("expected TokenIllegal for unterminated regex, got %v", tokens)
	}
}

func TestNewLexer_InputTooLong(t *testing.T) {
	long := make([]byte, MaxInputLength+1)
	for i := range long {
		long[i] = 'a'
	}
	_, err := NewLexer(string(long))
	if err == nil {
		t.Error("expected error for overlong input, got nil")
	}
}

