import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Cell } from '../types';
import { useLanguage } from '../../../context/LanguageContext';
import { ISLABlock } from '../isla/ISLABlock';

/**
 * Properties for {@link MarkdownCell}.
 */
export interface MarkdownCellProps {
  /** The notebook markdown cell model instance */
  cell: Cell;
  /** Callback fired when markdown text content changes */
  onChange: (content: string) => void;
  /** Whether editing is enabled (defaults to true) */
  isEditable?: boolean;
  /** Optional callback fired when clicking a scripture reference link */
  onSelectVerse?: (ref: string) => void;
  /** Active translation identifier for embedded ISLA blocks */
  translation?: string;
}

/**
 * Rich interactive Markdown cell supporting live previews, double-click inline editing,
 * scripture reference links (`[John 3:16]`), and embedded ISLA DSL blocks (`!#`, `!@`, `!?`).
 *
 * @param props - Component properties conforming to {@link MarkdownCellProps}.
 * @returns Interactive Markdown cell container.
 */
export const MarkdownCell: React.FC<MarkdownCellProps> = ({
  cell,
  onChange,
  isEditable = true,
  onSelectVerse,
  translation = 'WEB',
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      setIsEditing(false);
    }
  };

  /**
   * Normalizes fast ISLA directives into valid executable ISLA DSL strings.
   */
  const normalizeISLAQuery = (rawQuery: string): string => {
    let q = rawQuery.trim();
    // Strip leading `!`
    if (q.startsWith('!')) {
      q = q.substring(1).trim();
    }
    // Strip leading `isla ` or `ISLA `
    if (/^isla\s+/i.test(q)) {
      q = q.replace(/^isla\s+/i, '').trim();
    }

    // Shorthand for simple scripture references: `!@Joh 3:16` -> `@Joh 3:16`
    if (q.startsWith('@')) {
      return q;
    }

    // Shorthand for keyword search: `!? "armo" @ut` or `!i? "valkeus"` -> `? "armo" @ut`
    if (q.startsWith('?')) {
      return q;
    }

    // Shorthand for compare / analyze queries: `~ "armo" @room` -> `~ "armo" @room`
    if (q.startsWith('~')) {
      return q;
    }

    // Shorthand for count queries: `# "armo" @ut` or `# @Joh 3:16` -> `? "armo" @ut => count` or `@Joh 3:16 => count`
    if (q.startsWith('#')) {
      const rest = q.substring(1).trim();
      if (rest.startsWith('@') || rest.startsWith('?')) {
        return `${rest} => count`;
      }
      return `? ${rest} => count`;
    }

    return q;
  };

  /**
   * Preprocesses raw Markdown text:
   * 1. Transforms `![[isla ...]]` or `![[@...]]` embeds into ISLA code blocks.
   * 2. Transforms inline backtick shortcuts `` `!isla ...` `` or `` `!@...` `` into ISLA code blocks.
   * 3. Transforms `[ref]` (or `[[ref]]`) into clickable scripture links `[ref](#bible-link/ref)`.
   * 4. Transforms line-level and mid-line `!isla ...`, `!@...`, `!?...`, `!#...`, `!~...` into ISLA code blocks.
   */
  const preprocessContent = (text: string) => {
    // 1. Transform `![[isla @...]]` or `![[@...]]` embeds into ISLA blocks
    let processed = text.replace(/!\[\[(?:isla\s+|ISLA\s+|i\s+)?(@.*?|\?.*?|#.*?|~.*?|.*?)\]\]/g, (_, g1) => {
      return `\n\n\`\`\`isla\n${normalizeISLAQuery(g1)}\n\`\`\`\n\n`;
    });

    // 2. Transform inline `!isla ...` or `!@...` or `!?...` into ISLA blocks (breaks out of inline <p><code>)
    processed = processed.replace(/`!(?:isla\s+|ISLA\s+|i\s+)?(@.*?|\?.*?|#.*?|~.*?|.*?)`/g, (_, g1) => {
      return `\n\n\`\`\`isla\n${normalizeISLAQuery(g1)}\n\`\`\`\n\n`;
    });

    // 3. Transform clickable verse links `[reference]` or `[[reference]]` -> `[reference](#bible-link/reference)`
    // Matches [ref] or [[ref]] while avoiding images (![...]) and standard markdown links ([...](url))
    processed = processed.replace(/(?<![!])\[(?:\[([^\]]+)\]|([^\]]+))\](?!\s*[([])/g, (_, doubleRef, singleRef) => {
      const ref = (doubleRef || singleRef || '').trim();
      if (!ref) return '';
      return `[${ref}](#bible-link/${encodeURIComponent(ref)})`;
    });

    // 4. Transform line and mid-line directives: `!isla ...`, `!@...`, `!?...`, `!#...`, `!~...`, `!i#...`
    processed = processed.replace(/(?:^|[ \t]+)(!(?:isla\b|ISLA\b|i[@?#~]|[@?#~]|\s+@|\s+\?|\s+#|\s+~)[^\n`]*)/gm, (_, fullDirective) => {
      const query = normalizeISLAQuery(fullDirective);
      return `\n\n\`\`\`isla\n${query}\n\`\`\`\n\n`;
    });

    return processed;
  };

  const markdownComponents = {
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (href?.startsWith('#bible-link/')) {
        const reference = decodeURIComponent(href.replace('#bible-link/', ''));
        return (
          <a
            href={`#${reference}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onSelectVerse) onSelectVerse(reference);
            }}
            className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-semibold underline decoration-dotted transition-colors cursor-pointer"
          >
            {children}
          </a>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-amber-600 dark:text-amber-500 hover:underline"
        >
          {children}
        </a>
      );
    },
    code: ({
      className,
      children,
      ...props
    }: React.ComponentPropsWithoutRef<'code'> & { node?: unknown }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (language === 'isla' || language === 'magic') {
        return (
          <ISLABlock
            code={String(children).replace(/\n$/, '')}
            translation={translation}
          />
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  const { strings } = useLanguage();

  if (!isEditable) {
    return (
      <div className="prose prose-amber dark:prose-invert max-w-none p-4 font-serif text-[var(--text)] whitespace-normal break-words">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {preprocessContent(cell.content) || strings.noContentText}
        </ReactMarkdown>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="w-full relative">
        <textarea
          ref={(node) => {
            if (node) {
              node.focus();
              const len = node.value.length;
              node.setSelectionRange(len, len);
            }
          }}
          className="w-full min-h-[120px] p-4 font-serif bg-[var(--surface-2)] border border-[var(--border-soft)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y transition-all"
          value={cell.content}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleKeyDown}
          placeholder={strings.markdownCellPlaceholder}
        />
        <div className="absolute right-2 bottom-2 text-xs text-[var(--muted)] pointer-events-none select-none">
          {strings.markdownCtrlEnterHint}
        </div>
      </div>
    );
  }

  return (
    <div
      className="prose prose-amber dark:prose-invert max-w-none p-4 font-serif text-[var(--text)] cursor-pointer rounded-lg hover:bg-[var(--surface-2)]/30 border border-transparent hover:border-[var(--border-soft)] transition-all duration-200 whitespace-normal break-words"
      onDoubleClick={() => setIsEditing(true)}
      onClick={() => {
        if (!cell.content.trim()) {
          setIsEditing(true);
        }
      }}
      title={strings.markdownEditTitle}
    >
      {cell.content.trim() ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {preprocessContent(cell.content)}
        </ReactMarkdown>
      ) : (
        <p className="text-[var(--muted)] italic py-2">
          {strings.markdownEmptyText}
        </p>
      )}
    </div>
  );
};