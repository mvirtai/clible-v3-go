# Suunnitelma 05B: Clible Notebooks — React-solukäyttöliittymä

Tämä dokumentti ohjaa Clible Notebook -muistiinpanojen frontend-toteutusta. Luomme solupohjaisen (cell-based) editorin, joka tarjoaa intuitiivisen käyttökokemuksen Markdown- ja koodisolujen muokkaamiseen ja suorittamiseen.

---

## 1. Komponenttirakenne

Luodaan uusi hakemisto `frontend/src/components/notebook/` ja sinne seuraavat React-komponentit:

* `NotebookEditor.tsx` — Pääkomponentti, joka lataa Notebookin koon, vastaa solujen järjestyksen tilasta, tallennuksesta ja ylätason asioista.
* `CellWrapper.tsx` — Kehyskomponentti, joka tarjoaa solujen ohjaustoiminnot (poista, siirrä ylös/alas, vaihda tyyppiä, suorita).
* `MarkdownCell.tsx` — Solu markdown-tekstille. Tarjoaa editointitilan (textarea) ja renderöintitilan (ReactMarkdown-kirjasto).
* `CodeCell.tsx` — Solu Clible CLI -komennoille. Sisältää komentorivisyötteen ja dynaamisen tulosalueen, joka renderöi backendin API:n vastauksen.

---

## 2. Solujen tilanhallinta (State Management)

NotebookEditor ylläpitää solujen listaa tilassa:

```typescript
interface Cell {
  id: string;
  type: 'markdown' | 'code';
  content: string;
  resultJson?: any;
  position: number;
}

const [cells, setCells] = useState<Cell[]>([]);
```

---

## 3. Komponenttien yksityiskohdat

### MarkdownCell.tsx

Markdown-solulla on kaksi tilaa: *editointi* ja *lukutila*.
* Editointitila käynnistyy kaksoisklikistä tai erillisestä Edit-painikkeesta.
* Kun solu menettää fokuksen (blur) tai käyttäjä painaa `Esc`-painiketta, tallennetaan sisältö ja siirrytään lukutilaan, jossa teksti renderöidään kauniisti warm-neutral/Georgia-teemalla.

```tsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export const MarkdownCell = ({ cell, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <textarea
        className="w-full p-3 font-mono bg-neutral-900 border border-amber-500/30 text-amber-50 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
        value={cell.content}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        autoFocus
      />
    );
  }

  return (
    <div 
      className="prose prose-amber max-w-none p-3 font-serif cursor-pointer hover:bg-neutral-800/40 rounded transition-colors"
      onDoubleClick={() => setIsEditing(true)}
    >
      {cell.content || <span className="text-neutral-500 italic">Tyhjä markdown-solu (kaksoisklikkaa muokataksesi)</span>}
    </div>
  );
};
```

### CodeCell.tsx

Koodisolu tarjoaa interaktiivisen syötteen, joka suorittaa pyynnön backendille.

```tsx
export const CodeCell = ({ cell, onChange, onExecute }) => {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded overflow-hidden">
      {/* Komentorivi */}
      <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 border-b border-neutral-800">
        <span className="font-mono text-amber-500 font-bold">$ clible</span>
        <input
          type="text"
          className="flex-1 font-mono bg-transparent text-neutral-100 border-none outline-none focus:ring-0"
          value={cell.content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/read John 3:16"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onExecute();
          }}
        />
        <button 
          onClick={onExecute}
          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded transition-colors"
        >
          Run
        </button>
      </div>

      {/* Tuloksen renderöintialue */}
      {cell.resultJson && (
        <div className="p-3 bg-neutral-950 font-sans text-neutral-300 border-t border-neutral-900">
          <ResultRenderer type={cell.resultJson.type} data={cell.resultJson.data} />
        </div>
      )}
    </div>
  );
};
```

---

## 4. Solujen järjesteleminen ja UX

* **Siirtopainikkeet:** Jokaisen solun oikeassa laidassa (tai leijuvassa valikossa) on painikkeet `Siirrä ylös` ja `Siirrä alas`.
* **Lisäys-CTA:** Solujen välissä on pieni leijuva painike, josta voi klikata joko `+ Markdown` tai `+ CLI` luodakseen uuden solun suoraan kyseiseen väliin.
* **Automaattinen tallennus (Debounce):** Kun soluja muokataan tai järjestellään, lähetetään dynaamiset päivitykset taustalla backendin `/api/notebooks/{id}/cells` -rajapintaan (esim. 1 sekunnin viiveellä viimeisestä muokkauksesta).
