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
		// Parse verse citation parts (e.g. Joh 3:16 or 1. Kor 13:4-8)
		var sb strings.Builder
		for {
			cur := p.current()
			if cur.Type == TokenIdent || cur.Type == TokenNumber || cur.Type == TokenColon {
				if cur.Type == TokenColon || (sb.Len() > 0 && sb.String()[sb.Len()-1] == ':') {
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
		// 1. Key-value option, e.g. limit:5
		if val == "limit" && p.current().Type == TokenColon {
			p.next()
			argVal := p.current().Literal
			p.next()
			return &ActionNode{Kind: val, Value: argVal}, nil
		}

		// 2. Special functions and aggregates. E.g. => count
		if val == "count" {
			return &ActionNode{Kind: "count"}, nil
		}

		// 3. TranslationID as default. E.g. KR92 or KJV
		return &ActionNode{Kind: "translation", Value: val}, nil
	}

	return nil, fmt.Errorf("expected action or option, got %s at pos %d", tok.Type, tok.Pos)
}
