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
  return (
    trimmed.startsWith('!@') ||
    trimmed.startsWith('!?') ||
    trimmed.startsWith('!#') ||
    trimmed.startsWith('!~') ||
    trimmed.startsWith('!isla') ||
    trimmed.startsWith('!ISLA') ||
    trimmed.startsWith('! ') ||
    trimmed === '!'
  );
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

    // 5. Multi-character operators: `=>`
    if (line.startsWith('=>', index)) {
      tokens.push({ type: 'operator', text: '=>' });
      index += 2;
      continue;
    }

    // 6. Single character operators: `?`, `:`, `^`
    if (char === '?' || char === ':' || char === '^') {
      tokens.push({ type: 'operator', text: char });
      index++;
      continue;
    }

    // 7. Scripture References and Scopes: `@Joh 3:16`, `@Room`, `@NT` or reference immediately following `!@`
    if (char === '@') {
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

    // 8. Functions / tags: `#themes`, `#count`, `#refs`, `#suggest`
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

    // 10. Identifiers / Words / Translations
    const wordMatch = line.slice(index).match(/^[A-Za-zäöåÄÖÅ][A-Za-z0-9äöåÄÖÅ]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      if (KNOWN_TRANSLATIONS.has(word)) {
        tokens.push({ type: 'translation', text: word });
      } else if (word === 'count' || word === 'themes' || word === 'refs' || word === 'suggest') {
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
      return 'text-amber-400 font-bold';
    case 'reference':
      return 'text-emerald-400 font-semibold';
    case 'string':
      return 'text-cyan-300';
    case 'regex':
      return 'text-teal-300 font-mono';
    case 'operator':
      return 'text-purple-400 font-bold';
    case 'translation':
      return 'text-rose-400 font-semibold';
    case 'function':
      return 'text-fuchsia-400 font-semibold';
    case 'param':
      return 'text-sky-300';
    case 'plain':
    default:
      return 'text-neutral-200';
  }
}