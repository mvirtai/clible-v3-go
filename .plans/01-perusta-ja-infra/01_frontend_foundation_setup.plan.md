# Suunnitelma: 01_frontend_foundation_setup (Yksityiskohtainen ja opetuksellinen opas)

Tämä suunnitelma opastaa sinua askel askeleelta Clible-v3-go -projektin frontendin perustustyössä. Opit ymmärtämään jokaisen tiedoston roolin, arkkitehtoniset päätökset ja TDD (Test Driven Development) -työtavan käytännössä.

---

## 1. Vaihe 1: Testiympäristön asennus ja konfigurointi

Tavoitteena on saattaa Vitest-testiajo toimintakuntoon ja varmistaa, että Vite-konfiguraatio osaa kääntää sekä tyylit että testit samalla työkaluketjulla.

### 1.1 Viten ja Vitestin asetukset (`vite.config.ts`)

Vitest hyödyntää Viten omaa kääntäjää (Esbuild). Tämä on suuri etu verrattuna vanhempaan Jestiin, sillä meidän ei tarvitse konfiguroida erillisiä Babel-kääntäjiä TypeScriptille ja JSX-koodille.

* **Opetuksellinen huomio:** `/// <reference types="vitest" />` on TypeScriptin kolmen vinoviivan direktiivi. Se tuo Vitestin tyypit (kuten `test`-konfiguraatiolohkon) globaalisti saataville tässä tiedostossa.
* **Asetus `globals: true`**: Mahdollistaa testausfunktioiden (`describe`, `test`, `expect`, `beforeEach` jne.) käytön ilman, että niitä tarvitsee importata jokaiseen testitiedostoon erikseen (`import { test } from 'vitest'`).
* **Asetus `environment: 'happy-dom'`**: Happy-dom emuloi selaimen rajapintoja (kuten `window`, `document` ja `fetch`) Node.js-ympäristössä. Se on huomattavasti kevyempi ja nopeampi kuin perinteinen `jsdom`.

### 1.2 `package.json` -skriptit

Lisäämme kaksi testiskriptiä:

* `"test": "vitest run"`: Ajaa testit kerran ja poistuu (käytetään myöhemmin CI/CD-automaatiossa).
* `"test:watch": "vitest"`: Jättää testiajon tarkkailemaan tiedostoja (Watch Mode). Aina kun tallennat koodin, Vitest ajaa vain muuttuneet testit uudelleen sekunnin murto-osassa. Tämä on TDD:n ydin!

---

## 2. Vaihe 2: TypeScript-tyypit ja Go-rajapintojen mäppäys (`src/types/`)

Kun kirjoitamme TypeScriptiä, haluamme täyden tyyppiturvallisuuden. Jos backend muuttaa API-vastauksen rakennetta, haluamme TypeScript-kääntäjän huomauttavan siitä heti build-vaiheessa, emmekä halua selvittää asiaa vasta sovelluksen kaatuessa selaimessa.

### 2.1 Raamattutyypit (`src/types/bible.ts`)

Määrittelemme tyypit, jotka mäppäävät Go backendin JSON-rakenteisiin:

* **`Verse`**: Yksittäinen jae. Go-puolella tämä vastaa `FrontendVerse` -structia.
* **`BibleResponse`**: Kokonainen luku tai jaeryhmä vastauksena hakuun. Vastaa Go-puolella `FrontendBibleResponse` -structia.
* **`InstalledTranslation`**: Tietokantaan asennettu käännös.
* **`AvailableTranslation`**: Käännös, joka on saatavilla netistä, mutta ei välttämättä vielä asennettu. Se perii (`extends`) asennetun käännöksen kentät ja lisää vapaaehtoisen `sizeMb`-kentän.
* **`TextStats` & `WordFrequency`**: Analytiikkadatan tyypit, jotka palautetaan endpointista `POST /api/analytics/analyze`. `WordFrequency` käyttää rakennetta `{ name: string, value: number }`, koska tämä on suoraan yhteensopiva Recharts-kaaviokirjaston kanssa.

### 2.2 Hakutyypit (`src/types/searchQuery.ts` & `src/types/search.ts`)

* **`SearchQueryOptions`**: Käyttäjän valitsemat hakuehdot (hakusanat, operaattorit, rajaukset).
* **`SearchHistoryEntry`**: Tietokantaan tallennettu aiempi haku. Huomaa camelCase-mäppäys: backendin `query_text` on frontendissä `queryText`, ja `searched_at` on `searchedAt`.
* **`SearchResponse`**: FTS5-hakutulokset backendiltä. Sisältää osumarivit (`rows`) ja hakutilastoja (`statistics`).

---

## 3. Vaihe 3: Apufunktiot ja kielituki (`src/utils/`)

Siirrämme ja sovitamme kaksi keskeistä apumoduulia:

### 3.1 Monikielisyys (`src/utils/i18n.ts`)

Toteutamme kevyen ja dynaamisen käännösjärjestelmän ilman raskaita kolmannen osapuolen kirjastoja (kuten `i18next`).

* Määritellään tyyppi `UILanguage = 'fi' | 'en'`.
* Luodaan sanasto-objektit molemmille kielille.
* Luodaan apufunktio `t(lang: UILanguage)`, joka palauttaa oikean sanaston. TypeScript varmistaa, että kaikki sanaston avaimet ovat identtiset molemmilla kielillä!

### 3.2 Raamatun kirjojen normalisointi (`src/utils/bookNames.ts`)

Tämä tiedosto vastaa siitä, että käyttäjän syöttämät jaeviitteet tunnistetaan oikein.

* **Normalisointi**: Kirja "1. Moos" tai "Genesis" tai "Gen" pitää pystyä mäppäämään sisäiseksi tunnisteeksi `"GEN"`.
* **Kieli-mäppäykset**: Sisältää dynaamisen kirjojen nimien kääntämisen (esim. `"GEN"` -> suomeksi "Genesis" tai englanniksi "Genesis").

### 3.3 Testivetoinen kehitys (TDD)

Kopioimme tiedoston `bookNames.test.ts` v2-projektista. Testit varmistavat muun muassa:

* Tunnistaako koodi lyhenteet oikein ("Joh" -> "John").
* Toimiiko viitteiden display-muotoilu oikein suomeksi ja englanniksi.
* Ajamalla `pnpm test` näet heti, jos jokin v2:sta tuotu koodirivi käyttää väärää (esim. vanhaa snake_case-tunnistetta).

---

## 4. Vaihe 4: API-asiakaskerros (`src/services/api.ts`)

Luomme uuden `ApiService`-luokan, joka eristää HTTP-fetch-kutsut React-komponenttien sisältä.

### 4.1 Erottelu (Separation of Concerns)

React-komponenttien tulisi vastata vain käyttöliittymän piirtämisestä ja tilanhallinnasta. Jos komponentit itse tekevät fetch-pyyntöjä ja käsittelevät virheitä, sovelluksesta tulee nopeasti vaikeasti testattava ja ylläpidettävä. `ApiService` kokoaa kaikki yhteydet backend-endpointteihin yhteen luokkaan ja tarjoaa siistit asynkroniset metodit, jotka palauttavat suoraan oikein tyypitettyä dataa.

### 4.2 API-asiakkaan toteutus (`src/services/api.ts`)

Toteutamme standardinmukaisen asynkronisen palveluluokan, joka yhdistää backendin HTTP REST API -rajapintaan.

```typescript
// src/services/api.ts
import { BibleResponse, InstalledTranslation, TextStats, ComparisonResult } from '../types/bible';
import { SearchHistoryEntry } from '../types/searchQuery';

export class ApiService {
  private baseUrl = '/api';

  /**
   * Hakee jakeet annetulla viitteellä ja käännöksellä.
   * Vastaa endpointtia: GET /api/verses?ref=...&translation=...
   */
  async getVerses(reference: string, translation: string): Promise<BibleResponse> {
    const res = await fetch(`${this.baseUrl}/verses?ref=${encodeURIComponent(reference)}&translation=${encodeURIComponent(translation)}`);
    if (!res.ok) throw new Error('Failed to fetch verses');
    return res.json();
  }

  /**
   * Suorittaa haun annettujen ehtojen mukaisesti.
   * Vastaa endpointtia: GET /api/search?q=...&translation=...&regex=...
   */
  async search(query: string, translation: string, regex: boolean): Promise<any> {
    const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&translation=${encodeURIComponent(translation)}&regex=${regex}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  }

  /**
   * Hakee tietokantaan asennetut käännökset.
   * Vastaa endpointtia: GET /api/translations
   */
  async getTranslations(): Promise<InstalledTranslation[]> {
    const res = await fetch(`${this.baseUrl}/translations`);
    if (!res.ok) throw new Error('Failed to fetch translations');
    return res.json();
  }

  /**
   * Hakee viimeisimmät haut hakuhistoriasta.
   * Vastaa endpointtia: GET /api/history
   */
  async getHistory(): Promise<SearchHistoryEntry[]> {
    const res = await fetch(`${this.baseUrl}/history`);
    if (!res.ok) throw new Error('Failed to fetch search history');
    return res.json();
  }

  /**
   * Tallentaa uuden hakuprojektin historiaan.
   * Vastaa endpointtia: POST /api/history
   */
  async addSearch(historyEntry: Omit<SearchHistoryEntry, 'id' | 'searchedAt'>): Promise<void> {
    const res = await fetch(`${this.baseUrl}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyEntry),
    });
    if (!res.ok) throw new Error('Failed to save search history');
  }

  /**
   * Suorittaa tekstianalyysin yhdelle käännökselle ja jaeviitteelle.
   * Vastaa endpointtia: POST /api/analytics/analyze
   */
  async analyze(reference: string, translationId: string): Promise<TextStats> {
    const res = await fetch(`${this.baseUrl}/analytics/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, translationId }),
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
  }

  /**
   * Vertailee kahta eri käännöstä toisiinsa.
   * Vastaa endpointtia: POST /api/analytics/compare
   */
  async compare(reference: string, translationId1: string, translationId2: string): Promise<ComparisonResult> {
    const res = await fetch(`${this.baseUrl}/analytics/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, translationId1, translationId2 }),
    });
    if (!res.ok) throw new Error('Comparison failed');
    return res.json();
  }
}

export const apiService = new ApiService();
```

### 4.3 TDD: API-yhteyskerroksen testaus (`src/services/api.test.ts`)

Jotta voimme luottaa API-yhteyskerrokseemme, kirjoitamme sille yksikkötestit. Koska emme halua testien tekevän oikeita HTTP-verkkopyyntöjä backend-palvelimelle (mikä tekisi testeistä hitaita ja riippuvaisia ulkoisista tekijöistä), **mockaamme** eli matkimme selaimen globaalia `fetch`-funktiota Vitestin avulla.

Luo tiedosto `src/services/api.test.ts` seuraavalla rakenteella:

```typescript
// src/services/api.test.ts
import { apiService } from './api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ApiService', () => {
  beforeEach(() => {
    // Tyhjennetään mahdolliset aiemmat mock-kutsut ennen jokaista testiä
    vi.restoreAllMocks();
  });

  it('hakee jakeet onnistuneesti backendiltä (getVerses)', async () => {
    const mockResponse = {
      reference: 'John 3:16',
      verses: [{ bookName: 'John', chapter: 3, verse: 16, text: 'For God so loved...' }],
      text: 'For God so loved...',
      translationName: 'World English Bible',
    };

    // Asetetaan globaali fetch palauttamaan valevastaus
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await apiService.getVerses('John 3:16', 'web');
    
    expect(result.reference).toBe('John 3:16');
    expect(result.verses[0].text).toContain('God so loved');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/verses?ref=John%203%3A16&translation=web')
    );
  });

  it('heittää virheen jos verses-pyyntö epäonnistuu', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as Response);

    await expect(apiService.getVerses('John 3:16', 'web')).rejects.toThrow('Failed to fetch verses');
  });

  it('hakee asennetut käännökset onnistuneesti (getTranslations)', async () => {
    const mockTranslations = [
      { id: 'web', name: 'World English Bible', language: 'en', format: 'xml', sourceUrl: '', installedAt: '' }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTranslations,
    } as Response);

    const result = await apiService.getTranslations();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('web');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/translations'));
  });

  it('tallentaa hakuhistorian onnistuneesti (addSearch)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    } as Response);

    const payload = {
      queryText: 'forgiveness',
      searchScope: 'book',
      scopeValue: 'PSA',
      translationId: 'web',
      mode: 'phrase',
      resultCount: 5
    };

    await apiService.addSearch(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/history'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload)
      })
    );
  });
});
```

---

## Seuraavat askeleet kehittäjälle

1. **Konfiguroi testaus** (`package.json`, `vite.config.ts`). (Tehty!)
2. **Kirjoita TypeScript-tyypit** kansioon `src/types/`. (Tehty!)
3. **Luo apufunktiot** (`bookNames.ts`, `i18n.ts`) ja niiden testit `src/utils/` -kansioon. (Tehty!)
4. **Aja testit** (`pnpm test`) ja varmista, että normalisoinnit toimivat. (Valmis ajettavaksi!)
5. **Luo API-asiakas** (`src/services/api.ts`) ja sille testitiedosto (`src/services/api.test.ts`) suunnitelman 4. vaiheen mukaisesti. Aja testit ja nauti täydestä TDD-kokemuksesta!
