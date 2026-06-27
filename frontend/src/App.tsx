// src/App.tsx
import { useState } from 'react';
import { TranslationSelector } from './components/TranslationSelector';
import { TranslationManager } from './components/TranslationManager';
import { VerseReader } from './components/VerseReader';
import { VerseSearch } from './components/VerseSearch';
import { SearchHistory } from './components/SearchHistory';
import { Terminal, Settings, BookOpen } from 'lucide-react';

function App() {
  const [selectedTranslation, setSelectedTranslation] = useState<string>('');
  const [historyTrigger, setHistoryTrigger] = useState(false);
  const [translationTrigger, setTranslationTrigger] = useState(false);
  const [showManager, setShowManager] = useState(false);

  const handleSearchFinished = () => setHistoryTrigger((p) => !p);
  const handleTranslationInstalled = () => setTranslationTrigger((p) => !p);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}>
              <Terminal size={16} />
            </div>
            <h1 className="text-lg font-medium tracking-tight" style={{ color: 'var(--text)' }}>
              Clible <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Workspace</span>
              <span className="ml-2 text-xs font-mono" style={{ color: 'var(--accent)' }}>v3</span>
            </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManager(!showManager)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                border: '1px solid var(--border)',
                background: showManager ? 'var(--accent-bg)' : 'transparent',
                color: showManager ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              <Settings size={14} />
              <span>{showManager ? 'Hide' : 'Translations'}</span>
            </button>

            <TranslationSelector
              selectedTranslation={selectedTranslation}
              onSelectTranslation={setSelectedTranslation}
              refreshTrigger={translationTrigger}
            />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-6 py-12">

        {showManager && (
          <div className="mb-10 max-w-2xl mx-auto">
            <TranslationManager onTranslationInstalled={handleTranslationInstalled} />
          </div>
        )}

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
                <p className="font-medium" style={{ color: 'var(--text)' }}>No translation selected</p>
                <p className="text-sm">Open <strong>Translations</strong> in the header and install one.</p>
                <button
                  onClick={() => setShowManager(true)}
                  className="mt-4 px-5 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Install a Translation
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
                Quick Start
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                Install a translation, then try reading{' '}
                <code>Joh. 3:16</code> or <code>John 3:16</code>, or search
                for <code>light</code> in the text search below.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 mt-12 text-center text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
        Clible-v3-go — Built in partnership with Antigravity.
      </footer>
    </div>
  );
}

export default App;

