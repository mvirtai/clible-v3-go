import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Cell } from './types';
import { useLanguage } from '../../context/LanguageContext';
import { ISLABlock } from './ISLABlock';

interface MarkdownCellProps {
  cell: Cell;
  onChange: (content: string) => void;
  isEditable?: boolean;
  onSelectVerse?: (ref: string) => void;
  translation?: string;
}

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
   * Preprocesses raw Markdown text:
   * 1. Transforms `[[ref]]` into clickable scripture links `[ref](#bible-link/ref)`.
   * 2. Transforms `![[isla ...]]` or `![[@...]]` embeds into ISLA code blocks.
   * 3. Transforms line-level `!isla ...`, `!@...`, `!?...`, or `! @...` into ISLA code blocks.
   */
  const preprocessContent = (text: string) => {
    // 1. Transform `![[isla @...]]` or `![[@...]]` embeds into ISLA blocks
    let processed = text.replace(/!\[\[(?:isla\s+|ISLA\s+)?(@.*?|\?.*?|.*?)\]\]/g, (_, g1) => {
      return `\n\`\`\`isla\n${g1.trim()}\n\`\`\`\n`;
    });

    // 2. Transform clickable verse links `[[reference]]` -> `[reference](#bible-link/reference)`
    processed = processed.replace(/\[\[(.*?)\]\]/g, (_, g1) => {
      const ref = g1.trim();
      return `[${ref}](#bible-link/${encodeURIComponent(ref)})`;
    });

    // 3. Transform line directives: `!isla ...`, `!@...`, `!?...`, or `! @...`
    processed = processed.replace(/^[ \t]*!(?:isla\s+|ISLA\s+|@|\?|\s+)(.*)$/gm, (fullLine) => {
      const trimmed = fullLine.trim();
      let query = '';

      if (trimmed.startsWith('!@')) {
        query = '@' + trimmed.substring(2).trim();
      } else if (trimmed.startsWith('!?')) {
        query = '?' + trimmed.substring(2).trim();
      } else if (trimmed.startsWith('!isla') || trimmed.startsWith('!ISLA')) {
        query = trimmed.replace(/^!(?:isla|ISLA):?\s*/, '');
      } else if (trimmed.startsWith('!')) {
        query = trimmed.substring(1).trim();
      }

      return `\n\`\`\`isla\n${query}\n\`\`\`\n`;
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

      // Inline shortcut support: `!isla @Joh 3:16` or `!@Joh 3:16`
      const text = String(children).trim();
      if (text.startsWith('!isla ') || text.startsWith('!ISLA ') || text.startsWith('!@') || text.startsWith('!?')) {
        const query = text.replace(/^!(?:isla|ISLA):?\s*/, '').replace(/^!/, '');
        return <ISLABlock code={query} translation={translation} />;
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
      <div className="prose prose-amber dark:prose-invert max-w-none p-4 font-serif text-[var(--text)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {preprocessContent(cell.content) || '*No content*'}
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
      className="prose prose-amber dark:prose-invert max-w-none p-4 font-serif text-[var(--text)] cursor-pointer rounded-lg hover:bg-[var(--surface-2)]/30 border border-transparent hover:border-[var(--border-soft)] transition-all duration-200"
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