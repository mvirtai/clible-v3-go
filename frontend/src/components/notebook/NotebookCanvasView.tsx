import { useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { move } from '@dnd-kit/helpers';
import { RotateCcw } from 'lucide-react';
import { GridOverlay } from './grid/GridOverlay';
import { SortableNotebookCard } from './SortableNotebookCard';
import { NotebookEditor } from './NotebookEditor';
import { useLanguage } from '../../context/LanguageContext';
import type { Notebook } from './types';
import { GuestNotebookBanner } from './GuestNotebookBanner';
import {
  isGuestNotebookId,
  updateGuestNotebook,
  saveAllGuestNotebooks,
} from '../../utils/guestNotebookStorage';

export interface NotebookCanvasViewProps {
  notebooks: Notebook[];
  onNotebooksChange: React.Dispatch<React.SetStateAction<Notebook[]>>;
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string | null) => void;
  selectedTranslation: string;
  onSelectVerse: (ref: string) => void;
  onCreateNotebook: () => void;
  onResetNotebookSizes: () => void;
  isGuest?: boolean;
}

export function NotebookCanvasView({
  notebooks,
  onNotebooksChange,
  selectedNotebookId,
  onSelectNotebook,
  selectedTranslation,
  onSelectVerse,
  onCreateNotebook,
  onResetNotebookSizes,
  isGuest = false,
}: NotebookCanvasViewProps) {
  const { strings } = useLanguage();
  const [isAnyCardResizing, setIsAnyCardResizing] = useState(false);

  if (selectedNotebookId) {
    return (
      <div className="space-y-6">
        {isGuest && <GuestNotebookBanner />}
        <div>
          <button
            onClick={() => onSelectNotebook(null)}
            className="mb-4 px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--text)] text-xs rounded transition-all flex items-center gap-1 cursor-pointer"
          >
            {strings.backToList}
          </button>
          <NotebookEditor
            notebookId={selectedNotebookId}
            translation={selectedTranslation}
            onSelectVerse={onSelectVerse}
            isGuest={isGuest}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4">
        <h2 className="text-lg font-bold text-[var(--text)]">{strings.notebookTitle}</h2>
        <div className="flex items-center gap-2">
          {notebooks.length > 0 && (
            <button
              onClick={onResetNotebookSizes}
              className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border-soft)] text-[var(--muted)] hover:text-amber-500 text-xs rounded font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={strings.resetNotebookSizes || 'Palauta koot'}
            >
              <RotateCcw size={13} />
              <span>{strings.resetNotebookSizes || 'Palauta koot'}</span>
            </button>
          )}
          <button
            onClick={onCreateNotebook}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded transition-all shadow-sm cursor-pointer"
          >
            + {strings.createNotebook}
          </button>
        </div>
      </div>

      {isGuest && <GuestNotebookBanner />}

      <DragDropProvider
        onDragEnd={(event) => {
          onNotebooksChange((prev) => {
            const next = move(prev, event);
            if (isGuest) {
              saveAllGuestNotebooks(next);
            }
            return next;
          });
        }}
      >
        {/* 24-sarakkeinen tiivis CSS Grid -kontti 24px automaattisilla rivikorkeuksilla */}
        <div className="grid grid-cols-24 auto-rows-[24px] grid-flow-row-dense gap-4 items-start relative">
          <GridOverlay visible={isAnyCardResizing} />
          {notebooks.map((nb, index) => (
            <SortableNotebookCard
              key={nb.id}
              nb={nb}
              index={index}
              onClick={() => onSelectNotebook(nb.id)}
              onResizeStart={() => setIsAnyCardResizing(true)}
              onResizeEnd={async (colSpan, rowSpan) => {
                setIsAnyCardResizing(false);
                if (isGuestNotebookId(nb.id)) {
                  updateGuestNotebook(nb.id, { colSpan, rowSpan });
                  onNotebooksChange((prev) =>
                    prev.map((item) =>
                      item.id === nb.id ? { ...item, colSpan, rowSpan } : item
                    )
                  );
                  return;
                }

                try {
                  // Save matrix sizes to backend (colSpan and rowSpan)
                  await fetch(`/api/notebooks/${nb.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      colSpan,
                      rowSpan,
                    }),
                  });
                  // Update state synchronously in the frontend
                  onNotebooksChange((prev) =>
                    prev.map((item) =>
                      item.id === nb.id ? { ...item, colSpan, rowSpan } : item
                    )
                  );
                } catch (err) {
                  console.error('Failed to update notebook dimensions:', err);
                }
              }}
              dragHandleTitle={strings.dragHandleTitle || 'Vedä järjestääksesi'}
              updatedAtLabel="Päivitetty"
              noDateLabel="-"
            />
          ))}
          {notebooks.length === 0 && (
            <div className="col-span-24 text-center py-12 text-[var(--muted)] text-sm">
              {strings.noNotebooksText}
            </div>
          )}
        </div>
      </DragDropProvider>
    </div>
  );
}
