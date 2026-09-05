import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Clock, UserPlus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getGuestRemainingSeconds } from '../../utils/guestNotebookStorage';

/**
 * Periodic subscription for updating TTL seconds every 10 seconds.
 * React 19.2 / React Compiler external store subscription pattern.
 */
function subscribeGuestTimer(callback: () => void): () => void {
  const interval = setInterval(callback, 10000);
  return () => clearInterval(interval);
}

function getGuestTimerSnapshot(): number {
  return getGuestRemainingSeconds();
}

/**
 * Sleek, modern banner displayed at the top of the notebook canvas in guest mode.
 * Shows remaining TTL countdown with amber glowing status indicator and direct registration CTA.
 */
export function GuestNotebookBanner() {
  const { strings } = useLanguage();
  const remainingSec = useSyncExternalStore(
    subscribeGuestTimer,
    getGuestTimerSnapshot,
    () => 0
  );

  const formatRemainingTime = (sec: number): string => {
    if (sec <= 0) return '0 min';
    if (sec < 60) return `${sec} s`;
    const mins = Math.ceil(sec / 60);
    return `${mins} min`;
  };

  const isExpired = remainingSec <= 0;

  return (
    <aside
      aria-label={strings.guestNotebookBannerTitle}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-4.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-colors"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--accent)] shrink-0">
          <Clock size={18} className="opacity-90" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text)]">
              {strings.guestNotebookBannerTitle}
            </h3>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                isExpired
                  ? 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)]'
                  : 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-border)]'
              }`}
            >
              {!isExpired && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]" />
                </span>
              )}
              {isExpired ? '0 min' : strings.guestNotebookExpiresIn.replace('{time}', formatRemainingTime(remainingSec))}
            </span>
          </div>

          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
            {isExpired ? strings.guestNotebookExpiredNotice : strings.guestNotebookBannerDesc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium btn-tactile btn-accent cursor-pointer shadow-xs"
        >
          <UserPlus size={14} />
          <span>{strings.guestNotebookSignUpCta}</span>
        </Link>
      </div>
    </aside>
  );
}