# Muistikirjojen CLI-solukomentojen Kehitystiekartta

Tämä dokumentti määrittelee Clible Notebooks -ominaisuuden CLI-komentotulkin pitkän aikavälin kehitystiekartan, soluviittausten kohdentamislogiikan sekä suunnitellut tulevat CLI-komennot.

---

## 1. Visio ja Tavoitteet

Clible Notebooksin koodisolujen slash-komennot (kuten `/read`, `/search`, `/refs`, `/suggest` ja `/themes`) tarjoavat teologisen tutkimuksen ja muistiinpanojen teon tueksi reaaliaikaisen, älykkään tutkimusympäristön.

Nykyinen `/suggest`-toteutus oli rajoittunut ottamaan aineistoksi vain nykyisen koodisolu yläpuolella olevia markdown-soluja. Tämän kehitysosion tavoitteena on:

1. Luoda yleiskäyttöinen, joustava **Solukohdennusmoottori (Cell Scoping Engine)**, jolla käyttäjä voi tarkasti rajata mitä soluja komennon aineistona käytetään (`--ref`, `--dir`, `--n`).
2. Toteuttaa uusi `/themes`-komento aineiston avainteemojen ja sanataajuuksien analysointiin.
3. Luoda pohja tuleville älykkäille komennoille (kuten `/compare`, `/summarize`, `/timeline`).

---

## 2. Solukohdennuksen kielioppi ja lippusyntaksi

Jokainen CLI-komento, joka hyödyntää muistikirjan markdown-solujen tekstiaineistoa, tukee seuraavia lippumuotoja:

| Lippu / Syntaksi | Kuvaus | Esimerkki |
| :--- | :--- | :--- |
| `--ref=up \| down \| all` | Määrittää tarkastelusuunnan nykyiseen soluun nähden. | `/suggest --ref=down` |
| `--dir=up \| down` | Suunnan vaihtoehtoinen määritys (`up` = ylöspäin, `down` = alaspäin). | `/suggest --dir=down --n=3` |
| `--n=<val>` | Valittavien solujen määrä sekä joustavat pikamerkinnät. | `/themes --n=3n --limit=10` |
| `--limit=<n>` | Nyt `/themes`-komennossa tulostettavien teemojen maksimimäärä. | `/themes --limit=5` |

### Pikakoodaus syntaksissa `--n`

- `3n` tai `3d`: 3 seuraavaa solua alaspäin (`next` / `down`)
- `2p` tai `2u`: 2 edeltävää solua ylöspäin (`prev` / `up`)
- `3`: 3 solua valitun tai komennon oletussuunnan mukaisesti

---

## 3. Komentojen oletuskäyttäytyminen

- `/suggest`: Oletuksena ottaa *kaikki yläpuolella olevat markdown-solut* (`--ref=up`, taaksepäin yhteensopivuus).
- `/themes`: Oletuksena ottaa *seuraavan markdown-solun alaspäin* (`--n=1n`) ja näyttää 10 yleisintä teemaa (`--limit=10`).

---

## 4. Tulevien CLI-laajennusten tiekartta

Tulevissa PR-vaiheissa samaa solukohdennusmoottoria hyödynnetään seuraavissa komennoissa:

1. **`/summarize`** (`--n=3n` / `--ref=all`): Tiivistää valittujen solujen teologisen sisällön tai keskeiset raamatunkohdat.
2. **`/compare`** (`--ref=up` vs `--ref=down`): Vertaa kahden solualueen avainsanoja ja eroja.
3. **`/timeline`**: Tunnistaa ja järjestää valituista soluista ajalliset tai historialliset kontekstit.

---

## 5. Tiedostorakenne tässä osiossa

- [`00-cli-improvements-roadmap.md`](file:///home/vivaldev/code/clible-v3-go/.plans/08-notebook-cli-improvements/00-cli-improvements-roadmap.md): Yleiskuva ja tiekartta (tämä tiedosto).
- [`01-cell-scoping-engine.md`](file:///home/vivaldev/code/clible-v3-go/.plans/08-notebook-cli-improvements/01-cell-scoping-engine.md): Solukohdennusmoottorin (`ResolveCellContext`) yksityiskohtainen toteutusohje.
- [`02-suggest-and-themes-commands.md`](file:///home/vivaldev/code/clible-v3-go/.plans/08-notebook-cli-improvements/02-suggest-and-themes-commands.md): `/suggest`- ja `/themes`-komentojen toteutus backendissä ja UI-taso.
