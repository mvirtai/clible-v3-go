# Kehitysohje: UI:n interaktiivisuuden ja näppituntuman parantaminen

Tässä dokumentissa kuvataan, miten sovelluksen käyttöliittymään lisätään hienovaraisia, mutta erittäin reagoivia mikrovirtauksia (micro-interactions), kuten painikkeiden mekaaninen painallustuntuma (tactile feedback), syötekenttien tyylikkäät fokustilat ja luetteloiden/korttien hover-efektit.

---

## 1. CSS-perusta (`frontend/src/index.css`)

Lisätään `frontend/src/index.css` -tiedoston loppuun uudet apuluokat ja säännöt, jotka määrittelevät joustavan siirtymän (`ease-spring`), painikkeen klikkaustuntuman (`.btn-tactile`) ja korttien nousun (`.card-tactile`), sekä parantavat yleisiä fokustiloja.

```css
/* ─── UI Interactivity & Tactile feedback ────────────────────────────── */

/* Elastinen siirtymäanimaatio (jousiefekti) */
:root {
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --transition-tactile: 
    transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.15s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

/* Tyylikkäät kohdistusrajat (focus outlines) näppäimistökäyttäjille */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Globaalit fokustilat tekstikentille ja valitsimille */
input[type="text"]:focus,
input[type="email"]:focus,
input[type="password"]:focus,
select:focus {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 3px var(--accent-bg) !important;
  outline: none;
}

/* Mekaanisen näppituntuman antava painike-apuluokka */
.btn-tactile {
  transition: var(--transition-tactile) !important;
}

.btn-tactile:hover {
  transform: translateY(-1px) scale(1.02);
}

.btn-tactile:active {
  transform: translateY(1px) scale(0.96) !important;
  transition-duration: 0.08s !important;
}

/* Ensisijainen painike (accent-painike) hover- ja active-tummennuksilla */
.btn-accent {
  background-color: var(--accent) !important;
  color: #fff !important;
}

.btn-accent:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent) 90%, black) !important;
}

.btn-accent:active:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent) 80%, black) !important;
}

/* Korttimaisten ja klikattavien elementtien hover-nosto */
.card-tactile {
  transition: var(--transition-tactile) !important;
}

.card-tactile:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
}

:root.dark .card-tactile:hover {
  box-shadow: 0 6px 16px var(--accent-bg);
}

.card-tactile:active {
  transform: translateY(0px) scale(0.98);
  transition-duration: 0.08s !important;
}
```

---

## 2. Pääsovelluksen painikkeet (`frontend/src/App.tsx`)

Lisätään `App.tsx` -tiedoston painikkeisiin `.btn-tactile` -luokka ja parannetaan niiden hover-tyylejä:

1. **Log out** -painike (rivi 112):

   ```tsx
   className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)] hover:text-[var(--text)]"
   ```

2. **Translations** -painike (rivi 125):

   ```tsx
   className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)]"
   ```

3. **Näkymänvälilehdet (Tabs)** (rivit 155-191):
   - Lisätään jokaiselle tab-painikkeelle `btn-tactile` ja parannetaan siirtymiä:

   ```tsx
   // Esimerkki Lukukone-tabille:
   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile ${
     viewMode === 'reader'
       ? 'bg-[var(--surface)] shadow-sm text-[var(--text)] border border-[var(--border-soft)]'
       : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
   }`}
   ```

---

## 3. Lukukone (`frontend/src/components/VerseReader.tsx`)

Parannetaan lukunäkymän käytettävyyttä ja näppituntumaa:

1. **Fetch**-painike (rivi 85):
   - Lisätään `btn-tactile` ja `btn-accent` -luokat, ja poistetaan inline-taustavärimääritys.
2. **Syötekenttä (input)** (rivi 73):
   - Varmistetaan, että se siirtyy tyylikkäästi fokukseen ja käyttää elastista siirtymää.
3. **Jakeiden teksti (jaeluettelo)** (rivi 114):
   - Luodaan jakeiden tekstiriveille kevyesti korostuva tausta hover-tilassa, jolloin lukijan on helpompi seurata yksittäistä jaetta:

   ```tsx
   data.verses.map((v, idx) => (
     <span 
       key={`${v.chapter}-${v.verse}-${idx}`} 
       className="inline px-1 py-0.5 rounded-sm transition-colors hover:bg-[var(--accent-bg)] cursor-text"
     >
       <sup className="mx-0.5 align-super font-sans text-[0.55em] font-semibold" style={{ color: 'var(--accent)' }}>
         {v.verse}
       </sup>
       {v.text}
       {idx < data.verses.length - 1 ? ' ' : null}
     </span>
   ))
   ```

---

## 4. Tekstihaku (`frontend/src/components/VerseSearch.tsx`)

Tehdään hakutuloksista interaktiivisempia kortteja:

1. **Search**-painike (rivi 71) & syötekenttä (rivi 59):
   - Lisätään `btn-tactile` ja `btn-accent` painikkeeseen, ja poistetaan inline-taustavärit.
2. **Hakutulosten laatikot (cards)** (rivi 117):
   - Lisätään `card-tactile` luokka, ja korvataan olemassa olevat hover-tyylit uuden luokan hyödyillä:

   ```tsx
   <div
     key={`${r.bookId}-${r.chapter}-${r.verse}-${i}`}
     className="rounded-2xl p-4 transition-all text-left cursor-pointer card-tactile border"
     style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}
     onClick={() => onSelectVerse?.(`${r.bookId} ${r.chapter}:${r.verse}`)}
   >
     {/* ... sisältö ... */}
   </div>
   ```

---

## 5. Hakuhistoria (`frontend/src/components/SearchHistory.tsx`)

Hakuhistoriasta saadaan huomattavasti hyödyllisempi, jos sen rivejä voi klikata suorittaakseen haun uudelleen lukukoneessa/haussa:

1. **Päivitetään klikattavuus**:
   - Koska App.tsx välittää `VerseSearch`:ille `onSelectVerse` callbackin, voimme lisätä `SearchHistory`:lle myös `onSelectHistory` propin tai antaa historian kohteille reaktiivisen klikkauskokemuksen.
   - Pidetään muutokset yksinkertaisina: jos historian kohdetta klikataan, se kopioi hakutekstin leikepöydälle tai suorittaa haun. Tehdään historiariveistä tactile-kortteja (`card-tactile cursor-pointer`):

   ```tsx
   // Esimerkiksi:
   <div 
     key={h.id} 
     className="flex justify-between items-center rounded-xl px-3 py-2 text-left card-tactile cursor-pointer border"
     style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}
     // Voit lisätä esim. haun uudelleenkäynnistyksen tai klikkaustoiminnon propin kautta
   >
   ```

---

## 6. Käännösvertailu (`frontend/src/components/CompareView.tsx`)

Vertailunäkymän elementteihin lisätään hienovaraisia parannuksia:

1. **Vertaa käännöksiä** -painike (rivi 121):
   - Lisätään `btn-tactile` luokka.
2. **Vertailutaulukon rivit** (rivi 213):
   - Tehdään hover-tilasta tyylikäs ja lisätään siirtymä:

   ```tsx
   <tr key={index} className="align-top border-b border-[var(--border-soft)] hover:bg-[var(--accent-bg)]/5 transition-colors duration-200">
   ```
