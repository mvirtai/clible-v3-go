import React from 'react';
import { Hash } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface CountResultData {
  target_type?: string;
  query?: string;
  reference?: string;
  is_regex?: boolean;
  count: number;
  translation?: string;
}

interface CountResultProps {
  data: CountResultData;
}

export const CellCountResult: React.FC<CountResultProps> = ({ data }) => {
  const { strings } = useLanguage();

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
        <Hash className="w-5 h-5" />
      </div>
      <div>
        <div className="text-sm font-medium text-amber-300">
          {data.target_type === 'search' ? (
            <span>
              {strings.countResultsForSearch}{' '}
              <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-mono">
                {data.is_regex ? `/${data.query}/` : `"${data.query}"`}
              </code>
            </span>
          ) : (
            <span>
              {strings.countVersesForRef}{' '}
              <span className="font-semibold text-amber-100">{data.reference}</span>
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-amber-100 mt-0.5">
          {data.count}{' '}
          <span className="text-sm font-normal text-amber-400/80">
            {data.count === 1 ? strings.countMatchSingular : strings.countMatchPlural} ({data.translation || strings.defaultTranslationLabel})
          </span>
        </div>
      </div>
    </div>
  );
};