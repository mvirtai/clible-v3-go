import { useState } from 'react';
import { apiService } from '../../services/api';
import { Loader2, X } from 'lucide-react';
import type { InstalledTranslation } from '../../types/bible';
import { useLanguage } from '../../context/LanguageContext';

export interface TranslationManagerProps {
  translations: InstalledTranslation[];
  onTranslationChanged?: () => void;
  onClose?: () => void;
}

export function TranslationManager({
  translations,
  onTranslationChanged,
  onClose,
}: TranslationManagerProps) {
  const { strings } = useLanguage();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Paikallinen tila estää välähdyksen: kun kytkintä painetaan, tila vaihtuu välittömästi
  // ja pysyy siinä kunnes vanhemman asynkroninen uudelleenrenderöinti saapuu ja synkronoi
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});

  const handleToggle = async (tr: InstalledTranslation) => {
    if (loadingId !== null) return;
    const currentInstalled = localOverrides[tr.id] !== undefined ? localOverrides[tr.id] : tr.installed;
    const nextInstalled = !currentInstalled;

    // 1. Käännetään kytkin heti lokaalisti (0ms viive)
    setLocalOverrides((prev) => ({ ...prev, [tr.id]: nextInstalled }));
    setLoadingId(tr.id);
    setStatus(null);

    try {
      if (!nextInstalled) {
        await apiService.unlinkTranslation(tr.id);
        setStatus({ type: 'success', message: `"${tr.name}" ${strings.translationDeactivatedMsg}` });
      } else {
        await apiService.linkTranslation(tr.id);
        setStatus({ type: 'success', message: `"${tr.name}" ${strings.translationActivatedMsg}` });
      }
      // 2. Ilmoitetaan taustalle ilman että kytkin heilahtaa takaisin
      if (onTranslationChanged) {
        onTranslationChanged();
      }
    } catch (err: unknown) {
      // Virheen sattuessa peruutetaan paikallinen muutos
      setLocalOverrides((prev) => {
        const copy = { ...prev };
        delete copy[tr.id];
        return copy;
      });
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({
        type: 'error',
        message: msg || (nextInstalled ? strings.translationActivationFailed : strings.translationDeactivationFailed),
      });
    } finally {
      setLoadingId(null);
    }
  };

  // Yhdistetään propsina tuleva data ja paikalliset välittömät valinnat
  const mergedTranslations = translations.map((t) => ({
    ...t,
    installed: localOverrides[t.id] !== undefined ? localOverrides[t.id] : t.installed,
  }));

  const groups = [
    {
      title: strings.translationGroupFinnish,
      items: mergedTranslations.filter((t) => t.language === 'fi'),
    },
    {
      title: strings.translationGroupEnglish,
      items: mergedTranslations.filter((t) => t.language === 'en'),
    },
    {
      title: strings.translationGroupOriginal,
      items: mergedTranslations.filter((t) => t.language === 'he' || t.language === 'grc'),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div
      className="rounded-3xl p-4 sm:p-7 space-y-5 relative"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            {strings.translationManagementTitle}
          </h2>
          <span className="text-xs text-[var(--muted)] font-mono">
            {mergedTranslations.filter((t) => t.installed).length}/{mergedTranslations.length}
          </span>
        </div>

        {/* Poistumistie / Sulje-painike */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={strings.aiUsageClose}
            className="p-1.5 -mr-1 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
          >
            <span className="hidden sm:inline">{strings.aiUsageClose}</span>
            <X size={16} />
          </button>
        )}
      </div>

      {status && (
        <div
          className="p-3 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
          style={{
            background: status.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
            border: `1px solid ${status.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
            color: status.type === 'success' ? 'var(--success)' : 'var(--error)',
          }}
        >
          <span className="leading-relaxed">{status.message}</span>
        </div>
      )}

      {/* Selkeät kieliryhmät allekkain */}
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] px-1">
              {group.title}
            </h3>
            <div className="space-y-1.5">
              {group.items.map((tr) => {
                const isLoading = loadingId === tr.id;
                return (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-medium text-[var(--text)] truncate">{tr.name}</div>
                      <div className="text-xs text-[var(--muted)] font-mono">{tr.id}</div>
                    </div>

                    {/* Sulava, pätkimätön switch-kytkin */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={tr.installed}
                      aria-label={`${tr.name} (${tr.language.toUpperCase()})`}
                      id={`toggle-${tr.id}`}
                      disabled={loadingId !== null}
                      onClick={() => handleToggle(tr)}
                      className={`relative w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 ${
                        tr.installed ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center transition-transform duration-200 ${
                          tr.installed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      >
                        {isLoading && <Loader2 size={11} className="animate-spin text-[var(--muted)]" />}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {translations.length === 0 && (
        <p className="text-sm text-center py-6 text-[var(--muted)]">
          {strings.noTranslationsAdminHint}
        </p>
      )}

      {/* Alareunan toissijainen sulkemispainike helppoon poistumiseen */}
      {onClose && (
        <div className="pt-2 border-t border-[var(--border-soft)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors cursor-pointer"
          >
            {strings.aiUsageClose}
          </button>
        </div>
      )}
    </div>
  );
}