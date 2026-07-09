import { useState, useMemo, useEffect } from 'react';
import { GitCompareArrows, Loader2, Save } from 'lucide-react';
import { apiService } from '../services/api';
import type { InstalledTranslation, ComparisonResult } from '../types/bible';
import { resolveBookId } from '../utils/bookNames';

interface CompareViewProps {
    /** All translations currently installed in the workspace. */
    installedTranslations: InstalledTranslation[];
    activeScopeId?: string;
    onWorkspaceUpdated?: () => void;
    loadedSavedComparison?: {
        result: ComparisonResult;
        reference: string;
        translationA: string;
        translationB: string;
    } | null;
}

function similarityBarHue(ratio01: number): string {
    const t = Math.max(0, Math.min(1, ratio01));
    return `hsl(${Math.round(t * 120)}, 55%, 42%)`;
}

export function CompareView({
    installedTranslations,
    activeScopeId,
    onWorkspaceUpdated,
    loadedSavedComparison
}: CompareViewProps) {
    const [reference, setReference] = useState('John 3:16');
    const [leftTr, setLeftTr] = useState('');
    const [rightTr, setRightTr] = useState('');
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Tallennuksen tilat
    const [saveName, setSaveName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Käsittele ladattu vertailu sivupalkista
    useEffect(() => {
        if (!loadedSavedComparison) return;

        const loadData = async () => {
            setReference(loadedSavedComparison.reference);
            setLeftTr(loadedSavedComparison.translationA);
            setRightTr(loadedSavedComparison.translationB);
            setError(null);

            if (loadedSavedComparison.result) {
                setResult(loadedSavedComparison.result);
            } else {
                // Suoritetaan vertailu backendistä, jos välimuistitulos puuttuu
                setLoading(true);
                try {
                    const normalized = loadedSavedComparison.reference.replace(
                        /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
                        (match) => resolveBookId(match) ?? match,
                    );
                    const data = await apiService.compare(
                        normalized,
                        loadedSavedComparison.translationA,
                        loadedSavedComparison.translationB
                    );
                    setResult(data);
                } catch {
                    setError('Tallennetun käännösvertailun lataaminen epäonnistui');
                } finally {
                    setLoading(false);
                }
            }
        };

        loadData();
    }, [loadedSavedComparison]);


    // Filter right translation options to avoid comparing a translation with itself
    const rightOptions = useMemo(() => {
        return installedTranslations.filter((t) => t.id !== leftTr);
    }, [installedTranslations, leftTr]);

    const runCompare = async () => {
        if (!reference.trim() || !leftTr || !rightTr) return;
        const normalized = reference.trim().replace(
            /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
            (match) => resolveBookId(match) ?? match,
        );
        setLoading(true);
        setError(null);
        try {
            const data = await apiService.compare(normalized, leftTr, rightTr);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Comparison failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Control Panel */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <GitCompareArrows size={22} className="text-[var(--accent)]" />
                    <span>Käännösvertailu (Translation Compare)</span>
                </h2>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                            Jaeviite (Reference)
                        </label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. John 3:16 or John 3:16-20"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm"
                            disabled={installedTranslations.length < 2}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                                Vasen käännös (Left Translation)
                            </label>
                            <select
                                value={leftTr}
                                onChange={(e) => {
                                    setLeftTr(e.target.value);
                                    if (e.target.value === rightTr) setRightTr('');
                                }}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm uppercase"
                                disabled={installedTranslations.length === 0}
                            >
                                <option value="">-- Valitse käännös --</option>
                                {installedTranslations.map((tr) => (
                                    <option key={tr.id} value={tr.id}>
                                        {tr.id} · {tr.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                                Oikea käännös (Right Translation)
                            </label>
                            <select
                                value={rightTr}
                                onChange={(e) => setRightTr(e.target.value)}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm uppercase"
                                disabled={!leftTr || rightOptions.length === 0}
                            >
                                <option value="">-- Valitse käännös --</option>
                                {rightOptions.map((tr) => (
                                    <option key={tr.id} value={tr.id}>
                                        {tr.id} · {tr.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {installedTranslations.length < 2 && (
                    <p className="text-sm text-amber-600">Asenna vähintään kaksi käännöstä vertailutyökalun käyttämiseksi.</p>
                )}

                <button
                    onClick={runCompare}
                    disabled={loading || !leftTr || !rightTr || !reference.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--text)] text-[var(--bg)] px-6 py-2.5 text-sm font-medium btn-tactile disabled:opacity-40"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <GitCompareArrows size={18} />}
                    Vertaa käännöksiä
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                    {error}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12 gap-2 text-[var(--muted)] text-sm">
                    <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
                    Verrataan jakeita...
                </div>
            )}

            {result && !loading && (
                <>
                    {activeScopeId && (
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-left space-y-3 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                                    Haluatko tallentaa tämän käännösvertailun työtilaan?
                                </span>
                                {!showSaveForm && (
                                    <button
                                        onClick={() => setShowSaveForm(true)}
                                        className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 btn-tactile hover:border-[var(--accent)] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                                    >
                                        <Save size={12} /> Tallenna
                                    </button>
                                )}
                            </div>

                            {showSaveForm && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nimi vertailulle (esim. Joh 3:16 kr92/web)..."
                                        value={saveName}
                                        onChange={(e) => setSaveName(e.target.value)}
                                        className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none border"
                                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!saveName.trim()) return;
                                            setSaving(true);
                                            try {
                                                await apiService.saveAnalysis({
                                                    scopeId: activeScopeId,
                                                    name: saveName.trim(),
                                                    reference: reference,
                                                    analysisType: 'comparison',
                                                    translationId: leftTr,
                                                    paramsJson: JSON.stringify({ translationB: rightTr }),
                                                    resultJson: JSON.stringify(result) // Välimuistitetaan vertailutulos!
                                                });
                                                setSaveName('');
                                                setShowSaveForm(false);
                                                if (onWorkspaceUpdated) onWorkspaceUpdated();
                                            } catch {
                                                alert('Tallennus epäonnistui');
                                            } finally {

                                                setSaving(false);
                                            }
                                        }}
                                        disabled={saving || !saveName.trim()}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-accent btn-tactile"
                                    >
                                        {saving ? 'Tallennetaan...' : 'Tallenna'}
                                    </button>
                                    <button
                                        onClick={() => setShowSaveForm(false)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border text-[var(--muted)] border-[var(--border)] bg-transparent cursor-pointer"
                                    >
                                        Peruuta
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary stats */}
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                            Käännösten välinen vastaavuus: {result.reference}
                        </h3>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                            <div className="flex justify-between py-1 border-b border-[var(--border-soft)]">
                                <dt className="text-[var(--muted)]">Keskimääräinen samankaltaisuus</dt>
                                <dd className="font-mono font-semibold">{(result.summary.averageSimilarity * 100).toFixed(1)}%</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[var(--border-soft)]">
                                <dt className="text-[var(--muted)]">Täysin samat jakeet (Exact Matches)</dt>
                                <dd className="font-mono font-semibold">
                                    {result.summary.exactMatches} / {result.summary.totalVerses}{' '}
                                    <span className="font-sans font-normal text-[var(--muted)]">
                                        ({(result.summary.exactMatchRatio * 100).toFixed(1)}%)
                                    </span>
                                </dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[var(--border-soft)]">
                                <dt className="text-[var(--muted)]">Rivejä vertailtu</dt>
                                <dd className="font-mono font-semibold">{result.summary.totalVerses}</dd>
                            </div>
                            {result.summary.mostSimilarVerseRef && (
                                <div className="flex justify-between py-1 border-b border-[var(--border-soft)]">
                                    <dt className="text-[var(--muted)]">Samankaltaisin jae</dt>
                                    <dd className="font-mono font-semibold">{result.summary.mostSimilarVerseRef}</dd>
                                </div>
                            )}
                        </dl>

                        {result.summary.topSharedWords.length > 0 && (
                            <div className="pt-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">
                                    Jaetut sanat (Shared tokens)
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {result.summary.topSharedWords.slice(0, 10).map((w, idx) => (
                                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-xs font-mono border border-[var(--border-soft)] flex items-center gap-1.5">
                                            <span className="text-[var(--text)]">{w.name}</span>
                                            <span className="text-[var(--muted)]">({w.value})</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detailed aligned table */}
                    {result.alignedVerses.length > 0 && (
                        <div className="overflow-hidden rounded-3xl border border-[var(--border)] shadow-sm bg-[var(--surface)]">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--surface-2)] text-left text-[var(--muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                                            <th className="px-4 py-3 whitespace-nowrap">Jae (Verse)</th>
                                            <th className="px-4 py-3 min-w-[16rem]">{result.translationA}</th>
                                            <th className="px-4 py-3 min-w-[16rem]">{result.translationB}</th>
                                            <th className="px-4 py-3 w-[10rem]">Suhde (Sim)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.alignedVerses.map((row, index) => {
                                            const pct = row.similarity * 100;
                                            const refStr = `${row.bookId} ${row.chapter}:${row.verse}`;
                                            return (
                                                <tr key={index} className="align-top border-b border-[var(--border-soft)] hover:bg-[var(--accent-bg)]/5 transition-colors duration-200">
                                                    <td className="px-4 py-3 font-mono text-[var(--muted)] whitespace-nowrap">
                                                        {refStr}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed">
                                                            {row.textA?.trim() ? row.textA : <span className="italic text-[var(--muted)]">—</span>}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed">
                                                            {row.textB?.trim() ? row.textB : <span className="italic text-[var(--muted)]">—</span>}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="space-y-1">
                                                            <span className="font-mono text-xs block">
                                                                {pct.toFixed(1)}%
                                                            </span>
                                                            <div
                                                                className="h-1.5 rounded-full bg-[var(--border-soft)] overflow-hidden border border-[var(--border-soft)]"
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                        backgroundColor: similarityBarHue(row.similarity),
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}