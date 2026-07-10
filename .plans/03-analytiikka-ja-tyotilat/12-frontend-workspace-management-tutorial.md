# Kehittäjäopas: Työtilahallinta, hakurajaukset ja tulosten tallennus (Polku C)

Tämä opas sisältää vaiheittaiset ohjeet Clible-v3-go -sovelluksen laajentamiseksi työtilahallinnalla (Scopes), hakualuerajauksilla sekä laskenta- ja hakutulosten suoralla välimuistituksella tietokantaan. Seuraa ohjeita järjestyksessä.

---

## Vaihe 1: Tietokannan laajentaminen (`result_json`)

Luo uusi SQL-migraatiotiedosto `backend/migrations/011_add_result_json_to_saved.sql` ja lisää siihen seuraava sisältö:

```sql
-- Migration 011: Add result_json to saved searches and analyses
ALTER TABLE saved_searches ADD COLUMN result_json TEXT;
ALTER TABLE saved_analyses ADD COLUMN result_json TEXT;
```

Tämä sarake tallentaa suoraan haun tai analyysin JSON-tuloksen, jotta se voidaan ladata myöhemmin viiveettä ilman uudelleenlaskentaa.

---

## Vaihe 2: Backendin tietomallien päivitys

Muokkaa tiedostoa `backend/internal/models/types.go`. Päivitä `SavedSearch` ja `SavedAnalysis` structit siten, että ne sisältävät uuden `result_json` -sarakkeen:

```go
type SavedSearch struct {
 ID            string    `json:"id" db:"id"`
 ScopeID       string    `json:"scopeId" db:"scope_id"`
 Name          string    `json:"name" db:"name"`
 QueryText     string    `json:"queryText" db:"query_text"`
 SearchScope   string    `json:"searchScope" db:"search_scope"`
 ScopeValue    string    `json:"scopeValue" db:"scope_value"`
 TranslationID string    `json:"translationId" db:"translation_id"`
 ResultJSON    string    `json:"resultJson" db:"result_json"` // NEW
 CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

type SavedAnalysis struct {
 ID            string    `json:"id" db:"id"`
 ScopeID       string    `json:"scopeId" db:"scope_id"`
 Name          string    `json:"name" db:"name"`
 Reference     string    `json:"reference" db:"reference"`
 AnalysisType  string    `json:"analysisType" db:"analysis_type"`
 TranslationID string    `json:"translationId" db:"translation_id"`
 ParamsJSON    string    `json:"paramsJson" db:"params_json"`
 ResultJSON   string    `json:"resultJson" db:"result_json"` // NEW
 CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}
```

---

## Vaihe 3: Repositorion päivitys (`saved_repo.go`)

Päivitä tiedosto `backend/internal/db/saved_repo.go` lukemaan ja tallentamaan uusi `result_json` -sarake:

1. **`SaveSearch`**: Lisää `result_json` INSERT-lauseeseen ja välitä `s.ResultJSON` kyselylle:

   ```go
   query := `
       INSERT INTO saved_searches (id, scope_id, name, query_text, search_scope, scope_value, translation_id, result_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
   `
   // ... ja ExecContextiin:
   s.ID, s.ScopeID, s.Name, s.QueryText, s.SearchScope, scopeValue, translationID, s.ResultJSON, s.CreatedAt,
   ```

2. **`GetSearchesByScope`**: Lisää `result_json` SELECT-hakuun ja Scan-lausekkeeseen:

   ```go
   query := `
       SELECT id, scope_id, name, query_text, search_scope, scope_value, translation_id, result_json, created_at
       FROM saved_searches WHERE scope_id = $1 ORDER BY created_at DESC
   `
   // ... Scan-kohdassa:
   err := rows.Scan(&s.ID, &s.ScopeID, &s.Name, &s.QueryText, &s.SearchScope, &scopeValue, &translationID, &s.ResultJSON, &s.CreatedAt)
   ```

3. **`SaveAnalysis`**: Päivitä vastaavasti `INSERT INTO saved_analyses`:

   ```go
   query := `
       INSERT INTO saved_analyses (id, scope_id, name, reference, analysis_type, translation_id, params_json, result_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
   `
   // ... ja ExecContextiin:
   a.ID, a.ScopeID, a.Name, a.Reference, a.AnalysisType, translationID, paramsJSON, a.ResultJSON, a.CreatedAt,
   ```

4. **`GetAnalysesByScope`**: Päivitä `SELECT` ja `Scan` saved_analyses-hakuun lukemaan `result_json`.

---

## Vaihe 4: API Handler -päivitys (`scope_handler.go`)

Muokkaa tiedostoa `backend/internal/api/scope_handler.go`.

1. Päivitä `SaveSearchRequest` ja `SaveAnalysisRequest` structit ottamaan vastaan `resultJson`:

   ```go
   type SaveSearchRequest struct {
       // ... entiset kentät ...
       ResultJSON string `json:"resultJson"` // NEW
   }

   type SaveAnalysisRequest struct {
       // ... entiset kentät ...
       ResultJSON string `json:"resultJson"` // NEW
   }
   ```

2. Päivitä `SaveSearch` ja `SaveAnalysis` handlerit siirtämään `req.ResultJSON` osaksi tallennettavaa tietomallia (`models.SavedSearch` ja `models.SavedAnalysis`).

---

## Vaihe 5: Hakurajausten (VT / UT / Kirja) toteutus backendissä

Jotta käyttäjä voi rajata hakua, meidän pitää muokata hakureittejä.

### 5.1 Verses Repon päivitys (`verse_repo.go`)

Muokkaa tiedostoa `backend/internal/db/verse_repo.go`.

1. Laajenna `SearchParams` structia:

   ```go
   type SearchParams struct {
       FTSQuery      string
       RegexPattern  string
       TranslationID string
       SearchScope   string // NEW: "all", "ot", "nt", "book"
       ScopeValue    string // NEW: esim. "GEN", "PSA" (kun SearchScope == "book")
   }
   ```

2. Päivitä `Search`-metodi suodattamaan tulokset `SearchScope`-asetuksen mukaan:
   Rakenna SQL-suodatin dynaamisesti riippuen rajauksesta:

   ```go
   var scopeFilter string
   var scopeArgs []any

   if params.SearchScope == "ot" {
       scopeFilter = " AND book_id IN (SELECT id FROM books WHERE testament = 'OT')"
   } else if params.SearchScope == "nt" {
       scopeFilter = " AND book_id IN (SELECT id FROM books WHERE testament = 'NT')"
   } else if params.SearchScope == "book" && params.ScopeValue != "" {
       scopeFilter = " AND book_id = $" + fmt.Sprintf("%d", len(args)+1)
       args = append(args, params.ScopeValue)
   }
   ```

   Yhdistä tämä `scopeFilter` sekä Regex- että FTS-hakujen SQL-kyselyihin (esim. `baseQuery` ja `ftsQuery`).

### 5.2 Verses Servicen ja API Handlerin päivitys

1. Päivitä `backend/internal/services/verse_service.go` ottamaan vastaan `searchScope` ja `scopeValue`:

   ```go
   func (s *VerseService) SearchVerses(ctx context.Context, query string, useRegex bool, translationID string, searchScope string, scopeValue string) ([]models.Verse, error)
   ```

   Välitä nämä `db.SearchParams` -rakenteelle.

2. Päivitä `backend/internal/api/bible_handler.go` lukemaan uudet query-parametrit ja välittämään ne servicelle:

   ```go
   scope := r.URL.Query().Get("scope")
   scopeValue := r.URL.Query().Get("scopeValue")
   
   results, err := h.verseService.SearchVerses(ctx, query, useRegex, translation, scope, scopeValue)
   ```

---

## Vaihe 6: Frontend-tyyppien luominen

Luo uusi tiedosto `frontend/src/types/workspace.ts` ja määrittele tyypit:

```typescript
export interface Scope {
  id: string;
  name: string;
  createdAt: string;
  userId: string;
}

export interface SavedSearch {
  id: string;
  scopeId: string;
  name: string;
  queryText: string;
  searchScope: string;
  scopeValue: string;
  translationId: string;
  resultJson: string; // Tallennettu hakutulos välimuistina
  createdAt: string;
}

export interface SavedAnalysis {
  id: string;
  scopeId: string;
  name: string;
  reference: string;
  analysisType: string;
  translationId: string;
  paramsJson: string;
  resultJson: string; // Tallennettu analyysitulos välimuistina
  createdAt: string;
}

export interface ScopeWorkspace {
  scope: Scope;
  searches: SavedSearch[];
  analyses: SavedAnalysis[];
}
```

---

## Vaihe 7: Frontend API -kutsut (`api.ts`)

Muokkaa tiedostoa `frontend/src/services/api.ts`.

1. Tuo uudet tyypit tiedoston alussa:

   ```typescript
   import type { Scope, SavedSearch, SavedAnalysis, ScopeWorkspace } from "../types/workspace";
   ```

2. Päivitä `search` -metodi ottamaan vastaan `scope` ja `scopeValue`:

   ```typescript
   async search(query: string, translation: string, regex: boolean, scope = 'all', scopeValue = ''): Promise<SearchVerse[]> {
       const res = await fetch(
           `${this.baseUrl}/search?q=${encodeURIComponent(query)}&translation=${encodeURIComponent(translation)}&regex=${regex}&scope=${scope}&scopeValue=${encodeURIComponent(scopeValue)}`
           , { credentials: 'include' }
       );
       // ...
   }
   ```

3. Lisää työtilan API-metodit `ApiService`-luokkaan:

   ```typescript
   async getScopes(): Promise<Scope[]> {
       const res = await fetch(`${this.baseUrl}/scopes`, { credentials: 'include' });
       if (!res.ok) throw new Error(`GET /scopes returned ${res.status}`);
       return await res.json();
   }

   async createScope(name: string): Promise<Scope> {
       const res = await fetch(`${this.baseUrl}/scopes`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ name }),
           credentials: 'include',
       });
       if (!res.ok) throw new Error(`POST /scopes returned ${res.status}`);
       return await res.json();
   }

   async deleteScope(id: string): Promise<void> {
       const res = await fetch(`${this.baseUrl}/scopes?id=${encodeURIComponent(id)}`, {
           method: 'DELETE',
           credentials: 'include',
       });
       if (!res.ok) throw new Error(`DELETE /scopes returned ${res.status}`);
   }

   async getScopeWorkspace(id: string): Promise<ScopeWorkspace> {
       const res = await fetch(`${this.baseUrl}/scopes/workspace?id=${encodeURIComponent(id)}`, {
           credentials: 'include',
       });
       if (!res.ok) throw new Error(`GET /scopes/workspace returned ${res.status}`);
       return await res.json();
   }

   async saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt'>): Promise<SavedSearch> {
       const res = await fetch(`${this.baseUrl}/scopes/saved-searches`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(search),
           credentials: 'include',
       });
       if (!res.ok) throw new Error(`POST /saved-searches returned ${res.status}`);
       return await res.json();
   }

   async saveAnalysis(analysis: Omit<SavedAnalysis, 'id' | 'createdAt'>): Promise<SavedAnalysis> {
       const res = await fetch(`${this.baseUrl}/scopes/saved-analyses`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(analysis),
           credentials: 'include',
       });
       if (!res.ok) throw new Error(`POST /saved-analyses returned ${res.status}`);
       return await res.json();
   }
   ```

---

## Vaihe 8: WorkspaceSidebar-komponentti

Luo uusi tiedosto `frontend/src/components/WorkspaceSidebar.tsx`. Tämä komponentti hallinnoi työtilan valintaa, luomista, poistamista ja tallennettujen kohteiden pikalataamista:

```tsx
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
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const fetchScopes = async () => {
      try {
        const list = await apiService.getScopes();
        setScopes(list);
      } catch (err) {
        console.error('Failed to load scopes:', err);
      }
    };
    fetchScopes();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!activeScopeId) {
      setWorkspace(null);
      return;
    }
    const fetchWorkspace = async () => {
      setLoading(true);
      try {
        const data = await apiService.getScopeWorkspace(activeScopeId);
        setWorkspace(data);
      } catch (err) {
        console.error('Failed to load workspace data:', err);
      } finally {
        setLoading(false);
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
    } catch (err) {
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
    } catch (err) {
      alert('Työtilan poistaminen epäonnistui');
    }
  };

  return (
    <div className="rounded-3xl p-6 space-y-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
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

      {activeScopeId && workspace && (
        <div className="space-y-5 pt-2 border-t" style={{ borderColor: 'var(--border-soft)' }}>
          {/* Tallennetut haut */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Tallennetut haut</h3>
            {workspace.searches.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--muted)' }}>Ei tallennettuja hakuja.</p>
            ) : (
              <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                {workspace.searches.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onLoadSavedSearch(s)}
                    className="w-full text-left p-2 rounded-xl text-xs hover:bg-[var(--surface-2)] transition-all flex items-center justify-between group border border-transparent hover:border-[var(--border-soft)]"
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
            {workspace.analyses.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--muted)' }}>Ei tallennettuja analyysejä.</p>
            ) : (
              <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                {workspace.analyses.map(a => (
                  <button
                    key={a.id}
                    onClick={() => onLoadSavedAnalysis(a)}
                    className="w-full text-left p-2 rounded-xl text-xs hover:bg-[var(--surface-2)] transition-all flex items-center justify-between group border border-transparent hover:border-[var(--border-soft)]"
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
      )}
    </div>
  );
};
```

---

## Vaihe 9: Hakukomponentin (`VerseSearch.tsx`) päivitys

Muokkaa tiedostoa `frontend/src/components/VerseSearch.tsx`.

1. Lisää propsit:

   ```typescript
   interface Props {
     translation: string;
     onSelectVerse?: (reference: string) => void;
     activeScopeId?: string;       // NEW
     onWorkspaceUpdated?: () => void; // NEW
     loadedSavedResults?: SearchVerse[] | null; // NEW: Välimuistitetun tuloksen lataus
     onClearLoadedResults?: () => void;         // NEW
   }
   ```

2. Hae kirjat `apiService` -kautta rajausta varten, ja hallinnoi hakurajauksen tiloja:

   ```typescript
   const [searchScope, setSearchScope] = useState<'all' | 'ot' | 'nt' | 'book'>('all');
   const [scopeValue, setScopeValue] = useState('');
   const [books, setBooks] = useState<any[]>([]);
   const [saveName, setSaveName] = useState('');
   const [showSaveForm, setShowSaveForm] = useState(false);
   ```

   Lataa kirjat `useEffect`:issä, jotta kirjat voidaan listata alasvetovalikossa, kun `searchScope === 'book'`.

3. Jos `loadedSavedResults` on annettu propseissa, näytetään ne suoraan `results` -tilan sijaan (tai asetetaan ne tilaan).

4. Hakulomakkeeseen lisätään rajauksen valinta:

   ```tsx
   <div className="flex gap-2 text-xs">
     <select
       value={searchScope}
       onChange={e => {
         setSearchScope(e.target.value as any);
         setScopeValue('');
       }}
       className="rounded-lg border px-3 py-1.5 outline-none cursor-pointer"
       style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
     >
       <option value="all">Koko Raamattu</option>
       <option value="ot">Vanha testamentti</option>
       <option value="nt">Uusi testamentti</option>
       <option value="book">Tietty kirja</option>
     </select>
     
     {searchScope === 'book' && (
       <select
         value={scopeValue}
         onChange={e => setScopeValue(e.target.value)}
         className="rounded-lg border px-3 py-1.5 outline-none cursor-pointer"
         style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
       >
         <option value="">-- Valitse kirja --</option>
         {books.map(b => (
           <option key={b.id} value={b.id}>{b.name}</option>
         ))}
       </select>
     )}
   </div>
   ```

5. Lisätään "Tallenna haku työtilaan" -lomake suoritetun haun yläpuolelle:

   ```tsx
   {activeScopeId && results.length > 0 && (
     <div className="p-4 rounded-2xl border space-y-2 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}>
       <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Tallenna tämä haku työtilaan</p>
       {!showSaveForm ? (
         <button
           onClick={() => setShowSaveForm(true)}
           className="px-3 py-1 rounded-full text-xs font-medium btn-accent btn-tactile"
         >
           Tallenna haku
         </button>
       ) : (
         <div className="flex gap-2">
           <input
             type="text"
             placeholder="Haun nimi (esim. Valo-haku)..."
             value={saveName}
             onChange={e => setSaveName(e.target.value)}
             className="flex-1 rounded-lg px-3 py-1 text-xs outline-none border"
             style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
           />
           <button
             onClick={async () => {
               if (!saveName.trim()) return;
               try {
                 await apiService.saveSearch({
                   scopeId: activeScopeId,
                   name: saveName.trim(),
                   queryText: query,
                   searchScope: searchScope,
                   scopeValue: scopeValue,
                   translationId: translation,
                   resultJson: JSON.stringify(results) // TALLENNETAAN TULOS JSONINA
                 });
                 setSaveName('');
                 setShowSaveForm(false);
                 onWorkspaceUpdated?.();
               } catch (err) {
                 alert('Tallennus epäonnistui');
               }
             }}
             className="px-3 py-1 rounded-lg text-xs font-semibold btn-accent"
           >
             Tallenna
           </button>
         </div>
       )}
     </div>
   )}
   ```

---

## Vaihe 10: Analytiikka- ja vertailukomponenttien päivitys

Päivitetään analytiikkanäkymät ottamaan vastaan `activeScopeId` ja `onWorkspaceUpdated`.

### 10.1 `AnalyticsView.tsx`

1. Lisää propsit:

   ```typescript
   interface Props {
     defaultTranslation: string;
     activeScopeId?: string;
     onWorkspaceUpdated?: () => void;
     loadedSavedStats?: { stats: TextStats; reference: string; translationId: string } | null;
   }
   ```

2. Jos `loadedSavedStats` on annettu, asetetaan se suoraan näytettäväksi tilaksi eikä suoriteta uutta `apiService.analyze` kutsua.
3. Lisää "Tallenna analyysi työtilaan" -painike lomakkeen/tuloksen yhteyteen:

   ```tsx
   // Kun klikataan "Tallenna työtilaan", kutsutaan:
   await apiService.saveAnalysis({
       scopeId: activeScopeId,
       name: `Leksikaalinen analyysi: ${reference} (${translationId})`,
       reference: reference,
       analysisType: 'single_stats',
       translationId: translationId,
       paramsJson: '{}',
       resultJson: JSON.stringify(stats) // Välimuistitetaan laskentatulos!
   });
   ```

### 10.2 `CompareView.tsx`

1. Lisää propsit:

   ```typescript
   interface Props {
     installedTranslations: InstalledTranslation[];
     activeScopeId?: string;
     onWorkspaceUpdated?: () => void;
     loadedSavedComparison?: { result: ComparisonResult; reference: string; translationA: string; translationB: string } | null;
   }
   ```

2. Vastaavasti, jos `loadedSavedComparison` on annettu, ladataan se suoraan käyttöliittymään.
3. Tallennetaan vertailu kutsumalla:

   ```tsx
   await apiService.saveAnalysis({
       scopeId: activeScopeId,
       name: `Käännösvertailu: ${reference} (${tA} vs ${tB})`,
       reference: reference,
       analysisType: 'comparison',
       translationId: tA,
       paramsJson: JSON.stringify({ translationB: tB }),
       resultJson: JSON.stringify(comparisonResult) // Välimuistitetaan vertailutulos!
   });
   ```

---

## Vaihe 11: Sovelluksen pääsolmun (`App.tsx`) integrointi

Päivitetään tiedosto `frontend/src/App.tsx`.

1. Määritellään tilat sovelluksen tilanhallintaan:

   ```typescript
   const [activeScopeId, setActiveScopeId] = useState<string>(() => localStorage.getItem('activeScopeId') || '');
   const [workspaceTrigger, setWorkspaceTrigger] = useState(false);
   
   // Tilat tallennettujen tulosten pikalataamiseen ilman API-laskentaa
   const [loadedSearch, setLoadedSearch] = useState<any | null>(null);
   const [loadedStats, setLoadedStats] = useState<any | null>(null);
   const [loadedComparison, setLoadedComparison] = useState<any | null>(null);
   ```

2. Tallenna valittu työtila `localStorageen` kun se muuttuu:

   ```typescript
   const handleScopeChanged = (id: string) => {
       setActiveScopeId(id);
       localStorage.setItem('activeScopeId', id);
   };
   ```

3. Toteutetaan callbackit tallennettujen kohteiden pikalataus-callbackit:

   ```typescript
   const handleLoadSavedSearch = (s: SavedSearch) => {
       // Puretaan välimuistissa oleva tulos
       const results = JSON.parse(s.resultJson);
       setLoadedSearch({
           query: s.queryText,
           translation: s.translationId,
           searchScope: s.searchScope,
           scopeValue: s.scopeValue,
           results
       });
       setSelectedTranslation(s.translationId);
       setViewMode('reader'); // Vaihdetaan lukukoneeseen
   };

   const handleLoadSavedAnalysis = (a: SavedAnalysis) => {
       const result = JSON.parse(a.resultJson);
       if (a.analysisType === 'single_stats') {
           setLoadedStats({
               stats: result,
               reference: a.reference,
               translationId: a.translationId
           });
           setViewMode('analytics');
       } else if (a.analysisType === 'comparison') {
           const params = JSON.parse(a.paramsJson);
           setLoadedComparison({
               result,
               reference: a.reference,
               translationA: a.translationId,
               translationB: params.translationB
           });
           setViewMode('compare');
       }
   };
   ```

4. Lisätään `WorkspaceSidebar` oikeaan sivupalkkiin (sidbariin) ennen hakuhistoriaa:

   ```tsx
   <WorkspaceSidebar
       activeScopeId={activeScopeId}
       onScopeChanged={handleScopeChanged}
       onLoadSavedSearch={handleLoadSavedSearch}
       onLoadSavedAnalysis={handleLoadSavedAnalysis}
       refreshTrigger={workspaceTrigger}
   />
   ```

5. Välitetään `activeScopeId` ja `onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}` komponenteille `VerseSearch`, `AnalyticsView` ja `CompareView`.
