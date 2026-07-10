# Kehittäjäopas: Persistentti työtilan sivupalkki kaikissa näkymissä (Suunnitelma 14)

Tämä opas sisältää tarkat ohjeet, joilla `WorkspaceSidebar`-komponentti nostetaan näkymäkohtaisesta lukukone-osiosta yhteiseen grid-rakenteeseen, jotta se näkyy kaikissa kolmessa näkymässä (Lukukone, Tekstianalyysi, Käännösvertailu).

---

## Nykyinen rakenne (ennen muutosta)

Tällä hetkellä `App.tsx`-tiedoston `<main>`-osio on rakennettu seuraavasti:

```
<main>
  {showManager && <TranslationManager />}
  <ViewTabs />

  {viewMode === 'reader' && (
    <grid cols-3>
      <col-span-2>  ← VerseReader + VerseSearch
      <col-span-1>  ← WorkspaceSidebar + SearchHistory + QuickStart
    </grid>
  )}

  {viewMode === 'analytics' && <AnalyticsView />}     ← Täysleveä, ei sivupalkkia
  {viewMode === 'compare' && <CompareView />}          ← Täysleveä, ei sivupalkkia
</main>
```

**Ongelma:** Sivupalkki on upotettu `reader`-ehdon sisään, joten se katoaa analytics- ja compare-näkymissä.

---

## Tavoiterakenne (muutoksen jälkeen)

```
<main>
  {showManager && <TranslationManager />}
  <ViewTabs />

  <grid cols-3>                                         ← Yhteinen grid KAIKILLE näkymille
    <col-span-2>                                        ← Vasen puoli: Aktiivinen näkymä
      {viewMode === 'reader' && <VerseReader + VerseSearch />}
      {viewMode === 'analytics' && <AnalyticsView />}
      {viewMode === 'compare' && <CompareView />}
    </col-span-2>

    <col-span-1>                                        ← Oikea puoli: Aina näkyvissä
      <WorkspaceSidebar />
      {viewMode === 'reader' && <SearchHistory />}
      <QuickStartCard />
    </col-span-1>
  </grid>
</main>
```

---

## Muutettavat kohdat tiedostossa `App.tsx`

### Vaihe 1: Poista `reader`-ehdon sisältämä grid-rakenne (rivit 328–397)

Nykyinen koodi riviltä 328:

```tsx
        {viewMode === 'reader' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Reader & Search */}
            <div className="lg:col-span-2 space-y-8">
              ...
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-8">
              <WorkspaceSidebar ... />
              <SearchHistory ... />
              <QuickStartCard ... />
            </div>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="max-w-5xl mx-auto">
            <AnalyticsView ... />
          </div>
        )}

        {viewMode === 'compare' && (
          <div className="max-w-5xl mx-auto">
            <CompareView ... />
          </div>
        )}
```

### Vaihe 2: Korvaa yhteisellä grid-rakenteella

Korvataan koko yllä oleva osio (rivit 328–419) seuraavalla:

```tsx
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vasen puoli: Aktiivinen näkymä */}
          <div className="lg:col-span-2 space-y-8">
            {viewMode === 'reader' && (
              selectedTranslation ? (
                <>
                  <VerseReader
                    translation={selectedTranslation}
                    activeReference={activeReference}
                    activeScopeId={activeScopeId}
                    onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                  />
                  <div onClick={handleSearchFinished}>
                    <VerseSearch
                      translation={selectedTranslation}
                      onSelectVerse={handleSelectReference}
                      activeScopeId={activeScopeId}
                      onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                      loadedSavedResults={loadedSearch}
                      onClearLoadedResults={() => setLoadedSearch(null)}
                    />
                  </div>
                </>
              ) : (
                <div className="py-24 text-center space-y-4" style={{ color: 'var(--muted)' }}>
                  {/* ... No translation placeholder ... */}
                </div>
              )
            )}

            {viewMode === 'analytics' && (
              <AnalyticsView
                defaultTranslation={selectedTranslation || (activatedTranslations[0]?.id || '')}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                loadedSavedStats={loadedStats}
              />
            )}

            {viewMode === 'compare' && (
              <CompareView
                installedTranslations={activatedTranslations}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                loadedSavedComparison={loadedComparison}
              />
            )}
          </div>

          {/* Oikea puoli: Aina näkyvä työtilan sivupalkki */}
          <div className="space-y-8">
            <WorkspaceSidebar
              activeScopeId={activeScopeId}
              onScopeChanged={handleScopeChanged}
              onLoadSavedSearch={handleLoadSavedSearch}
              onLoadSavedAnalysis={handleLoadSavedAnalysis}
              refreshTrigger={workspaceTrigger}
            />

            {viewMode === 'reader' && (
              <SearchHistory triggerRefresh={historyTrigger} />
            )}

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
```

### Vaihe 3: Poista `max-w-5xl mx-auto` -kääre analytics- ja compare-näkymiltä

Koska `AnalyticsView` ja `CompareView` ovat nyt 2/3-sarakkeessa gridin sisällä, ne eivät enää tarvitse omaa `max-w-5xl`-leveysrajoitetta. Gridin `lg:col-span-2` huolehtii leveydestä.

---

## Yhteenveto muutoksista

| Tiedosto | Muutos |
|----------|--------|
| `App.tsx` | Nostetaan grid-rakenne `reader`-ehdon ulkopuolelle ja sijoitetaan kaikki kolme näkymää vasempaan sarakkeeseen. Sivupalkki pysyy oikeassa sarakkeessa. |

**Muita tiedostoja ei tarvitse muuttaa** — `WorkspaceSidebar`, `AnalyticsView`, `CompareView` ja muut komponentit toimivat sellaisenaan, koska niiden propit eivät muutu.
