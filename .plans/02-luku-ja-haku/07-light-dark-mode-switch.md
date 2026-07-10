# Vaiheittainen ohje: Valoisa/pimeä teeman valitsimen toteuttaminen Headeriin

Tässä ohjeessa käydään läpi, miten toteutetaan valoisa/pimeä teeman manuaalinen kytkeminen ja sen tallentaminen selaimen `localStorage`-muistiin. Ohjeessa esitellään tarvittavat muutokset CSS-määrittelyihin, HTML-alustukseen sekä React-komponentteihin.

---

## 1. CSS-muuttujien päivitys (`frontend/src/index.css`)

Tällä hetkellä pimeä teema aktivoituu automaattisesti `@media (prefers-color-scheme: dark)` -säännöllä. Jotta voimme hallita teemaa painikkeesta, siirrymme käyttämään `:root.dark` -luokkaa.

### Muutettava kohta

Korvataan nykyiset `@media (prefers-color-scheme: dark)` -lohkot luokkapohjaisella valitsimella.

```css
/* frontend/src/index.css */

/* ─── Design tokens – Light ─────────────────────────────────────────── */
:root {
  --bg:           #fdfcfb;
  --surface:      #ffffff;
  --surface-2:    #faf9f6;
  --text:         #1a1a1a;
  --text-2:       #333333;
  --muted:        #6b6b6b;
  --border:       #e5e5e5;
  --border-soft:  #f0f0f0;
  --accent:       #d4a373;
  --accent-bg:    rgba(212, 163, 115, 0.12);
  --accent-border:rgba(212, 163, 115, 0.4);

  --sans:    system-ui, 'Segoe UI', Roboto, sans-serif;
  --serif:   Georgia, 'Times New Roman', serif;
  --mono:    ui-monospace, Consolas, monospace;

  font: 17px/155% var(--sans);
  letter-spacing: 0.12px;
  color: var(--text);
  background: var(--bg);
  color-scheme: light dark;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* ─── Design tokens – Dark (Korvattu luokalla .dark) ────────────────── */
:root.dark {
  --bg:           #0f1113;
  --surface:      #15181b;
  --surface-2:    #111417;
  --text:         #f3f4f6;
  --text-2:       #d6d8dc;
  --muted:        #a8b0b8;
  --border:       rgba(255, 255, 255, 0.10);
  --border-soft:  rgba(255, 255, 255, 0.06);
  --accent:       #e0b47f;
  --accent-bg:    rgba(224, 180, 127, 0.12);
  --accent-border:rgba(224, 180, 127, 0.35);
}

/* Lisätään sujuva siirtymä väreille (transition), jotta teeman vaihto näyttää hyvältä */
body, header, main, footer, button, input, select {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
```

---

## 2. Välähdyksen esto (`frontend/index.html`)

Jotta vältytään tilanteelta, jossa sivu latautuu ensin vaaleana ennen kuin React ehtii alustaa pimeän teeman (Flash of Unstyled Content, FOUC), lisätään pieni inline-skripti HTML-tiedoston `<head>`-osioon.

### Muutettava kohta

Lisää seuraava `<script>`-lohko tiedoston `frontend/index.html` `<head>`-osion loppuun.

```html
<!-- frontend/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clible Workspace</title>
    <!-- Alustetaan teema mahdollisimman aikaisin -->
    <script>
      (function() {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 3. Teematilan hallinta ja kytkin Headeriin (`frontend/src/App.tsx`)

Päivitetään `App.tsx` siten, että se hallitsee teeman tilaa (state) ja tarjoaa kytkimen header-elementissä.

### Vaihe 3.1: Tuodaan tarvittavat ikonit

Tuo `Sun` ja `Moon` ikonit `lucide-react`-kirjastosta.

```typescript
// Etsi rivi, jossa importataan lucide-react (rivi 10)
import { Terminal, Settings, BookOpen, Activity, GitCompare, Sun, Moon } from 'lucide-react';
```

### Vaihe 3.2: Alustetaan teeman tila Reactissa

Lisää `App`-komponentin alkuun state ja apufunktio teeman vaihtamiseksi.

```typescript
// App.tsx:n sisällä (esim. rivin 19 jälkeen)
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  // Tarkistetaan onko luokka .dark jo asetettu HTML-juureen inline-skriptin toimesta
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
});

// Synkronoidaan teeman muutokset HTML-elementtiin ja localStorageen
const toggleTheme = () => {
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
  localStorage.setItem('theme', nextTheme);
  
  if (nextTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
```

### Vaihe 3.3: Lisätään kytkin-painike Headerin ohjaimiin

Sijoitetaan painike Header-komponentin `flex items-center gap-3` -konttiin.

```tsx
{/* Controls (Noin rivi 63-82 App.tsx-tiedostossa) */}
<div className="flex items-center gap-3">
  
  {/* Teemakytkin */}
  <button
    type="button"
    onClick={toggleTheme}
    aria-label={theme === 'dark' ? 'Käytä vaaleaa tilaa' : 'Käytä pimeää tilaa'}
    className="flex items-center justify-center p-2 rounded-xl transition-all duration-200"
    style={{
      border: '1px solid var(--border)',
      background: 'var(--surface-2)',
      color: 'var(--text)',
      cursor: 'pointer',
    }}
  >
    {theme === 'dark' ? (
      <Sun size={15} className="text-amber-400 animate-spin-slow" />
    ) : (
      <Moon size={15} className="text-slate-500" />
    )}
  </button>

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
```

Voit halutessasi lisätä pienen CSS-luokan `animate-spin-slow` tiedostoon `index.css` tekemään auringosta erittäin hienovaraisesti pyörivän (rich aesthetics!). Esimerkiksi:

```css
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}
```

---

## 4. Testaus ja todentaminen

Kun koodi on kirjoitettu, testaa toimivuus seuraavasti:

1. Käynnistä kehityspalvelin: `pnpm run dev` (tai Taskfilen kautta).
2. Avaa sivu ja klikkaa teemakytkintä. Teeman pitäisi vaihtua heti ilman viivettä.
3. Päivitä sivu. Teeman pitäisi pysyä valittuna (latautuen oikealla teemalla heti alusta alkaen ilman välähdystä).
4. Kokeile poistaa `theme`-avain selaimen LocalStoragesta ja varmista, että teema seuraa taas käyttöjärjestelmän asetusta.
