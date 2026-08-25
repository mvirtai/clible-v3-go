import type { Components } from 'react-markdown';

/**
 * Options for configuring custom ReactMarkdown component rendering tokens.
 */
export interface MarkdownComponentsOptions {
  /** Whether to invert color tokens for dark backgrounds */
  invert: boolean;
  /** Whether to use expanded heading styles for AI insight layouts */
  insightLayout?: boolean;
  /** Whether to use expanded heading styles for AI tone layouts */
  toneLayout?: boolean;
}

/**
 * Creates a customized map of HTML element components for ReactMarkdown with bespoke theme styling.
 *
 * @param options - Configuration options conforming to {@link MarkdownComponentsOptions}.
 * @returns ReactMarkdown `Components` mapping.
 */
export function markdownComponents(options: MarkdownComponentsOptions): Components {
  const { invert, insightLayout, toneLayout } = options;

  // High-end typography class tokens
  const bodyColor = invert ? 'text-gray-200' : 'text-[var(--text-2)]';
  const headingColor = invert ? 'text-white' : 'text-[var(--text)]';
  const strongCls = invert ? 'font-semibold text-white' : 'font-semibold text-[var(--text)]';

  const codeBg = invert ? 'bg-gray-800/80 text-gray-100' : 'bg-[var(--surface-2)] text-[var(--text)]';
  const quoteBg = invert ? 'bg-gray-800/40' : 'bg-[var(--surface-2)]';
  const quoteBorder = invert ? 'border-gray-600' : 'border-[var(--accent)]';

  // Headings design system
  const headings: Pick<Components, 'h1' | 'h2' | 'h3'> =
    insightLayout || toneLayout
      ? {
        h1: ({ children }) => (
          <h1 className={`mb-6 mt-1 text-2xl font-bold tracking-tight first:mt-0 ${headingColor}`}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className={`mt-10 mb-4 border-l-4 pl-3 text-xl font-bold tracking-tight first:mt-2 ${quoteBorder} ${headingColor}`}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className={`mb-3 mt-8 text-lg font-semibold tracking-tight ${invert ? 'text-gray-200' : 'text-[var(--text-2)]'}`}>
            {children}
          </h3>
        ),
      }
      : {
        h1: ({ children }) => (
          <h3 className={`mb-2 mt-4 text-base font-semibold ${strongCls}`}>
            {children}
          </h3>
        ),
        h2: ({ children }) => (
          <h3 className={`mb-2 mt-3 text-sm font-semibold ${strongCls}`}>
            {children}
          </h3>
        ),
        h3: ({ children }) => (
          <h4 className={`mb-5
           mt-2 text-xs font-semibold ${strongCls}`}>
            {children}
          </h4>
        ),
      };

  return {
    ...headings,
    p: ({ children }) => (
      <p 
        style={{ marginBottom: '1.25rem' }}
        className={`text-[0.95rem] leading-relaxed ${bodyColor}`}
      >
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className={strongCls}>
        {children}
      </strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul 
        style={{ marginTop: '1rem', marginBottom: '1rem' }}
        className={`list-disc space-y-1.5 pl-6 text-[0.95rem] leading-relaxed ${bodyColor}`}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol 
        style={{ marginTop: '1rem', marginBottom: '1rem' }}
        className={`list-decimal space-y-1.5 pl-6 text-[0.95rem] leading-relaxed ${bodyColor}`}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    table: ({ children }) => (
      <div className="mb-5 overflow-x-auto rounded-lg border border-[var(--border-soft)] shadow-sm">
        <table className="w-full border-collapse text-sm text-[var(--text-2)]">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={invert ? 'bg-gray-800/70' : 'bg-[var(--surface-2)] border-b border-[var(--border-soft)]'}>{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className={invert ? 'border-b border-gray-700/60' : 'border-b border-[var(--border-soft)]'}>
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th
        className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${invert ? 'text-gray-200' : 'text-[var(--muted)]'
          }`}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`px-4 py-2.5 align-top ${invert ? 'text-gray-200' : 'text-[var(--text-2)]'}`}>
        {children}
      </td>
    ),
    code: ({ children }) => (
      <code className={`rounded px-1.5 py-0.5 font-mono text-[0.88em] ${codeBg}`}>
        {children}
      </code>
    ),
    blockquote: ({ children }) => (
      <blockquote className={`my-5 border-l-4 ${quoteBorder} ${quoteBg} p-4 rounded-r-lg italic text-[0.98rem] ${invert ? 'text-gray-300' : 'text-[var(--text-2)]'}`}>
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr
        className={`my-5 border-0 border-t ${invert ? 'border-gray-700' : 'border-[var(--border-soft)]'}`}
      />
    ),
  };
}
