import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Cell, CellType, Notebook } from './types';
import { CellWrapper } from './CellWrapper';
import { MarkdownCell } from './MarkdownCell';
import { CodeCell } from './CodeCell';
import { useLanguage } from '../../context/LanguageContext';

interface NotebookEditorProps {
  notebookId: string;
  translation?: string;
  onSelectVerse?: (ref: string) => void;
}

export const NotebookEditor: React.FC<NotebookEditorProps> = ({ notebookId, translation = 'WEB', onSelectVerse }) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Otsikon muokkaustila
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Käytetään viitettä estämään tallennuksen ajaminen alkulatauksen aikana
  const initialLoadDone = useRef(false);

  // 1. Ladataan notebook
  useEffect(() => {
    const fetchNotebook = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/notebooks/${notebookId}`);
        if (!res.ok) throw new Error('Notebookia ei saatu ladattua.');
        const data: Notebook = await res.json();
        
        // Järjestetään solut valmiiksi position mukaan
        const sortedCells = (data.cells || []).sort((a, b) => a.position - b.position);
        setNotebook(data);
        setCells(sortedCells);
        setTitleInput(data.title || '');
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Haku epäonnistui');
      } finally {
        setIsLoading(false);
        // Merkitään alkulataus suoritetuksi pienen viiveen jälkeen
        setTimeout(() => {
          initialLoadDone.current = true;
        }, 100);
      }
    };

    fetchNotebook();
  }, [notebookId]);

  // 2. Tallenna otsikon muutos
  const handleTitleSave = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed || !notebook || trimmed === notebook.title) {
      setIsEditingTitle(false);
      if (notebook) {
        setTitleInput(notebook.title);
      }
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          scopeId: notebook.scopeId,
        }),
      });

      if (!res.ok) throw new Error('Otsikon tallennus epäonnistui');
      const updated: Notebook = await res.json();
      setNotebook(updated);
      setTitleInput(updated.title);
      setIsEditingTitle(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Otsikon tallennus epäonnistui.');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Tallenna solujen nykyinen tila backendille
  const saveCells = useCallback(async (currentCells: Cell[]) => {
    setIsSaving(true);
    try {
      // Lähetetään solujen sisältö ja uudet positiot
      const res = await fetch(`/api/notebooks/${notebookId}/cells`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          currentCells.map((c, index) => ({
            id: c.id,
            type: c.type,
            content: c.content,
            position: index, // Varmistetaan uusi indeksi
          }))
        ),
      });

      if (!res.ok) throw new Error('Virhe solujen tallentamisessa');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Automaattinen tallennus epäonnistui. Tarkista verkko.');
    } finally {
      setIsSaving(false);
    }
  }, [notebookId]);

  // 3. Debounce-efekti tallennukselle
  useEffect(() => {
    if (!initialLoadDone.current) return;

    const timer = setTimeout(() => {
      saveCells(cells);
    }, 1500); // 1.5 sekunnin debounce

    return () => clearTimeout(timer);
  }, [cells, saveCells]);

  // 4. Aputoiminto: solujen positioiden uudelleenlaskenta
  const reorderCells = (updated: Cell[]): Cell[] => {
    return updated.map((cell, idx) => ({
      ...cell,
      position: idx,
    }));
  };

  // 5. Muokkaustoiminnot solulle
  const handleCellContentChange = (id: string, newContent: string) => {
    setCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content: newContent } : c))
    );
  };

  const handleCellTypeChange = (id: string, newType: CellType) => {
    setCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, type: newType } : c))
    );
  };

  const handleCellDelete = (id: string) => {
    setCells((prev) => reorderCells(prev.filter((c) => c.id !== id)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setCells((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return reorderCells(next);
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === cells.length - 1) return;
    setCells((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return reorderCells(next);
    });
  };

  // 6. Uuden solun luonti tiettyyn indeksiin (indeksi = väli solujen välissä)
  const handleInsertCell = (index: number, type: CellType) => {
    const newCell: Cell = {
      id: crypto.randomUUID(), // Väliaikainen tai heti uniikki UUID
      notebookId,
      type,
      content: '',
      position: index,
      resultJson: null,
    };

    setCells((prev) => {
      const next = [...prev];
      next.splice(index, 0, newCell);
      return reorderCells(next);
    });
  };

  // 7. Koodisolun suoritus
  const handleExecuteCell = async (id: string) => {
    const targetCell = cells.find((c) => c.id === id);
    if (!targetCell) return;

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/cells/${id}/execute?translation=${translation}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Suoritus epäonnistui');
      const resultData = await res.json();
      console.log("DEBUG: Execute result data:", resultData);

      setCells((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, resultJson: resultData } : c
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tuntematon virhe suorituksessa';
      setCells((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                resultJson: {
                  type: 'error',
                  data: { message: errorMessage },
                },
              }
            : c
        )
      );
    }
  };

  const handleFreezeCell = (index: number, markdown: string, direction: 'up' | 'down' = 'down') => {
    const insertIndex = direction === 'up' ? index : index + 1;
    const newCell: Cell = {
      id: crypto.randomUUID(),
      notebookId,
      type: 'markdown',
      content: markdown,
      position: insertIndex,
      resultJson: null,
    };

    setCells((prev) => {
      const next = [...prev];
      next.splice(insertIndex, 0, newCell);
      return reorderCells(next);
    });
  };

  const { strings } = useLanguage();

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
      <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-lg text-center my-6">
        <h3 className="font-bold text-lg mb-1">{strings.errorHeading}</h3>
        <p className="text-sm text-red-300/80 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 text-white rounded text-sm transition-all"
        >
          {strings.retryButtonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Otsikkoalue */}
      <div className="border-b border-[var(--border-soft)] pb-5 flex items-center justify-between">
        <div className="flex-1 mr-4">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setIsEditingTitle(false);
                  if (notebook) setTitleInput(notebook.title);
                }
              }}
              className="text-2xl font-bold bg-[var(--surface-2)] border border-[var(--border-soft)] text-[var(--text)] rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              autoFocus
            />
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
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-amber-500 transition-all"
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
          {isSaving ? (
            <span className="text-[10px] font-mono text-amber-500 animate-pulse bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">
              Saving...
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-2)] px-2 py-1 rounded border border-[var(--border-soft)]">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Tyhjän tilan ilmoitus */}
      {cells.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface-2)]/40 border border-dashed border-[var(--border-soft)] rounded-xl space-y-4">
          <p className="text-[var(--muted)] text-sm">{strings.emptyNotebookText}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleInsertCell(0, 'markdown')}
              className="px-3.5 py-1.5 bg-[var(--surface-2)] border border-[var(--border-soft)] hover:border-amber-500/30 text-amber-600 dark:text-amber-500 hover:text-amber-500 font-bold text-xs rounded transition-all"
            >
              {strings.addMarkdownCellLabel}
            </button>
            <button
              onClick={() => handleInsertCell(0, 'code')}
              className="px-3.5 py-1.5 bg-[var(--surface-2)] border border-[var(--border-soft)] hover:border-amber-500/30 text-amber-600 dark:text-amber-500 hover:text-amber-500 font-bold text-xs rounded transition-all"
            >
              + Lisää CLI-koodisolu
            </button>
          </div>
        </div>
      )}

      {/* Solulistaus */}
      <div className="space-y-4">
        {cells.map((cell, index) => (
          <React.Fragment key={cell.id}>
            {/* Leijuva välipainike solujen välissä uuden solun lisäämiseksi */}
            <div className="h-2 relative group/divider flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-[var(--border-soft)]/55 opacity-0 group-hover/divider:opacity-100 transition-opacity duration-200" />
              <div className="absolute opacity-0 group-hover/divider:opacity-100 transition-all duration-200 flex gap-2 scale-90 group-hover/divider:scale-100 bg-[var(--surface)] px-2 py-1 rounded-full border border-[var(--border-soft)] shadow-lg z-20">
                <button
                  onClick={() => handleInsertCell(index, 'markdown')}
                  className="text-[10px] font-bold text-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-500 px-2 py-0.5 rounded hover:bg-[var(--surface-2)] transition-colors"
                >
                  + Markdown
                </button>
                <span className="w-px h-3 bg-[var(--border-soft)] self-center" />
                <button
                  onClick={() => handleInsertCell(index, 'code')}
                  className="text-[10px] font-bold text-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-500 px-2 py-0.5 rounded hover:bg-[var(--surface-2)] transition-colors"
                >
                  + Command
                </button>
              </div>
            </div>

            {/* Itse solu wrapperin sisällä */}
            <CellWrapper
              cell={cell}
              index={index}
              totalCells={cells.length}
              onDelete={() => handleCellDelete(cell.id)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onChangeType={(newType) => handleCellTypeChange(cell.id, newType)}
            >
              {cell.type === 'markdown' ? (
                <MarkdownCell
                  cell={cell}
                  onChange={(content) => handleCellContentChange(cell.id, content)}
                  onSelectVerse={onSelectVerse}
                />
              ) : (
                <CodeCell
                  cell={cell}
                  onChange={(content) => handleCellContentChange(cell.id, content)}
                  onExecute={() => handleExecuteCell(cell.id)}
                  translation={translation}
                  onFreeze={(markdown, direction) => handleFreezeCell(index, markdown, direction)}
                />
              )}
            </CellWrapper>
          </React.Fragment>
        ))}

        {/* Lisäyspainike alareunassa, kun soluja on jo olemassa */}
        {cells.length > 0 && (
          <div className="h-6 relative group/divider flex items-center justify-center mt-6">
            <div className="absolute inset-x-0 h-px bg-[var(--border-soft)]/55" />
            <div className="absolute flex gap-2 bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--border-soft)] shadow-md">
              <button
                onClick={() => handleInsertCell(cells.length, 'markdown')}
                className="text-[10px] font-bold text-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-500 px-2 py-0.5 transition-colors"
              >
                + Markdown loppuun
              </button>
              <span className="w-px h-3 bg-[var(--border-soft)] self-center" />
              <button
                onClick={() => handleInsertCell(cells.length, 'code')}
                className="text-[10px] font-bold text-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-500 px-2 py-0.5 transition-colors"
              >
                + Command loppuun
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};