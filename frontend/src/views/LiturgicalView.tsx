import { useState, useTransition, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Flame,
  BookOpen,
  Music,
  ExternalLink,
  Clock,
  Sparkles,
  Info,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Layers,
  LayoutGrid,
  Send,
  Check,
  Copy,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getLiturgicalDay } from '../api/liturgical';
import type { LiturgicalDay } from '../types/liturgical';

export interface LiturgicalViewProps {
  onSelectVerse: (reference: string) => void;
  initialDate?: string;
  onExportToNotebook?: (day: LiturgicalDay) => void;
}

type OfficeType = 'morning' | 'noon' | 'evening' | 'eve' | 'completorium' | 'apocrypha';
type DisplayMode = 'drawers' | 'tabs';
type ActiveTab = 'readings' | 'psalms' | 'offices' | 'prayers' | 'hymns';

function getTodayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToISO(iso: string, days: number): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Removes HTML angle brackets for clean clipboard copying.
 * Using single-character sanitization avoids incomplete multi-character stripping.
 */
function cleanTextForCopy(rawText: string): string {
  return rawText.replace(/[<>]/g, '').trim();
}

/**
 * LiturgicalPoem formats poetic liturgical text (psalms, canticles)
 * with authentic cadence underlines (<u>...</u>) and cadence pause asterisks (*).
 * Supports toggling cadence marks on/off matching kirkkovuosikalenteri.fi.
 */
export function LiturgicalPoem({
  text,
  showCadence = true,
  cadenceLabel,
  className = '',
}: {
  text: string;
  showCadence?: boolean;
  cadenceLabel?: string;
  className?: string;
}) {
  const lines = text.split('\n');

  return (
    <div className={`space-y-1 text-sm sm:text-base leading-relaxed text-[var(--text)] font-serif ${className}`}>
      {lines.map((line, idx) => {
        const hasCadence = line.includes('*');
        const isAnsweringHemistich = idx > 0 && lines[idx - 1].includes('*') && !hasCadence;

        // If cadence marks are hidden, strip <u> tags and asterisk
        if (!showCadence) {
          const cleanLine = line.replace(/<\/?u>/gi, '').replace(/\s*\*\s*/g, ' ').trimEnd();
          return (
            <div
              key={idx}
              className={`transition-colors ${
                isAnsweringHemistich
                  ? 'pl-4 sm:pl-7 text-[var(--text)]/90 italic mb-2'
                  : ''
              }`}
            >
              {cleanLine}
            </div>
          );
        }

        // When showCadence is active: parse asterisks and <u> tags
        const parts = line.split('*');

        return (
          <div
            key={idx}
            className={`transition-colors ${
              isAnsweringHemistich
                ? 'pl-4 sm:pl-7 text-[var(--text)]/90 italic mb-2'
                : hasCadence
                ? 'font-medium text-[var(--text)]'
                : 'text-[var(--text)]'
            }`}
          >
            {parts.map((part, pIdx) => {
              // Parse <u> tags inside each part
              const uRegex = /<u>(.*?)<\/u>/g;
              const elements: (string | React.ReactNode)[] = [];
              let lastIndex = 0;
              let match: RegExpExecArray | null;

              while ((match = uRegex.exec(part)) !== null) {
                if (match.index > lastIndex) {
                  elements.push(part.substring(lastIndex, match.index));
                }
                elements.push(
                  <u
                    key={`u-${match.index}`}
                    className="underline decoration-current underline-offset-3 font-semibold decoration-2"
                  >
                    {match[1]}
                  </u>
                );
                lastIndex = uRegex.lastIndex;
              }
              if (lastIndex < part.length) {
                elements.push(part.substring(lastIndex));
              }

              return (
                <span key={pIdx}>
                  {elements.length > 0 ? elements : part}
                  {pIdx < parts.length - 1 && (
                    <span
                      className="inline-flex items-center justify-center mx-1.5 px-1.5 py-0.5 rounded text-xs font-serif font-bold text-amber-700 dark:text-amber-300 bg-amber-400/20 border border-amber-400/40 select-none align-middle shadow-2xs hover:scale-125 transition-transform cursor-help"
                      title={cadenceLabel || 'Kadenssimerkki (puolisäe / tauko)'}
                      aria-label="kadenssimerkki"
                    >
                      *
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function LiturgicalView({ onSelectVerse, initialDate, onExportToNotebook }: LiturgicalViewProps) {
  const { strings } = useLanguage();
  const todayISO = getTodayISODate();

  const [date, setDate] = useState<string>(() => initialDate || todayISO);
  const [dayData, setDayData] = useState<LiturgicalDay | null>(null);
  const [activeOffice, setActiveOffice] = useState<OfficeType>('morning');
  const [activeVolume, setActiveVolume] = useState<'current' | 'I' | 'II' | 'III'>('current');
  const [psalmType, setPsalmType] = useState<'day' | 'week'>('day');
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('clible_liturgical_view_mode');
      if (saved === 'tabs' || saved === 'drawers') return saved;
    }
    return 'drawers';
  });

  const handleSetDisplayMode = (mode: DisplayMode) => {
    setDisplayMode(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('clible_liturgical_view_mode', mode);
    }
  };
  const [activeTab, setActiveTab] = useState<ActiveTab>('readings');
  const [showImages, setShowImages] = useState(false);
  const [showCadence, setShowCadence] = useState(true);
  const [copiedPsalm, setCopiedPsalm] = useState(false);
  const [copiedOfficeIndex, setCopiedOfficeIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);

  // Drawer expansion state (all open by default for full content accessibility)
  const [openDrawers, setOpenDrawers] = useState<Record<string, boolean>>({
    readings: true,
    psalms: true,
    offices: true,
    prayers: true,
    hymns: true,
  });

  // Initial load once on mount without cascading useEffect
  if (!hasLoadedInitially) {
    setHasLoadedInitially(true);
    void getLiturgicalDay(date).then((data) => {
      setDayData(data);
      if (!data) setError(strings.liturgicalNotFound);
    });
  }

  const loadDate = (nextDate: string) => {
    setDate(nextDate);
    setError(null);
    startTransition(async () => {
      const data = await getLiturgicalDay(nextDate);
      setDayData(data);
      if (!data) {
        setError(strings.liturgicalNotFound);
      }
    });
  };

  const handlePrevDay = () => loadDate(addDaysToISO(date, -1));
  const handleNextDay = () => loadDate(addDaysToISO(date, 1));
  const handleToday = () => loadDate(todayISO);

  const toggleDrawer = (id: string) => {
    setOpenDrawers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAllDrawers = () => {
    setOpenDrawers({
      readings: true,
      psalms: true,
      offices: true,
      prayers: true,
      hymns: true,
    });
  };

  const collapseAllDrawers = () => {
    setOpenDrawers({
      readings: false,
      psalms: false,
      offices: false,
      prayers: false,
      hymns: false,
    });
  };

  const handleCopyPsalmText = async (text: string) => {
    const clean = cleanTextForCopy(text);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clean);
      }
      setCopiedPsalm(true);
      setTimeout(() => setCopiedPsalm(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyOfficeText = async (text: string, idx: number) => {
    const clean = cleanTextForCopy(text);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clean);
      }
      setCopiedOfficeIndex(idx);
      setTimeout(() => setCopiedOfficeIndex(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExport = () => {
    if (dayData && onExportToNotebook) {
      onExportToNotebook(dayData);
    }
  };

  // Keyboard shortcut: Alt+N exports today's liturgical texts to notebook
  useEffect(() => {
    if (!onExportToNotebook || !dayData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onExportToNotebook(dayData);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dayData, onExportToNotebook]);

  const colorBadgeStyles: Record<string, string> = {
    vihreä: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    valkoinen: 'bg-amber-400/20 text-amber-800 dark:text-amber-300 border-amber-400/40',
    punainen: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    violetti: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
    musta: 'bg-neutral-500/20 text-neutral-800 dark:text-neutral-300 border-neutral-500/40',
  };

  const colorKey = dayData?.color?.toLowerCase() || '';
  const activeColorStyle = colorBadgeStyles[colorKey] || 'bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]';

  // Determine current liturgical volume / cycle
  const currentVolumeKey = dayData?.current_volume?.replace('volume-', '') || 'I';
  const displayVolume = activeVolume === 'current' ? (currentVolumeKey === '1' ? 'I' : currentVolumeKey === '2' ? 'II' : currentVolumeKey === '3' ? 'III' : 'I') : activeVolume;
  const cycleReadings = dayData?.years?.[displayVolume];

  const offices = dayData?.prayer_offices;
  const officeItems = offices ? offices[activeOffice] || [] : [];

  // Active psalm selection (day vs week)
  const activePsalm = psalmType === 'week' && dayData?.week_psalm ? dayData.week_psalm : dayData?.day_psalm;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── Top Bar: Date Navigator & View Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors btn-tactile cursor-pointer"
            aria-label={strings.liturgicalPrevDay}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors btn-tactile cursor-pointer ${
              date === todayISO
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface)]/80 border border-[var(--border-soft)]'
            }`}
          >
            {strings.liturgicalToday}
          </button>
          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors btn-tactile cursor-pointer"
            aria-label={strings.liturgicalNextDay}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Datepicker */}
          <div className="relative flex items-center">
            <Calendar size={16} className="absolute left-3 text-[var(--muted)] pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) loadDate(e.target.value);
              }}
              className="pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
            />
          </div>

          {/* Mode Switcher: Drawers vs Tabs */}
          <div className="flex items-center p-0.5 rounded-xl bg-[var(--surface)] border border-[var(--border-soft)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleSetDisplayMode('drawers')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                displayMode === 'drawers'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] font-bold shadow-2xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              title={strings.liturgicalViewModeDrawers}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">{strings.liturgicalViewModeDrawers}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetDisplayMode('tabs')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                displayMode === 'tabs'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] font-bold shadow-2xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              title={strings.liturgicalViewModeTabs}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">{strings.liturgicalViewModeTabs}</span>
            </button>
          </div>

          {/* Bulk Drawer Controls in Drawer Mode */}
          {displayMode === 'drawers' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={expandAllDrawers}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                title={strings.liturgicalExpandAll}
                aria-label={strings.liturgicalExpandAll}
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                onClick={collapseAllDrawers}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                title={strings.liturgicalCollapseAll}
                aria-label={strings.liturgicalCollapseAll}
              >
                <Minimize2 size={15} />
              </button>
            </div>
          )}

          {isPending && (
            <span className="text-xs text-[var(--muted)] animate-pulse">
              {strings.liturgicalLoading}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm flex items-center gap-3">
          <Info size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {dayData && (
        <>
          {/* ── Compact Celebration Header Card ── */}
          <div className="relative overflow-hidden p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${activeColorStyle}`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {strings.liturgicalColor}: {dayData.color || '–'}
                </span>

                {dayData.candles && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border-soft)]">
                    <Flame size={13} className="text-amber-500" />
                    {dayData.candles}
                  </span>
                )}

                {/* Optional Altar Image Drawer Toggle */}
                {(dayData.image || dayData.altar_image) && (
                  <button
                    type="button"
                    onClick={() => setShowImages(!showImages)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border-soft)] transition-colors cursor-pointer"
                  >
                    <ImageIcon size={13} />
                    <span>{showImages ? strings.liturgicalHideImages : strings.liturgicalShowImages}</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showImages ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onExportToNotebook && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] border border-[var(--border-soft)] transition-colors cursor-pointer group shadow-2xs"
                    title={strings.liturgicalExportToNotebookTooltip}
                    aria-label={strings.liturgicalExportToNotebook}
                  >
                    <FileText size={13} className="text-[var(--accent)] group-hover:text-current" />
                    <span>{strings.liturgicalExportToNotebook}</span>
                    <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-[var(--surface)] text-[var(--muted)] group-hover:bg-white/20 group-hover:text-white border border-[var(--border-soft)] font-mono">
                      Alt+N
                    </span>
                  </button>
                )}

                {dayData.period && (
                  <span className="text-xs text-[var(--muted)] font-medium">
                    {dayData.period}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] font-serif">
                {dayData.title}
              </h1>
              {dayData.subtitle && (
                <p className="text-base sm:text-lg text-[var(--muted)] font-medium">
                  {dayData.subtitle}
                </p>
              )}
            </div>

            {/* Collapsible Image Drawer */}
            {showImages && (dayData.image || dayData.altar_image) && (
              <div className="pt-3 border-t border-[var(--border-soft)] flex flex-wrap gap-4 items-center animate-fade-in">
                {dayData.image && (
                  <div className="rounded-2xl overflow-hidden border border-[var(--border-soft)] max-w-xs shadow-xs">
                    <img
                      src={dayData.image}
                      alt={dayData.title}
                      className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
                {dayData.altar_image && (
                  <div className="rounded-2xl overflow-hidden border border-[var(--border-soft)] max-w-xs shadow-xs">
                    <img
                      src={dayData.altar_image}
                      alt={`${dayData.title} alttari`}
                      className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Tabs Navigation Bar (Visible in Tabs Mode) ── */}
          {displayMode === 'tabs' && (
            <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('readings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all btn-tactile cursor-pointer ${
                  activeTab === 'readings'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border-soft)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <BookOpen size={15} className="text-blue-500" />
                <span>{strings.liturgicalReadings}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('psalms')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all btn-tactile cursor-pointer ${
                  activeTab === 'psalms'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border-soft)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Sun size={15} className="text-amber-500" />
                <span>{strings.liturgicalPsalm}</span>
                {dayData.day_psalm && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                    *
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('offices')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all btn-tactile cursor-pointer ${
                  activeTab === 'offices'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border-soft)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Clock size={15} className="text-purple-500" />
                <span>{strings.liturgicalOffices}</span>
              </button>

              {dayData.prayers && dayData.prayers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('prayers')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all btn-tactile cursor-pointer ${
                    activeTab === 'prayers'
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border-soft)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Sparkles size={15} className="text-teal-500" />
                  <span>{strings.liturgicalPrayers}</span>
                </button>
              )}

              {dayData.hymns && dayData.hymns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('hymns')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all btn-tactile cursor-pointer ${
                    activeTab === 'hymns'
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border-soft)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Music size={15} className="text-indigo-500" />
                  <span>{strings.liturgicalHymns}</span>
                </button>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DRAWER / SECTION 1: Päivän lukukappaleet (Lectionary Cycles)
             ══════════════════════════════════════════════════════════════════ */}
          {(displayMode === 'drawers' || activeTab === 'readings') && dayData.years && (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden transition-all">
              {/* Drawer Header Button */}
              {displayMode === 'drawers' ? (
                <button
                  type="button"
                  onClick={() => toggleDrawer('readings')}
                  className="w-full p-4 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-2)]/60 transition-colors cursor-pointer select-none"
                  aria-expanded={openDrawers.readings}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                        {strings.liturgicalReadings}
                      </h2>
                      <span className="text-xs text-[var(--muted)]">
                        {strings.liturgicalCycle} {displayVolume}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChevronDown
                      size={18}
                      className={`text-[var(--muted)] transition-transform duration-200 ${
                        openDrawers.readings ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              ) : null}

              {/* Drawer Content */}
              {(displayMode === 'tabs' || openDrawers.readings) && (
                <div className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-6">
                  {/* Volume Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-soft)]">
                    <span className="text-xs font-semibold text-[var(--muted)]">
                      {strings.liturgicalCycle}:
                    </span>
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)] text-xs font-semibold">
                      {(['current', 'I', 'II', 'III'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setActiveVolume(v)}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            activeVolume === v
                              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-bold'
                              : 'text-[var(--muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          {v === 'current' ? `${strings.liturgicalCycle} (${currentVolumeKey})` : v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {cycleReadings && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Old Testament */}
                      <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] space-y-2">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                          {strings.liturgicalOldTestament}
                        </span>
                        {cycleReadings.old_testament && cycleReadings.old_testament.length > 0 ? (
                          cycleReadings.old_testament.map((ref) => (
                            <button
                              key={ref}
                              type="button"
                              onClick={() => onSelectVerse(ref)}
                              className="w-full text-left p-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--accent-bg)] text-[var(--text)] hover:text-[var(--accent)] font-semibold text-sm transition-colors flex items-center justify-between border border-[var(--border-soft)] cursor-pointer group"
                            >
                              <span>{ref}</span>
                              <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--muted)]">–</p>
                        )}
                      </div>

                      {/* Epistle */}
                      <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] space-y-2">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                          {strings.liturgicalEpistle}
                        </span>
                        {cycleReadings.epistle && cycleReadings.epistle.length > 0 ? (
                          cycleReadings.epistle.map((ref) => (
                            <button
                              key={ref}
                              type="button"
                              onClick={() => onSelectVerse(ref)}
                              className="w-full text-left p-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--accent-bg)] text-[var(--text)] hover:text-[var(--accent)] font-semibold text-sm transition-colors flex items-center justify-between border border-[var(--border-soft)] cursor-pointer group"
                            >
                              <span>{ref}</span>
                              <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--muted)]">–</p>
                        )}
                      </div>

                      {/* Gospel */}
                      <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] space-y-2">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                          {strings.liturgicalGospel}
                        </span>
                        {cycleReadings.gospel && cycleReadings.gospel.length > 0 ? (
                          cycleReadings.gospel.map((ref) => (
                            <button
                              key={ref}
                              type="button"
                              onClick={() => onSelectVerse(ref)}
                              className="w-full text-left p-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--accent-bg)] text-[var(--text)] hover:text-[var(--accent)] font-semibold text-sm transition-colors flex items-center justify-between border border-[var(--border-soft)] cursor-pointer group"
                            >
                              <span>{ref}</span>
                              <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--muted)]">–</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DRAWER / SECTION 2: Päivän ja viikon psalmi (Kadenssit & Kopiointi)
             ══════════════════════════════════════════════════════════════════ */}
          {(displayMode === 'drawers' || activeTab === 'psalms') && activePsalm && (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden transition-all">
              {/* Drawer Header Button */}
              {displayMode === 'drawers' ? (
                <button
                  type="button"
                  onClick={() => toggleDrawer('psalms')}
                  className="w-full p-4 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-2)]/60 transition-colors cursor-pointer select-none"
                  aria-expanded={openDrawers.psalms}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Sun size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                          {psalmType === 'week' ? strings.liturgicalWeekPsalm : strings.liturgicalPsalm}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          {activePsalm.verse}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--muted)]">
                        {strings.liturgicalCadenceMark}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChevronDown
                      size={18}
                      className={`text-[var(--muted)] transition-transform duration-200 ${
                        openDrawers.psalms ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              ) : null}

              {/* Drawer Content */}
              {(displayMode === 'tabs' || openDrawers.psalms) && (
                <div className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-soft)]">
                    {/* Toggle Day Psalm vs Week Psalm if both exist */}
                    {dayData.week_psalm ? (
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)] text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setPsalmType('day')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            psalmType === 'day'
                              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-bold'
                              : 'text-[var(--muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          {strings.liturgicalPsalm}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPsalmType('week')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            psalmType === 'week'
                              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-bold'
                              : 'text-[var(--muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          {strings.liturgicalWeekPsalm}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-[var(--muted)]">
                        {activePsalm.verse}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectVerse(activePsalm.verse)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent-bg)] text-[var(--accent)] hover:opacity-85 transition-opacity btn-tactile cursor-pointer"
                    >
                      <BookOpen size={14} />
                      <span>{strings.liturgicalOpenReader}</span>
                    </button>
                  </div>

                  {/* Psalm Stanzas with Cadence Underlines & Asterisks */}
                  <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] shadow-2xs">
                    <LiturgicalPoem
                      text={activePsalm.text}
                      showCadence={showCadence}
                      cadenceLabel={strings.liturgicalCadenceMark}
                    />
                  </div>

                  {/* ── Cadence Toggle & Copy Buttons (Matching kirkkovuosikalenteri.fi) ── */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCadence(!showCadence)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-700/60 dark:border-rose-400/60 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors btn-tactile cursor-pointer"
                    >
                      <span className="font-mono text-sm leading-none">*</span>
                      <span>{showCadence ? strings.liturgicalHideCadence : strings.liturgicalShowCadence}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyPsalmText(activePsalm.text)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-700/60 dark:border-rose-400/60 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors btn-tactile cursor-pointer"
                    >
                      {copiedPsalm ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">{strings.liturgicalCopied}</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} className="-rotate-45" />
                          <span>{strings.liturgicalCopyText}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ── Psalm Tones & Melodies Information ── */}
                  <div className="pt-2">
                    <details className="group rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 sm:p-4 text-xs">
                      <summary className="font-bold text-[var(--accent)] flex items-center justify-between cursor-pointer list-none select-none">
                        <div className="flex items-center gap-2">
                          <Music size={15} />
                          <span>{strings.liturgicalPsalmMelodies}</span>
                        </div>
                        <ChevronDown size={14} className="text-[var(--muted)] group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-3 space-y-2 text-[var(--text)]/90 leading-relaxed font-sans">
                        <p>{strings.liturgicalPsalmMelodiesInfo}</p>
                        <p className="text-[var(--muted)]">
                          Kirkkovuosikalenterissa ei ole valmiita ääniraitoja, sillä seurakunnassa kanttori tai esilaulaja valitsee tilanteeseen sopivan sävelmän kymmenestä yksinkertaisesta psalmisävelmästä (1–10) tai kirkkosävellajien gregoriaanisista sävelmistä (I–VIII).
                        </p>
                        <div className="pt-1 flex flex-wrap gap-3">
                          <a
                            href="http://kirkkokasikirja.fi/jp/psalmisaavelmat.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                          >
                            <span>Psalmisävelmät Kirkkokäsikirjassa</span>
                            <ExternalLink size={12} />
                          </a>
                          <a
                            href="https://evl.fi/plus/seurakuntaelama/jumalanpalvelus-ja-hengellisyys/jumalanpalveluselama/kirkkovuosi/kirkkovuosikalenterin-hakemistot-ja-liitteet/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:underline"
                          >
                            <span>Kirkkovuosikalenterin liitteet (evl.fi)</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DRAWER / SECTION 3: Hetkipalvelukset / Rukoushetket (Daily Offices)
             ══════════════════════════════════════════════════════════════════ */}
          {(displayMode === 'drawers' || activeTab === 'offices') && (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden transition-all">
              {/* Drawer Header Button */}
              {displayMode === 'drawers' ? (
                <button
                  type="button"
                  onClick={() => toggleDrawer('offices')}
                  className="w-full p-4 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-2)]/60 transition-colors cursor-pointer select-none"
                  aria-expanded={openDrawers.offices}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                        {strings.liturgicalOffices}
                      </h2>
                      <span className="text-xs text-[var(--muted)]">
                        {dayData.period || dayData.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChevronDown
                      size={18}
                      className={`text-[var(--muted)] transition-transform duration-200 ${
                        openDrawers.offices ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              ) : null}

              {/* Drawer Content */}
              {(displayMode === 'tabs' || openDrawers.offices) && (
                <div className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-6">
                  {/* Office selection tabs */}
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] w-fit pt-2">
                    {(
                      [
                        { id: 'morning', label: strings.liturgicalMorning, count: offices?.morning?.length || 0 },
                        { id: 'noon', label: strings.liturgicalNoon, count: offices?.noon?.length || 0 },
                        { id: 'evening', label: strings.liturgicalEvening, count: offices?.evening?.length || 0 },
                        { id: 'eve', label: strings.liturgicalEve, count: offices?.eve?.length || 0 },
                        { id: 'completorium', label: strings.liturgicalCompletorium, count: offices?.completorium?.length || 0 },
                        { id: 'apocrypha', label: strings.liturgicalApocrypha, count: offices?.apocrypha?.length || 0 },
                      ] as const
                    ).map((tab) => {
                      if (tab.count === 0 && tab.id === 'eve' && activeOffice !== 'eve') return null;
                      if (tab.count === 0 && tab.id === 'apocrypha' && activeOffice !== 'apocrypha') return null;
                      const isSelected = activeOffice === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveOffice(tab.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all btn-tactile cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border-soft)]'
                              : 'text-[var(--muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--surface-2)] text-[var(--muted)] font-mono">
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Office readings list with Cadence Markers & Copy Button */}
                  {officeItems.length > 0 ? (
                    <div className="space-y-4">
                      {officeItems.map((item, idx) => (
                        <div
                          key={`${item.verse}-${idx}`}
                          className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--accent)]">
                              {item.verse}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyOfficeText(item.text, idx)}
                                className="flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                                title={strings.liturgicalCopyText}
                              >
                                {copiedOfficeIndex === idx ? (
                                  <>
                                    <Check size={13} className="text-emerald-500" />
                                    <span className="text-emerald-600 dark:text-emerald-400">{strings.liturgicalCopied}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    <span>{strings.liturgicalCopyText}</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectVerse(item.verse)}
                                className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                              >
                                <BookOpen size={13} />
                                <span>{strings.liturgicalOpenReader}</span>
                              </button>
                            </div>
                          </div>

                          <LiturgicalPoem
                            text={item.text}
                            showCadence={showCadence}
                            cadenceLabel={strings.liturgicalCadenceMark}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted)] py-4 text-center">
                      {strings.liturgicalNotFound}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DRAWER / SECTION 4: Päivän rukoukset (Collect Prayers)
             ══════════════════════════════════════════════════════════════════ */}
          {(displayMode === 'drawers' || activeTab === 'prayers') && dayData.prayers && dayData.prayers.length > 0 && (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden transition-all">
              {/* Drawer Header Button */}
              {displayMode === 'drawers' ? (
                <button
                  type="button"
                  onClick={() => toggleDrawer('prayers')}
                  className="w-full p-4 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-2)]/60 transition-colors cursor-pointer select-none"
                  aria-expanded={openDrawers.prayers}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                        {strings.liturgicalPrayers}
                      </h2>
                      <span className="text-xs text-[var(--muted)]">
                        {dayData.prayers.length} rukousta
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChevronDown
                      size={18}
                      className={`text-[var(--muted)] transition-transform duration-200 ${
                        openDrawers.prayers ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              ) : null}

              {/* Drawer Content */}
              {(displayMode === 'tabs' || openDrawers.prayers) && (
                <div className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-soft)]">
                    {dayData.prayers.map((prayer, i) => (
                      <div
                        key={i}
                        className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] text-sm leading-relaxed text-[var(--text)] font-serif whitespace-pre-line"
                      >
                        {prayer}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DRAWER / SECTION 5: Virsisuositukset (Hymns)
             ══════════════════════════════════════════════════════════════════ */}
          {(displayMode === 'drawers' || activeTab === 'hymns') && dayData.hymns && dayData.hymns.length > 0 && (
            <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden transition-all">
              {/* Drawer Header Button */}
              {displayMode === 'drawers' ? (
                <button
                  type="button"
                  onClick={() => toggleDrawer('hymns')}
                  className="w-full p-4 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-2)]/60 transition-colors cursor-pointer select-none"
                  aria-expanded={openDrawers.hymns}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Music size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                        {strings.liturgicalHymns}
                      </h2>
                      <span className="text-xs text-[var(--muted)]">
                        {dayData.hymns.reduce((acc, g) => acc + g.hymns.length, 0)} virttä
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChevronDown
                      size={18}
                      className={`text-[var(--muted)] transition-transform duration-200 ${
                        openDrawers.hymns ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              ) : null}

              {/* Drawer Content */}
              {(displayMode === 'tabs' || openDrawers.hymns) && (
                <div className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--border-soft)]">
                    {dayData.hymns.map((group, gIdx) => (
                      <div
                        key={`${group.group}-${gIdx}`}
                        className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] space-y-2.5"
                      >
                        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                          {group.group || 'Virsisuositukset'}
                        </h3>
                        <div className="space-y-1.5">
                          {group.hymns.map((hymn) => (
                            <a
                              key={`${hymn.number}-${hymn.name}`}
                              href={hymn.url || `https://virsikirja.fi/${hymn.number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--accent-bg)] text-[var(--text)] hover:text-[var(--accent)] text-xs font-semibold transition-colors border border-[var(--border-soft)] group cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] font-mono text-[11px]">
                                  {hymn.number}
                                </span>
                                <span className="truncate">{hymn.name}</span>
                              </div>
                              <ExternalLink size={12} className="shrink-0 text-[var(--muted)] group-hover:text-[var(--accent)]" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
