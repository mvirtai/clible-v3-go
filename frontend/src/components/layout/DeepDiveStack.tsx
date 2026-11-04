import { useState, type JSX } from 'react';
import type { DeepDiveEntry } from '../../types/ai';
import { DeepDiveCard } from './DeepDiveCard';
import { DeepDiveSkeleton } from './DeepDiveSkeleton';
import { useLanguage } from '../../context/LanguageContext';

export interface DeepDiveStackProps {
  /** Ordered list of deep dive research results. */
  entries: DeepDiveEntry[];
  /** Topic label currently loading in flight, or null. */
  pendingTopic: string | null;
  /** Error from the latest request, or null. */
  error: Error | null;
  /** Entry that should be expanded (e.g. duplicate pick or latest), or null. */
  focusId: string | null;
  /** Fallback card title (e.g. strings.deepDiveToneTitle). */
  title: string;
  /** Callback fired when an entry is dismissed. */
  onRemove: (id: string) => void;
  /** When true, renders high-contrast inverted card style. */
  invert?: boolean;
}

/**
 * Accordion stack for chained deep dive insights.
 * Automatically expands the newest or focused entry while keeping previous results accessible.
 */
export function DeepDiveStack({
  entries,
  pendingTopic,
  error,
  focusId,
  title,
  onRemove,
  invert = false,
}: DeepDiveStackProps): JSX.Element | null {
  const { strings } = useLanguage();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  if (entries.length === 0 && !pendingTopic && !error) {
    return null;
  }

  // Default: only the focused entry (or the latest entry) is expanded.
  const defaultOpenId = focusId ?? entries.at(-1)?.id ?? null;
  const isCollapsed = (id: string): boolean => {
    if (toggled[id] !== undefined) {
      return !toggled[id];
    }
    return id !== defaultOpenId;
  };

  const handleToggle = (id: string) => {
    setToggled((prev) => {
      const currentlyCollapsed = isCollapsed(id);
      return {
        ...prev,
        [id]: currentlyCollapsed, // if currently collapsed, true expands it
      };
    });
  };

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <DeepDiveCard
          key={entry.id}
          title={entry.topic || title}
          text={entry.text}
          invert={invert}
          collapsed={isCollapsed(entry.id)}
          onToggle={() => handleToggle(entry.id)}
          onClose={() => onRemove(entry.id)}
          geminiUsageMetadata={entry.usage}
        />
      ))}

      {pendingTopic && <DeepDiveSkeleton topic={pendingTopic} />}

      {error && (
        <p className="text-xs text-red-500 font-semibold mt-2">
          {error.message || strings.deepDiveFailed}
        </p>
      )}
    </div>
  );
}
