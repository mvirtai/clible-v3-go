import { Check, X, RotateCcw, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { Messages } from '../../utils/i18n';
import type { AiVerseMatch } from '../../types/aiSearch';

export type CurationStatus = 'unreviewed' | 'accepted' | 'rejected';

export interface CuratedVerseCardProps {
  verse: AiVerseMatch;
  status: CurationStatus;
  strings: Messages;
  onAccept: (verseId: string) => void;
  onReject: (verseId: string) => void;
  onRestore: (verseId: string) => void;
  onSelectVerse?: (reference: string) => void;
}

const SWIPE_THRESHOLD_PX = 75;

export function CuratedVerseCard({
  verse,
  status,
  strings,
  onAccept,
  onReject,
  onRestore,
  onSelectVerse,
}: CuratedVerseCardProps) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  const reference = `${verse.bookId} ${verse.chapter}:${verse.verse}`;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || e.touches.length !== 1) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    const bounded = Math.max(-140, Math.min(140, diff));
    setTouchDeltaX(bounded);
  };

    const handleTouchEnd = () => {
        if (touchDeltaX > SWIPE_THRESHOLD_PX) {
            onAccept(verse.id);
        } else if (touchDeltaX < -SWIPE_THRESHOLD_PX) {
            onReject(verse.id);
        }
        setTouchStartX(null);
        setTouchDeltaX(0);
        setIsSwiping(false);
    };

    const handleTouchCancel = () => {
        setTouchStartX(null);
        setTouchDeltaX(0);
        setIsSwiping(false);
    };

    const isAccepted = status === 'accepted';
    const isRejected = status === 'rejected';

    const swipeAcceptActive = touchDeltaX > 25;
    const swipeRejectActive = touchDeltaX < -25;

    return (
    <div
      data-testid={`curated-verse-${verse.id}`}
      data-status={status}
      className={`relative overflow-hidden rounded-xl border transition-all select-none ${
        isAccepted
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : isRejected
            ? 'border-[var(--border-soft)] bg-[var(--surface-2)]/60 opacity-60'
            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-xs'
      }`}
    >
      {/* Taustavihjeet mobiilin pyyhkäisylle */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-between px-4 pointer-events-none transition-opacity ${
          isSwiping ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 font-semibold text-xs transition-colors ${
            swipeAcceptActive ? 'text-emerald-500 opacity-100' : 'text-emerald-500/30 opacity-40'
          }`}
        >
          <Check size={18} />
          <span className="hidden xs:inline">{strings.curateAccept}</span>
        </div>
        <div
          className={`flex items-center gap-1.5 font-semibold text-xs transition-colors ${
            swipeRejectActive ? 'text-rose-500 opacity-100' : 'text-rose-500/30 opacity-40'
          }`}
        >
          <span className="hidden xs:inline">{strings.curateReject}</span>
          <X size={18} />
        </div>
      </div>

      {/* Etualan korttisisältö kosketuselekäsittelijöillä */}
      <div
        data-testid={`curated-verse-card-inner-${verse.id}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          transform: touchDeltaX !== 0 ? `translateX(${touchDeltaX}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1)',
        }}
        className="relative z-10 p-3.5 sm:p-4 bg-[var(--surface)] rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Jakeen viite ja teksti klikkauskohteena */}
          <div
            onClick={() => onSelectVerse?.(reference)}
            className="flex-1 cursor-pointer group space-y-1.5"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectVerse?.(reference);
              }
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold ${
                  isAccepted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isRejected
                      ? 'text-[var(--muted)] line-through'
                      : 'text-[var(--accent)]'
                }`}
              >
                {reference}
              </span>

              {isAccepted && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {strings.curateAccepted}
                </span>
              )}

              {isRejected && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/15 text-rose-500">
                  {strings.curateRejected}
                </span>
              )}

              <ArrowRight
                size={12}
                className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>

            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isRejected
                  ? 'text-[var(--muted)] line-through'
                  : 'text-[var(--text)]'
              }`}
            >
              {verse.text}
            </p>
          </div>

          {/* Työpöydän pikanapit */}
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {isRejected ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(verse.id);
                }}
                title={strings.curateRestore}
                aria-label={strings.curateRestore}
                className="p-1.5 rounded-lg text-xs font-medium border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline text-[11px]">{strings.curateRestore}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAccepted) {
                      onRestore(verse.id);
                    } else {
                      onAccept(verse.id);
                    }
                  }}
                  title={strings.curateAccept}
                  aria-label={strings.curateAccept}
                  aria-pressed={isAccepted}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isAccepted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'border border-[var(--border-soft)] text-[var(--muted)] hover:text-emerald-600 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                  }`}
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(verse.id);
                  }}
                  title={strings.curateReject}
                  aria-label={strings.curateReject}
                  className="p-1.5 rounded-lg border border-[var(--border-soft)] text-[var(--muted)] hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}