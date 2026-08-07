// src/components/TranslationManager.tsx
import React, { useState } from 'react';
import { apiService } from '../services/api';
import { CheckCircle, PlusCircle, Loader2, MinusCircle } from 'lucide-react';
import type { InstalledTranslation } from '../types/bible';

interface Props {
  translations: InstalledTranslation[];
  onTranslationChanged?: () => void;
}

export const TranslationManager: React.FC<Props> = ({ translations, onTranslationChanged }) => {
  const [loading, setLoading] = useState<string | null>(null); // stores the translationId being processed
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleActivate = async (translationId: string, name: string) => {
    setLoading(translationId);
    setStatus(null);
    try {
      await apiService.linkTranslation(translationId);
      setStatus({ type: 'success', message: `"${name}" activated successfully!` });
      if (onTranslationChanged) onTranslationChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ type: 'error', message: msg || 'Activation failed. Please try again.' });
    } finally {
      setLoading(null);
    }
  };

  const handleDeactivate = async (translationId: string, name: string) => {
    setLoading(translationId);
    setStatus(null);
    try {
      await apiService.unlinkTranslation(translationId);
      setStatus({ type: 'success', message: `"${name}" deactivated.` });
      if (onTranslationChanged) onTranslationChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ type: 'error', message: msg || 'Deactivation failed. Please try again.' });
    } finally {
      setLoading(null);
    }
  };

  const installed = translations.filter(t => t.installed);
  const available = translations.filter(t => !t.installed);

  return (
    <div className="rounded-3xl p-4 sm:p-8 space-y-4 sm:space-y-6" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        Translation Management
      </h2>

      {status && (
        <div className="p-4 rounded-2xl text-sm flex items-start gap-3" style={{
          background: status.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          border: `1px solid ${status.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
          color: status.type === 'success' ? 'var(--success)' : 'var(--error)',
        }}>
          <span className="leading-relaxed">{status.message}</span>
        </div>
      )}

      {/* Active translations */}
      {installed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Active Translations
          </p>
          <div className="space-y-2">
            {installed.map(tr => (
              <div
                key={tr.id}
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ background: 'rgba(52,168,83,0.06)', border: '1px solid rgba(52,168,83,0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={15} style={{ color: '#34a853', flexShrink: 0 }} />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{tr.name}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>{tr.language.toUpperCase()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeactivate(tr.id, tr.name)}
                  disabled={loading !== null}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', cursor: 'pointer' }}
                  id={`deactivate-${tr.id}`}
                >
                  {loading === tr.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <MinusCircle size={12} />}
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available translations */}
      {available.length > 0 && (
        <div className="space-y-3" style={{ borderTop: installed.length > 0 ? '1px solid var(--border-soft)' : 'none', paddingTop: installed.length > 0 ? '1.5rem' : '0' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Available Translations
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {available.map(tr => (
              <button
                key={tr.id}
                onClick={() => handleActivate(tr.id, tr.name)}
                disabled={loading !== null}
                className="rounded-2xl p-4 text-left flex items-center gap-3 transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
                id={`activate-${tr.id}`}
              >
                {loading === tr.id
                  ? <Loader2 size={15} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  : <PlusCircle size={15} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{tr.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{tr.language.toUpperCase()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {translations.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
          No translations available. Please contact an administrator.
        </p>
      )}
    </div>
  );
};