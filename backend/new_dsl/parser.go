package newdsl

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// Parser transforms a stream of tokens from Lexer into an ISLAExpression AST.
type Parser struct {
	tokens []Token
	pos    int
}

// ParseISLA parses a raw ISLA expression string into an ISLAExpression AST.
func ParseISLA(input string) (*ISLAExpression, error) {
	lex, err := NewLexer(input)
	if err != nil {
		return nil, err
	}

	var tokens []Token
	for {
		tok := lex.NextToken()
		if tok.Type == TokenIllegal {
			return nil, fmt.Errorf("isla: illegal token %q at pos %d", tok.Literal, tok.Pos)
		}
		if tok.Type == TokenEOF {
			break
		}
		tokens = append(tokens, tok)
	}

	if len(tokens) == 0 {
		return nil, errors.New("isla: empty expression")
	}

	p := &Parser{tokens: tokens, pos: 0}
	return p.parseExpression()
}

func (p *Parser) current() Token {
	if p.pos >= len(p.tokens) {
		return Token{Type: TokenEOF}
	}
	return p.tokens[p.pos]
}

func (p *Parser) advance() Token {
	tok := p.current()
	p.pos++
	return tok
}

func (p *Parser) expect(expected TokenType) (Token, error) {
	tok := p.current()
	if tok.Type != expected {
		return tok, fmt.Errorf("isla: expected token %q, got %q (type %s) at pos %d", expected, tok.Literal, tok.Type, tok.Pos)
	}
	p.pos++
	return tok, nil
}

func (p *Parser) parseExpression() (*ISLAExpression, error) {
	// Step 1: Extract the mandatory output operator from the end.
	outputOp, exprTokens, err := p.extractOutputOp()
	if err != nil {
		return nil, err
	}

	if len(exprTokens) == 0 {
		return nil, errors.New("isla: expression is empty before output operator")
	}

	// Reset parser to parse only the expression tokens prior to the output operator.
	subParser := &Parser{tokens: exprTokens, pos: 0}

	// Step 2: Parse object.
	obj, err := subParser.parseObject()
	if err != nil {
		return nil, err
	}

	// Step 3: Parse chained methods (.method(args)).
	var methods []MethodCall
	for subParser.pos < len(subParser.tokens) {
		if subParser.current().Type != TokenDot {
			return nil, fmt.Errorf("isla: expected '.' before method call, got %q at pos %d", subParser.current().Literal, subParser.current().Pos)
		}
		subParser.advance() // consume '.'

		method, err := subParser.parseMethodCall()
		if err != nil {
			return nil, err
		}

		// Validate method against object kind.
		if err := validateMethodForObject(obj.objectKind(), method.Name); err != nil {
			return nil, err
		}

		methods = append(methods, method)
	}

	return &ISLAExpression{
		Object:  obj,
		Methods: methods,
		Output:  *outputOp,
	}, nil
}

// extractOutputOp locates and extracts the output operator (and optional name)
// from the tail of p.tokens. Returns the OutputOp and the remaining expression tokens.
func (p *Parser) extractOutputOp() (*OutputOp, []Token, error) {
	n := len(p.tokens)
	if n == 0 {
		return nil, nil, errors.New("isla: empty expression")
	}

	// Find the position of the output operator token (=>, >, >>) near the end.
	opIdx := -1
	for i := n - 1; i >= 0; i-- {
		t := p.tokens[i].Type
		if t == TokenOutputInline || t == TokenOutputAbove || t == TokenOutputBelow {
			opIdx = i
			break
		}
	}

	if opIdx == -1 {
		return nil, nil, errors.New("isla: missing output operator (expected =>, >, or >>)")
	}

	opTok := p.tokens[opIdx]
	var kind OutputKind
	switch opTok.Type {
	case TokenOutputInline:
		kind = OutputInline
	case TokenOutputAbove:
		kind = OutputNewCellAbove
	case TokenOutputBelow:
		kind = OutputNewCellBelow
	}

	// Any tokens after opTok form the name.
	nameTokens := p.tokens[opIdx+1:]
	exprTokens := p.tokens[:opIdx]

	var name string
	if len(nameTokens) > 0 {
		if kind == OutputInline {
			return nil, nil, errors.New("isla: => does not support naming — use > or >>")
		}

		// Check if it's #slug or string literal or words.
		if nameTokens[0].Type == TokenHash {
			// #slug
			var sb strings.Builder
			sb.WriteString("#")
			for _, t := range nameTokens[1:] {
				sb.WriteString(t.Literal)
			}
			name = sb.String()
		} else if len(nameTokens) == 1 && nameTokens[0].Type == TokenString {
			name = nameTokens[0].Literal
		} else {
			// Free title text
			var words []string
			for _, t := range nameTokens {
				words = append(words, t.Literal)
			}
			name = strings.Join(words, " ")
		}
	}

	return &OutputOp{Kind: kind, Name: name}, exprTokens, nil
}

func (p *Parser) parseObject() (Object, error) {
	tok := p.current()

	switch tok.Type {
	case TokenAtOpen:
		p.advance()
		// Literal already holds the verse reference string: "Joh 3:16"
		ref := strings.TrimSpace(tok.Literal)
		if ref == "" {
			return nil, errors.New("isla: empty verse reference in @()")
		}
		return &VerseRefNode{Reference: ref}, nil

	case TokenCaret:
		p.advance()
		// Check if next token is "all" or a number
		if p.pos < len(p.tokens) {
			nextTok := p.current()
			if nextTok.Type == TokenIdent && strings.ToLower(nextTok.Literal) == "all" {
				p.advance()
				return &CellCtxNode{All: true, Count: -1}, nil
			}
			if nextTok.Type == TokenNumber {
				p.advance()
				count, err := strconv.Atoi(nextTok.Literal)
				if err != nil || count <= 0 {
					return nil, fmt.Errorf("isla: invalid cell count %q", nextTok.Literal)
				}
				return &CellCtxNode{Count: count}, nil
			}
		}
		return &CellCtxNode{Count: 1}, nil

	case TokenSearch: // '?' shorthand
		p.advance()
		return p.parseSearchBody()

	case TokenIdent:
		name := strings.ToLower(tok.Literal)
		switch name {
		case "range":
			p.advance()
			return p.parseRange()
		case "search":
			p.advance()
			return p.parseSearchBody()
		default:
			return nil, fmt.Errorf("isla: unknown object identifier %q at pos %d", tok.Literal, tok.Pos)
		}

	default:
		return nil, fmt.Errorf("isla: unexpected token %q (type %s) at start of expression", tok.Literal, tok.Type)
	}
}

func (p *Parser) parseRange() (*RangeNode, error) {
	if _, err := p.expect(TokenParenOpen); err != nil {
		return nil, err
	}

	// Read start
	startStr, err := p.readRangePart()
	if err != nil {
		return nil, err
	}

	if _, err := p.expect(TokenComma); err != nil {
		return nil, errors.New("isla: range() expects two comma-separated arguments: start, end")
	}

	// Read end
	endStr, err := p.readRangePart()
	if err != nil {
		return nil, err
	}

	if _, err := p.expect(TokenParenClose); err != nil {
		return nil, err
	}

	return &RangeNode{
		Start: strings.TrimSpace(startStr),
		End:   strings.TrimSpace(endStr),
	}, nil
}

func (p *Parser) readRangePart() (string, error) {
	var sb strings.Builder
	var lastType TokenType
	for p.pos < len(p.tokens) {
		t := p.current()
		if t.Type == TokenComma || t.Type == TokenParenClose || t.Type == TokenEOF {
			break
		}
		p.advance()
		if sb.Len() > 0 && lastType != TokenColon && t.Type != TokenColon && lastType != TokenDash && t.Type != TokenDash {
			sb.WriteString(" ")
		}
		sb.WriteString(t.Literal)
		lastType = t.Type
	}
	res := strings.TrimSpace(sb.String())
	if res == "" {
		return "", errors.New("isla: expected range argument")
	}
	return res, nil
}

func (p *Parser) parseSearchBody() (*SearchNode, error) {
	// If followed by '(', consume it
	hasParen := false
	if p.current().Type == TokenParenOpen {
		hasParen = true
		p.advance()
	}

	// Check for regex /pattern/
	if p.current().Type == TokenRegex {
		pattern := p.advance().Literal
		if hasParen {
			if _, err := p.expect(TokenParenClose); err != nil {
				return nil, err
			}
		}
		return &SearchNode{
			Query:   pattern,
			IsRegex: true,
		}, nil
	}

	// Search terms (can be boolean AND / OR)
	var terms []string
	var boolMode SearchBoolMode

	for p.pos < len(p.tokens) {
		if hasParen && p.current().Type == TokenParenClose {
			p.advance()
			break
		}
		if !hasParen && (p.current().Type == TokenDot || p.current().Type == TokenOutputInline ||
			p.current().Type == TokenOutputAbove || p.current().Type == TokenOutputBelow) {
			break
		}

		tok := p.advance()
		switch tok.Type {
		case TokenString:
			terms = append(terms, `"`+tok.Literal+`"`)
		case TokenIdent:
			u := strings.ToUpper(tok.Literal)
			if u == "AND" || tok.Literal == "&" {
				boolMode = SearchBoolAND
			} else if u == "OR" || tok.Literal == "|" {
				boolMode = SearchBoolOR
			} else {
				terms = append(terms, tok.Literal)
			}
		default:
			return nil, fmt.Errorf("isla: unexpected token %q in search expression", tok.Literal)
		}
	}

	if len(terms) == 0 {
		return nil, errors.New("isla: search requires at least one search query term")
	}

	if len(terms) > 1 {
		if boolMode == "" {
			boolMode = SearchBoolAND // Default boolean mode when multiple terms given
		}
		return &SearchNode{
			BoolMode: boolMode,
			Terms:    terms,
		}, nil
	}

	// Single term
	single := terms[0]
	// Strip surrounding double quotes if present for Query field
	q := single
	if strings.HasPrefix(q, `"`) && strings.HasSuffix(q, `"`) && len(q) >= 2 {
		q = q[1 : len(q)-1]
	}

	return &SearchNode{
		Query: q,
	}, nil
}

func (p *Parser) parseMethodCall() (MethodCall, error) {
	tok, err := p.expect(TokenIdent)
	if err != nil {
		return MethodCall{}, fmt.Errorf("isla: expected method name after '.', got %s", p.current().Type)
	}
	name := strings.ToLower(tok.Literal)

	// Arguments are optional for some methods: .stats or .stats()
	var args []string
	if p.current().Type == TokenParenOpen {
		p.advance() // consume '('
		for p.pos < len(p.tokens) && p.current().Type != TokenParenClose {
			argTok := p.advance()
			if argTok.Type == TokenComma {
				continue
			}
			args = append(args, argTok.Literal)
		}
		if _, err := p.expect(TokenParenClose); err != nil {
			return MethodCall{}, err
		}
	}

	// Normalize aliases
	if name == "ttr" {
		name = "stats"
	}

	return MethodCall{
		Name: name,
		Args: args,
	}, nil
}

func validateMethodForObject(kind ObjectKind, method string) error {
	switch method {
	case "use":
		if kind == ObjectCellCtx {
			return fmt.Errorf("isla: .use() method is not permitted on cell context (^)")
		}
	case "vs":
		if kind != ObjectVerseRef {
			return fmt.Errorf("isla: .vs() comparison method is only permitted on verse references @()")
		}
	case "at":
		if kind != ObjectSearch {
			return fmt.Errorf("isla: .at() scope method is only permitted on search() objects")
		}
	case "limit":
		if kind != ObjectSearch {
			return fmt.Errorf("isla: .limit() method is only permitted on search() objects")
		}
	case "refs":
		if kind != ObjectVerseRef {
			return fmt.Errorf("isla: .refs() cross-reference method is only permitted on verse references @()")
		}
	case "count", "themes", "suggest", "top", "stats":
		// Allowed on all objects
		return nil
	default:
		return fmt.Errorf("isla: unknown method .%s()", method)
	}
	return nil
}
