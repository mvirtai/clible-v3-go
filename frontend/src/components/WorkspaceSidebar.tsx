import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Scope, ScopeWorkspace, SavedSearch, SavedAnalysis } from '../types/workspace';
import { Folder, Plus, Trash2, Search, BarChart3, ChevronRight } from 'lucide-react';

interface Props {
  activeScopeId: string;
  onScopeChanged: (scopeId: string) => void;
  onLoadSavedSearch: (search: SavedSearch) => void;
  onLoadSavedAnalysis: (analysis: SavedAnalysis) => void;
  refreshTrigger: boolean;
}

export const WorkspaceSidebar: React.FC<Props> = ({
  activeScopeId,
  onScopeChanged,
  onLoadSavedSearch,
  onLoadSavedAnalysis,
  refreshTrigger
}) => {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [newScopeName, setNewScopeName] = useState('');
  const [workspace, setWorkspace] = useState<ScopeWorkspace | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingScopes, setLoadingScopes] = useState<boolean>(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);

  useEffect(() => {
    const fetchScopes = async () => {
      setLoadingScopes(true);
      try {
        const list = await apiService.getScopes();
        setScopes(list || []);
      } catch {
        console.error('Failed to load scopes');
      } finally {
        setLoadingScopes(false);
      }
    };
    fetchScopes();
  }, [refreshTrigger]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!activeScopeId) {
        setWorkspace(null);
        setLoadingWorkspace(false);
        return;
      }
      setLoadingWorkspace(true);
      try {
        const data = await apiService.getScopeWorkspace(activeScopeId);
        setWorkspace(data);
      } catch {
        console.error('Failed to load workspace data');
      } finally {
        setLoadingWorkspace(false);
      }
    };
    fetchWorkspace();
  }, [activeScopeId, refreshTrigger]);

  const handleCreateScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScopeName.trim()) return;
    try {
      const created = await apiService.createScope(newScopeName.trim());
      setScopes(prev => [...prev, created]);
      onScopeChanged(created.id);
      setNewScopeName('');
      setShowAddForm(false);
    } catch {
      alert('Työtilan luominen epäonnistui');
    }
  };

  const handleDeleteScope = async () => {
    if (!activeScopeId || !window.confirm('Haluatko varmasti poistaa tämän työtilan ja kaikki sen tallennetut tulokset?')) return;
    try {
      await apiService.deleteScope(activeScopeId);
      const remaining = scopes.filter(s => s.id !== activeScopeId);
      setScopes(remaining);
      onScopeChanged(remaining[0]?.id || '');
    } catch {
      alert('Työtilan poistaminen epäonnistui');
    }
  };

  // VAIHE 4: Haamukuvion renderöinti alussa
  if (loadingScopes && scopes.length === 0) {
    return (
      <div className="rounded-3xl p-6 space-y-6 border text-left animate-pulse" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-[var(--surface-2)] rounded w-1/3"></div>
          <div className="w-5 h-5 bg-[var(--surface-2)] rounded-full"></div>
        </div>
        <div className="h-9 bg-[var(--surface-2)] rounded-xl w-full"></div>
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="h-3 bg-[var(--surface-2)] rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-7 bg-[var(--surface-2)] rounded-lg w-full"></div>
            <div className="h-7 bg-[var(--surface-2)] rounded-lg w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6 space-y-6 border text-left" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--muted)' }}>
          <Folder size={16} /> Työtila (Scope)
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 rounded-full hover:bg-[var(--surface-2)] transition-colors text-[var(--accent)]"
          title="Uusi työtila"
        >
          <Plus size={18} />
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateScope} className="flex gap-2">
          <input
            type="text"
            placeholder="Työtilan nimi..."
            value={newScopeName}
            onChange={e => setNewScopeName(e.target.value)}
            className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none border"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            autoFocus
          />
          <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-accent btn-tactile">
            Luo
          </button>
        </form>
      )}

      <div className="flex gap-2">
        <select
          value={activeScopeId}
          onChange={e => onScopeChanged(e.target.value)}
          className="flex-1 rounded-xl px-3 py-2 text-xs transition-all outline-none border cursor-pointer font-medium"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="">-- Valitse työtila --</option>
          {scopes.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {activeScopeId && (
          <button
            onClick={handleDeleteScope}
            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
            title="Poista työtila"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {activeScopeId && workspace && (() => {
        const searches = workspace.searches || [];
        const analyses = workspace.analyses || [];
        return (
          <div 
            className="space-y-5 pt-2 border-t" 
            style={{ 
              borderColor: 'var(--border-soft)',
              opacity: loadingWorkspace ? 0.6 : 1,
              pointerEvents: loadingWorkspace ? 'none' : 'auto',
              transition: 'opacity 0.2s ease-in-out'
            }}
          >
            {/* Tallennetut haut */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Tallennetut haut</h3>
              {searches.length === 0 ? (
                <p className="text-xs italic" style={{ color: 'var(--muted)' }}>Ei tallennettuja hakuja.</p>
              ) : (
                <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                  {searches.map(s => (
                    <button
                      key={s.id}
                      onClick={() => onLoadSavedSearch(s)}
                      className="w-full text-left p-2 rounded-xl text-xs hover:bg-[var(--surface-2)] transition-all flex items-center justify-between group border border-transparent hover:border-[var(--border-soft)] cursor-pointer"
                      style={{ color: 'var(--text-2)' }}
                    >
                      <span className="flex items-center gap-2 truncate font-medium">
                        <Search size={12} className="text-[var(--accent)]" />
                        {s.name}
                      </span>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tallennetut analyysit */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Tallennetut analyysit</h3>
              {analyses.length === 0 ? (
                <p className="text-xs italic" style={{ color: 'var(--muted)' }}>Ei tallennettuja analyysejä.</p>
              ) : (
                <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                  {analyses.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onLoadSavedAnalysis(a)}
                      className="w-full text-left p-2 rounded-xl text-xs hover:bg-[var(--surface-2)] transition-all flex items-center justify-between group border border-transparent hover:border-[var(--border-soft)] cursor-pointer"
                      style={{ color: 'var(--text-2)' }}
                    >
                      <span className="flex items-center gap-2 truncate font-medium">
                        <BarChart3 size={12} className="text-[var(--accent)]" />
                        {a.name}
                      </span>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};
