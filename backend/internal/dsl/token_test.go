package dsl

import (
	"strings"
	"testing"
)

func TestToken_String(t *testing.T) {
	tok := Token{
		Type:    TokenAt,
		Literal: "@",
		Pos:     1,
	}

	str := tok.String()
	if !strings.Contains(str, "@") || !strings.Contains(str, "pos=1") {
		t.Errorf("unexpected Token.String() output: %s", str)
	}
}
