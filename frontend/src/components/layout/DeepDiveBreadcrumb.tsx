import type { JSX } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface DeepDiveBreadcrumbProps {
  path: string[];
}

export function DeepDiveBreadcrumb({ path }: DeepDiveBreadcrumbProps): JSX.Element | null {
  const { strings } = useLanguage();

  if (!path || path.length === 0) {
    return null;
  }

  return (
    <nav aria-label={strings.deepDivePathLabel} className="my-1.5 flex items-center text-xs text-text-muted">
      <ol className="flex flex-wrap items-center gap-1.5 list-none p-0 m-0">
        {path.map((item, idx) => {
          const isCurrent = idx === path.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-text-muted/60 select-none" aria-hidden="true">›</span>}
              <span
                className={isCurrent ? 'font-medium text-text-main dark:text-gray-100' : 'hover:text-text-main transition-colors'}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {item}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

