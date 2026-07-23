# Suunnitelma 06B: Tekstin typografia ja luettavuus lukunäkymässä

Tämä dokumentti kuvaa yksityiskohtaisesti erillisen, rajatun parannuksen lukunäkymän tekstin esitystapaan. Se on tarkoituksella pidetty erillään Vaiheesta A (kontekstinavigaatio, lukumerkit, merkinnät, etenemä) — kyseessä on puhtaasti visuaalinen/typografinen muutos, ei uutta tilaa tai backend-logiikkaa.

---

## Lähtökohta: mitä data oikeasti tarjoaa

Ennen ratkaisun suunnittelua tarkistettiin faktapohjaisesti kaikki projektissa käytössä olevat suomenkieliset XML-lähteet:

- `xml_translations/fin-1992.xml`
- `xml_translations/fin-1776.xml`
- `xml_translations/fin-biblia-33-38.osis.xml`

**Havainto:** kaikki kolme sisältävät ainoastaan `<verse>`-tagit. Ei `<p>`-tageja, ei `<heading>`-elementtejä, ei mitään merkintää kappalejaosta — myöskään OSIS-muotoinen lähde ei tässä konkreettisessa tiedostossa käytä formaatin tukemia rakenne-elementtejä. Backendin `xml_parser.go` ei näin ollen poimi eikä `models.Verse`-tietorakenne (`translation_id`, `book_id`, `chapter`, `verse`, `text`) tallenna mitään kappalejakoon liittyvää tietoa.

**Johtopäätös:** todellisia, alkuperäiseen tekstiin perustuvia kappalejakoja ei voida näyttää luottavasti millään nykyisellä lähteellä. Tämä ei ole korjattavissa parserimuutoksella, vaan vaatisi kokonaan toisen, rikkaamman lähdeformaatin (esim. USX). Tämä suunnitelma **ei yritä ratkaista tätä** — se parantaa luettavuutta sillä tiedolla, joka on oikeasti saatavilla: kirjan tunnus ja kirjallisuuslaji (genre).

### Sivuhavainto: dialogimerkintä fin-1992:ssa

fin-1992 merkitsee dialogin ajatusviivalla suoraan jaetekstin sisällä, esim. (Gen 2:23): `-- Tämä se on! Tämä on luu minun luustani...`. Tämä on ainoa rakenteellinen vihje lähteessä, mutta sitä ei käytetä tässä suunnitelmassa heuristiikan pohjana, koska merkintä ei ole systemaattinen kaikissa käännöksissä eikä kaikissa jakeissa. Mahdollinen tuleva jatkokehitys, ei osa tätä PR:ää.

---

## Nykytila: lukunäkymän tekstirenderöinti

`frontend/src/components/VerseReader.tsx`, jaetekstin renderöintikohta:

```tsx
<p className="text-xl leading-relaxed font-serif" style={{ color: 'var(--text-2)' }}>
  {data.verses.length > 0 ? (
    data.verses.map((v, idx) => (
      <span
        key={`${v.chapter}-${v.verse}-${idx}`}
        className="inline px-1 py-0.5 rounded-md transition-colors hover:bg-[var(--accent-bg)] cursor-pointer"
        onClick={() => handleVerseClick(v)}
      >
        <sup className="mx-0.5 align-super font-sans text-[0.55em] font-semibold" style={{ color: 'var(--accent)' }}>
          {v.verse}
        </sup>
        {v.text}
        {idx < data.verses.length - 1 ? ' ' : null}
      </span>
    ))
  ) : (
    <span style={{ color: 'var(--muted)' }}>{strings.noVersesFound}</span>
  )}
</p>
```

Kaikki jakeet — riippumatta kirjasta tai genrestä — renderöityvät samalla tavalla: yhtenä juoksevana `<p>`-elementtinä, jossa jokainen jae on `inline`-tyylinen `<span>`. Tämä toimii kohtuullisesti proosalle, mutta:

1. **Ei ylärajaa rivin pituudelle** — leveällä näytöllä rivi voi kasvaa huomattavan pitkäksi, mikä heikentää luettavuutta (typografian perussääntö: optimaalinen rivinpituus on noin 60–75 merkkiä).
2. **Runoudelle sopimaton** — Psalmien, Sananlaskujen ja muun heprealaisen runouden keskeinen rakenne on parallelismi (kaksi riviä toistaa tai vastakkaisasettaa saman ajatuksen). Juoksevaan tekstiin valettuna tämä rakenne katoaa kokonaan.

---

## Ratkaisu

### Osa 1: Kirjallisuuslajin (genre) luokittelu

`bible_structure.json` sisältää jo kentän `testament` (`OT`/`NT`), mutta ei genre-tietoa. Genre on kuitenkin kiinteä, yleisesti tunnettu luokittelu, joka voidaan koodata suoraan frontendiin ilman migraatiota tai parserimuutosta.

**Uusi tiedosto: `frontend/src/utils/bookGenre.ts`**

```ts
export type BookGenre = 'prose' | 'poetry';

/**
 * Runoudeksi luokitellut kirjat: heprealainen runous, jonka keskeinen piirre
 * on parallelismi (rivipari toistaa/vastakkaisasettaa ajatuksen).
 * Lähde: yleisesti hyväksytty Raamatun kirjallisuuslajien jaottelu.
 */
const POETRY_BOOKS = new Set<string>([
  'JOB',  // Job
  'PSA',  // Psalmit
  'PRO',  // Sananlaskut
  'ECC',  // Saarnaaja (osin runollinen, käsitellään runoutena)
  'SNG',  // Laulujen laulu
  'LAM',  // Valitusvirret
]);

export function getBookGenre(bookId: string): BookGenre {
  return POETRY_BOOKS.has(bookId) ? 'poetry' : 'prose';
}
```

> **Rajaus:** profeetalliset kirjat (Isaiah, Jeremiah jne.) sisältävät paikoin runomittaista tekstiä, mutta ne on tässä ensimmäisessä versiossa luokiteltu proosaksi yksinkertaisuuden vuoksi — ne ovat rakenteellisesti sekamuotoisia (proosakerronta + runolliset oraakkelit), ja niiden jakaminen vaatisi jae-tarkkaa tietoa, jota ei ole saatavilla. Tarvittaessa laajennettavissa myöhemmin.

### Osa 2: Kaksi renderöintitapaa jaetekstille

**Muutos `VerseReader.tsx`:ään.** Nykyinen renderöintilohko korvataan ehdollisella logiikalla, joka valitsee tyylin `getBookGenre`-funktion perusteella. Tarvitaan kirjan tunnus, joka on jo pääteltävissä samasta `parseCurrentChapter`-apufunktiosta, joka lisättiin PR 1:ssä (Osa 1, kontekstinavigaatio).

```tsx
import { getBookGenre } from '../utils/bookGenre';

// ... komponentin sisällä, currentChapterInfo on jo olemassa PR 1:stä
const genre = currentChapterInfo ? getBookGenre(currentChapterInfo.bookId) : 'prose';
```

**Proosa-renderöinti** (nykyistä mallia parannettuna — rajattu rivinpituus):

```tsx
<p
  className="text-xl leading-relaxed font-serif max-w-[38rem]"
  style={{ color: 'var(--text-2)' }}
>
  {/* ...nykyinen jae-map, ennallaan... */}
</p>
```

`max-w-[38rem]` vastaa Tailwindin `ch`-yksikköä karkeasti noin 65 merkin rivinpituuteen tämän fontin ja koon (`text-xl`) yhdistelmällä. Tarkka arvo kannattaa hienosäätää manuaalisesti selaimessa, koska `ch`-yksikkö riippuu fontista — `max-w-[65ch]` on typografisesti täsmällisempi valinta ja suositellaan kokeiltavaksi ensin:

```tsx
<p className="text-xl leading-relaxed font-serif max-w-[65ch]" ...>
```

**Runous-renderöinti** (uusi, jae omalla rivillään):

```tsx
<div className="space-y-2 max-w-[65ch]">
  {data.verses.map((v, idx) => (
    <div
      key={`${v.chapter}-${v.verse}-${idx}`}
      className="flex gap-2 items-baseline rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--accent-bg)] cursor-pointer"
      onClick={() => handleVerseClick(v)}
    >
      <sup
        className="font-sans text-[0.55em] font-semibold shrink-0"
        style={{ color: 'var(--accent)' }}
      >
        {v.verse}
      </sup>
      <span className="text-xl leading-relaxed font-serif" style={{ color: 'var(--text-2)' }}>
        {v.text}
      </span>
    </div>
  ))}
</div>
```

Huomioita:
- `flex gap-2 items-baseline` pitää jaenumeron ja tekstin samalla perusviivalla, samaan tapaan kuin nykyinen `<sup>`-asettelu, mutta jae saa omaan `<div>`-rivinsä
- Tyhjän tuloksen käsittely (`strings.noVersesFound`) pysyy yhteisenä molemmille tiloille — se sijoitetaan ehdon ulkopuolelle, ennen genre-valintaa

### Osa 3: Yhdistetty ehtorakenne

```tsx
{data.verses.length === 0 ? (
  <p style={{ color: 'var(--muted)' }}>{strings.noVersesFound}</p>
) : genre === 'poetry' ? (
  <div className="space-y-2 max-w-[65ch]">
    {/* runous-renderöinti, ks. yllä */}
  </div>
) : (
  <p className="text-xl leading-relaxed font-serif max-w-[65ch]" style={{ color: 'var(--text-2)' }}>
    {/* proosa-renderöinti, nykyinen malli */}
  </p>
)}
```

---

## Testaus

### Yksikkötestit

**`frontend/src/utils/bookGenre.test.ts`** (uusi)
```ts
import { describe, it, expect } from 'vitest';
import { getBookGenre } from './bookGenre';

describe('getBookGenre', () => {
  it('luokittelee Psalmit runoudeksi', () => {
    expect(getBookGenre('PSA')).toBe('poetry');
  });

  it('luokittelee Genesiksen proosaksi', () => {
    expect(getBookGenre('GEN')).toBe('prose');
  });

  it('luokittelee tunnistamattoman kirjan proosaksi (turvallinen oletus)', () => {
    expect(getBookGenre('XXX')).toBe('prose');
  });
});
```

### Komponenttitestit

Olemassa oleva `VerseReader.test.tsx` sisältää testejä, jotka odottavat jaetekstin löytyvän `container!.textContent`-sisällöstä (esim. `'For God so loved the world'`) ja jae-`span`-elementtejä (`container!.querySelectorAll('span.cursor-pointer')`). Kun runous-renderöinti käyttää `<div>`-elementtejä `<span>`-elementtien sijaan, **nykyiset testit eivät riko**, koska testiaineisto (`JHN 3`, Johanneksen evankeliumi) on proosaa — mutta lisätään erikseen testi runous-tilalle:

```tsx
it('renders poetry books with one verse per line', async () => {
  vi.mocked(apiService.getVerses).mockResolvedValue({
    reference: 'PSA 23',
    text: '...',
    translationName: 'World English Bible',
    verses: [
      { bookName: 'PSA', chapter: 23, verse: 1, text: 'The LORD is my shepherd...' },
      { bookName: 'PSA', chapter: 23, verse: 2, text: 'He makes me lie down...' },
    ],
  });

  const r = createRoot(container!);
  root = r;
  await act(async () => {
    r.render(<VerseReader translation="web" activeReference="PSA 23" />);
  });
  await act(async () => { await Promise.resolve(); });

  // Runous-tilassa jae-elementit ovat <div>, eivät <span>
  const verseRows = container!.querySelectorAll('div.cursor-pointer');
  expect(verseRows.length).toBe(2);
});
```

### Manuaalinen testaus

1. Hae `Psalmit 23` — vahvista, että jokainen jae on omalla rivillään
2. Hae `Johannes 3` — vahvista, että teksti pysyy juoksevana kuten ennenkin
3. Testaa leveällä näytöllä (esim. 1920px ikkuna) — vahvista, että rivinpituus ei kasva liian pitkäksi kummassakaan tilassa
4. Klikkaa jaetta molemmissa tiloissa — vahvista, että `handleVerseClick`-navigointi toimii identtisesti

---

## Yhteenveto: uudet ja muokattavat tiedostot

| Tiedosto | Toimenpide |
|---|---|
| `frontend/src/utils/bookGenre.ts` | **Uusi** — genre-luokittelu |
| `frontend/src/utils/bookGenre.test.ts` | **Uusi** — yksikkötestit |
| `frontend/src/components/VerseReader.tsx` | **Muokattu** — ehdollinen renderöinti genren mukaan, rajattu rivinpituus |
| `frontend/src/components/VerseReader.test.tsx` | **Muokattu** — uusi testi runous-renderöinnille |

Ei migraatioita, ei backend-muutoksia, ei uusia API-kutsuja.

---

## Avoimet kysymykset ennen toteutusta

1. **`max-w-[65ch]` vai `max-w-[38rem]`?** — `ch`-yksikkö on typografisesti täsmällisempi, mutta kannattaa kokeilla selaimessa molemmilla kielillä (suomenkieliset sanat ovat keskimäärin pidempiä kuin englanninkieliset, mikä voi vaikuttaa koettuun rivinpituuteen samalla merkkimäärällä).
2. **Saarnaajan (ECC) luokittelu** — se sisältää sekä runollisia että proosamaisia jaksoja. Ehdotettu oletusluokittelu on "runous", mutta tätä voi perustellusti kyseenalaistaa.
3. **Profeetalliset kirjat** — jätetäänkö kokonaan proosaksi tässä versiossa (suositus), vai halutaanko jo nyt tehdä karkea jako esim. Jesaja/Jeremia osittain runoudeksi? Suositus: jätetään proosaksi, koska jae-tarkkaa tietoa ei ole, ja väärä luokittelu olisi pahempi kuin konservatiivinen oletus.

---

*Luotu: 2026-07-22*
