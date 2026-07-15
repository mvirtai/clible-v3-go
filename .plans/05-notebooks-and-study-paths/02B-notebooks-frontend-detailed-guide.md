# Ohje 05B: Clible Notebooks — Yksityiskohtainen React-solueditorin toteutusohje

Tämä opas tarjoaa yksityiskohtaiset vaiheittaiset ohjeet ja koodipohjat Clible Notebooks -solueditorin (`frontend/src/components/notebook/`) toteuttamiseen.

---

## 1. Yleiskatsaus ja kansiorakenne

Luomme viisi keskeistä tiedostoa React-solueditorille:

1. `types.ts` — Jaetut TypeScript-tyypit solurakenteille ja API-vastauksille.
2. `MarkdownCell.tsx` — Markdown-sisällön editointi- ja renderöintikomponentti.
3. `CodeCell.tsx` — Clible CLI -komentojen syöttäminen, suorittaminen ja tulosten visualisointi.
4. `CellWrapper.tsx` — Solujen ympärille kiedottava kehys, joka sisältää ohjaustoiminnot (siirto, tyypin vaihto, poisto).
5. `NotebookEditor.tsx` — Pääkomponentti, joka lataa datan backendistä, hallitsee solujen tilaa ja suorittaa automaattisen tallennuksen (Debounce).

Varmista, että hakemisto `frontend/src/components/notebook/` on luotu.

Done? Check! 07/12/26 at 00:57 A.M.

---

## 2. Vaihe 1: TypeScript-tyypit (`types.ts`)

Luodaan ensin tyyppimäärittelyt, jotta kaikilla komponenteilla on yhteinen ymmärrys datarakenteesta.

### [NEW] `frontend/src/components/notebook/types.ts`

```typescript
export type CellType = 'markdown' | 'code';

export interface CellResult {
  type: string;       // esim. 'text', 'verse_list', 'graph', 'error'
  data: any;          // dynaaminen data backendistä
  output?: string;    // raaka CLI-tuloste varalta
}

export interface Cell {
  id: string;
  notebookId: string;
  type: CellType;
  content: string;
  position: number;
  resultJson?: CellResult | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notebook {
  id: string;
  title: string;
  description?: string;
  scopeId: string;
  cells: Cell[];
  createdAt: string;
  updatedAt: string;
}
```

Done? Check! 07/12/26 at 00:57 A.M.

---

## 3. Vaihe 2: MarkdownCell-komponentti

Markdown-solulla on kaksi tilaa: **Edit-tila** ja **Preview-tila**.

* Preview-tilassa kaksoisklikkaus vaihtaa solun editointitilaan.
* Edit-tilassa fokusointi menetetään (`onBlur`), tai kun painetaan `Ctrl+Enter` / `Esc`, siirrytään takaisin Preview-tilaan.

### [MODIFY] `frontend/src/components/notebook/MarkdownCell.tsx`

```tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Cell } from './types';

interface MarkdownCellProps {
  cell: Cell;
  onChange: (content: string) => void;
  isEditable?: boolean;
}

export const MarkdownCell: React.FC<MarkdownCellProps> = ({
  cell,
  onChange,
  isEditable = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Siirretään kursori tekstin loppuun
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      setIsEditing(false);
    }
  };

  if (!isEditable) {
    return (
      <div className="prose prose-invert prose-amber max-w-none p-4 font-serif text-neutral-200">
        <ReactMarkdown>{cell.content || '*No content*'}</ReactMarkdown>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="w-full relative">
        <textarea
          ref={textareaRef}
          className="w-full min-h-[120px] p-4 font-mono bg-neutral-900/90 border border-amber-500/30 text-amber-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y transition-all"
          value={cell.content}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleKeyDown}
          placeholder="Kirjoita Markdownia tästä... (Ctrl+Enter valmis, Esc peruuttaa)"
        />
        <div className="absolute right-2 bottom-2 text-xs text-neutral-500 pointer-events-none select-none">
          Ctrl+Enter valmis
        </div>
      </div>
    );
  }

  return (
    <div
      className="prose prose-invert prose-amber max-w-none p-4 font-serif text-neutral-200 cursor-pointer rounded-lg hover:bg-neutral-800/20 border border-transparent hover:border-neutral-800/50 transition-all duration-200"
      onDoubleClick={() => setIsEditing(true)}
      title="Kaksoisklikkaa muokataksesi"
    >
      {cell.content.trim() ? (
        <ReactMarkdown>{cell.content}</ReactMarkdown>
      ) : (
        <p className="text-neutral-500 italic py-2">
          Tyhjä markdown-solu. Kaksoisklikkaa lisätäksesi muistiinpanoja tai teologista pohdintaa.
        </p>
      )}
    </div>
  );
};
```

---

## 4. Vaihe 3: CodeCell-komponentti (CLI Komentotulkki)

Koodisolu simuloi Clible CLI -päätettä. Solussa on syötekenttä komentojonolle (esim. `/read John 3:16`) ja suorituspainike. Koodisolu myös näyttää suorituksen dynaamisen lopputuloksen (esim. jakeet tai virheilmoitukset).

### [MODIFY] `frontend/src/components/notebook/CodeCell.tsx`

```tsx
import React, { useState } from 'react';
import { Cell, CellResult } from './types';

interface CodeCellProps {
  cell: Cell;
  onChange: (content: string) => void;
  onExecute: () => Promise<void>;
}

export const CodeCell: React.FC<CodeCellProps> = ({
  cell,
  onChange,
  onExecute,
}) => {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      await onExecute();
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRun();
    }
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden transition-all duration-300 shadow-inner">
      {/* CLI-Syöterivi */}
      <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2 border-b border-neutral-800/80">
        <span className="font-mono text-amber-500 font-bold tracking-wider select-none">$ clible</span>
        <input
          type="text"
          className="flex-1 font-mono bg-transparent text-neutral-100 border-none outline-none focus:ring-0 text-sm placeholder-neutral-600"
          value={cell.content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/read Efesolaiskirje 2:8-9 tai /search armo"
          onKeyDown={handleKeyDown}
          disabled={isRunning}
        />
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 text-neutral-950 font-bold text-xs rounded transition-all shadow-sm"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-neutral-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              Run
            </>
          )}
        </button>
      </div>

      {/* Tuloksen renderöintialue */}
      {cell.resultJson && (
        <div className="p-4 bg-neutral-950/70 border-t border-neutral-900/50 font-sans text-neutral-200">
          <ResultRenderer result={cell.resultJson} />
        </div>
      )}
    </div>
  );
};

/* Yksinkertainen sisäinen apukomponentti tulosten renderöintiin */
const ResultRenderer: React.FC<{ result: CellResult }> = ({ result }) => {
  if (result.type === 'error') {
    return (
      <div className="text-red-400 font-mono text-sm border-l-2 border-red-500 pl-3 py-1">
        {result.data?.message || 'Virhe komennon suorituksessa.'}
      </div>
    );
  }

  if (result.type === 'verse_list') {
    const verses = Array.isArray(result.data) ? result.data : [];
    return (
      <div className="space-y-3">
        {verses.map((v: any, idx: number) => (
          <div key={idx} className="border-b border-neutral-900 pb-2 last:border-0 last:pb-0">
            <span className="text-amber-500 font-semibold text-xs mr-2 select-none">
              {v.book} {v.chapter}:{v.verse} ({v.translation})
            </span>
            <p className="text-neutral-300 leading-relaxed text-sm mt-0.5">{v.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // Oletus: raakateksti / fallback
  return (
    <pre className="font-mono text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded border border-neutral-900/30">
      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
    </pre>
  );
};
```

---

## 5. Vaihe 4: CellWrapper-komponentti (Ohjaimet ja asettelu)

`CellWrapper` paketoi jokaisen solun. Se piirtää hienovaraisen kehysviivan ja tarjoaa ylä- tai sivupalkin, jolla voi siirtää solua ylös/alas, poistaa sen, tai muuttaa tyyppiä (esim. Markdown -> Code).

### [MODIFY] `frontend/src/components/notebook/CellWrapper.tsx`

```tsx
import React from 'react';
import { Cell, CellType } from './types';

interface CellWrapperProps {
  cell: Cell;
  index: number;
  totalCells: number;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeType: (newType: CellType) => void;
  children: React.ReactNode;
}

export const CellWrapper: React.FC<CellWrapperProps> = ({
  cell,
  index,
  totalCells,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeType,
  children,
}) => {
  return (
    <div className="group relative border border-neutral-900 hover:border-amber-500/20 bg-neutral-900/20 hover:bg-neutral-900/40 rounded-xl p-4 transition-all duration-300">
      {/* Solun toimintopalkki (ilmestyy kun hiiri leijuu solun päällä) */}
      <div className="absolute -top-3 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-neutral-900 border border-neutral-800 rounded-md px-1.5 py-0.5 shadow-md z-10">
        
        {/* Solutyypin valinta */}
        <select
          value={cell.type}
          onChange={(e) => onChangeType(e.target.value as CellType)}
          className="bg-transparent text-neutral-400 text-xxs font-medium focus:outline-none border-none cursor-pointer hover:text-amber-500"
        >
          <option value="markdown" className="bg-neutral-900 text-neutral-200">Markdown</option>
          <option value="code" className="bg-neutral-900 text-neutral-200">CLI Command</option>
        </select>

        <span className="w-px h-3 bg-neutral-800" />

        {/* Siirto ylös */}
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 text-neutral-400 hover:text-amber-500 disabled:text-neutral-700 disabled:hover:text-neutral-700 transition-colors"
          title="Siirrä ylös"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>

        {/* Siirto alas */}
        <button
          onClick={onMoveDown}
          disabled={index === totalCells - 1}
          className="p-1 text-neutral-400 hover:text-amber-500 disabled:text-neutral-700 disabled:hover:text-neutral-700 transition-colors"
          title="Siirrä alas"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <span className="w-px h-3 bg-neutral-800" />

        {/* Poisto */}
        <button
          onClick={onDelete}
          className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
          title="Poista solu"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Solun varsinainen sisältö */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
};
```

---

## 6. Vaihe 5: NotebookEditor (Pääeditorikomponentti)

`NotebookEditor` hallitsee kokonaistilaa.

* Hakee notebookin backendistä `useEffect`:illä.
* Tarjoaa `useDebounce` -tyyppisen tallennuksen: Aina kun `cells` muuttuu (esim. sisältöä muokataan), asetetaan 1500ms ajastin, jonka lauettua lähetetään uusi solutilanne `/api/notebooks/{id}/cells` -PUT-kutsuun.
* Tarjoaa toiminnot solujen lisäämiseen haluttuun kohtaan, poistamiseen, siirtämiseen ja koodisolujen suorittamiseen backend-rajapinnalla.

### [MODIFY] `frontend/src/components/notebook/NotebookEditor.tsx`

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cell, CellType, Notebook } from './types';
import { CellWrapper } from './CellWrapper';
import { MarkdownCell } from './MarkdownCell';
import { CodeCell } from './CodeCell';

interface NotebookEditorProps {
  notebookId: string;
}

export const NotebookEditor: React.FC<NotebookEditorProps> = ({ notebookId }) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Haku epäonnistui');
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

  // 2. Tallenna solujen nykyinen tila backendille
  const saveCells = useCallback(async (currentCells: Cell[]) => {
    setIsSaving(true);
    try {
      // Lähetetään solujen sisältö ja uudet positiot
      const res = await fetch(`/api/notebooks/${notebookId}/cells`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cells: currentCells.map((c, index) => ({
            id: c.id,
            type: c.type,
            content: c.content,
            position: index, // Varmistetaan uusi indeksi
          })),
        }),
      });

      if (!res.ok) throw new Error('Virhe solujen tallentamisessa');
      setError(null);
    } catch (err: any) {
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
      const res = await fetch(`/api/notebooks/${notebookId}/cells/${id}/execute`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Suoritus epäonnistui');
      const resultData = await res.json();

      setCells((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, resultJson: resultData } : c
        )
      );
    } catch (err: any) {
      setCells((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                resultJson: {
                  type: 'error',
                  data: { message: err.message || 'Tuntematon virhe suorituksessa' },
                },
              }
            : c
        )
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-neutral-400">
        <svg className="animate-spin h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="font-mono text-sm tracking-wide">Ladataan muistikirjaa...</span>
      </div>
    );
  }

  if (error && cells.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-lg text-center my-6">
        <h3 className="font-bold text-lg mb-1">Hups! Jotain meni vikaan</h3>
        <p className="text-sm text-red-300/80 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 text-white rounded text-sm transition-all"
        >
          Yritä uudelleen
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Otsikkoalue */}
      <div className="border-b border-neutral-900 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">
            {notebook?.title || 'Nimetön muistikirja'}
          </h1>
          {notebook?.description && (
            <p className="text-neutral-400 text-sm mt-1 leading-relaxed">
              {notebook.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="text-xxs font-mono text-amber-500 animate-pulse bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">
              Saving...
            </span>
          ) : (
            <span className="text-xxs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Tyhjän tilan ilmoitus */}
      {cells.length === 0 && (
        <div className="text-center py-16 bg-neutral-900/10 border border-dashed border-neutral-800/80 rounded-xl space-y-4">
          <p className="text-neutral-500 text-sm">Tässä muistikirjassa ei ole vielä soluja.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleInsertCell(0, 'markdown')}
              className="px-3.5 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 text-amber-500 hover:text-amber-400 font-bold text-xs rounded transition-all"
            >
              + Lisää Markdown-solu
            </button>
            <button
              onClick={() => handleInsertCell(0, 'code')}
              className="px-3.5 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 text-amber-500 hover:text-amber-400 font-bold text-xs rounded transition-all"
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
              <div className="absolute inset-x-0 h-px bg-neutral-800/40 opacity-0 group-hover/divider:opacity-100 transition-opacity duration-200" />
              <div className="absolute opacity-0 group-hover/divider:opacity-100 transition-all duration-200 flex gap-2 scale-90 group-hover/divider:scale-100 bg-neutral-950 px-2 py-1 rounded-full border border-neutral-800 shadow-lg z-20">
                <button
                  onClick={() => handleInsertCell(index, 'markdown')}
                  className="text-xxs font-bold text-neutral-400 hover:text-amber-500 px-2 py-0.5 rounded hover:bg-neutral-900 transition-colors"
                >
                  + Markdown
                </button>
                <span className="w-px h-3 bg-neutral-800 self-center" />
                <button
                  onClick={() => handleInsertCell(index, 'code')}
                  className="text-xxs font-bold text-neutral-400 hover:text-amber-500 px-2 py-0.5 rounded hover:bg-neutral-900 transition-colors"
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
                />
              ) : (
                <CodeCell
                  cell={cell}
                  onChange={(content) => handleCellContentChange(cell.id, content)}
                  onExecute={() => handleExecuteCell(cell.id)}
                />
              )}
            </CellWrapper>
          </React.Fragment>
        ))}

        {/* Lisäyspainike alareunassa, kun soluja on jo olemassa */}
        {cells.length > 0 && (
          <div className="h-6 relative group/divider flex items-center justify-center mt-6">
            <div className="absolute inset-x-0 h-px bg-neutral-800/40" />
            <div className="absolute flex gap-2 bg-neutral-950 px-3 py-1 rounded-full border border-neutral-800 shadow-md">
              <button
                onClick={() => handleInsertCell(cells.length, 'markdown')}
                className="text-xxs font-bold text-neutral-400 hover:text-amber-500 px-2 py-0.5 transition-colors"
              >
                + Markdown loppuun
              </button>
              <span className="w-px h-3 bg-neutral-800 self-center" />
              <button
                onClick={() => handleInsertCell(cells.length, 'code')}
                className="text-xxs font-bold text-neutral-400 hover:text-amber-500 px-2 py-0.5 transition-colors"
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
```

---

## Verification & Testing Plan

### Automaattiset Testi

* Varmistetaan linterin toimivuus frontendissä: `npm run lint` tai vastaava linter-ajo.

* Tarkistetaan React- ja TypeScript-käännös: `npm run build` tai `tsc --noEmit`.

### Manuaalinen Testaus

1. Avaa muistikirjanäkymä, jolla on ID.
2. Lisää uusi Markdown-solu, kirjoita Markdown-syntaksia, paina `Ctrl+Enter` ja varmista että renderöinti on kaunis. Kaksoisklikkaa ja varmista paluu edit-tilaan.
3. Lisää CLI-koodisolu, kirjoita `/read John 3:16` ja paina "Run". Varmista että tulosalue näyttää palautetun jakeen oikein.
4. Järjestele soluja ylös-alas nuolilla ja varmista, että backend tallentaa uudet positiot automaattisesti taustalla (`Saving...` vilahtaa ja vaihtuu takaisin `Saved`).
