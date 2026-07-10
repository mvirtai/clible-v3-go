# Ohjekirja: Analytiikka- ja vertailunäkymien toteutus (Polku B)

Tämä ohjekirja opastaa sinua (kehittäjää) toteuttamaan Clible-v3-go:n uudet tekstianalyysi- ja käännösvertailunäkymät frontend-puolelle. Kaikki sovelluksen lähdekoodi, komentovaihtoehdot ja koodikommentit on kirjoitettu englanniksi sovittujen sääntöjen mukaisesti. Ohjeistukset ovat suomeksi.

---

## Vaihe 1: API-kutsut ja mallimuunnokset (`api.ts`)

Muokataan tiedostoa [api.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/services/api.ts). Koska Go-backend palauttaa tiedot `snake_case`-avainten avulla, meidän on lisättävä muunnosfunktiot muuttamaan ne TypeScriptin odottamaan `camelCase`-muotoon.

Lisää tiedoston alkuun (heti import-lauseiden jälkeen, ennen `export class ApiService` -määrittelyä) seuraavat tyypit ja sovitinfunktiot:

```typescript
// raw api types matching the Go backend JSON responses
interface RawWordCount {
    word: string;
    count: number;
}

interface RawTextStats {
    token_count: number;
    unique_token_count: number;
    type_token_ratio: number;
    character_count: number;
    avg_word_length: number;
    top_words: RawWordCount[];
    top_bigrams: RawWordCount[];
    top_trigrams: RawWordCount[];
}

interface RawAlignedVerse {
    book_id: string;
    chapter: number;
    verse: number;
    text_a: string;
    text_b: string;
    similarity: number;
    exact_match: boolean;
}

interface RawComparisonSummary {
    total_verses: number;
    fully_aligned_verses: number;
    exact_matches: number;
    exact_match_ratio: number;
    average_similarity: number;
    top_shared_words: RawWordCount[];
    most_similar_verse_ref?: string;
}

interface RawComparisonResult {
    reference: string;
    translation_a: string;
    translation_b: string;
    aligned_verses: RawAlignedVerse[];
    summary: RawComparisonSummary;
}

/**
 * Maps RawTextStats structure to the camelCase TextStats interface.
 */
function mapTextStats(raw: RawTextStats): TextStats {
    return {
        tokenCount: raw.token_count,
        uniqueTokenCount: raw.unique_token_count,
        typeTokenRatio: raw.type_token_ratio,
        characterCount: raw.character_count,
        avgWordLength: raw.avg_word_length,
        topWords: (raw.top_words || []).map(w => ({ name: w.word, value: w.count })),
        topBigrams: (raw.top_bigrams || []).map(w => ({ name: w.word, value: w.count })),
        topTrigrams: (raw.top_trigrams || []).map(w => ({ name: w.word, value: w.count })),
    };
}

/**
 * Maps RawComparisonResult structure to the camelCase ComparisonResult interface.
 */
function mapComparisonResult(raw: RawComparisonResult): ComparisonResult {
    return {
        reference: raw.reference,
        translationA: raw.translation_a,
        translationB: raw.translation_b,
        alignedVerses: (raw.aligned_verses || []).map(v => ({
            bookId: v.book_id,
            chapter: v.chapter,
            verse: v.verse,
            textA: v.text_a,
            textB: v.text_b,
            similarity: v.similarity,
            exactMatch: v.exact_match
        })),
        summary: {
            totalVerses: raw.summary.total_verses,
            fullyAlignedVerses: raw.summary.fully_aligned_verses,
            exactMatches: raw.summary.exact_matches,
            exactMatchRatio: raw.summary.exact_match_ratio,
            averageSimilarity: raw.summary.average_similarity,
            topSharedWords: (raw.summary.top_shared_words || []).map(w => ({ name: w.word, value: w.count })),
            mostSimilarVerseRef: raw.summary.most_similar_verse_ref
        }
    };
}
```

Päivitä sitten `ApiService`-luokan `analyze`- ja `compare`-metodit käyttämään näitä apufunktioita:

```typescript
    /**
     * Executes textual analysis for a translation and verse reference.
     * @param reference - The verse reference to analyze (e.g. "PSA 23:1").
     * @param translationId - The ID of the translation to analyze.
     * @returns A TextStats object containing analytical metrics.
     * @throws Error if the request fails.
     * POST /api/analytics/analyze
     */
    async analyze(reference: string, translationId: string): Promise<TextStats> {
        const res = await fetch(
            `${this.baseUrl}/analytics/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference, translationId }),
        });
        if (!res.ok) throw new Error(
            `POST ${this.baseUrl}/analytics/analyze returned ${res.status}`);
        
        const raw = await res.json() as RawTextStats;
        return mapTextStats(raw);
    }

    /**
     * Compares two different translations for the same verse reference.
     * @param reference - The verse reference to compare (e.g. "JHN 3:16").
     * @param translationId1 - The ID of the first translation (e.g. "web").
     * @param translationId2 - The ID of the second translation (e.g. "kjv").
     * @returns A ComparisonResult object containing alignment and similarity stats.
     * @throws Error if the request fails.
     * POST /api/analytics/compare
     */
    async compare(
        reference: string,
        translationId1: string,
        translationId2: string): Promise<ComparisonResult> {
        const res = await fetch(
            `${this.baseUrl}/analytics/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference, translationId1, translationId2 }),
        });
        if (!res.ok) throw new Error(
            `POST ${this.baseUrl}/analytics/compare returned ${res.status}`);
        
        const raw = await res.json() as RawComparisonResult;
        return mapComparisonResult(raw);
    }
```

---

## Vaihe 2: `WordCloud` -komponentti

Luo uusi tiedosto `frontend/src/components/WordCloud.tsx`. Tämä komponentti piirtää visuaalisen sanapilven, jossa suosituimmat sanat näkyvät suuremmalla fontilla.

```typescript
import type { WordFrequency } from '../types/bible';

interface WordCloudProps {
  /** Array of words and their occurrence counts. */
  words: WordFrequency[];
}

const PALETTE = [
  'var(--text)',       // Standard readable text color
  'var(--accent)',     // Warm brand color token
  '#6b7280',           // Medium gray
  '#92400e',           // Rich amber/brown
  '#374151',           // Deep charcoal
  '#b45309',           // Vibrant orange/amber
];

/**
 * WordCloud renders a lightweight tag-cloud using proportional font sizing
 * based on word frequencies.
 */
export function WordCloud({ words }: WordCloudProps) {
  if (words.length === 0) {
    return null;
  }

  const max = words[0].value;
  const min = words[words.length - 1].value;
  const range = max - min || 1;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 justify-center items-center p-4 leading-tight select-none">
      {words.map((w, i) => {
        const ratio = (w.value - min) / range;
        const size = Math.round(13 + ratio * 36);
        const weight = ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400;
        const color = PALETTE[i % PALETTE.length];
        const opacity = 0.55 + ratio * 0.45;

        return (
          <span
            key={w.name}
            title={`${w.name}: ${w.value}`}
            style={{ fontSize: `${size}px`, fontWeight: weight, color, opacity }}
            className="transition-opacity hover:opacity-100 cursor-default"
          >
            {w.name}
          </span>
        );
      })}
    </div>
  );
}
```

---

## Vaihe 3: `AnalyticsView` -komponentti

Luo uusi tiedosto `frontend/src/components/AnalyticsView.tsx`. Se tarjoaa käyttöliittymän tekstianalyysin ajamiseen, näyttää keskeiset tilastot ja visualisoi sanatiheyden joko Rechart-pylväsdiagrammilla tai sanapilvellä. Se sisältää myös AI Tone Analysis -paikkamerkkilaatikon ("Coming soon") visuaalisen rakenteen hahmottelemiseksi.

```typescript
import { useState } from 'react';
import { BarChart3, Hash, Activity, MessageSquare, Loader2, Sparkles, Cloud } from 'lucide-react';
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

interface AnalyticsViewProps {
  /** The translation ID selected globally (e.g. "kr92"). */
  defaultTranslation: string;
}

export function AnalyticsView({ defaultTranslation }: AnalyticsViewProps) {
  const [reference, setReference] = useState('John 3');
  const [stats, setStats] = useState<TextStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'cloud'>('bar');

  const runAnalysis = async () => {
    if (!reference.trim() || !defaultTranslation) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.analyze(reference.trim(), defaultTranslation);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to run text analysis');
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
                        tick={{ fontSize: 12, fill: 'var(--muted)' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--surface-2)' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                        }}
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
```

---

## Vaihe 4: `CompareView` -komponentti

Luo uusi tiedosto `frontend/src/components/CompareView.tsx`. Se tarjoaa rinnakkaisen vertailutyökalun kahden valitun käännöksen samankaltaisuusarviointia varten ja näyttää aligned-tulokset värikoodatun samankaltaisuusindikaattorin kera.

```typescript
import { useState, useMemo } from 'react';
import { GitCompareArrows, Loader2, Info } from 'lucide-react';
import { apiService } from '../services/api';
import type { InstalledTranslation, ComparisonResult } from '../types/bible';

interface CompareViewProps {
  /** All translations currently installed in the workspace. */
  installedTranslations: InstalledTranslation[];
}

function similarityBarHue(ratio01: number): string {
  const t = Math.max(0, Math.min(1, ratio01));
  return `hsl(${Math.round(t * 120)}, 55%, 42%)`;
}

export function CompareView({ installedTranslations }: CompareViewProps) {
  const [reference, setReference] = useState('John 3:16');
  const [leftTr, setLeftTr] = useState('');
  const [rightTr, setRightTr] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter right translation options to avoid comparing a translation with itself
  const rightOptions = useMemo(() => {
    return installedTranslations.filter((t) => t.id !== leftTr);
  }, [installedTranslations, leftTr]);

  const runCompare = async () => {
    if (!reference.trim() || !leftTr || !rightTr) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.compare(reference.trim(), leftTr, rightTr);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
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
          className="inline-flex items-center gap-2 rounded-full bg-[var(--text)] text-[var(--bg)] px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40"
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
                        <tr key={index} className="align-top border-b border-[var(--border-soft)] hover:bg-[var(--surface-2)]/40 transition-colors">
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
```

---

## Vaihe 5: Päänäkymän ja navigaation integrointi (`App.tsx`)

Muokataan tiedostoa [App.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/App.tsx). Tehdään päänäkymästä välilehtipohjainen, haetaan asennettujen käännösten lista ja tuodaan uudet `AnalyticsView`- ja `CompareView`-näkymät käyttöön.

Aseta seuraavat muutokset [App.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/App.tsx) -tiedostoon:

1. **Tuonnit tiedoston alussa:**
   Korvaa import-lauseet (rivit 1–8) seuraavilla:
   ```typescript
   import { useState, useEffect } from 'react';
   import { TranslationSelector } from './components/TranslationSelector';
   import { TranslationManager } from './components/TranslationManager';
   import { VerseReader } from './components/VerseReader';
   import { VerseSearch } from './components/VerseSearch';
   import { SearchHistory } from './components/SearchHistory';
   import { AnalyticsView } from './components/AnalyticsView';
   import { CompareView } from './components/CompareView';
   import { apiService } from './services/api';
   import { Terminal, Settings, BookOpen, Activity, GitCompare } from 'lucide-react';
   import type { InstalledTranslation } from './types/bible';
   ```

2. **Kunto ja tilamuuttujat (State vars):**
   Lisää `App`-komponentin aloituksen jälkeen (noin riville 11) tilamuuttujat välilehtien hallintaa ja käännöslistaa varten:
   ```typescript
   function App() {
     const [selectedTranslation, setSelectedTranslation] = useState<string>('');
     const [historyTrigger, setHistoryTrigger] = useState(false);
     const [translationTrigger, setTranslationTrigger] = useState(false);
     const [showManager, setShowManager] = useState(false);
     const [viewMode, setViewMode] = useState<'reader' | 'analytics' | 'compare'>('reader');
     const [installedTranslations, setInstalledTranslations] = useState<InstalledTranslation[]>([]);

     // Load installed translations list for CompareView select options
     useEffect(() => {
       const loadTranslations = async () => {
         try {
           const list = await apiService.getTranslations();
           setInstalledTranslations(list);
         } catch (err) {
           console.error('Failed to load translations list:', err);
         }
       };
       loadTranslations();
     }, [translationTrigger]);
   ```

3. **Välilehtipalkin renderöinti:**
   Lisää `<main>`-elementin alkuun (heti päänäkymän `<main className="max-w-5xl mx-auto px-6 py-12">` jälkeen, ennen `showManager` tarkistusta) seuraava lasiefektillä (glassmorphism) tyylitelty välilehtipainikepalkki:
   ```tsx
   {/* View Selection Tabs */}
   <div className="flex gap-1.5 p-1 rounded-xl w-fit mb-8 bg-[var(--surface-2)] border border-[var(--border-soft)]">
     <button
       type="button"
       onClick={() => setViewMode('reader')}
       className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
         viewMode === 'reader'
           ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
           : 'text-[var(--muted)] hover:text-[var(--text)]'
       }`}
     >
       <BookOpen size={16} />
       <span>Lukukone</span>
     </button>
     
     <button
       type="button"
       onClick={() => setViewMode('analytics')}
       className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
         viewMode === 'analytics'
           ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
           : 'text-[var(--muted)] hover:text-[var(--text)]'
       }`}
     >
       <Activity size={16} />
       <span>Tekstianalyysi</span>
     </button>

     <button
       type="button"
       onClick={() => setViewMode('compare')}
       className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
         viewMode === 'compare'
           ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
           : 'text-[var(--muted)] hover:text-[var(--text)]'
       }`}
     >
       <GitCompare size={16} />
       <span>Käännösvertailu</span>
     </button>
   </div>
   ```

4. **Näkymäasettelun mukauttaminen:**
   Korvaa `<main>` sisällä oleva `<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">` ja sen sisäinen asettelu ehdollisella renderöinnillä, joka näyttää Lukukoneelle normaalin kaksipalstaisen näkymän ja analytiikalle sekä vertailulle koko leveyden saavat näkymät:
   ```tsx
   {viewMode === 'reader' && (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
       {/* Left: Reader & Search */}
       <div className="lg:col-span-2 space-y-8">
         {selectedTranslation ? (
           <>
             <VerseReader translation={selectedTranslation} />
             <div onClick={handleSearchFinished}>
               <VerseSearch translation={selectedTranslation} />
             </div>
           </>
         ) : (
           <div className="py-24 text-center space-y-4" style={{ color: 'var(--muted)' }}>
             <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
               style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}>
               <BookOpen size={28} />
             </div>
             <p className="font-medium" style={{ color: 'var(--text)' }}>Ei käännöstä valittuna</p>
             <p className="text-sm">Avaa <strong>Translations</strong> ylävalikosta ja asenna käännös aloittaaksesi.</p>
             <button
               onClick={() => setShowManager(true)}
               className="mt-4 px-5 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
               style={{ background: 'var(--accent)', color: '#fff' }}
             >
               Asenna käännös
             </button>
           </div>
         )}
       </div>

       {/* Right: Sidebar */}
       <div className="space-y-8">
         <SearchHistory triggerRefresh={historyTrigger} />

         <div className="rounded-2xl p-6 text-left" style={{
           background: 'var(--surface-2)',
           border: '1px solid var(--border-soft)',
         }}>
           <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
             Pikaohje
           </h3>
           <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
             Valitse käännös, ja hae lukemista varten esimerkiksi viitteellä{' '}
             <code>Joh. 3:16</code> tai etsi hakupalkista sanalla <code>valo</code>.
           </p>
         </div>
       </div>
     </div>
   )}

   {viewMode === 'analytics' && (
     <div className="max-w-5xl mx-auto">
       <AnalyticsView defaultTranslation={selectedTranslation || (installedTranslations[0]?.id || '')} />
     </div>
   )}

   {viewMode === 'compare' && (
     <div className="max-w-5xl mx-auto">
       <CompareView installedTranslations={installedTranslations} />
     </div>
   )}
   ```
