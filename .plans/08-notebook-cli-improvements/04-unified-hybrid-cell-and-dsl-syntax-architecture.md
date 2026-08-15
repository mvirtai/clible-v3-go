# Arkkitehtuurisuunnitelma: Unified Hybrid Cell & Clible Magic DSL

Tässä dokumentissa määritellään **Unified Hybrid Cell** -arkkitehtuuri ja uusi **Clible Magic DSL** -syntaksi. Tavoitteena on yhdistää vanhat erilliset Markdown- ja CLI-solut yhdeksi saumattomaksi, esteettisesti miellyttäväksi ja erittäin tehokkaaksi muistiinpanotyökaluksi.

---

## 1. Visio ja Käyttäjäkokemus

Nykyinen kahtiajako CLI-koodisolujen (`$ clible /read ...`) ja Markdown-solujen välillä poistuu. Tilalle tulee moderni **Hybrid Notebook Cell**, jossa teologinen teksti, reaaliaikaiset raamattunoudot, hakukyselyt ja älykkäät teema-analyysit elävät samassa dokumentissa.

```text
+-----------------------------------------------------------------------------+
|  Muistiinpanot Roomalaiskirjeestä                                            |
|                                                                             |
|  Paavali tiivistää vanhurskauttamisen uskon kautta:                         |
|                                                                             |
|  @Room 3:23-24 => KR92                                                      |
|  +-----------------------------------------------------------------------+  |
|  | [Room 3:23-24 (KR92)]                                                 |  |
|  | "Sillä kaikki ovat syntiä tehneet ja ovat Jumalan kirkkautta vailla ja |  |
|  |  lahjaksi vanhurskautetaan hänen armostaan..."                        |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  Vertaillaanpa tätä KJV-käännökseen: @Room 3:24 ? KR92 : KJV                |
|                                                                             |
|  Avainteemat tästä luvusta: ^ => #themes                                    |
|  [#synti (4)] [#armo (6)] [#vanhurskaus (8)] [#usko (12)]                   |
+-----------------------------------------------------------------------------+
```

---

## 2. Clible Magic DSL -kielioppi ja Syntaksisäännöt

Clible Magic DSL yhdistää funktionaalisen ohjelmoinnin ja modernien muistiinpanosovellusten parhaat puolet käyttäen selkeitä symboleita: `@`, `?`, `=>`, `^` ja `? :` (ternary).

### A. Raamattuviittaukset ja Noudot (`@` ja `=>`)

| Syntaksi | Toiminto | Esimerkki / Kuvaus |
| :--- | :--- | :--- |
| `@<viite>` | Hakee jakeen oletuskäännöksellä | `@Joh 3:16`, `@Room 8:28-30` |
| `@<viite> => <käännös>` | Hakee jakeen määritellyllä käännöksellä | `@Joh 3:16 => KR92`, `@Ps 23:1 => KJV` |
| `@<viite> => [<k1>, <k2>]` | Monikäännösvertailu rinnakkain | `@Joh 1:1 => [KR92, KR38, KJV]` |
| `@<viite> => #refs` | Hakee dynaamiset ristiviitteet | `@Room 8:28 => #refs` |
| `@<viite> => :<tyyli>` | Visuaalisen esitysmuodon valinta | `:card` (kortti), `:quote` (lainaus), `:compact` (rivi) |

### B. Haku ja Kyselyt (`?` ja `=>`)

| Syntaksi | Toiminto | Esimerkki / Kuvaus |
| :--- | :--- | :--- |
| `? "<hakusana>"` | Tekstihaku Raamatusta | `? "rakkaus"`, `? "uusi liitto"` |
| `? "<hakusana>" in @<kirja>` | Kohdennettu haku tiettyyn kirjaan | `? "armo" in @Room => KR92` |
| `? "<hakusana>" => limit:<n>` | Hakutulosten rajaus | `? "toivo" => limit:5` |
| `? /<regex>/ => <käännös>` | Säännöllinen lausekehaku | `? /vanhurska.*/ => KR92` |

### C. Ternary- ja Ehdolliset Operaatiot (`? :`)

Ternary-operaattori tarjoaa intuitiivisen tavan vertailla käännöksiä tai valita esitysmuotoja:

1. **Käännösvertailu rinnakkain:**
   ```text
   @Joh 3:16 ? KR92 : KJV
   ```
   *Renderöi elegantin 2-palstaisen vertailunäkymän näiden käännösten välillä.*

2. **Käännösketju / Fallback:**
   ```text
   @Apteg 2:38 ? KR92 : (KR38 ? KR38 : WEB)
   ```

3. **Ehdollinen esitysmuoto:**
   ```text
   @Matt 5:3-10 ? :table : :cards
   ```

### D. Kontekstuaalinen Soluanalyysi ja Taikaoperaattorit (`^` ja `=>`)

Korvaa vanhat komentorivipohjaiset `/themes`- ja `/suggest`-komennot ilmeikkäällä ja joustavalla nuolisyntaksilla:

| Syntaksi | Toiminto | Vastaava vanha CLI-komento |
| :--- | :--- | :--- |
| `^ => #themes` | Analysoi edellisen solun avainteemat | `/themes --ref=up --n=1` |
| `^3 => #themes` | Analysoi 3 edellistä solua | `/themes --ref=up --n=3` |
| `^all => #themes => limit:15` | Analysoi koko muistikirjan teemat | `/themes --ref=all --limit=15` |
| `^ => #suggest` | Ehdottaa jakeita solun sisällön pohjalta | `/suggest --ref=up` |
| `@Joh 3:16 => #suggest` | Hakee teologisesti läheisiä jakeita | `/suggest` jakeelle Joh 3:16 |

---

## 3. Inline vs. Block Magic -renderöinti

Clible Magic DSL toimii kahdella tasolla:

1. **Inline Magic (Leipätekstin seassa):**
   - Esimerkki: `Paavali muistuttaa meitä toivosta (@Room 5:5) ja rauhasta (@Fil 4:7 => KR92).`
   - Renderöityy siistiksi, interaktiiviseksi **Magic Chipiksi**, jonka päälle viemällä (hover) näkyy jakeen esikatselu ja klikkaamalla aukeaa lukutila.
2. **Block Magic (Itsenäisellä rivillä):**
   - Rivi, joka sisältää pelkän lausekkeen (esim. `@Joh 3:16-18 => KR92` tai `? "ilo" => limit:3`), renderöityy täysikokoiseksi rikkaaksi kortiksi, jossa on jaevalinnat, käännöksen pikanapit ja "Freeze"-toiminto.

---

## 4. Käyttöliittymäarkkitehtuuri (React 19 & TailwindCSS v4)

### A. Optimistinen tilanhallinta (`useOptimistic` + `useTransition`)

Kun käyttäjä kirjoittaa tai muokkaa taikalauseketta:
1. React 19:n `useOptimistic` luo heti hohtavan kultaisen/oranssin **Skeleton Loader** -tilan (`"⏳ Haetaan jaetta Joh 3:16 (KR92)..."`).
2. Asynkroninen haku (`useTransition`) hakee backendistä jakeet ilman käyttöliittymän jäätymistä.
3. Vastaus asettuu solun välimuistiin (`resultJson`), jolloin lohko renderöityy viiveettä ilman layout-välähdyksiä.

### B. Freeze & Melt (Jäädytä & Sulata)

- **Freeze (Jäädytä):** Korvaa taikalausekkeen staattisella Markdown-lainauksella. Hyödyllinen julkaisua, vientiä tai pysyvää arkistointia varten.
- **Melt (Sulata):** Palauttaa staattisen lainauksen takaisin reaktiiviseksi `@`-lausekkeeksi yhdellä klikkauksella.

### C. Autocomplete / IntelliSense -ponnahdusikkuna

Kun käyttäjä kirjoittaa editorissa `@`, `?` tai `=>`:
- Aukeaa kevyt, tummasävyinen kelluva valikko, joka ehdottaa:
  - `@` -> Raamatun kirjoja ja lukuja (`Joh`, `Room`, `1Kor`, `Ps`...)
  - `=>` -> Käännöksiä (`KR92`, `KR38`, `KJV`, `WEB`), funktioita (`#refs`, `#themes`, `#suggest`) ja tyylejä (`:card`, `:quote`, `:compact`).

---

## 5. Backend- ja Tietokantamuutokset

1. **Tietomalli (`Cell` & `CellType`):**
   - Tuetaan `CellTypeHybrid = "hybrid"` (tai yhtenäistetty solutyyppi, joka korvaa vanhat `markdown`/`code` -tyypit säilyttäen taaksepäin yhteensopivuuden).
2. **DSL-parseri Backendissä (`internal/dsl/`):**
   - Nopea Lexer ja AST-jäsennin, joka tunnistaa `@`, `?`, `^`, `=>`, `? :` -operaatiot.
   - Suorittaa rinnakkaiset jakeiden ja hakujen haut `context.Context`-aikakatkaisuilla.
3. **API-reitti:**
   - `POST /api/notebooks/{id}/cells/{cellId}/eval` tai tehostettu `ExecuteCellCommand`.

---

## 6. Toteutuksen etenemisvaiheet (Roadmap)

1. **Vaihe 1: DSL Lexer & AST Parser (Backend & Shared Types)**
   - Määritellään DSL-syntaksin säännöt, kirjoitetaan parseri ja kattavat yksikkötestit Go-backendille.
2. **Vaihe 2: Frontend DSL Highlighter & Inline Chip Parser**
   - Luodaan Markdown-laajennus / regex-parseri, joka tunnistaa `@viitteet` ja muotoilee ne interaktiivisiksi komponenteiksi.
3. **Vaihe 3: Unified Hybrid Cell -komponentti & React 19 Optimistic State**
   - Korvataan vanha `CodeCell.tsx` ja `MarkdownCell.tsx` uudella `HybridCell.tsx` -komponentilla.
4. **Vaihe 4: Autocomplete & Magic Helpers (`@`, `=>`, `?`)**
   - Lisätään älykäs kirjoitusavustin ja pikanäppäimet.
5. **Vaihe 5: Freeze / Melt & Taaksepäin yhteensopivuus**
   - Varmistetaan, että vanhat `/read`- ja `$ clible` -solut toimivat ja voidaan migroida automaattisesti uuteen syntaksiin.
