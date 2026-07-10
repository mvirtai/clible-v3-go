# Kehittäjäopas: Työtilan lataustilojen ja tallennuspalautteen parantaminen (Suunnitelma 13)

Tämä opas sisältää tarkat ohjeet ja koodimuutokset, joilla parannetaan Clible Workspace -sovelluksen käytettävyyttä. Ratkaisemme asynkronisen latauksen aiheuttamat käyttöliittymän vilkkumiset (flickering) ja lisäämme käyttäjälle selvän visuaalisen palautteen tietojen tallentamisesta työtilaan.

---

## 1. App.tsx: Tilan säilytys (localStorage)

Muokataan tiedostoa `frontend/src/App.tsx`. Alustetaan `selectedTranslation` ja `activeReference` suoraan `localStorage`-muistista ja päivitetään ne sinne aina kun ne muuttuvat.

### Muutettavat kohdat tiedostossa `frontend/src/App.tsx`

1. **Tilojen alustus:**
   Korvaa rivit:

   ```typescript
   const [selectedTranslation, setSelectedTranslation] = useState<string>('');
   ...
   const [activeReference, setActiveReference] = useState<string>('');
   ```

   Näillä riveillä:

   ```typescript
   const [selectedTranslation, setSelectedTranslation] = useState<string>(
     () => localStorage.getItem('selectedTranslation') || ''
   );
   ...
   const [activeReference, setActiveReference] = useState<string>(
     () => localStorage.getItem('activeReference') || ''
   );
   ```

2. **Aktiivisen jakeen valinta (Helper):**
   Lisää uusi apufunktio `handleSelectReference` tilapäivitystä ja synkronointia varten:

   ```typescript
   const handleSelectReference = (ref: string) => {
     setActiveReference(ref);
     if (ref) {
       localStorage.setItem('activeReference', ref);
     } else {
       localStorage.removeItem('activeReference');
     }
   };
   ```

3. **`handleLoadSavedSearch` päivitys:**
   Päivitä `localStorage` myös silloin, kun tallennettu haku ladataan:

   ```typescript
     const handleLoadSavedSearch = (s: SavedSearch) => {
       if (s.searchScope === 'reference') {
         setSelectedTranslation(s.translationId);
         localStorage.setItem('selectedTranslation', s.translationId);
         handleSelectReference(s.queryText);
         setViewMode('reader');
         setLoadedSearch(null);
         return;
       }
       // ... muu latauskoodi ...
       setSelectedTranslation(s.translationId);
       localStorage.setItem('selectedTranslation', s.translationId);
       setViewMode('reader');
     };
   ```

4. **Käännöksenvalitsimen propit JSX:ssä:**
   Päivitä `<TranslationSelector>` vastaanottamaan ja tallentamaan arvo `localStorage`-muistiin:

   ```typescript
   <TranslationSelector
     selectedTranslation={selectedTranslation}
     onSelectTranslation={(id) => {
       setSelectedTranslation(id);
       if (id) {
         localStorage.setItem('selectedTranslation', id);
       } else {
         localStorage.removeItem('selectedTranslation');
       }
     }}
     refreshTrigger={translationTrigger}
   />
   ```

5. **Lukukoneen ja haun propit JSX:ssä:**
   Muuta `VerseSearch`-komponentin `onSelectVerse`-prop käyttämään uutta funktiota:

   ```typescript
   <VerseSearch
     translation={selectedTranslation}
     onSelectVerse={handleSelectReference}
     activeScopeId={activeScopeId}
     onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
     loadedSavedResults={loadedSearch}
     onClearLoadedResults={() => setLoadedSearch(null)}
   />
   ```

---

## 2. WorkspaceSidebar.tsx: Lataustilat ja haamurakenteet (Skeleton Loaders)

Muokataan tiedostoa `frontend/src/components/WorkspaceSidebar.tsx`. Lisätään lataustilat ja näytetään haamurakenne (skeleton) silloin, kun työtiloja ladataan taustalla.

### Muutettavat kohdat tiedostossa `frontend/src/components/WorkspaceSidebar.tsx`

1. **Uudet tilat:**
   Lisää komponentin alkuun lataustilat:

   ```typescript
   const [loadingScopes, setLoadingScopes] = useState(true);
   const [loadingWorkspace, setLoadingWorkspace] = useState(false);
   ```

2. **`fetchScopes` lataustilan asettaminen:**
   Päivitä ensimmäinen `useEffect`:

   ```typescript
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
   ```

3. **`fetchWorkspace` lataustilan asettaminen:**
   Päivitä toinen `useEffect` (huomaa, ettemme aseta `workspace` tilaa `null`-arvoksi turhaan, jotta vanha data säilyy näytöllä latauksen aikana eli Stale-While-Revalidate):

   ```typescript
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
   ```

4. **Haamukuvion renderöinti alussa:**
   Renderöidään skeleton silloin, kun työtilat ladataan ensimmäistä kertaa:

   ```typescript
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
   ```

5. **Päivityksen läpinäkyvyysefekti (Visual Indicator):**
   Kun työtila päivittyy taustalla (`loadingWorkspace === true`), himmennetään listanäkymää kevyesti ja estetään klikkaukset asynkronisen siirtymän aikana.
   Etsi sidebarin palautuslausekkeesta `return (` ja kääri sisäinen haut/analyysit osio elementtiin, joka reagoi lataustilaan:

   ```typescript
   <div 
     className="space-y-5 pt-2 border-t" 
     style={{ 
       borderColor: 'var(--border-soft)',
       opacity: loadingWorkspace ? 0.6 : 1,
       pointerEvents: loadingWorkspace ? 'none' : 'auto',
       transition: 'opacity 0.2s ease-in-out'
     }}
   >
     {/* Tallennetut haut & Tallennetut analyysit ... */}
   </div>
   ```

---

## 3. Tallennuksen onnistumispalaute tallennusnäkymiin

Lisätään visuaalinen vahvistus jokaisen komponentin tallennusnäkymään.

### 3.1 VerseReader.tsx (Lukukone)

Muokataan tiedostoa `frontend/src/components/VerseReader.tsx`.

1. **Uusi tila:**

   ```typescript
   const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
   ```

2. **Päivitetty tallennusfunktio:**
   Päivitetään Tallenna-painikkeen `onClick`-käsittelijä:

   ```typescript
   onClick={async () => {
     if (!saveName.trim()) return;
     setSaveStatus('saving');
     try {
       await apiService.saveSearch({
         scopeId: activeScopeId,
         name: saveName.trim(),
         queryText: data.reference,
         searchScope: 'reference',
         scopeValue: '',
         translationId: translation,
         resultJson: JSON.stringify(data.verses)
       });
       setSaveName('');
       setShowSaveForm(false);
       setSaveStatus('success');
       setTimeout(() => setSaveStatus('idle'), 3000);
       onWorkspaceUpdated?.();
     } catch (err) {
       console.error('Failed to save reference search', err);
       setSaveStatus('error');
       setTimeout(() => setSaveStatus('idle'), 4000);
     }
   }}
   ```

3. **Tilaviestin näyttäminen JSX:ssä:**
   Näytetään vihreä tai punainen palauteteksti tallennusosion sisällä:

   ```typescript
   {/* Tallenna jaehaku painike tai lomake */}
   {!showSaveForm ? (
     <div className="flex items-center gap-3">
       <button
         type="button"
         onClick={() => setShowSaveForm(true)}
         className="px-3 py-1 rounded-full text-xs font-medium btn-accent btn-tactile"
       >
         Tallenna jaehaku
       </button>
       {saveStatus === 'success' && (
         <span className="text-xs font-semibold text-emerald-500 animate-pulse">✓ Tallennettu työtilaan!</span>
       )}
       {saveStatus === 'error' && (
         <span className="text-xs font-semibold text-red-500">✗ Tallennus epäonnistui.</span>
       )}
     </div>
   ) : (
     // ... lomakekentät ...
   )}
   ```

### 3.2 VerseSearch.tsx (Tekstihaku)

Muokataan tiedostoa `frontend/src/components/VerseSearch.tsx`.

1. **Uusi tila:**

   ```typescript
   const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
   ```

2. **Päivitetty `handleSaveSearch`:**

   ```typescript
   const handleSaveSearch = async () => {
     if (!saveName.trim() || !activeScopeId) return;
     setSaving(true);
     try {
       await apiService.saveSearch({
         scopeId: activeScopeId,
         name: saveName.trim(),
         queryText: query,
         searchScope: searchScope,
         scopeValue: scopeValue,
         translationId: translation,
         resultJson: JSON.stringify(results)
       });
       setSaveName('');
       setShowSaveForm(false);
       setSaveStatus('success');
       setTimeout(() => setSaveStatus('idle'), 3000);
       if (onWorkspaceUpdated) {
         onWorkspaceUpdated();
       }
     } catch {
       setSaveStatus('error');
       setTimeout(() => setSaveStatus('idle'), 3000);
     } finally {
       setSaving(false);
     }
   };
   ```

3. **JSX-palaute painikkeiden vierelle:**

   ```typescript
   {!showSaveForm ? (
     <div className="flex items-center gap-3">
       <button
         type="button"
         onClick={() => setShowSaveForm(true)}
         className="px-3 py-1 rounded-full text-xs font-medium btn-accent btn-tactile"
       >
         Tallenna haku
       </button>
       {saveStatus === 'success' && (
         <span className="text-xs font-semibold text-emerald-500 animate-pulse">✓ Tallennettu!</span>
       )}
       {saveStatus === 'error' && (
         <span className="text-xs font-semibold text-red-500">✗ Epäonnistui.</span>
       )}
     </div>
   ) : ( ... )}
   ```

### 3.3 AnalyticsView.tsx (Tekstianalyysi)

Muokataan tiedostoa `frontend/src/components/AnalyticsView.tsx`.

1. **Uusi tila ja sen alustus:**

   ```typescript
   const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
   ```

2. **Päivitetty `onClick`-tallennuskäsittelijä:**

   ```typescript
   try {
       await apiService.saveAnalysis({
           scopeId: activeScopeId,
           name: saveName.trim(),
           reference: reference,
           analysisType: 'single_stats',
           translationId: defaultTranslation,
           paramsJson: '{}',
           resultJson: JSON.stringify(stats)
       });
       setSaveName('');
       setShowSaveForm(false);
       setSaveStatus('success');
       setTimeout(() => setSaveStatus('idle'), 3000);
       if (onWorkspaceUpdated) onWorkspaceUpdated();
   } catch {
       setSaveStatus('error');
       setTimeout(() => setSaveStatus('idle'), 3000);
   } finally {
       setSaving(false);
   }
   ```

3. **JSX-palaute tallennuspainikkeen rinnalle:**

   ```typescript
   {!showSaveForm && (
       <div className="flex items-center gap-3">
           <button
               onClick={() => setShowSaveForm(true)}
               className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 btn-tactile hover:border-[var(--accent)] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
           >
               <Save size={12} /> Tallenna
           </button>
           {saveStatus === 'success' && (
               <span className="text-xs font-semibold text-emerald-500">✓ Tallennettu työtilaan!</span>
           )}
           {saveStatus === 'error' && (
               <span className="text-xs font-semibold text-red-500">✗ Tallennus epäonnistui.</span>
           )}
       </div>
   )}
   ```

### 3.4 CompareView.tsx (Käännösvertailu)

Muokataan tiedostoa `frontend/src/components/CompareView.tsx`.

1. **Uusi tila:**

   ```typescript
   const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
   ```

2. **Päivitetty `onClick`-käsittelijä:**

   ```typescript
   try {
       await apiService.saveAnalysis({
           scopeId: activeScopeId,
           name: saveName.trim(),
           reference: reference,
           analysisType: 'comparison',
           translationId: leftTr,
           paramsJson: JSON.stringify({ translationB: rightTr }),
           resultJson: JSON.stringify(result)
       });
       setSaveName('');
       setShowSaveForm(false);
       setSaveStatus('success');
       setTimeout(() => setSaveStatus('idle'), 3000);
       if (onWorkspaceUpdated) onWorkspaceUpdated();
   } catch {
       setSaveStatus('error');
       setTimeout(() => setSaveStatus('idle'), 3000);
   } finally {
       setSaving(false);
   }
   ```

3. **JSX-palaute tallennuspainikkeen rinnalle:**

   ```typescript
   {!showSaveForm && (
       <div className="flex items-center gap-3">
           <button
               onClick={() => setShowSaveForm(true)}
               className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 btn-tactile hover:border-[var(--accent)] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
           >
               <Save size={12} /> Tallenna
           </button>
           {saveStatus === 'success' && (
               <span className="text-xs font-semibold text-emerald-500">✓ Tallennettu työtilaan!</span>
           )}
           {saveStatus === 'error' && (
               <span className="text-xs font-semibold text-red-500">✗ Tallennus epäonnistui.</span>
           )}
       </div>
   )}
   ```
