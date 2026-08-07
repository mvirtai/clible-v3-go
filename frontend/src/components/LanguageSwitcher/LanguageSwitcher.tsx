import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, strings } = useLanguage();
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const visible = open || hovering;

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
    <div
      ref={rootRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={visible}
        aria-label="Change language"
        className="flex items-center gap-2 px-2 py-1 rounded-full transition-all duration-300 btn-tactile hover:border-[var(--accent)] cursor-pointer"
        style={{
          border: '1px solid var(--border)',
          background: visible ? 'var(--accent-bg)' : 'var(--surface)',
          color: visible ? 'var(--accent)' : 'var(--muted)',
        }}
      >
        <Globe
          size={14}
          className={`transition-transform duration-400 ${visible ? 'scale-110 -translate-x-0.5' : 'hover:scale-105 hover:-translate-x-0.5'}`}
          style={{ color: 'var(--accent)' }}
        />
      </button>

      {visible && (
        <div className="absolute right-0 top-full mt-1.5 z-50 flex rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleChoose('en')}
            aria-pressed={lang === 'en'}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all btn-tactile cursor-pointer ${lang === 'en'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
            title={strings.englishLabel}
          >
            EN
          </button>

          <button
            type="button"
            onClick={() => handleChoose('fi')}
            aria-pressed={lang === 'fi'}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all btn-tactile cursor-pointer ${lang === 'fi'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
            title={strings.finnishLabel}
          >
            FI
          </button>
        </div>
      )}
    </div>
  );
};
