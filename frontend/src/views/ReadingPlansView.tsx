import { useActionState, startTransition, type JSX } from 'react';
import {
  CalendarCheck,
  BookOpen,
  CheckCircle2,
  Circle,
  FileEdit,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { READING_PLANS } from '@/data/readingPlansData';
import type { ReadingPlanCategory } from '@/types/readingPlans';

/**
 * Props for {@link ReadingPlansView}
 */
export interface ReadingPlansViewProps {
  /** Callback invoked when the user selects a verse reference to open in a reader view */
  onSelectVerse: (reference: string) => void;
  /** Optional callback to create or open a study notebook for selects reading plan references */
  onStudyInNotebook?: (title: string, references: string[]) => void;
}

/**
 * State contract for the Reading Plans view managed via useActionState
 */
interface ReadingPlansState {
  /** Currently selected reading plan ID */
  selectedPlanId: string;
  /** Active category filter tab */
  categoryFilter: ReadingPlanCategory;
  /** Map of completed day numbers per plan ID */
  progressMap: Record<string, number[]>;
}

/**
 * Action discrimination union for updating Reading Plans state.
 */
type ReadingPlanAction =
  | { type: 'toggleDay'; planId: string; dayNum: number }
  | { type: 'resetProgress'; planId: string }
  | { type: 'selectPlan'; planId: string }
  | { type: 'setCategory'; category: ReadingPlanCategory };

/**
 * Retrieves the persisted list of completed day indices from local storage.
 *
 * @param planId Unique identifier of the reading plan.
 * @returns Array of 1-based completed day numbers.
 */
function getStoredCompletedDays(planId: string): number[] {
  try {
    const raw = localStorage.getItem(`clible_plan_progress_${planId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persists the list of completed day indices to local storage.
 *
 * @param planId Unique identifier of the reading plan.
 * @param days Array of 1-based completed day numbers to store.
 */
function setStoresCompletedDays(planId: string, days: number[]) {
  try {
    localStorage.setItem(
      `clible_plan_progress_${planId}`,
      JSON.stringify(days),
    );
  } catch (e) {
    console.error('Failed to save reading plan progress:', e);
  }
}

/**
 * Reducer function for useActionState handling plan selection and progress mutations.
 */
async function readingPlansActionReducer(
  prevState: ReadingPlansState,
  action: ReadingPlanAction,
): Promise<ReadingPlansState> {
  switch (action.type) {
    case 'selectPlan':
      return {
        ...prevState,
        selectedPlanId: action.planId,
        progressMap: {
          ...prevState.progressMap,
          [action.planId]:
            prevState.progressMap[action.planId] ??
            getStoredCompletedDays(action.planId),
        },
      };

    case 'setCategory':
      return {
        ...prevState,
        categoryFilter: action.category,
      };

    case 'toggleDay': {
      const currentDays =
        prevState.progressMap[action.planId] ??
        getStoredCompletedDays(action.planId);
      const isDone = currentDays.includes(action.dayNum);
      const updatedDays = isDone
        ? currentDays.filter((d) => d !== action.dayNum)
        : [...currentDays, action.dayNum].sort((a, b) => a - b);

      setStoresCompletedDays(action.planId, updatedDays);

      return {
        ...prevState,
        progressMap: {
          ...prevState.progressMap,
          [action.planId]: updatedDays,
        },
      };
    }

    case 'resetProgress': {
      setStoresCompletedDays(action.planId, []);
      return {
        ...prevState,
        progressMap: {
          ...prevState.progressMap,
          [action.planId]: [],
        },
      };
    }

    default:
      return prevState;
  }
}

/**
 * Reading plans view component built with useActionState.
 */
export function ReadingPlansView({
  onSelectVerse,
  onStudyInNotebook,
}: ReadingPlansViewProps): JSX.Element {
  const { strings } = useLanguage();

  // Initial state computed synchronously on mount
  const initialPlanId = READING_PLANS[0].id;
  const initialState: ReadingPlansState = {
    selectedPlanId: initialPlanId,
    categoryFilter: 'all',
    progressMap: {
      [initialPlanId]: getStoredCompletedDays(initialPlanId),
    },
  };

  // useActionState for all view mutations & async state transitions
  const [state, formAction, isPending] = useActionState(
    readingPlansActionReducer,
    initialState,
  );

  const dispatchAction = (action: ReadingPlanAction) => {
    startTransition(() => {
      formAction(action);
    });
  };

  // Pure derived state (React Compiler optimized, zero useState / useMemo)
  const activePlan =
    READING_PLANS.find((p) => p.id === state.selectedPlanId) ||
    READING_PLANS[0];

  const completedDays =
    state.progressMap[activePlan.id] ?? getStoredCompletedDays(activePlan.id);

    const filteredPlans = READING_PLANS.filter(p => {
        if (state.categoryFilter === 'all') return true;
        return p.category === state.categoryFilter;
    });

    const progressPercent = Math.round(
        (completedDays.length / (activePlan.durationDays || 1)) * 100
    );

    return (
    <div className="flex-1 flex flex-col bg-[var(--surface-0)] overflow-y-auto">
      {/* Ylätunniste */}
      <div className="px-4 sm:px-8 py-6 border-b border-[var(--border-soft)] bg-[var(--surface-1)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <CalendarCheck size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">
                {strings.tabReadingPlans}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
              {strings.readingPlansTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              {strings.readingPlansSubtitle}
            </p>
          </div>

          {/* Edistymiswidgetti */}
          <div
            className={`bg-[var(--surface-2)] border border-[var(--border-soft)] rounded-xl p-3.5 min-w-[240px] transition-opacity duration-200 ${
              isPending ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[var(--text)]">
                {strings.readingPlansProgress}
              </span>
              <span className="font-bold text-amber-500">
                {completedDays.length} / {activePlan.durationDays} ({progressPercent} %)
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--surface-0)] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
        {/* Kategoriapainikkeet */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {(
            [
              ['all', strings.readingPlansCategoryAll],
              ['gospels', strings.readingPlansCategoryGospels],
              ['devotional', strings.readingPlansCategoryDevotional],
              ['nt', strings.readingPlansCategoryNT],
            ] as const
          ).map(([cat, label]) => (
            <button
              key={cat}
              onClick={() => dispatchAction({ type: 'setCategory', category: cat })}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all whitespace-nowrap cursor-pointer ${
                state.categoryFilter === cat
                  ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-xs'
                  : 'bg-[var(--surface-1)] text-[var(--muted)] border-[var(--border-soft)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Suunnitelmavalitsimen kortit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => {
            const isSelected = plan.id === activePlan.id;
            const planTitle = (strings as unknown as Record<string, string>)[plan.titleKey] || plan.id;
            const planDesc = (strings as unknown as Record<string, string>)[plan.descKey] || '';

            return (
              <button
                key={plan.id}
                onClick={() => dispatchAction({ type: 'selectPlan', planId: plan.id })}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-[var(--surface-1)] border-[var(--border-soft)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500">
                      {plan.durationDays} {strings.readingPlansDaysTotal}
                    </span>
                    {isSelected && <Sparkles size={14} className="text-amber-500" />}
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text)]">{planTitle}</h3>
                  <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{planDesc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Valitun suunnitelman päivät */}
        <div className="bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-soft)]">
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">
                {(strings as unknown as Record<string, string>)[activePlan.titleKey] || activePlan.id}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {(strings as unknown as Record<string, string>)[activePlan.descKey]}
              </p>
            </div>
            {completedDays.length > 0 && (
              <button
                onClick={() =>
                  dispatchAction({ type: 'resetProgress', planId: activePlan.id })
                }
                className="text-xs text-[var(--muted)] hover:text-amber-500 flex items-center gap-1 cursor-pointer transition-colors"
                title={strings.readingPlansResetProgress}
              >
                <RotateCcw size={13} />
                <span>{strings.readingPlansResetProgress}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activePlan.days.map((day) => {
              const isCompleted = completedDays.includes(day.day);

              return (
                <div
                  key={day.day}
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-[var(--surface-2)]/40 border-emerald-500/30'
                      : 'bg-[var(--surface-0)] border-[var(--border-soft)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() =>
                        dispatchAction({
                          type: 'toggleDay',
                          planId: activePlan.id,
                          dayNum: day.day,
                        })
                      }
                      className="flex items-center gap-2 group cursor-pointer text-left"
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle size={18} className="text-[var(--muted)] group-hover:text-amber-500 shrink-0 transition-colors" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-[var(--text)]">
                          {strings.readingPlansDay} {day.day}
                        </span>
                        <div className="text-xs text-[var(--muted)] font-mono">
                          {day.references.join(', ')}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Toimintopainikkeet */}
                  <div className="mt-3 pt-2 border-t border-[var(--border-soft)]/60 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => onSelectVerse(day.references[0])}
                      className="text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <BookOpen size={12} />
                      <span>{strings.readingPlansOpenInReader}</span>
                    </button>
                    {onStudyInNotebook && (
                      <button
                        onClick={() =>
                          onStudyInNotebook(
                            `${strings.readingPlansDay} ${day.day}: ${day.references.join(', ')}`,
                            day.references
                          )
                        }
                        className="text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FileEdit size={12} />
                        <span>{strings.readingPlansStudyInNotebook}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
