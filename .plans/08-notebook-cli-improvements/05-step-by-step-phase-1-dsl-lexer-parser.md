# Step-by-Step Toteutusopas: Vaihe 1 – DSL Lexer, AST Parser & Backend Execution Engine

Tämä opas tarjoaa yksityiskohtaiset ohjeet ja koodirakenteet Clible Magic DSL -kieliopin ensimmäisen vaiheen (Lexer, Parser, AST ja Backend-suoritin) toteuttamiseen.

---

## 1. Yleiskatsaus ja tavoitteet

Vaiheessa 1 luodaan backend-paketti `internal/dsl`, joka vastaa taikalausekkeiden (`@`, `?`, `^`, `=>`, `? :`) muuntamisesta suoritettavaksi abstraktiksi syntaksipuuksi (AST) ja niiden ajamisesta tietokantaa vasten.

```text
[Raw Input: "@Joh 3:16 ? KR92 : KJV"]
                 │
                 ▼
         [Lexer / Tokenizer]
                 │
                 ▼  (Tokens: IDENT(@Joh), REF(3:16), TERNARY_Q(?), IDENT(KR92), COLON(:), IDENT(KJV))
         [Recursive Descent Parser]
                 │
                 ▼
         [AST: ComparisonNode]
            ├── Target: VerseRefNode(Joh 3:16)
            ├── Left: ActionNode(translation=KR92)
            └── Right: ActionNode(translation=KJV)
                 │
                 ▼
         [DSLExecutor / Service]
                 │
                 ▼
         [CLIResult: type="comparison", data={left: [...], right: [...]}]
```

---

## 2. Tiedostorakenne `backend/internal/dsl/`

Luodaan uusi paketti `backend/internal/dsl/`:

```text
backend/internal/dsl/
├── token.go        # Token type definitions and lexical structures
├── lexer.go        # Tokenizer logic (raw string to token stream)
├── ast.go          # Abstract Syntax Tree node representations
├── parser.go       # Recursive descent parser (token stream to AST)
├── executor.go     # AST execution engine and service orchestration
├── lexer_test.go   # Lexer unit tests
└── parser_test.go  # Parser and AST unit tests
```

---

## 3. Askel 1: Token-tyypit (`token.go`)

Määritellään kaikki kieliopin tukemat tokenit ja apufunktiot.

```go
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
	TokenColon        TokenType = ":"  // Ternary else delimiter or key-value separator (:card, limit:5)
	TokenCaret        TokenType = "^"  // Context scope referencing preceding cells (^, ^3)
	TokenHash         TokenType = "#"  // Function / tag indicator (#themes, #refs, #suggest)
	TokenBracketOpen  TokenType = "["  // List open delimiter [KR92, KJV]
	TokenBracketClose TokenType = "]"  // List close delimiter
	TokenParenOpen    TokenType = "("  // Parenthesis open delimiter
	TokenParenClose   TokenType = ")"  // Parenthesis close delimiter
	TokenComma        TokenType = ","  // Argument delimiter

	// Literals and identifiers
	TokenIdent  TokenType = "IDENT"  // Joh, KR92, limit, cards
	TokenString TokenType = "STRING" // "love", "new covenant"
	TokenNumber TokenType = "NUMBER" // 3, 16, 5
	TokenRegex  TokenType = "REGEX"  // /righteousness.*/
)

// Token represents a single lexical token with type, literal value, and byte offset position.
type Token struct {
	Type    TokenType
	Literal string
	Pos     int
}

// String returns a formatted representation of the token for debugging.
func (t Token) String() string {
	return fmt.Sprintf("Token(%s, %q, pos=%d)", t.Type, t.Literal, t.Pos)
}
```

---

## 4. Askel 2: Lexer / Tokenizer (`lexer.go`)

Lexer lukee syötemerkkijonon merkki kerrallaan ja tuottaa token-virran.

```go
package dsl

import (
	"strings"
	"unicode"
)

// Lexer transforms a DSL expression string into a sequential token stream.
type Lexer struct {
	input []rune
	pos   int
}

// NewLexer constructs a new Lexer initialized with input runes.
func NewLexer(input string) *Lexer {
	return &Lexer{
		input: []rune(input),
		pos:   0,
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
	l.pos++ // Skip opening quote
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
	l.pos++ // Skip opening slash
	var sb strings.Builder
	for l.pos < len(l.input) && l.input[l.pos] != '/' {
		sb.WriteRune(l.input[l.pos])
		l.pos++
	}
	if l.pos < len(l.input) {
		l.pos++ // Skip closing slash
	}
	return Token{Type: TokenRegex, Literal: sb.String(), Pos: startPos}
}

func isIdentRune(r rune) bool {
	return unicode.IsLetter(r) || r == '_' || r == 'ä' || r == 'ö' || r == 'å' || r == 'Ä' || r == 'Ö' || r == 'Å'
}
```

---

## 5. Askel 3: AST-solmut (`ast.go`)

Määritellään abstraktin syntaksipuun solmut.

```go
package dsl

// Node represents the base interface for all AST nodes.
type Node interface {
	node()
	String() string
}

// VerseRefNode represents an explicit Bible verse reference (e.g. @Joh 3:16-18).
type VerseRefNode struct {
	Reference string // e.g. "Joh 3:16-18" or "Rom 8:28"
}

func (n *VerseRefNode) node() {}
func (n *VerseRefNode) String() string { return "@" + n.Reference }

// SearchNode represents a full-text or regex search query (e.g. ? "love" in @Joh).
type SearchNode struct {
	Query     string
	IsRegex   bool
	ScopeBook string // Optional book filter, e.g. "Joh"
}

func (n *SearchNode) node() {}
func (n *SearchNode) String() string { return "? " + n.Query }

// ScopeNode represents a contextual scope reference to preceding cells (e.g. ^, ^3, ^all).
type ScopeNode struct {
	Count int  // Number of cells, e.g. 1, 3 (-1 for all notebook cells)
	All   bool // Flag for full notebook scope
}

func (n *ScopeNode) node() {}
func (n *ScopeNode) String() string { return "^" }

// PipeNode represents a pipeline transform or projection operator (Target => Action/Option).
type PipeNode struct {
	Left  Node
	Right Node
}

func (n *PipeNode) node() {}
func (n *PipeNode) String() string { return n.Left.String() + " => " + n.Right.String() }

// ComparisonNode represents a ternary multi-option or comparison expression (Target ? OptionA : OptionB).
type ComparisonNode struct {
	Target Node
	Left   Node // e.g. KR92
	Right  Node // e.g. KJV
}

func (n *ComparisonNode) node() {}
func (n *ComparisonNode) String() string {
	return n.Target.String() + " ? " + n.Left.String() + " : " + n.Right.String()
}

// ActionNode represents a function modifier or formatting option (#themes, #refs, #suggest, :card, limit:5).
type ActionNode struct {
	Kind  string            // "themes", "refs", "suggest", "style", "limit", "translation"
	Value string            // "card", "5", "KR92", etc.
	Args  map[string]string // Optional key-value parameters
}

func (n *ActionNode) node() {}
func (n *ActionNode) String() string { return "#" + n.Kind }
```

---

## 6. Askel 4: Parser (`parser.go`)

Parseri jäsentää tokenit AST-puuksi.

```go
package dsl

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// Parser parses a token stream into an Abstract Syntax Tree (AST).
type Parser struct {
	tokens []Token
	pos    int
}

// NewParser constructs a new Parser instance.
func NewParser(tokens []Token) *Parser {
	return &Parser{tokens: tokens, pos: 0}
}

// Parse takes a raw DSL string, tokenizes it, and returns the root AST Node.
func Parse(input string) (Node, error) {
	lexer := NewLexer(input)
	var tokens []Token
	for {
		tok := lexer.NextToken()
		tokens = append(tokens, tok)
		if tok.Type == TokenEOF {
			break
		}
	}
	p := NewParser(tokens)
	return p.ParseExpression()
}

func (p *Parser) current() Token {
	if p.pos >= len(p.tokens) {
		return Token{Type: TokenEOF}
	}
	return p.tokens[p.pos]
}

func (p *Parser) next() {
	if p.pos < len(p.tokens) {
		p.pos++
	}
}

// ParseExpression parses the top-level DSL expression including pipelines and ternary comparisons.
func (p *Parser) ParseExpression() (Node, error) {
	left, err := p.parsePrimary()
	if err != nil {
		return nil, err
	}

	for {
		tok := p.current()
		if tok.Type == TokenPipe {
			p.next()
			right, err := p.parseActionOrOption()
			if err != nil {
				return nil, err
			}
			left = &PipeNode{Left: left, Right: right}
		} else if tok.Type == TokenSearch { // Ternary comparison operator '?'
			p.next()
			firstOption, err := p.parseActionOrOption()
			if err != nil {
				return nil, err
			}
			if p.current().Type != TokenColon {
				return nil, fmt.Errorf("expected ':' in ternary comparison at pos %d", p.current().Pos)
			}
			p.next()
			secondOption, err := p.parseActionOrOption()
			if err != nil {
				return nil, err
			}
			left = &ComparisonNode{
				Target: left,
				Left:   firstOption,
				Right:  secondOption,
			}
		} else {
			break
		}
	}

	return left, nil
}

func (p *Parser) parsePrimary() (Node, error) {
	tok := p.current()

	switch tok.Type {
	case TokenAt:
		p.next()
		// Parse verse citation parts (e.g. Joh 3:16 or 1. Kor 13:4-8)
		var parts []string
		for {
			cur := p.current()
			if cur.Type == TokenIdent || cur.Type == TokenNumber || cur.Type == TokenColon {
				parts = append(parts, cur.Literal)
				p.next()
			} else {
				break
			}
		}
		if len(parts) == 0 {
			return nil, errors.New("empty verse reference after '@'")
		}
		return &VerseRefNode{Reference: strings.Join(parts, " ")}, nil

	case TokenSearch:
		p.next()
		queryTok := p.current()
		if queryTok.Type != TokenString && queryTok.Type != TokenRegex && queryTok.Type != TokenIdent {
			return nil, errors.New("expected search query after '?'")
		}
		p.next()
		return &SearchNode{
			Query:   queryTok.Literal,
			IsRegex: queryTok.Type == TokenRegex,
		}, nil

	case TokenCaret:
		p.next()
		count := 1
		all := false
		if p.current().Type == TokenNumber {
			c, _ := strconv.Atoi(p.current().Literal)
			count = c
			p.next()
		} else if p.current().Type == TokenIdent && p.current().Literal == "all" {
			all = true
			p.next()
		}
		return &ScopeNode{Count: count, All: all}, nil

	default:
		return nil, fmt.Errorf("unexpected token %s (%q) at pos %d", tok.Type, tok.Literal, tok.Pos)
	}
}

func (p *Parser) parseActionOrOption() (Node, error) {
	tok := p.current()

	if tok.Type == TokenHash {
		p.next()
		actionName := p.current().Literal
		p.next()
		return &ActionNode{Kind: actionName}, nil
	}

	if tok.Type == TokenColon {
		p.next()
		styleName := p.current().Literal
		p.next()
		return &ActionNode{Kind: "style", Value: styleName}, nil
	}

	if tok.Type == TokenIdent {
		val := tok.Literal
		p.next()
		// Check for key-value pairs like limit:5
		if p.current().Type == TokenColon {
			p.next()
			argVal := p.current().Literal
			p.next()
			return &ActionNode{Kind: val, Value: argVal}, nil
		}
		return &ActionNode{Kind: "translation", Value: val}, nil
	}

	return nil, fmt.Errorf("expected action or option, got %s at pos %d", tok.Type, tok.Pos)
}
```

---

## 7. Askel 5: Yksikkötestit (`lexer_test.go` & `parser_test.go`)

Kirjoitetaan kattavat testit, jotka varmistavat kaikkien pääoperaatioiden toimivuuden:

```go
package dsl

import "testing"

func TestDSLParser(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "@Joh 3:16",
			expected: "@Joh 3:16",
		},
		{
			input:    "@Joh 3:16 => KR92",
			expected: "@Joh 3:16 => #translation",
		},
		{
			input:    "@Joh 3:16 ? KR92 : KJV",
			expected: "@Joh 3:16 ? #translation : #translation",
		},
		{
			input:    `? "love" => limit:5`,
			expected: `? love => #limit`,
		},
		{
			input:    "^3 => #themes",
			expected: "^ => #themes",
		},
	}

	for _, tt := range tests {
		node, err := Parse(tt.input)
		if err != nil {
			t.Fatalf("Parse(%q) failed: %v", tt.input, err)
		}
		if node == nil {
			t.Fatalf("Parse(%q) returned nil node", tt.input)
		}
	}
}
```

---

## 8. Seuraavat toimenpiteet

Tämän toteutusoppaan pohjalta kehittäjä voi:

1. Luoda tiedostot `backend/internal/dsl/` -hakemistoon.
2. Ajaa `go test ./internal/dsl/...` ja varmistaa testien läpäisy.
3. Siirtyä vaiheeseen 2 (DSLExecutor & VerseService -integraatio).

