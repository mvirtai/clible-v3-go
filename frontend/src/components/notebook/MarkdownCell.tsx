import React, { useState, useRef, useEffect } from 'react'; 
import ReactMarkdown from 'react-markdown'; 
import type { Cell } from './types'; 

interface MarkdownCellProps {
  cell: Cell;
  onChange: (content: string) => void;
  isEditable?: boolean;
  onSelectVerse?: (ref: string) => void;
}

export const MarkdownCell: React.FC<MarkdownCellProps> = ({
  cell,
  onChange,
  isEditable = true,
  onSelectVerse,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Siirretään kursori tekstin loppuun
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      setIsEditing(false);
    }
  };

  // Muutetaan [[viite]] -> [viite](#bible-link/viite) jotta markdown renderöi sen linkkinä
  const preprocessContent = (text: string) => {
    return text.replace(/\[\[(.*?)\]\]/g, (_, g1) => {
      const ref = g1.trim();
      return `[${ref}](#bible-link/${encodeURIComponent(ref)})`;
    });
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
              if (onSelectVerse) onSelectVerse(reference);
            }}
            className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-semibold underline decoration-dotted transition-colors cursor-pointer"
          >
            {children}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-500 hover:underline">
          {children}
        </a>
      );
    }
  };

  if (!isEditable) {
    return (
      <div className="prose prose-amber dark:prose-invert max-w-none p-4 font-serif text-[var(--text)]">
        <ReactMarkdown components={markdownComponents}>
          {preprocessContent(cell.content) || '*No content*'}
        </ReactMarkdown>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="w-full relative">
        <textarea
          ref={textareaRef}
          className="w-full min-h-[120px] p-4 font-serif bg-[var(--surface-2)] border border-[var(--border-soft)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y transition-all"
          value={cell.content}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleKeyDown}
          placeholder="Kirjoita muistiinpanoja tästä... Voit viitata jakeisiin syntaksilla [[Joh. 3:16]] tai [[John 3:16]]"
        />
        <div className="absolute right-2 bottom-2 text-xs text-[var(--muted)] pointer-events-none select-none">
          Ctrl+Enter valmis
        </div>
      </div>
    );
  }

  return (
    <div
      className="prose prose-amber dark:prose-invert max-w-none p-4 font-serif text-[var(--text)] cursor-pointer rounded-lg hover:bg-[var(--surface-2)]/30 border border-transparent hover:border-[var(--border-soft)] transition-all duration-200"
      onDoubleClick={() => setIsEditing(true)}
      title="Kaksoisklikkaa muokataksesi"
    >
      {cell.content.trim() ? (
        <ReactMarkdown components={markdownComponents}>
          {preprocessContent(cell.content)}
        </ReactMarkdown>
      ) : (
        <p className="text-[var(--muted)] italic py-2">
          Tyhjä markdown-solu. Kaksoisklikkaa lisätäksesi muistiinpanoja. Voit viitata jakeisiin esim. [[Joh. 3:16]]
        </p>
      )}
    </div>
  );
};