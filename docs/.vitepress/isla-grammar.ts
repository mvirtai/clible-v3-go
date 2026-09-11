// docs/.vitepress/isla-grammar.ts
// Custom TextMate / Shiki grammar registration for the ISLA v2 query language.

export const islaLanguage = {
  name: 'isla',
  displayName: 'ISLA',
  scopeName: 'source.isla',
  patterns: [
    // Comments: // ...
    {
      name: 'comment.line.double-slash.isla',
      match: '//.*$',
    },
    // Directive Trigger Prefix: !, !isla, !ISLA
    {
      name: 'keyword.control.directive.isla',
      match: '^[ \\t]*(!|isla|ISLA)\\b',
    },
    // Verse References: @(Joh 3:16) or @Joh 3:16
    {
      name: 'entity.name.class.verse.isla',
      match: '@\\([^)]+\\)|@[a-zA-Z0-9äöÄÖåÅ]+(?:\\s*\\d+(?::\\d+(?:-\\d+)?)?)?',
    },
    // Caret Context Expressions: ^, ^1, ^3, ^all
    {
      name: 'keyword.operator.context.isla',
      match: '\\^([0-9]+|all)?',
    },
    // Output & Pipeline Operators: =>, >>, >, |>, ?
    {
      name: 'keyword.operator.isla',
      match: '(=>|>>|>|\\|>|\\?)',
    },
    // Variables & Slugs: #armo, #joh-verse
    {
      name: 'variable.other.isla',
      match: '#[a-zA-Z0-9_-]+',
    },
    // Built-in Analytical & Search Functions / Methods
    {
      name: 'entity.name.function.isla',
      match:
        '\\b(search|range|read|from|at|use|vs|refs|themes|suggest|count|top|stats|limit|words|verses|ttr)\\b',
    },
    // Known Bible Translation Identifiers
    {
      name: 'constant.language.translation.isla',
      match: '\\b(KR92|KR38|KJV|WEB|GRC|FinPR|FINPR|kr92|kr38|kjv|web|grc|finpr)\\b',
    },
    // Double-quoted strings
    {
      name: 'string.quoted.double.isla',
      begin: '"',
      end: '"',
      patterns: [
        {
          name: 'constant.character.escape.isla',
          match: '\\\\.',
        },
      ],
    },
    // Single-quoted strings
    {
      name: 'string.quoted.single.isla',
      begin: "'",
      end: "'",
      patterns: [
        {
          name: 'constant.character.escape.isla',
          match: '\\\\.',
        },
      ],
    },
    // Numeric literals and verse range numbers (e.g. 3:16, 3:16-18, 50)
    {
      name: 'constant.numeric.isla',
      match: '\\b\\d+(?::\\d+(?:-\\d+)?)?\\b',
    },
  ],
};
