import React, { useState, useEffect, useRef, useActionState } from 'react';
import type { Cell, CellWidth, Notebook } from './types';
import { CellWrapper } from './cells/CellWrapper';
import { MarkdownCell } from './cells/MarkdownCell';
import { useLanguage } from '../../context/LanguageContext';
import { DragDropProvider } from '@dnd-kit/react';
import { move } from '@dnd-kit/helpers';
import {
  isGuestNotebookId,
  getSingleGuestNotebook,
  updateSingleGuestNotebook,
  saveGuestCells,
} from '../../utils/guestNotebookStorage';

/**
 * Props for the {@link NotebookEditor} component.
 */
export interface NotebookEditorProps {
  /** Unique identifier of the target notebook */
  notebookId: string;
  /** Active Bible translation identifier (defaults to 'WEB') */
  translation?: string;
  /** Optional callback triggered when clicking a Bible verse reference */
  onSelectVerse?: (ref: string) => void;
  /** Whether the notebook belongs to a guest user (if true, shows guest banner) */
  isGuest?: boolean;
}

interface TitleActionState {
  error: string | null;
}

/**
 * Helper function to recalculate cell position indices sequentially.
 */
function reorderCells(cells: Cell[]): Cell[] {
  return cells.map((cell, idx) => ({
    ...cell,
    position: idx,
  }));
}

/**
 * Generates a unique cell identifier.
 */
function generateCellId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Main interactive editor component for a single notebook.
 * Conforms strictly to React 19.2 and React Compiler paradigms:
 * - Synchronous lazy initial state derivation for guest mode (Zero-flicker).
 * - Event-driven auto-saving debounced directly from user mutations (no effect cascade / ref-flags).
 * - React 19 Action-based title editing via `useActionState` and declarative form dispatching.
 * - Declarative document metadata hoisting (<title>).
 *
 * @param props - Component properties conforming to {@link NotebookEditorProps}.
 * @returns Interactive notebook editor workspace.
 */
export function NotebookEditor({ notebookId, translation = 'WEB', onSelectVerse, isGuest = false }: NotebookEditorProps) {
  const { strings } = useLanguage();
  const isGuestMode = isGuest || isGuestNotebookId(notebookId);

  // 1. Synchronous lazy initial state derivation
  const [notebook, setNotebook] = useState<Notebook | null>(() => {
    if (isGuestMode) {
      return getSingleGuestNotebook(notebookId);
    }
    return null;
  });

  const [cells, setCells] = useState<Cell[]>(() => {
    if (isGuestMode) {
      const guestData = getSingleGuestNotebook(notebookId);
      return (guestData?.cells || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => !isGuestMode);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(() => {
    if (isGuestMode && !getSingleGuestNotebook(notebookId)) {
      return strings.guestNotebookExpiredNotice;
    }
    return null;
  });

  // Title inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Auto-save debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // 2. Adjust loading state synchronously during render if notebookId prop changes
  const [prevNotebookId, setPrevNotebookId] = useState(notebookId);
  if (prevNotebookId !== notebookId) {
    setPrevNotebookId(notebookId);
    if (!isGuestMode) {
      setIsLoading(true);
    }
  }

  // 3. Fetch remote notebook data (only executed for authenticated users)
  useEffect(() => {
    if (isGuestMode) return;

    const controller = new AbortController();

    fetch(`/api/notebooks/${notebookId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load notebook.');
        return res.json();
      })
      .then((data: Notebook) => {
        const sortedCells = (data.cells || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        setNotebook(data);
        setCells(sortedCells);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Fetch failed');
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [notebookId, isGuestMode]);

  // 3. Event-driven debounced auto-save handler (direct reaction to user interaction)
  const scheduleAutoSave = (updatedCells: Cell[]) => {
    setIsSaving(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        if (isGuestMode) {
          saveGuestCells(notebookId, updatedCells);
        } else {
          const res = await fetch(`/api/notebooks/${notebookId}/cells`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              updatedCells.map((c, index) => ({
                id: c.id,
                type: c.type,
                content: c.content,
                position: index,
              }))
            ),
          });
          if (!res.ok) throw new Error('Cell persistence error');
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Auto-save failed. Check network connection.');
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  };

  // 4. React 19 Action for title editing
  const [, saveTitleAction, isTitlePending] = useActionState<TitleActionState, FormData>(
    async (_prevState, formData) => {
      const trimmed = (formData.get('title') as string || '').trim();
      if (!trimmed || !notebook || trimmed === notebook.title) {
        setIsEditingTitle(false);
        return { error: null };
      }

      if (isGuestMode) {
        const updated = updateSingleGuestNotebook(notebookId, { title: trimmed });
        if (updated) {
          setNotebook(updated);
        }
        setIsEditingTitle(false);
        return { error: null };
      }

      try {
        const res = await fetch(`/api/notebooks/${notebookId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trimmed,
            scopeId: notebook.scopeId,
          }),
        });

        if (!res.ok) throw new Error('Title update failed');
        const updated: Notebook = await res.json();
        setNotebook(updated);
        setIsEditingTitle(false);
        return { error: null };
      } catch (err) {
        console.error(err);
        setError('Title save failed.');
        return { error: err instanceof Error ? err.message : 'Title save failed.' };
      }
    },
    { error: null }
  );

  // 5. Direct user mutation handlers
  const handleCellContentChange = (id: string, newContent: string) => {
    setCells((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, content: newContent } : c));
      scheduleAutoSave(next);
      return next;
    });
  };

  const handleCellWidthChange = (
    id: string,
    newWidth: CellWidth,
    colSpan?: number,
    customHeight?: number
  ) => {
    setCells((prev) => {
      const next = prev.map((c) =>
        c.id === id
          ? {
              ...c,
              width: newWidth,
              ...(colSpan !== undefined && { colSpan }),
              ...(customHeight !== undefined && { customHeight }),
            }
          : c
      );
      scheduleAutoSave(next);
      return next;
    });
  };

  const handleCellDelete = (id: string) => {
    setCells((prev) => {
      const next = reorderCells(prev.filter((c) => c.id !== id));
      scheduleAutoSave(next);
      return next;
    });
    
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setCells((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      const reordered = reorderCells(next);
      scheduleAutoSave(reordered);
      return reordered;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === cells.length - 1) return;
    setCells((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      const reordered = reorderCells(next);
      scheduleAutoSave(reordered);
      return reordered;
    });
  };

  const handleInsertCell = (index: number) => {
    const cellId = generateCellId();

    const newCell: Cell = {
      id: cellId,
      notebookId,
      type: 'markdown',
      content: '',
      position: index,
      resultJson: null,
    };

    setCells((prev) => {
      const next = [...prev];
      next.splice(index, 0, newCell);
      const reordered = reorderCells(next);
      scheduleAutoSave(reordered);
      return reordered;
    });

    return cellId;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-neutral-400">
        <svg className="animate-spin h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="font-mono text-sm tracking-wide">{strings.loadingNotebook}</span>
      </div>
    );
  }

  if (error && cells.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 p-6 rounded-2xl text-center my-6 max-w-lg mx-auto shadow-xs">
        <h3 className="font-bold text-base mb-1.5">{strings.errorHeading}</h3>
        <p className="text-xs text-red-600/90 dark:text-red-300/80 mb-4 leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-2)]/80 text-[var(--text)] rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs"
        >
          {strings.retryButtonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Declarative document metadata hoisting */}
      <title>{notebook?.title ? `${notebook.title} | Clible` : strings.notebookTitle}</title>

      {/* Header section */}
      <div className="border-b border-[var(--border-soft)] pb-5 flex items-center justify-between">
        <div className="flex-1 mr-4">
          {isEditingTitle ? (
            <form action={saveTitleAction} className="flex items-center gap-2 w-full">
              <input
                type="text"
                name="title"
                defaultValue={notebook?.title || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={(e) => {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }}
                className="text-2xl font-bold bg-[var(--surface-2)] border border-[var(--border-soft)] text-[var(--text)] rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                autoFocus
                disabled={isTitlePending}
              />
            </form>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold text-[var(--text)] tracking-tight cursor-pointer hover:text-[var(--text)]/85 transition-colors"
                title={strings.markdownEditTitle}
              >
                {notebook?.title || strings.unnamedNotebook}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-amber-500 transition-all cursor-pointer"
                title={strings.editTitleLabel}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSaving || isTitlePending ? (
            <span className="text-[10px] font-mono text-amber-500 animate-pulse bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">
              {strings.savingLabel}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-2)] px-2 py-1 rounded border border-[var(--border-soft)]">
              {strings.savedLabel}
            </span>
          )}
        </div>
      </div>

      {/* Empty state notice */}
      {cells.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface-2)]/40 border border-dashed border-[var(--border-soft)] rounded-xl space-y-4">
          <p className="text-[var(--muted)] text-sm">{strings.emptyNotebookText}</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => handleInsertCell(0)}
              className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border-soft)] hover:border-amber-500/30 text-amber-600 dark:text-amber-500 hover:text-amber-500 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
            >
              {strings.addMarkdownCellLabel}
            </button>
          </div>
        </div>
      )}

      {/* Cell list wrapped inside DragDropProvider context and 12-column CSS Grid */}
      <DragDropProvider
        onDragEnd={(event) => {
          setCells((prev) => {
            const next = reorderCells(move(prev, event));
            scheduleAutoSave(next);
            return next;
          });
        }}
      >
        <div className="grid grid-cols-12 gap-4 items-start">
          {cells.map((cell, index) => (
            <React.Fragment key={cell.id}>
              {/* Floating divider insertion handle between cells */}
              <div className="col-span-12 h-2 relative group/divider flex items-center justify-center">
                <div className="absolute inset-x-0 h-px bg-[var(--border-soft)]/55 opacity-0 group-hover/divider:opacity-100 transition-opacity duration-200" />
                <div className="absolute opacity-0 group-hover/divider:opacity-100 transition-all duration-200 flex gap-2 scale-90 group-hover/divider:scale-100 bg-[var(--surface)] px-2.5 py-1 rounded-full border border-[var(--border-soft)] shadow-lg z-20">
                  <button
                    type="button"
                    onClick={() => handleInsertCell(index)}
                    className="text-[10px] font-bold text-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-500 px-2.5 py-1 rounded hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center gap-1"
                    title={strings.addMarkdownCellLabel}
                  >
                    <span>{strings.addMarkdownCellLabel}</span>
                  </button>
                </div>
              </div>

              {/* CellWrapper delegates sortable hooks internally */}
              <CellWrapper
                cell={cell}
                index={index}
                totalCells={cells.length}
                onDelete={() => handleCellDelete(cell.id)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onChangeWidth={(newWidth, colSpan, customHeight) =>
                  handleCellWidthChange(cell.id, newWidth, colSpan, customHeight)
                }
              >
                <MarkdownCell
                  cell={cell}
                  onChange={(content) => handleCellContentChange(cell.id, content)}
                  onSelectVerse={onSelectVerse}
                  translation={translation}
                />
              </CellWrapper>
            </React.Fragment>
          ))}

          {/* Append button at the bottom of notebook */}
          {cells.length > 0 && (
            <div className="col-span-12 h-6 relative group/divider flex items-center justify-center mt-6">
              <div className="absolute inset-x-0 h-px bg-[var(--border-soft)]/55" />
              <div className="absolute flex gap-2 bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--border-soft)] shadow-md">
                <button
                  type="button"
                  onClick={() => handleInsertCell(cells.length)}
                  className="text-[10px] font-bold text-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-500 px-2 py-0.5 transition-colors cursor-pointer"
                >
                  {strings.appendMarkdownCellLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </DragDropProvider>
    </div>
  );
}