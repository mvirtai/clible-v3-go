import { type JSX } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder } from 'lucide-react';
import { WorkspaceSidebar, type WorkspaceSidebarProps } from './WorkspaceSidebar';
import { useLanguage } from '../../context/LanguageContext';

export interface WorkspaceDrawerProps extends WorkspaceSidebarProps {
  /** Indicates whether the mobile drawer sheet is open */
  isOpen: boolean;
  /** Callback fired when user closes the drawer */
  onClose: () => void;
}

/**
 * Slide-over mobile drawer / sheet for accessing study workspaces,
 * scopes, and saved analyses on touch devices and small viewports.
 *
 * 100% React Compiler & React 19.2 compliant: Zero useEffect.
 */
export function WorkspaceDrawer({
  isOpen,
  onClose,
  activeScopeId,
  onScopeChanged,
  onLoadSavedSearch,
  onLoadSavedAnalysis,
  refreshTrigger,
}: WorkspaceDrawerProps): JSX.Element | null {
  const { strings } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-drawer-title"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm h-full flex flex-col shadow-2xl border-l overflow-y-auto animate-in slide-in-from-right duration-300"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
          paddingTop: 'max(1rem, var(--safe-top))',
          paddingBottom: 'max(1rem, var(--safe-bottom))',
          paddingLeft: 'max(1rem, var(--safe-left))',
          paddingRight: 'max(1rem, var(--safe-right))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Close button */}
        <div
          className="flex items-center justify-between pb-4 border-b mb-4"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <div className="flex items-center gap-2">
            <Folder size={18} className="text-[var(--accent)]" />
            <h2 id="workspace-drawer-title" className="text-sm font-semibold text-[var(--text)]">
              {strings.workspacesTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={strings.cancelLabel}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Embedded Workspace Content */}
        <div className="flex-1">
          <WorkspaceSidebar
            activeScopeId={activeScopeId}
            onScopeChanged={(id) => {
              onScopeChanged(id);
            }}
            onLoadSavedSearch={(s) => {
              onLoadSavedSearch(s);
              onClose();
            }}
            onLoadSavedAnalysis={(a) => {
              onLoadSavedAnalysis(a);
              onClose();
            }}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
