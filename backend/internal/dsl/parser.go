package dsl

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// actionParserFn is the signature for a registered action-parsing function.
// It is called after the action keyword token has already been consumed by the parser.
type actionParserFn func(p *Parser) (*ActionNode, error)

// actionRegistry maps lower-cased ISLA action keywords to their parser functions.
// To add a new action, register it here — no changes needed elsewhere in the parser.
var actionRegistry map[string]actionParserFn

func init() {
	actionRegistry = map[string]actionParserFn{
		// Translation / verse-view selectors
		"in":  parseUnaryAction("use"),
		"use": parseUnaryAction("use"),

		// Scope modifier (at(...) in pipeline position)
		"at": parseAtAction,

		// Multi-argument comparison
		"vs":      parseBinaryAction("vs"),
		"compare": parseBinaryAction("vs"),

		// Optional-numeric actions
		"refs":    parseOptionalNumericAction("refs"),
		"themes":  parseOptionalNumericAction("themes"),
		"suggest": parseOptionalNumericAction("suggest"),

		// Unit-aware aggregator: count(), count(verses), count(chapters), count(books), count(words), count(unique_words)
		"count": parseCountAction,

		// Shorthand actions for unique words count
		"unique_words":  parseCountUnitAction("unique_words"),
		"uw":            parseCountUnitAction("unique_words"),
		"uniques":       parseCountUnitAction("unique_words"),
		"uniq":          parseCountUnitAction("unique_words"),
		"uniikit":       parseCountUnitAction("unique_words"),
		"uniikit_sanat": parseCountUnitAction("unique_words"),
		"us":            parseCountUnitAction("unique_words"),

		// Top word frequencies: top(10), top, words(10), words
		"top":        parseTopAction,
		"words":      parseTopAction,
		"top_words":  parseTopAction,

		// Text statistics & Type-Token Ratio: stats(), stats, ttr(), ttr
		"stats": parseStatsAction,
		"ttr":   parseStatsAction,

		// Required-numeric limit
		"limit": parseLimitAction,
	}
}

// parseUnaryAction returns a parser for a single-argument functional action.
//
//	in(KR92), use(KR92), use:KR92
func parseUnaryAction(kind string) actionParserFn {
	return func(p *Parser) (*ActionNode, error) {
		if p.current().Type == TokenParenOpen {
			p.next()
			arg := p.current().Literal
			p.next()
			p.consumeOptional(TokenParenClose)
			return &ActionNode{Kind: kind, Value: arg}, nil
		}
		if p.current().Type == TokenColon {
			p.next()
			arg := p.current().Literal
			p.next()
			return &ActionNode{Kind: kind, Value: arg}, nil
		}
		// Bare translation identifier used as plain word, e.g. KR92
		return &ActionNode{Kind: kind, Value: ""}, nil
	}
}

// parseAtAction handles at(scope) in pipeline position.
// Scope may be a book group name, a book ID, or a verse reference.
func parseAtAction(p *Parser) (*ActionNode, error) {
	if p.current().Type != TokenParenOpen {
		return nil, errors.New("expected '(' after 'at'")
	}
	p.next()
	var sb strings.Builder
	for p.current().Type != TokenParenClose && p.current().Type != TokenEOF {
		appendCitationToken(&sb, p.current())
		p.next()
	}
	p.consumeOptional(TokenParenClose)
	return &ActionNode{Kind: "scope", Value: sb.String()}, nil
}

// parseBinaryAction returns a parser for two-argument functional actions.
//
//	vs(KR92, KR38), compare(KR92, KJV)
func parseBinaryAction(kind string) actionParserFn {
	return func(p *Parser) (*ActionNode, error) {
		if p.current().Type != TokenParenOpen {
			return nil, fmt.Errorf("expected '(' after %q", kind)
		}
		p.next()
		arg1 := p.current().Literal
		p.next()
		var arg2 string
		if p.current().Type == TokenComma {
			p.next()
			arg2 = strings.TrimSpace(p.current().Literal)
			p.next()
		}
		p.consumeOptional(TokenParenClose)
		return &ActionNode{Kind: kind, Args: []string{arg1, arg2}}, nil
	}
}

// parseOptionalNumericAction returns a parser for actions with an optional integer argument.
//
//	refs(3), refs(), refs
func parseOptionalNumericAction(kind string) actionParserFn {
	return func(p *Parser) (*ActionNode, error) {
		limStr := ""
		if p.current().Type == TokenParenOpen {
			p.next()
			if p.current().Type == TokenNumber {
				limStr = p.current().Literal
				p.next()
			}
			p.consumeOptional(TokenParenClose)
		}
		return &ActionNode{Kind: kind, Value: limStr}, nil
	}
}

// parseCountAction parses count() or count(UNIT) or count:UNIT.
// Supported units:
//   - books: "books", "book", "b", "kirjat", "kirja", "k"
//   - chapters: "chapters", "chapter", "c", "luvut", "luku", "l"
//   - verses: "verses", "verse", "v", "jakeet", "jae", "j" (default)
//   - words: "words", "word", "w", "sanat", "sana", "s"
//
// Arguments are supported both with and without quotes: count("books"), count(b), count('w').
func parseCountAction(p *Parser) (*ActionNode, error) {
	unit := "verses"
	if p.current().Type == TokenParenOpen {
		p.next()
		if p.current().Type == TokenIdent || p.current().Type == TokenString {
			raw := strings.ToLower(strings.TrimSpace(p.current().Literal))
			p.next()
			normalized, err := normalizeCountUnit(raw)
			if err != nil {
				return nil, err
			}
			unit = normalized
		}
		if p.current().Type != TokenParenClose {
			return nil, fmt.Errorf("expected ')' after count unit, got %s at pos %d", p.current().Type, p.current().Pos)
		}
		p.next()
	} else if p.current().Type == TokenColon {
		p.next()
		if p.current().Type == TokenIdent || p.current().Type == TokenString {
			raw := strings.ToLower(strings.TrimSpace(p.current().Literal))
			p.next()
			normalized, err := normalizeCountUnit(raw)
			if err != nil {
				return nil, err
			}
			unit = normalized
		}
	}
	return &ActionNode{Kind: "count", Value: unit}, nil
}

// parseCountUnitAction returns a parser for direct pipeline count unit actions, e.g. => unique_words, => uw.
func parseCountUnitAction(unit string) actionParserFn {
	return func(p *Parser) (*ActionNode, error) {
		if p.current().Type == TokenParenOpen {
			p.next()
			p.consumeOptional(TokenParenClose)
		}
		return &ActionNode{Kind: "count", Value: unit}, nil
	}
}

func normalizeCountUnit(raw string) (string, error) {
	switch raw {
	case "b", "book", "books", "k", "kirja", "kirjat":
		return "books", nil
	case "c", "chapter", "chapters", "l", "luku", "luvut":
		return "chapters", nil
	case "v", "verse", "verses", "j", "jae", "jakeet":
		return "verses", nil
	case "w", "word", "words", "s", "sana", "sanat":
		return "words", nil
	case "unique_words", "unique words", "unique", "uniques", "uniq", "uw", "vocab", "sanasto", "eri", "uniikit", "uniikit_sanat", "uniikit sanat", "eri_sanat", "eri sanat", "us":
		return "unique_words", nil
	default:
		return "", fmt.Errorf("invalid count unit %q: expected 'verses' ('v', 'j'), 'chapters' ('c', 'l'), 'books' ('b', 'k'), 'words' ('w', 's'), or 'unique_words' ('uw', 'uniques', 'uniq', 'uniikit', 'uniikit_sanat', 'us', 'sanasto', 'unique')", raw)
	}
}

// parseTopAction handles top(10), top, words(10), words. Default is 10, max 1000.
func parseTopAction(p *Parser) (*ActionNode, error) {
	limit := 10
	if p.current().Type == TokenParenOpen {
		p.next()
		if p.current().Type == TokenNumber {
			val, err := strconv.Atoi(p.current().Literal)
			if err != nil {
				return nil, fmt.Errorf("invalid number for top: %w", err)
			}
			if val > 1000 {
				val = 1000
			} else if val < 1 {
				val = 1
			}
			limit = val
			p.next()
		}
		if p.current().Type != TokenParenClose {
			return nil, fmt.Errorf("expected ')' after top limit, got %s at pos %d", p.current().Type, p.current().Pos)
		}
		p.next()
	} else if p.current().Type == TokenColon {
		p.next()
		if p.current().Type == TokenNumber {
			val, err := strconv.Atoi(p.current().Literal)
			if err != nil {
				return nil, fmt.Errorf("invalid number for top: %w", err)
			}
			if val > 1000 {
				val = 1000
			} else if val < 1 {
				val = 1
			}
			limit = val
			p.next()
		}
	}
	return &ActionNode{Kind: "top", Value: strconv.Itoa(limit)}, nil
}

// parseStatsAction handles stats(), stats, ttr(), ttr.
func parseStatsAction(p *Parser) (*ActionNode, error) {
	mode := "all"
	if p.current().Type == TokenParenOpen {
		p.next()
		if p.current().Type == TokenIdent || p.current().Type == TokenString {
			raw := strings.ToLower(strings.TrimSpace(p.current().Literal))
			p.next()
			if raw == "ttr" {
				mode = "ttr"
			}
		}
		if p.current().Type != TokenParenClose {
			return nil, fmt.Errorf("expected ')' after stats argument, got %s at pos %d", p.current().Type, p.current().Pos)
		}
		p.next()
	}
	return &ActionNode{Kind: "stats", Value: mode}, nil
}

// parseLimitAction handles limit(5) or limit:5.
func parseLimitAction(p *Parser) (*ActionNode, error) {
	if p.current().Type == TokenParenOpen {
		p.next()
		limStr := p.current().Literal
		p.next()
		p.consumeOptional(TokenParenClose)
		return &ActionNode{Kind: "limit", Value: limStr}, nil
	}
	if p.current().Type == TokenColon {
		p.next()
		limStr := p.current().Literal
		p.next()
		return &ActionNode{Kind: "limit", Value: limStr}, nil
	}
	return nil, errors.New("limit requires a numeric argument: limit(5) or limit:5")
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

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
	lexer, err := NewLexer(input)
	if err != nil {
		return nil, err
	}
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

// consumeOptional advances past tok.Type if it is the current token.
func (p *Parser) consumeOptional(t TokenType) {
	if p.current().Type == t {
		p.next()
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
		switch tok.Type {
		case TokenPipe:
			p.next()
			right, err := p.parseActionOrOption()
			if err != nil {
				return nil, err
			}
			left = &PipeNode{Left: left, Right: right}
		case TokenSearch: // Ternary comparison operator '?'
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
		default:
			return left, nil
		}
	}
}

func (p *Parser) parsePrimary() (Node, error) {
	tok := p.current()

	switch tok.Type {
	case TokenAt:
		p.next()
		// Parse verse citation parts (e.g. Joh 3:16, Room 8:1-5, or 1. Kor 13:4-8)
		var sb strings.Builder
		for {
			cur := p.current()
			if cur.Type == TokenIdent || cur.Type == TokenNumber || cur.Type == TokenColon || cur.Type == TokenDash || cur.Type == TokenComma {
				appendCitationToken(&sb, cur)
				p.next()
			} else {
				break
			}
		}
		ref := sb.String()
		if len(ref) == 0 {
			return nil, errors.New("empty verse reference after '@'")
		}
		return &VerseRefNode{Reference: ref}, nil

	case TokenSearch:
		p.next()
		queryTok := p.current()
		if queryTok.Type != TokenString && queryTok.Type != TokenRegex && queryTok.Type != TokenIdent {
			return nil, errors.New("expected search query after '?'")
		}
		p.next()

		scopeBook := ""
		if p.current().Type == TokenAt {
			p.next()
			var sb strings.Builder
			for {
				cur := p.current()
				if cur.Type == TokenIdent || cur.Type == TokenNumber || cur.Type == TokenColon || cur.Type == TokenDash || cur.Type == TokenComma {
					if cur.Type == TokenColon || cur.Type == TokenDash || cur.Type == TokenComma ||
						(sb.Len() > 0 && (sb.String()[sb.Len()-1] == ':' || sb.String()[sb.Len()-1] == '-' || sb.String()[sb.Len()-1] == ',')) {
						sb.WriteString(cur.Literal)
					} else {
						if sb.Len() > 0 {
							sb.WriteString(" ")
						}
						sb.WriteString(cur.Literal)
					}
					p.next()
				} else {
					break
				}
			}
			scopeBook = sb.String()
		}

		return &SearchNode{
			Query:     queryTok.Literal,
			IsRegex:   queryTok.Type == TokenRegex,
			ScopeBook: scopeBook,
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

	case TokenHash:
		p.next()
		var inner Node
		if p.current().Type == TokenString || p.current().Type == TokenRegex {
			queryTok := p.current()
			p.next()
			scopeBook := ""
			if p.current().Type == TokenAt {
				p.next()
				var sb strings.Builder
				for {
					cur := p.current()
					if cur.Type == TokenIdent || cur.Type == TokenNumber || cur.Type == TokenColon || cur.Type == TokenDash || cur.Type == TokenComma {
						appendCitationToken(&sb, cur)
						p.next()
					} else {
						break
					}
				}
				scopeBook = sb.String()
			}
			inner = &SearchNode{
				Query:     queryTok.Literal,
				IsRegex:   queryTok.Type == TokenRegex,
				ScopeBook: scopeBook,
			}
		} else {
			var err error
			inner, err = p.parsePrimary()
			if err != nil {
				return nil, err
			}
		}
		return &PipeNode{Left: inner, Right: &ActionNode{Kind: "count", Value: "verses"}}, nil

	case TokenIdent:
		// ── search(...) ────────────────────────────────────────────────────────
		if tok.Literal == "search" {
			p.next()
			return p.parseSearchCall()
		}

		// ── range(start, end) ──────────────────────────────────────────────────
		if tok.Literal == "range" {
			p.next()
			return p.parseRangeCall()
		}

		// ── at(ref) as a source (verse reference form) ─────────────────────────
		// e.g. `at(Joh 3:16) => use(KR92)` — at(...) in primary position always
		// resolves to a VerseRefNode, not a scope modifier.
		if tok.Literal == "at" {
			p.next()
			if p.current().Type != TokenParenOpen {
				return nil, errors.New("expected '(' after 'at'")
			}
			p.next()
			var sb strings.Builder
			for p.current().Type != TokenParenClose && p.current().Type != TokenEOF {
				appendCitationToken(&sb, p.current())
				p.next()
			}
			if p.current().Type != TokenParenClose {
				return nil, errors.New("expected ')' after at() reference")
			}
			p.next()
			return &VerseRefNode{Reference: sb.String()}, nil
		}

		// ── read(ref) / from(ref) ──────────────────────────────────────────────
		if tok.Literal == "read" || tok.Literal == "from" {
			p.next()
			if p.current().Type != TokenParenOpen {
				return nil, fmt.Errorf("expected '(' after %q", tok.Literal)
			}
			p.next()
			var sb strings.Builder
			for p.current().Type != TokenParenClose && p.current().Type != TokenEOF {
				cur := p.current()
				appendCitationToken(&sb, cur)
				p.next()
			}
			if p.current().Type != TokenParenClose {
				return nil, fmt.Errorf("expected ')' after %s reference", tok.Literal)
			}
			p.next()
			return &VerseRefNode{Reference: sb.String()}, nil
		}

		return nil, NewUnknownIdentDiagnostic(tok.Literal, tok.Pos)

	default:
		return nil, fmt.Errorf("unexpected token %s (%q) at pos %d", tok.Type, tok.Literal, tok.Pos)
	}
}

// parseSearchCall parses search(...) after the "search" keyword token is consumed.
//
// Supported forms:
//
//	search("armo")
//	search("armo", @evankeliumit)
//	search("armo" AND "rauha")
//	search("armo" OR "rauha")
//	search("armo", scope: evankeliumit, limit: 5)
func (p *Parser) parseSearchCall() (*SearchNode, error) {
	if p.current().Type != TokenParenOpen {
		return nil, errors.New("expected '(' after 'search'")
	}
	p.next()

	queryTok := p.current()
	if queryTok.Type != TokenString && queryTok.Type != TokenRegex && queryTok.Type != TokenIdent {
		return nil, fmt.Errorf("expected search query string inside search(...) at pos %d", queryTok.Pos)
	}
	p.next()

	node := &SearchNode{
		Query:   queryTok.Literal,
		IsRegex: queryTok.Type == TokenRegex,
		Terms:   []string{queryTok.Literal},
	}

	// Check for boolean operator: AND / OR immediately following first term
	if p.current().Type == TokenIdent {
		op := strings.ToUpper(p.current().Literal)
		if op == "AND" || op == "OR" {
			node.BoolMode = SearchBoolMode(op)
			p.next()
			// Collect additional terms separated by the same operator
			for {
				termTok := p.current()
				if termTok.Type != TokenString && termTok.Type != TokenIdent {
					break
				}
				node.Terms = append(node.Terms, termTok.Literal)
				p.next()
				// Continue if same operator repeats
				if p.current().Type == TokenIdent && strings.ToUpper(p.current().Literal) == string(node.BoolMode) {
					p.next()
				} else {
					break
				}
			}
		}
	}

	// Parse optional named params and trailing scope: search("armo", scope: evankeliumit, limit: 5)
	params := make(map[string]string)
	scopeBook := ""
	for p.current().Type == TokenComma {
		p.next()
		// Positional @scope shorthand: search("armo", @evankeliumit)
		if p.current().Type == TokenAt {
			p.next()
			scopeBook = p.current().Literal
			p.next()
			continue
		}
		// Named param: key: value
		if p.current().Type == TokenIdent {
			key := p.current().Literal
			p.next()
			if p.current().Type == TokenColon {
				p.next()
				val := p.current().Literal
				p.next()
				params[key] = val
				// Honour well-known named params directly on the node
				switch key {
				case "scope":
					scopeBook = val
				}
			} else {
				// Bare ident after comma = positional scope
				scopeBook = key
			}
		}
	}

	if p.current().Type != TokenParenClose {
		return nil, errors.New("expected ')' after search arguments")
	}
	p.next()

	// Optional trailing @scope immediately following closing paren: search("armo") @Joh
	if scopeBook == "" && p.current().Type == TokenAt {
		p.next()
		scopeBook = p.current().Literal
		p.next()
	}

	node.ScopeBook = scopeBook
	_ = params

	return node, nil
}

// parseRangeCall parses range(start, end) after the "range" keyword token is consumed.
func (p *Parser) parseRangeCall() (*RangeNode, error) {
	if p.current().Type != TokenParenOpen {
		return nil, errors.New("expected '(' after 'range'")
	}
	p.next()

	// Read start reference
	var start strings.Builder
	for p.current().Type != TokenComma && p.current().Type != TokenParenClose && p.current().Type != TokenEOF {
		appendCitationToken(&start, p.current())
		p.next()
	}
	startRef := strings.TrimSpace(start.String())
	if startRef == "" {
		return nil, errors.New("range() requires a start reference, e.g. range(Joh 1:1, Joh 3:36)")
	}

	if p.current().Type != TokenComma {
		return nil, errors.New("range() requires two arguments separated by ',', e.g. range(Joh 1:1, Joh 3:36)")
	}
	p.next()

	// Read end reference
	var end strings.Builder
	for p.current().Type != TokenParenClose && p.current().Type != TokenEOF {
		appendCitationToken(&end, p.current())
		p.next()
	}
	endRef := strings.TrimSpace(end.String())
	if endRef == "" {
		return nil, errors.New("range() requires an end reference, e.g. range(Joh 1:1, Joh 3:36)")
	}

	if p.current().Type != TokenParenClose {
		return nil, errors.New("expected ')' at end of range()")
	}
	p.next()

	return &RangeNode{Start: startRef, End: endRef}, nil
}

// parseActionOrOption parses a pipeline action following a `=>` operator.
// It delegates to the actionRegistry for registered keywords, and handles
// special-case tokens (@scope, :style, #legacy) directly.
func (p *Parser) parseActionOrOption() (Node, error) {
	tok := p.current()

	// Legacy #action shorthand: => #themes
	if tok.Type == TokenHash {
		p.next()
		actionName := p.current().Literal
		p.next()
		return &ActionNode{Kind: actionName}, nil
	}

	// @scope shorthand: => @evankeliumit
	if tok.Type == TokenAt {
		p.next()
		scopeVal := p.current().Literal
		p.next()
		return &ActionNode{Kind: "scope", Value: scopeVal}, nil
	}

	// :style shorthand: => :card
	if tok.Type == TokenColon {
		p.next()
		styleName := p.current().Literal
		p.next()
		return &ActionNode{Kind: "style", Value: styleName}, nil
	}

	if tok.Type == TokenIdent || tok.Type == TokenNumber {
		val := tok.Literal
		p.next()

		// Look up the action in the registry
		if fn, ok := actionRegistry[strings.ToLower(val)]; ok {
			return fn(p)
		}

		// Fallback: bare identifier treated as a plain translation selector
		// (e.g. KR92, KJV, 1992, KR38). This preserves backwards compatibility
		// for pipelines like `@Joh 3:16 => KR92` and ternary forms.
		if val != "" {
			return &ActionNode{Kind: "translation", Value: val}, nil
		}

		// Unknown identifier: return a typed diagnostic for rich frontend display
		return nil, NewUnknownIdentDiagnostic(val, tok.Pos)
	}

	return nil, fmt.Errorf("expected action or option, got %s at pos %d", tok.Type, tok.Pos)
}

func appendCitationToken(sb *strings.Builder, cur Token) {
	if cur.Type == TokenColon || cur.Type == TokenDash || cur.Type == TokenComma ||
		(sb.Len() > 0 && (sb.String()[sb.Len()-1] == ':' || sb.String()[sb.Len()-1] == '-' || sb.String()[sb.Len()-1] == ',')) {
		sb.WriteString(cur.Literal)
	} else {
		if sb.Len() > 0 {
			sb.WriteString(" ")
		}
		sb.WriteString(cur.Literal)
	}
}
