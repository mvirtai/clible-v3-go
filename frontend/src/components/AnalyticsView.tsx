import { useState, useEffect } from 'react';
import { BarChart3, Hash, Activity, MessageSquare, Loader2, Sparkles, Cloud, Save } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { apiService } from '../services/api';
import { WordCloud } from './WordCloud';
import type { TextStats } from '../types/bible';
import { resolveBookId } from '../utils/bookNames';

interface AnalyticsViewProps {
    /** The translation ID selected globally (e.g. "kr92") */
    defaultTranslation: string;
    activeScopeId?: string;
    onWorkspaceUpdated?: () => void;
    loadedSavedStats?: {
        stats: TextStats;
        reference: string;
        translationId: string;
    } | null;
}

export const AnalyticsView = ({
    defaultTranslation,
    activeScopeId,
    onWorkspaceUpdated,
    loadedSavedStats
}: AnalyticsViewProps) => {
    const [reference, setReference] = useState<string>("John 3");
    const [stats, setStats] = useState<TextStats | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [chartType, setChartType] = useState<'bar' | 'cloud'>('bar');

    // Tallennuksen tilat
    const [saveName, setSaveName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Käsittele ladattu analyysi sivupalkista
    useEffect(() => {
        if (!loadedSavedStats) return;

        const loadData = async () => {
            setReference(loadedSavedStats.reference);
            setError(null);

            if (loadedSavedStats.stats) {
                setStats(loadedSavedStats.stats);
            } else {
                // Suoritetaan analyysi backendistä, jos välimuisti puuttuu (vanha tallennus)
                setLoading(true);
                try {
                    const normalized = loadedSavedStats.reference.replace(
                        /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
                        (match) => resolveBookId(match) ?? match,
                    );
                    const data = await apiService.analyze(normalized, loadedSavedStats.translationId);
                    setStats(data);
                } catch {
                    setError('Tallennetun analyysin lataaminen epäonnistui');
                } finally {
                    setLoading(false);
                }
            }
        };

        loadData();
    }, [loadedSavedStats]);


    const runAnalysis = async () => {
        if (!reference.trim() || !defaultTranslation) return;
        const normalized = reference.trim().replace(
            /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
            (match) => resolveBookId(match) ?? match,
        );
        setLoading(true);
        setError(null);
        try {
            const data = await apiService.analyze(normalized, defaultTranslation)
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching analysis');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Search Header */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity size={20} className="text-[var(--accent)]" />
                    <span>Tekstianalyysi (Linguistic Analytics)</span>
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Syötä jaeviite tai luku (esim. Joh. 3 tai Genesis 1)"
                        className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm"
                    />
                    <button
                        onClick={runAnalysis}
                        disabled={loading || !defaultTranslation}
                        className="px-6 py-2.5 rounded-xl bg-[var(--text)] text-[var(--bg)] font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                        Analysoi teksti
                    </button>
                </div>
                {!defaultTranslation && (
                    <p className="text-xs text-red-500">Valitse käännös oikealta ylhäältä ennen analysointia.</p>
                )}
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                    {error}
                </div>
            )}

            {activeScopeId && stats && (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-left space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                            Haluatko tallentaa tämän analyysin työtilaan?
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
                                placeholder="Nimi analyysille (esim. Joh 3 sanasto)..."
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
                                            analysisType: 'single_stats',
                                            translationId: defaultTranslation,
                                            paramsJson: '{}',
                                            resultJson: JSON.stringify(stats)
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

            {stats && (
                <>
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Sanoja yhteensä (Tokens)', value: stats.tokenCount, icon: MessageSquare },
                            { label: 'Uniikit sanat (Unique)', value: stats.uniqueTokenCount, icon: Hash },
                            { label: 'Tyypin suhde (TTR %)', value: `${(stats.typeTokenRatio * 100).toFixed(1)}%`, icon: Activity },
                            { label: 'Keskipituus (Chars/Word)', value: stats.avgWordLength.toFixed(1), icon: BarChart3 },
                        ].map((card, i) => (
                            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-2 text-[var(--muted)] mb-2">
                                    <card.icon size={15} />
                                    <span className="text-[10px] uppercase tracking-wider font-semibold">{card.label}</span>
                                </div>
                                <div className="text-2xl font-mono font-bold text-[var(--text)]">{card.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Visualizations and AI Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Word Frequency Card */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-3xl shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                                    <BarChart3 size={16} /> Sanatiheys (Word Frequency)
                                </h3>
                                <div className="flex gap-1 bg-[var(--surface-2)] p-0.5 rounded-lg border border-[var(--border-soft)]">
                                    <button
                                        onClick={() => setChartType('bar')}
                                        className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-[var(--surface)] shadow-xs text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                        title="Pylväsdiagrammi"
                                    >
                                        <BarChart3 size={14} />
                                    </button>
                                    <button
                                        onClick={() => setChartType('cloud')}
                                        className={`p-1.5 rounded-md transition-colors ${chartType === 'cloud' ? 'bg-[var(--surface)] shadow-xs text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                        title="Sanapilvi"
                                    >
                                        <Cloud size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="h-64 min-h-[16rem] w-full flex items-center justify-center overflow-hidden">
                                {chartType === 'bar' ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.topWords} layout="vertical" margin={{ left: 10, right: 10 }}>
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={80}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: 'currentColor' }}
                                                className="text-[var(--muted)]"
                                                interval={0}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'var(--surface-2)' }}
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--surface)',
                                                }}
                                                itemStyle={{ color: 'var(--text)' }}
                                                labelStyle={{ color: 'var(--text-2)' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {stats.topWords.map((_, i) => (
                                                    <Cell key={i} fill="var(--accent)" fillOpacity={1 - i * 0.08} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <WordCloud words={stats.topWords} />
                                )}
                            </div>
                        </div>

                        {/* AI Tone Analysis Mock Placeholder (for Visual Layout Outlining) */}
                        <div className="bg-[var(--surface-2)] border border-[var(--border)] p-6 rounded-3xl shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-6 -right-6 p-6 opacity-5">
                                <Sparkles size={120} className="text-[var(--text)]" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                                    <Sparkles size={16} className="text-[var(--accent)]" /> AI Tone Analysis (Gemini Study Slot)
                                </h3>
                                <p className="text-sm text-[var(--muted)] leading-relaxed">
                                    Tämä tekoälypohjainen moduuli tulee analysoimaan tekstijakson sävyjä, kieliasua ja historiallista kontekstia Gemini-mallien avulla.
                                </p>
                                <div className="pt-4 space-y-2">
                                    <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                                    <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                                    <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-dashed border-[var(--border)] p-3 text-center text-xs font-mono text-[var(--muted)] bg-[var(--surface)]">
                                TULOSSA (Kehityspolku D: AI-ominaisuuksien porttaus)
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
