import type { Cell, CellCounts } from '../types';
import { classifyNotebookContent, type ContentCategory } from '../../../utils/islaClassifier';
import { useLanguage } from '../../../context/LanguageContext';

export type CellBadgeType = ContentCategory | 'markdown' | 'code';

interface BadgeVisual {
  bg: string;
  border: string;
  text: string;
  dot: string;
  emoji: string;
}

const BADGE_VISUALS: Record<CellBadgeType, BadgeVisual> = {
  text: {
    bg: 'rgba(14, 165, 233, 0.10)',
    border: 'rgba(14, 165, 233, 0.25)',
    text: '#0284c7',
    dot: '#0ea5e9',
    emoji: '📝',
  },
  search: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
    text: '#d97706',
    dot: '#f59e0b',
    emoji: '🔍',
  },
  verse: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.28)',
    text: '#059669',
    dot: '#10b981',
    emoji: '📖',
  },
  compare: {
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.28)',
    text: '#4f46e5',
    dot: '#6366f1',
    emoji: '⚖️',
  },
  count: {
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.28)',
    text: '#9333ea',
    dot: '#a855f7',
    emoji: '📊',
  },
  refs: {
    bg: 'rgba(217, 70, 239, 0.12)',
    border: 'rgba(217, 70, 239, 0.28)',
    text: '#c026d3',
    dot: '#d946ef',
    emoji: '🔗',
  },
  markdown: {
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.25)',
    text: '#2563eb',
    dot: '#3b82f6',
    emoji: '📝',
  },
  code: {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.25)',
    text: '#7c3aed',
    dot: '#8b5cf6',
    emoji: '⚙️',
  },
};

const BADGE_LABELS: Record<'fi' | 'en', Record<CellBadgeType, string>> = {
  fi: {
    text: 'Teksti',
    search: 'Haku',
    verse: 'Jae',
    compare: 'Vertailu',
    count: 'Määrä',
    refs: 'Viitteet',
    markdown: 'MD',
    code: 'CLI',
  },
  en: {
    text: 'Text',
    search: 'Search',
    verse: 'Verse',
    compare: 'Compare',
    count: 'Count',
    refs: 'Refs',
    markdown: 'MD',
    code: 'CLI',
  },
};

export interface CellBadgeProps {
  type: CellBadgeType;
  count: number;
  showEmoji?: boolean;
}

export function CellBadge({ type, count, showEmoji = true }: CellBadgeProps) {
  const { lang } = useLanguage();
  if (count <= 0) return null;
  const visual = BADGE_VISUALS[type] || BADGE_VISUALS.text;
  const label = BADGE_LABELS[lang]?.[type] || BADGE_LABELS.fi[type] || type;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none border transition-transform hover:scale-105 select-none shadow-2xs"
      style={{
        background: visual.bg,
        borderColor: visual.border,
        color: visual.text,
      }}
      title={`${count} ${label}`}
    >
      {showEmoji && <span className="text-[10px] leading-none" role="img" aria-label={label}>{visual.emoji}</span>}
      <span>{count}</span>
      <span className="text-[9px] font-medium opacity-90">{label}</span>
    </span>
  );
}

export interface NotebookContentBadgesProps {
  cells?: Cell[];
  fallbackCellCounts?: CellCounts;
}

export function NotebookContentBadges({ cells, fallbackCellCounts }: NotebookContentBadgesProps) {
  const { lang } = useLanguage();
  const counts = classifyNotebookContent(cells, fallbackCellCounts);
  const total = Object.values(counts).reduce((acc, n) => acc + n, 0);

  if (total === 0) {
    return <span className="text-[9px] text-[var(--muted)] italic">{lang === 'fi' ? 'Tyhjä' : 'Empty'}</span>;
  }

  const order: (keyof typeof counts)[] = ['text', 'search', 'verse', 'compare', 'count', 'refs'];

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {order.map((key) => {
        const val = counts[key];
        if (val <= 0) return null;
        return <CellBadge key={key} type={key} count={val} />;
      })}
    </div>
  );
}
