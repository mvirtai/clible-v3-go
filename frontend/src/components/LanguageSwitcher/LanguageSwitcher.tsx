import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, strings } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const handleChoose = (l: 'en' | 'fi') => {
    setLang(l);
    // animate out
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-2 px-2 py-1 rounded-full"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <Globe size={14} style={{ color: 'var(--accent)' }} />
      </button>

      {/* Options: inline, push other header items and animate width/opacity so the translation selector can shrink */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          overflow: 'hidden',
          maxWidth: open ? 160 : 0,
          opacity: open ? 1 : 0,
          transition: 'max-width 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="flex rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)] p-1">
          <button
            type="button"
            onClick={() => handleChoose('en')}
            aria-pressed={lang === 'en'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all btn-tactile ${lang === 'en'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
            style={{ transform: open ? 'translateX(0)' : 'translateX(-6px)', transition: 'transform 220ms ease, opacity 180ms ease', opacity: open ? 1 : 0 }}
            title={strings.englishLabel}
          >
            EN
          </button>

          <button
            type="button"
            onClick={() => handleChoose('fi')}
            aria-pressed={lang === 'fi'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all btn-tactile ${lang === 'fi'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
            style={{ transform: open ? 'translateX(0)' : 'translateX(-6px)', transition: 'transform 260ms ease 30ms, opacity 200ms ease 30ms', opacity: open ? 1 : 0 }}
            title={strings.finnishLabel}
          >
            FI
          </button>
        </div>
      </div>
    </div>
  );
};
