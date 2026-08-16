# Pull Request Story: 061 – Implement DSL Token Definitions, Lexer Engine, AST, and Parser

## Overview & Business Context

As part of Phase 1 of the **Unified Hybrid Cell & Clible Magic DSL** architecture, this PR introduces the complete lexical scanner and recursive descent AST parser (`internal/dsl`) for parsing magic expressions (such as `@Joh 3:16 => KR92`, `@Joh 3:16 ? KR92 : KJV`, `? "love" => limit:5`, and `^3 => #themes`).

The Lexer decomposes raw input strings into structured, typed token streams with character offset locations, fully supporting Unicode characters (including Finnish vowels `ä`, `ö`, `å`) and complex operators. The Parser reconstructs this stream into typed Abstract Syntax Tree (AST) nodes ready for execution.

---

## Architectural & System Changes

### 1. Token Definitions (`backend/internal/dsl/token.go`)

- Declared `TokenType` enum covering:
  - Reference prefixes (`@`)
  - Search / Ternary conditional operator (`?`)
  - Pipeline projection / transformation (`=>`)
  - Key-value / ternary else delimiter (`:`)
  - Contextual cell scope (`^`)
  - Function / tag markers (`#`)
  - Delimiters (`[`, `]`, `(`, `)`, `,`)
  - Literals (identifiers, quoted strings, numbers, regular expressions).
- Implemented `Token` struct and string formatting helper.

### 2. Lexer Engine (`backend/internal/dsl/lexer.go`)

- Created `Lexer` struct operating over `[]rune` for seamless multibyte Unicode handling.
- Implemented `NextToken()` state machine:
  - `skipWhitespace()`: Ignores space, tab, and newline runes.
  - `peek()`: Lookahead one rune without consuming (enables distinguishing `=` from `=>`).
  - `readString()`: Scans single/double-quoted string literals.
  - `readNumber()`: Scans sequential digit runes.
  - `readIdent()`: Scans identifier characters including hyphen, period, and international letters.
  - `readRegex()`: Scans `/pattern/` regular expressions.

### 3. Abstract Syntax Tree (`backend/internal/dsl/ast.go`)

- Declared `Node` base interface with sealed `node()` marker method and `String()` formatting.
- Implemented core AST nodes:
  - `VerseRefNode`: Explicit Bible verse references (`@Joh 3:16-18`).
  - `SearchNode`: Full-text and regex search queries (`? "love"`).
  - `ScopeNode`: Contextual notebook cell references (`^`, `^3`, `^all`).
  - `PipeNode`: Transform/projection pipelines (`Target => Action/Option`).
  - `ComparisonNode`: Ternary multi-option/translation comparison (`Target ? OptionA : OptionB`).
  - `ActionNode`: Modifiers, styles, and options (`#themes`, `:card`, `limit:5`).

### 4. Recursive Descent Parser (`backend/internal/dsl/parser.go`)

- Implemented `Parser` with lookahead state (`current()`, `next()`).
- `ParseExpression()`: Resolves binary pipelines (`=>`) and ternary comparisons (`? :`).
- `parsePrimary()`: Resolves citations (`@`), searches (`?`), and context scopes (`^`).
- `parseActionOrOption()`: Resolves tags (`#`), styles (`:`), and key-value options (`limit:5`).

### 5. Documentation & Developer Guides

- Created [`05A-dsl-lexer-ja-kielioppiopas.md`](file:///home/vivaldev/code/clible-v3-go/.plans/08-notebook-cli-improvements/05A-dsl-lexer-ja-kielioppiopas.md) detailing compiler fundamentals and Go runtime concepts.
- Created [`05B-clible-magic-dsl-kielioppi-ja-kokonaisarkkitehtuuri.md`](file:///home/vivaldev/code/clible-v3-go/.plans/08-notebook-cli-improvements/05B-clible-magic-dsl-kielioppi-ja-kokonaisarkkitehtuuri.md) illustrating the end-to-end data pipeline and AST mappings.

---

## Testing Strategy & Metrics

### Automated Backend Tests

- Unit tests in `internal/dsl/lexer_test.go` and `internal/dsl/parser_test.go` verifying:
  - Multi-operator tokenization (`@`, `=>`, `?`, `:`, `^`, `#`, `[]`, `()`, `/.../`).
  - Unicode / Finnish string literal scanning.
  - Complex expressions (`@Joh 3:16 => KR92`, `@Joh 3:16 ? KR92 : KJV`, `? "love" => limit:5`, `^3 => #themes`).
  - Error conditions and syntax boundary checks.

```text
=== RUN   TestLexer_NextToken
--- PASS: TestLexer_NextToken (0.00s)
=== RUN   TestLexer_UnicodeFinnish
--- PASS: TestLexer_UnicodeFinnish (0.00s)
=== RUN   TestDSLParser_ValidExpressions
--- PASS: TestDSLParser_ValidExpressions (0.00s)
=== RUN   TestDSLParser_InvalidExpressions
--- PASS: TestDSLParser_InvalidExpressions (0.00s)
PASS
coverage: 90.6% of statements
ok  	github.com/mvirtai/clible-v3-go/internal/dsl	0.011s	coverage: 90.6% of statements
```

