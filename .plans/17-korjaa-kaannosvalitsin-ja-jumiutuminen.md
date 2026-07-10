# Suunnitelma 17: Käännösvalitsimen jumiutumisen ja ikuisen silmukan korjaus

Tämä ohje auttaa korjaamaan kaksi kriittistä ongelmaa käyttöliittymän käännösten hallinnassa:

1. **Ikuinen silmukka:** `TranslationSelector` tekee tällä hetkellä jatkuvasti pyyntöjä `/api/translations`-rajapintaan, koska `onSelectTranslation` (eli `handleSelectTranslation` tiedostosta `App.tsx`) vaihtuu jokaisella renderöinnillä.
2. **Käyttäjän jumiutuminen:** Jos käyttäjällä ei ole yhtään käännöstä aktivoituna (kuten uudella käyttäjällä), yläpalkin kytkin näyttää vain kiinteän "No translations" -tekstin ilman klikkaus- tai valintamahdollisuutta.

Korjaamme nämä tekemällä `TranslationSelector`-komponentista täysin kontrolloidun (se saa käännökset propseina `App.tsx`-tiedostolta) ja lisäämällä automaattisen aktivointilogiikan yläpalkin valitsimeen.

---

## Vaihe 1: Muutokset tiedostoon `frontend/src/App.tsx`

Teemme kolme muutosta tiedostoon [App.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/App.tsx):

1. Tuodaan `useCallback` Reactista.
2. Kääritään `handleSelectTranslation` `useCallback`-funktioon ja lisätään siihen automaattinen käännöksen linkitys/aktivointi tietokantaan, mikäli valittua käännöstä ei ole vielä asennettu.
3. Lisätään `useEffect`-koukku, joka valitsee automaattisesti ensimmäisen aktiivisen käännöksen, jos valittu käännös on tyhjä tai virheellinen.
4. Välitetään `installedTranslations`-lista `TranslationSelector`-komponentille propsina.

### Koodimuutokset

#### 1. Päivitä React-tuonnit tiedoston alussa

Etsi rivi 1:

```typescript
import { useState, useEffect } from 'react';
```

Korvaa se seuraavalla:

```typescript
import { useState, useEffect, useCallback } from 'react';
```

#### 2. Korvaa `handleSelectTranslation` ja lisää automaattivalinnan `useEffect`

Etsi rivit 87–94:

```typescript
  const handleSelectTranslation = (translation_id: string) => {
    setSelectedTranslation(translation_id);
    if (translation_id) {
      localStorage.setItem('selectedTranslation', translation_id);
    } else {
      localStorage.removeItem('selectedTranslation')
    }
  }
```

Korvaa se seuraavalla toteutuksella, joka käärii funktion `useCallback`-rakenteeseen ja lisää siihen automaattisen käännöksen aktivoinnin (`linkTranslation`) sekä automaattivalinnan kun käännökset latautuvat:

```typescript
  const handleSelectTranslation = useCallback(async (translation_id: string) => {
    setSelectedTranslation(translation_id);
    if (translation_id) {
      localStorage.setItem('selectedTranslation', translation_id);
      
      // Auto-link/activate translation if it's not already installed/linked
      const tr = installedTranslations.find(t => t.id === translation_id);
      if (tr && !tr.installed) {
        try {
          await apiService.linkTranslation(translation_id);
          setTranslationTrigger((p) => !p);
        } catch (err) {
          console.error('Failed to auto-link translation:', err);
        }
      }
    } else {
      localStorage.removeItem('selectedTranslation');
    }
  }, [installedTranslations]);

  // Auto-select first active translation if selectedTranslation is empty or invalid
  useEffect(() => {
    if (installedTranslations.length === 0) return;
    const activeList = installedTranslations.filter((t) => t.installed);
    const exists = activeList.some((t) => t.id === selectedTranslation);
    if (activeList.length > 0 && (!selectedTranslation || !exists)) {
      handleSelectTranslation(activeList[0].id);
    }
  }, [installedTranslations, selectedTranslation, handleSelectTranslation]);
```

#### 3. Päivitä `<TranslationSelector />`-komponentin kutsu

Etsi rivit 379–383:

```typescript
            <TranslationSelector
              selectedTranslation={selectedTranslation}
              onSelectTranslation={handleSelectTranslation}
              refreshTrigger={translationTrigger}
            />
```

Korvaa se välittämällä `translations`-prop `refreshTriggerin` sijaan:

```typescript
            <TranslationSelector
              selectedTranslation={selectedTranslation}
              onSelectTranslation={handleSelectTranslation}
              translations={installedTranslations}
            />
```

---

## Vaihe 2: Muutokset tiedostoon `frontend/src/components/TranslationSelector.tsx`

Yksinkertaistetaan tiedosto [TranslationSelector.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/TranslationSelector.tsx) kokonaan. Poistetaan sieltä sisäinen tilanhallinta ja API-kutsut, ja korvataan ne propsina saatavilla käännöksillä.

Jos käyttäjällä on aktiivisia käännöksiä, näytetään vain ne. Jos käyttäjällä ei ole yhtään aktiivista käännöstä, näytetään kaikki järjestelmässä tarjolla olevat käännökset ja lisätään alkuun "Valitse käännös..." -vaihtoehto, jolloin uusi käyttäjä voi suoraan yläpalkista valita ja aktivoida haluamansa käännöksen.

### Koodimuutokset

Korvaa tiedoston koko sisältö seuraavalla koodilla:

```typescript
// src/components/TranslationSelector.tsx
import React from 'react';
import type { InstalledTranslation } from '../types/bible';
import { Globe } from 'lucide-react';

interface Props {
  selectedTranslation: string;
  onSelectTranslation: (id: string) => void;
  translations: InstalledTranslation[];
}

export const TranslationSelector: React.FC<Props> = ({
  selectedTranslation,
  onSelectTranslation,
  translations,
}) => {
  const uiLanguage = 'fi'; // Kehitysfilosofian kieli

  // Jos käyttäjällä on jo asennettuja käännöksiä, näytetään yläpalkissa vain ne.
  // Jos ei ole yhtään asennettua käännöstä, näytetään kaikki tarjolla olevat käännökset,
  // jotta käyttäjä voi valita käännöksen suoraan yläpalkista.
  const hasActive = translations.some(t => t.installed);
  const list = hasActive
    ? translations.filter(t => t.installed)
    : translations;

  if (!list || list.length === 0) {
    return (
      <div className="text-xs px-3 py-1.5 rounded-full"
        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
        {uiLanguage === 'fi' ? 'Ei käännöksiä' : 'No translations'}
      </div>
    );
  }

  // Näytetään placeholder "Valitse käännös..." vain silloin, kun valittua käännöstä ei ole asetettu
  const showPlaceholder = !selectedTranslation || !list.some(t => t.id === selectedTranslation);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <Globe size={13} style={{ color: 'var(--accent)' }} />
      <select
        value={selectedTranslation}
        onChange={(e) => onSelectTranslation(e.target.value)}
        className="text-sm font-medium outline-none cursor-pointer"
        style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}
      >
        {showPlaceholder && (
          <option value="" disabled>
            {uiLanguage === 'fi' ? 'Valitse käännös...' : 'Select translation...'}
          </option>
        )}
        {list.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.id.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
};
```

---

## Vaihe 3: Laadunvarmistus ja testaus

Kun olet tehnyt koodimuutokset, suorita seuraavat komennot varmistaaksesi, että kaikki kääntyy ja linter ei valita mistään:

1. Aja linter ja TypeScript-tyyppitarkistus:

   ```bash
   task frontend:lint
   ```

2. Rakenna tuotantoversio varmistaaksesi, että niputus onnistuu ilman virheitä:

   ```bash
   task frontend:build
   ```

3. Testaa selaimessa:
   - Rekisteröi uusi käyttäjä (tai poista kaikki käännökset Translation Managerista ja päivitä sivu).
   - Varmista, että yläpalkissa lukee "Valitse käännös..." ja valikko on klikattavissa.
   - Valitse käännös valikosta. Käännöksen tulisi aktivoitua taustalla automaattisesti, ja lukukoneen pitäisi alkaa näyttää kyseistä käännöstä heti.
   - Varmista selaimen kehittäjätyökaluista, ettei `/api/translations` -rajapintaan tehdä toistuvia kutsuja ikuisessa silmukassa.
