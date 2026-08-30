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

	case TokenIdent:
		if tok.Literal == "search" {
			p.next()
			if p.current().Type != TokenParenOpen {
				return nil, errors.New("expected '(' after 'search'")
			}
			p.next()
			queryTok := p.current()
			if queryTok.Type != TokenString && queryTok.Type != TokenRegex && queryTok.Type != TokenIdent {
				return nil, fmt.Errorf("expected search query string inside search(...) at pos %d", queryTok.Pos)
			}
			p.next()

			scopeBook := ""
			if p.current().Type == TokenComma {
				p.next()
				if p.current().Type == TokenAt {
					p.next()
				}
				scopeBook = p.current().Literal
				p.next()
			}

			if p.current().Type != TokenParenClose {
				return nil, errors.New("expected ')' after search arguments")
			}
			p.next()

			// Optional trailing @scope immediately following search: search("armo") @Joh
			if scopeBook == "" && p.current().Type == TokenAt {
				p.next()
				scopeBook = p.current().Literal
				p.next()
			}

			return &SearchNode{
				Query:     queryTok.Literal,
				IsRegex:   queryTok.Type == TokenRegex,
				ScopeBook: scopeBook,
			}, nil
		}

		if tok.Literal == "read" || tok.Literal == "at" {
			fnName := tok.Literal
			p.next()
			if p.current().Type != TokenParenOpen {
				return nil, fmt.Errorf("expected '(' after %q", fnName)
			}
			p.next()
			var sb strings.Builder
			for p.current().Type != TokenParenClose && p.current().Type != TokenEOF {
				cur := p.current()
				appendCitationToken(&sb, cur)
				p.next()
			}
			if p.current().Type != TokenParenClose {
				return nil, fmt.Errorf("expected ')' after %s reference", fnName)
			}
			p.next()

			return &VerseRefNode{Reference: sb.String()}, nil
		}

		return nil, fmt.Errorf("unexpected identifier %q at pos %d", tok.Literal, tok.Pos)

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

	if tok.Type == TokenAt {
		p.next()
		scopeVal := p.current().Literal
		p.next()
		return &ActionNode{Kind: "scope", Value: scopeVal}, nil
	}

	if tok.Type == TokenColon {
		p.next()
		styleName := p.current().Literal
		p.next()
		return &ActionNode{Kind: "style", Value: styleName}, nil
	}

	if tok.Type == TokenIdent || tok.Type == TokenNumber {
		val := tok.Literal
		p.next()

		// 1. use(KR92), use:KR92, in(KR92) or in:KR92
		if val == "use" || val == "in" {
			if p.current().Type == TokenParenOpen {
				p.next()
				arg := p.current().Literal
				p.next()
				if p.current().Type == TokenParenClose {
					p.next()
				}
				return &ActionNode{Kind: "use", Value: arg}, nil
			}
			if p.current().Type == TokenColon {
				p.next()
				arg := p.current().Literal
				p.next()
				return &ActionNode{Kind: "use", Value: arg}, nil
			}
		}

		// 1b. at(Room), at(evankeliumit) or at(Joh 1:1)
		if val == "at" {
			if p.current().Type == TokenParenOpen {
				p.next()
				var sb strings.Builder
				for p.current().Type != TokenParenClose && p.current().Type != TokenEOF {
					cur := p.current()
					appendCitationToken(&sb, cur)
					p.next()
				}
				if p.current().Type == TokenParenClose {
					p.next()
				}
				return &ActionNode{Kind: "scope", Value: sb.String()}, nil
			}
		}

		// 2. vs(KR92, KR38) or compare(KR92, KR38)
		if val == "vs" || val == "compare" {
			if p.current().Type == TokenParenOpen {
				p.next()
				arg1 := p.current().Literal
				p.next()
				var arg2 string
				if p.current().Type == TokenComma {
					p.next()
					arg2 = p.current().Literal
					p.next()
				}
				if p.current().Type == TokenParenClose {
					p.next()
				}
				return &ActionNode{Kind: "vs", Args: []string{arg1, arg2}}, nil
			}
		}

		// 3. refs(3), refs() or refs
		if val == "refs" {
			limStr := ""
			if p.current().Type == TokenParenOpen {
				p.next()
				if p.current().Type == TokenNumber {
					limStr = p.current().Literal
					p.next()
				}
				if p.current().Type == TokenParenClose {
					p.next()
				}
			}
			return &ActionNode{Kind: "refs", Value: limStr}, nil
		}

		// 4. themes(5), themes() or themes
		if val == "themes" {
			limStr := ""
			if p.current().Type == TokenParenOpen {
				p.next()
				if p.current().Type == TokenNumber {
					limStr = p.current().Literal
					p.next()
				}
				if p.current().Type == TokenParenClose {
					p.next()
				}
			}
			return &ActionNode{Kind: "themes", Value: limStr}, nil
		}

		// 5. suggest(3), suggest() or suggest
		if val == "suggest" {
			limStr := ""
			if p.current().Type == TokenParenOpen {
				p.next()
				if p.current().Type == TokenNumber {
					limStr = p.current().Literal
					p.next()
				}
				if p.current().Type == TokenParenClose {
					p.next()
				}
			}
			return &ActionNode{Kind: "suggest", Value: limStr}, nil
		}

		// 6. count() or count
		if val == "count" {
			if p.current().Type == TokenParenOpen {
				p.next()
				if p.current().Type == TokenParenClose {
					p.next()
				}
			}
			return &ActionNode{Kind: "count"}, nil
		}

		// 7. limit(5) or limit:5
		if val == "limit" {
			limStr := ""
			if p.current().Type == TokenParenOpen {
				p.next()
				limStr = p.current().Literal
				p.next()
				if p.current().Type == TokenParenClose {
					p.next()
				}
				return &ActionNode{Kind: "limit", Value: limStr}, nil
			}
			if p.current().Type == TokenColon {
				p.next()
				limStr = p.current().Literal
				p.next()
				return &ActionNode{Kind: "limit", Value: limStr}, nil
			}
		}

		// 8. Default fallback translation identifier (KR92, KJV...)
		return &ActionNode{Kind: "translation", Value: val}, nil
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
