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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '../utils/markdownComponents';
import { NextFocusChips } from './NextFocusChips';
import { DeepDiveCard } from './DeepDiveCard';
import type { AiTextResponse, NextFocusItem } from '../types/ai';

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
    loadedSavedTone?: AiTextResponse | null;
    loadedSavedDeepDive?: string | null;
    activeReference?: string;
}

export const AnalyticsView = ({
    defaultTranslation,
    activeScopeId,
    onWorkspaceUpdated,
    loadedSavedStats,
    loadedSavedTone,
    loadedSavedDeepDive,
    activeReference
}: AnalyticsViewProps) => {
    const [reference, setReference] = useState<string>(() => activeReference || "John 3");
    const [stats, setStats] = useState<TextStats | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [chartType, setChartType] = useState<'bar' | 'cloud'>('bar');

    // AI states
    const [toneResult, setToneResult] = useState<AiTextResponse | null>(null);
    const [toneLoading, setToneLoading] = useState(false);
    const [toneError, setToneError] = useState<string | null>(null);
    const [deepDiveText, setDeepDiveText] = useState<string | null>(null);

    const [prevLoadedSavedTone, setPrevLoadedSavedTone] = useState<AiTextResponse | null>(null);
    const normalizedSavedTone = loadedSavedTone || null;
    if (normalizedSavedTone !== prevLoadedSavedTone) {
        setToneResult(normalizedSavedTone);
        setPrevLoadedSavedTone(normalizedSavedTone);
    }

    const [prevLoadedSavedDeepDive, setPrevLoadedSavedDeepDive] = useState<string | null>(null);
    const normalizedSavedDeepDive = loadedSavedDeepDive || null;
    if (normalizedSavedDeepDive !== prevLoadedSavedDeepDive) {
        setDeepDiveText(normalizedSavedDeepDive);
        setPrevLoadedSavedDeepDive(normalizedSavedDeepDive);
    }
    const [toneSaveStatus, setToneSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Tallennuksen tilat
    const [saveName, setSaveName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Käsittele ladattu analyysi sivupalkista
    useEffect(() => {
        if (!loadedSavedStats) return;

        const loadData = async () => {
            setReference(loadedSavedStats.reference);
            setError(null);
            if (!loadedSavedTone) {
                setToneResult(null);
            }
            if (!loadedSavedDeepDive) {
                setDeepDiveText(null);
            }
            setToneError(null);

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
    }, [loadedSavedStats, loadedSavedTone, loadedSavedDeepDive]);


    const runAnalysis = async () => {
        if (!reference.trim() || !defaultTranslation) return;
        setToneResult(null);
        setDeepDiveText(null);
        setToneError(null);
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

    const handleRunToneAnalysis = async () => {
        if (!reference || !stats) return;
        setToneLoading(true);
        setToneError(null);
        setToneResult(null);
        try {
            const normalized = reference.trim().replace(
                /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
                (match) => resolveBookId(match) ?? match,
            );
            const resData = await apiService.getVerses(normalized, defaultTranslation);
            const text = resData.verses.map(v => v.text).join('\n');
            const res = await apiService.getAiTone(text);
            setToneResult(res);
        } catch (err) {
            const errorObj = err as Error;
            if (errorObj.message && errorObj.message.includes('503')) {
                setToneError('Tekoäly ei ole käytettävissä (GEMINI_API_KEY puuttuu tai rate limit täynnä).');
            } else {
                setToneError(errorObj.message || 'Sävyanalyysi epäonnistui.');
            }
        } finally {
            setToneLoading(false);
        }
    };

    const handleSaveToneAnalysis = async () => {
        if (!activeScopeId || !toneResult || !reference) return;
        setToneSaveStatus('saving');
        try {
            await apiService.saveAnalysis({
                scopeId: activeScopeId,
                name: `Sävyanalyysi: ${reference}`,
                reference: reference,
                analysisType: 'tone',
                translationId: defaultTranslation,
                paramsJson: JSON.stringify({}),
                resultJson: JSON.stringify({ stats, tone: toneResult, deepDive: deepDiveText })
            });
            setToneSaveStatus('success');
            if (onWorkspaceUpdated) {
                onWorkspaceUpdated();
            }
            setTimeout(() => setToneSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to save tone analysis', err);
            setToneSaveStatus('error');
            setTimeout(() => setToneSaveStatus('idle'), 4000);
        }
    };

    const handleNextFocusPick = async (it: NextFocusItem) => {
        if (it.kind === 'word' || it.kind === 'theme') {
            setToneLoading(true);
            setToneError(null);
            try {
                const res = await apiService.getAiDeepDive(it.label, 'fi', { reference });
                setDeepDiveText(res.text);
            } catch (err) {
                const errorObj = err as Error;
                setToneError(errorObj.message || 'Deep dive failed.');
            } finally {
                setToneLoading(false);
            }
        } else {
            setReference(it.label);
            const normalized = it.label.trim().replace(
                /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
                (match) => resolveBookId(match) ?? match,
            );
            setLoading(true);
            setError(null);
            setToneResult(null);
            setDeepDiveText(null);
            try {
                const data = await apiService.analyze(normalized, defaultTranslation);
                setStats(data);
            } catch {
                setError('Analyysin suorittaminen epäonnistui');
            } finally {
                setLoading(false);
            }
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
                {activeReference && reference.trim().toLowerCase() !== activeReference.trim().toLowerCase() && (
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--muted)]">Viimeksi luettu jae:</span>
                        <button
                            onClick={() => setReference(activeReference)}
                            className="px-2 py-0.5 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] text-[var(--text)] transition-colors cursor-pointer"
                        >
                            {activeReference}
                        </button>
                    </div>
                )}
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
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowSaveForm(true)}
                                    className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 btn-tactile hover:border-[var(--accent)] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                                >
                                    <Save size={12} /> Tallenna
                                </button>
                                {saveStatus === 'success' && (
                                    <span className="text-xs font-semibold text-emerald-500">✓ Tallennettu työtilaan!</span>
                                )}
                                {saveStatus === 'error' && (
                                    <span className="text-xs font-semibold text-red-500">✗ Tallennus epäonnistui.</span>
                                )}
                            </div>
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
                                        const resultPayload = toneResult 
                                            ? { stats, tone: toneResult, deepDive: deepDiveText }
                                            : { stats };
                                        await apiService.saveAnalysis({
                                            scopeId: activeScopeId,
                                            name: saveName.trim(),
                                            reference: reference,
                                            analysisType: toneResult ? 'tone' : 'single_stats',
                                            translationId: defaultTranslation,
                                            paramsJson: '{}',
                                            resultJson: JSON.stringify(resultPayload)
                                        });
                                        setSaveName('');
                                        setShowSaveForm(false);
                                        setSaveStatus('success');
                                        setTimeout(() => setSaveStatus('idle'), 3000);
                                        if (onWorkspaceUpdated) onWorkspaceUpdated();
                                    } catch {
                                        setSaveStatus('error');
                                        setTimeout(() => setSaveStatus('idle'), 3000);
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

                        {/* AI Tone Analysis Live Panel */}
                        <div className="bg-[var(--surface-2)] border border-[var(--border)] p-6 rounded-3xl shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between text-left">
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                                    <Sparkles size={16} className="text-[var(--accent)]" /> AI Sävy- ja tyylianalyysi (Gemini)
                                </h3>

                                {!toneResult && !toneLoading && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                                            Analysoi tekstijakson kielellistä sävyä, teemoja ja teologista tyyliä tekoälyn avulla.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleRunToneAnalysis}
                                            className="rounded-full px-4 py-2 text-xs font-semibold btn-accent btn-tactile cursor-pointer"
                                        >
                                            Suorita sävyanalyysi
                                        </button>
                                    </div>
                                )}

                                {toneLoading && (
                                    <div className="flex items-center gap-2 text-sm text-[var(--muted)] py-4">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Tekoäly analysoi tekstin sävyjä...</span>
                                    </div>
                                )}

                                {toneError && (
                                    <p className="text-xs text-red-500 font-semibold">{toneError}</p>
                                )}

                                {toneResult && (
                                    <div className="space-y-4 mt-2">
                                        <div className="font-sans text-[var(--text-2)]">
                                            <ReactMarkdown
                                                components={markdownComponents({ invert: false, insightLayout: false, toneLayout: true })}
                                                remarkPlugins={[remarkGfm]}
                                            >
                                                {toneResult.text}
                                            </ReactMarkdown>
                                        </div>

                                        {activeScopeId && (
                                            <div className="flex justify-end border-t border-[var(--border-soft)] pt-3 mt-4">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveToneAnalysis}
                                                    disabled={toneSaveStatus === 'saving'}
                                                    className="rounded-full px-4 py-1.5 text-xs font-semibold btn-accent btn-tactile cursor-pointer"
                                                >
                                                    {toneSaveStatus === 'saving' && 'Tallennetaan...'}
                                                    {toneSaveStatus === 'success' && 'Tallennettu! ✓'}
                                                    {toneSaveStatus === 'error' && 'Virhe tallennuksessa'}
                                                    {toneSaveStatus === 'idle' && 'Tallenna sävyanalyysi työtilaan'}
                                                </button>
                                            </div>
                                        )}

                                        <NextFocusChips
                                            title="Suositellut teemat ja sanat"
                                            items={toneResult.nextFocus ?? []}
                                            onPick={handleNextFocusPick}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {deepDiveText && (
                        <div className="mt-8 w-full">
                            <DeepDiveCard
                                title="Sävyn syvennys"
                                text={deepDiveText}
                                onClose={() => setDeepDiveText(null)}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
