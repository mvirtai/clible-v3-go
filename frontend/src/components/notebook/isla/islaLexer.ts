/**
 * Lexical token types supported by the ISLA DSL in-browser tokenizer.
 */
export type ISLATokenType =
  | 'directive'
  | 'reference'
  | 'string'
  | 'regex'
  | 'operator'
  | 'translation'
  | 'function'
  | 'param'
  | 'plain';

/**
 * Represents a single highlighted lexical token.
 */
export interface ISLAToken {
  /** Classification of the token */
  type: ISLATokenType;
  /** Literal text slice */
  text: string;
}

/**
 * Known Bible translation IDs recognized for instant syntax highlighting.
 */
const KNOWN_TRANSLATIONS = new Set([
  'KR92', 'KR38', 'KJV', 'WEB', 'GRC', 'FinPR', 'FINPR', 'kr92', 'kr38', 'kjv', 'web', 'grc', 'finpr'
]);

/**
 * Checks whether a single line is an ISLA code directive.
 *
 * @param line - The raw line of text.
 * @returns True if the line starts with `!` indicating an ISLA directive.
 */
export function isISLALine(line: string): boolean {
  const trimmed = line.trimStart();
  if (!trimmed) return false;

  // Markdown image `![alt](url)` vs ISLA embed `![@Joh 3:16]` or `![[isla ...]]`
  if (trimmed.startsWith('![')) {
    return /^!\[(?:\[)?(?:isla\b|ISLA\b|i\b|[@?#~^]|search|read|at|range|from|count|vs|compare)/i.test(trimmed);
  }

  // Any other line starting with `!` is an ISLA directive
  if (trimmed.startsWith('!')) {
    return true;
  }

  // Also support bare ISLA expressions (without `!` prefix):
  // e.g. `@Joh 3:16`, `^ => #themes`, `search("armo")`, `range(GEN,EXO)`, `#myvar.count`
  if (
    trimmed.startsWith('@') ||
    trimmed.startsWith('^') ||
    trimmed.startsWith('?') ||
    /^(?:search|range|read|at|use|vs|compare|count|themes|words|stats|ttr)\s*\(/i.test(trimmed) ||
    /^#[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+|\s*=>|\s*>|\s*>>)/.test(trimmed)
  ) {
    return true;
  }

  return false;
}

/**
 * Helper to retrieve the last non-whitespace token.
 */
function getLastNonWsToken(tokens: ISLAToken[]): ISLAToken | undefined {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].type !== 'plain' || tokens[i].text.trim().length > 0) {
      return tokens[i];
    }
  }
  return undefined;
}

/**
 * Tokenizes a single ISLA DSL line into structured, highlightable tokens.
 *
 * @param line - The line text to tokenize
 * @returns Array of ISLA tokens.
 */
export function tokenizeISLALine(line: string): ISLAToken[] {
  const tokens: ISLAToken[] = [];
  let index = 0;
  const len = line.length;

  while (index < len) {
    const char = line[index];

    // 1. Directive prefix: "!", "!@", "!?", "!#", "!~", "!isla"
    if (index === 0 || (index > 0 && /^\s+$/.test(line.slice(0, index)))) {
      const match = line.slice(index).match(/^!(?:isla\b|ISLA\b|[@?#~]|\s+)?/);
      if (match && match[0].length > 0) {
        tokens.push({ type: 'directive', text: match[0] });
        index += match[0].length;
        continue;
      }
    }

    // 2. Whitespace
    if (/\s/.test(char)) {
      let ws = '';
      while (index < len && /\s/.test(line[index])) {
        ws += line[index];
        index++;
      }
      tokens.push({ type: 'plain', text: ws });
      continue;
    }

    // 3. Quoted String: "..." or '...'
    if (char === '"' || char === "'") {
      const quote = char;
      let str = quote;
      index++;
      while (index < len && line[index] !== quote) {
        if (line[index] === '\\' && index + 1 < len) {
          str += line[index] + line[index + 1];
          index += 2;
        } else {
          str += line[index];
          index++;
        }
      }
      if (index < len && line[index] === quote) {
        str += quote;
        index++;
      }
      tokens.push({ type: 'string', text: str });
      continue;
    }

    // 4. Regex: `/pattern/`
    if (char === '/') {
      const lastNonWs = getLastNonWsToken(tokens);
      if (!lastNonWs || lastNonWs.type === 'directive' || lastNonWs.type === 'operator') {
        const match = line.slice(index).match(/^\/[^/\n]+\//);
        if (match) {
          tokens.push({ type: 'regex', text: match[0] });
          index += match[0].length;
          continue;
        }
      }
    }

    // 5. Multi-character operators: `=>`, `>>`
    if (line.startsWith('=>', index)) {
      tokens.push({ type: 'operator', text: '=>' });
      index += 2;
      continue;
    }
    if (line.startsWith('>>', index)) {
      tokens.push({ type: 'operator', text: '>>' });
      index += 2;
      continue;
    }

    // 6. Single character operators: `?`, `:`, `^`, `>`, `.`
    if (char === '?' || char === ':' || char === '^' || char === '>' || char === '.') {
      tokens.push({ type: 'operator', text: char });
      index++;
      continue;
    }

    // 7. Scripture References and Scopes: `@(Joh 3:16)`, `@Joh 3:16`, `@Room`, `@NT`
    if (char === '@') {
      if (line.startsWith('@(', index)) {
        const closeIdx = line.indexOf(')', index + 2);
        if (closeIdx !== -1) {
          const refText = line.slice(index, closeIdx + 1);
          tokens.push({ type: 'reference', text: refText });
          index = closeIdx + 1;
          continue;
        }
      }
      const match = line.slice(index).match(/^@[A-Za-z0-9äöåÄÖÅ]+(?:\s+\d+(?::\d+(?:-\d+)?)?)?/);
      if (match) {
        tokens.push({ type: 'reference', text: match[0] });
        index += match[0].length;
        continue;
      }
      tokens.push({ type: 'operator', text: '@' });
      index++;
      continue;
    }

    const lastToken = tokens[tokens.length - 1];
    if (lastToken && lastToken.type === 'directive' && lastToken.text === '!@') {
      const refMatch = line.slice(index).match(/^(?:[1-3]\s+)?[A-Za-zäöåÄÖÅ]+(?:\s+\d+(?::\d+(?:-\d+)?)?)?/);
      if (refMatch && refMatch[0].length > 0) {
        tokens.push({ type: 'reference', text: refMatch[0] });
        index += refMatch[0].length;
        continue;
      }
    }

    // 8. Functions / tags / slugs: `#themes`, `#count`, `#refs`, `#suggest`, `#slug`
    if (char === '#') {
      const match = line.slice(index).match(/^#[A-Za-z0-9_-]+/);
      if (match) {
        tokens.push({ type: 'function', text: match[0] });
        index += match[0].length;
        continue;
      }
      tokens.push({ type: 'operator', text: '#' });
      index++;
      continue;
    }

    // 9. Parameters (e.g. `limit:5`)
    const paramMatch = line.slice(index).match(/^limit:\d+/);
    if (paramMatch) {
      tokens.push({ type: 'param', text: paramMatch[0] });
      index += paramMatch[0].length;
      continue;
    }

    // 10. Identifiers / Words / Translations / Functions
    const wordMatch = line.slice(index).match(/^[A-Za-zäöåÄÖÅ][A-Za-z0-9äöåÄÖÅ]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const lower = word.toLowerCase();
      if (KNOWN_TRANSLATIONS.has(word)) {
        tokens.push({ type: 'translation', text: word });
      } else if (
        lower === 'use' ||
        lower === 'at' ||
        lower === 'search' ||
        lower === 'range' ||
        lower === 'from' ||
        lower === 'read' ||
        lower === 'vs' ||
        lower === 'compare' ||
        lower === 'in' ||
        lower === 'count' ||
        lower === 'themes' ||
        lower === 'refs' ||
        lower === 'suggest' ||
        lower === 'limit' ||
        lower === 'top' ||
        lower === 'words' ||
        lower === 'stats' ||
        lower === 'ttr' ||
        lower === 'verses'
      ) {
        tokens.push({ type: 'function', text: word });
      } else {
        tokens.push({ type: 'plain', text: word });
      }
      index += word.length;
      continue;
    }

    // 11. Fallback character
    tokens.push({ type: 'plain', text: char });
    index++;
  }
  return tokens;
}

/**
 * Maps an ISLA token type to its respective Tailwind CSS styling classes.
 *
 * @param type - Classification of the ISLA token.
 * @returns Tailwind CSS utility class string for syntax highlighting.
 */
export function getTokenClassName(type: ISLATokenType): string {
  switch (type) {
    case 'directive':
      return 'text-amber-600 dark:text-amber-400 font-bold';
    case 'reference':
      return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    case 'string':
      return 'text-cyan-700 dark:text-cyan-300';
    case 'regex':
      return 'text-teal-700 dark:text-teal-300 font-mono';
    case 'operator':
      return 'text-purple-600 dark:text-purple-400 font-bold';
    case 'translation':
      return 'text-rose-600 dark:text-rose-400 font-semibold';
    case 'function':
      return 'text-fuchsia-600 dark:text-fuchsia-400 font-semibold';
    case 'param':
      return 'text-sky-700 dark:text-sky-300';
    case 'plain':
    default:
      return 'text-neutral-800 dark:text-neutral-200';
  }
}