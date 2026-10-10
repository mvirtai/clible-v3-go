# Tutkimusvihkot, 2D Canvas ja hybridisolut

**Clible-tutkimusvihkot** (Notebooks) ovat interaktiivisia työtiloja teologiseen tutkimukseen, raamatuntutkisteluun ja muistiinpanojen järjestämiseen.

Tutkimusvihkoissa teksti, kyselyt ja **ISLA v2 -komennot** yhdistyvät 2D-ruudukkoon. Eri solutyypeillä voit koota tutkimuksen yhdeksi dokumentiksi.

---

## 2D Canvas -matriisiruudukko

Tutkimusvihko on joustava tutkimusasiakirja, joka koostuu järjestetyistä **soluista** (Cells). Soluja voidaan tarkastella joko lineaarisena asiakirjana tai laajana **2D Canvas -matriisina**:

- **24 sarakkeen skaalautuva ruudukko**: Jokainen kortti määrittää oman leveytensä (`colSpan`, 1–24 saraketta, oletuksena 12) ja valinnaisen korkeuden (`colHeight`, pikseleinä) rinnakkaisia vertailuasetelmia varten.
- **Rinnakkaiset kortit**: Asettele tutkimuksen eri osat vierekkäin ilman vaakavieritystä.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tutkimusvihko: Room 5:n tutkimus (2D Canvas)                           │
│  ────────────────────────────────────────────────────────────────────  │
│  [Kortti 1: Markdown-muistiinpanot] │ [Kortti 2: Elävä ISLA v2 -upotus] │
│  colSpan: 12                        │ colSpan: 12                       │
│                                     │                                   │
│  Vanhurskauttaminen uskosta tuo     │ @(Rom 5:1).vs(KR92, KJV) =>       │
│  rauhan Jumalan kanssa Kristuksessa │ ───────────────────────────────── │
│                                     │ KR92: Koska me siis olemme...     │
│                                     │ KJV:  Therefore being just...     │
│  ───────────────────────────────────┴─────────────────────────────────  │
│  [Kortti 3: CLI-kyselylehtiö]                                           │
│  colSpan: 24                                                            │
│  $ clible search "armo" --scope=ROM                                     │
│  [x] ROM 5:2  [x] ROM 5:15  [ ] ROM 5:17  ──> [ Jäädytä Markdowniksi ]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Solutyypit ja hybridityönkulut

Clible-vihkot tukevat kolmea keskeistä solumuotoa:

### 1. Markdown-solut (`markdown`)

Markdown-solut ovat muotoiltuja tekstilohkoja raamatuntekstien tulkintaa koskeville muistiinpanoille, saarnaluonnoksille ja väliotsikoille:

- **Syntaksi**: Täysi GitHub Flavored Markdown (GFM).
- **Upotetut reaktiiviset komennot**: Voit upottaa eläviä ISLA v2 -komentoja suoraan leipätekstin lomaan:
  ```markdown
  Paavalin argumentin peruskivi:

  ! @(Rom 5:1).vs(KR92, KJV) =>

  Tekstijakson sanastoanalyysi:

  ! @(Rom 5:1-5).stats() >>
  ```
- **Lukutila**: Kyselysyntaksi piilotetaan ja korvataan jaekorteilla. Kun viet osoittimen kortin päälle, näkyviin tulee `✦`-tunnus. Valitsemalla sen näet ISLA-lausekkeen.

### 2. CLI-komentosolut (`code`) — Jatkuva luonnoslehtiö

Komentosolu tarjoaa interaktiivisen komentorivin selaimessa:

- **Syntaksi**: Alkaa `$ clible` -komennolla (esim. `$ clible read Joh 3:16`, `$ clible search "armo" --scope=NT`).
- **Interaktiiviset valintaruudut**: Tuloksissa näkyy valintaruutu kunkin löydetyn jakeen vieressä.
- **Jäädytä-toiminto**: Valitut jakeet muunnetaan pysyväksi Markdown-soluksi, ja komentorivin syöte palautuu `$ clible` -alkutilaan. Sama luonnoslehtiösolu sopii useiden kyselyiden tekemiseen.

### 3. Reaktiiviset ISLA v2 -upotukset

Markdown-soluja kirjoitettaessa voit lisätä ISLA v2 -direktiivejä joko itsenäisinä lohkoina tai tekstin sisällä. Ne arvioidaan palvelimella ja renderöidään elävinä tuloskortteina:

```isla
@(Joh 3:16).vs(KR92, KJV) =>
range(Joh 1:1, Joh 1:18).themes(8) >>
search("armo" AND "rauha").at(epistolat).count() =>
^all.stats() >>
```

Tutustu täyteen syntaksioppaaseen sivulla [ISLA v2 -kieliopas](/fi/guide/isla-guide).

---

## ISLAEditor — Älykäs syöte ja kirjoittamisen apuvälineet

**ISLAEditor** tarjoaa reaaliaikaisia kooditäydennyksiä ja kirjoittamisen apuvälineitä. Toiminnot perustuvat TypeScript-moduuleihin (`islaLexer.ts`, `islaIntellisense.ts`, `islaEditorGestures.ts`):

### Syntaksikorostuksen kerrosmalli (Overlay)

Editori käyttää **kerrosmallia** (Overlay Pattern) ISLA-tokenien värittämiseen ilman raskaita ulkoisia verkkopohjaisia koodieditoreja:

```
┌──────────────────────────────────────────────────────────────────────┐
│ div.relative (kääre)                                                 │
│ ├─ div[aria-hidden] ISLASyntaxLayer  ← värikoodattu token-kerros     │
│ │   ├─ @(          ← kulta (aloitus)                                 │
│ │   ├─ Joh 3:16   ← syaani (viite)                                   │
│ │   └─ .vs(       ← fuksia (metodi)                                  │
│ └─ <textarea>      ← läpinäkyvä teksti, näkyvä kultainen kohdistin   │
└──────────────────────────────────────────────────────────────────────┘
```

`<textarea>` hoitaa tavallisen näppäimistösyötteen, valinnat ja undo-pinon läpinäkyvällä tekstillä (`color: transparent`), kun taas sen alla oleva `aria-hidden`-kerros piirtää vastaavat väritetyt `<span>`-elementit pikselintarkasti kohdistettuna.

### Älykkäät kirjoituselealyt

Kirjoittamisen nopeuttamiseksi editori sisältää useita automaattisia avustimia:

- **`!`-komennon aloitus**: Kun kirjoitat huutomerkin `!` tyhjän rivin alkuun, editori lisää välilyönnin ja avaa kyselymallit.
- **`@`-viitteen aloitus**: `@`-merkin kirjoittaminen täydentää sen muotoon `@()` ja asettaa kohdistimen sulkeiden sisään. Editorissa näkyvät raamatunkirjojen ehdotukset.
- **Sulkeutuvat erottimet**: Merkkien `(`, `"` tai `'` kirjoittaminen lisää automaattisesti vastaavan sulkevan merkin ja pitää kohdistimen niiden välissä.
- **Valinnan ympäröinti (Wrap)**: Tekstin maalaaminen ja merkin `@`, `(`, `"` tai `'` painaminen käärii valitun tekstin merkkien sisään tuhoamatta sitä.
- **Ylikirjoituksen ohitus (Overtype)**: Sulkevan merkin `)`, `"` tai `'` kirjoittaminen olemassa olevan sulkumerkin edessä hyppää sen yli luomatta tuplamerkkiä.
- **Parin poisto**: Backspacen painaminen `@(|)` -rakenteen sisällä poistaa koko sulkukääreen kerralla.

### Automaattitäydennys ja IntelliSense

Kirjoittaminen avaa kontekstista riippuvia ehdotuksia:

| Kohdistimen konteksti | Tarjotut ehdotukset |
|---|---|
| `!` | Juuritason mallikyselyt (`@(Joh 3:16) =>`, `search("armo") =>`) |
| `@(` | Kanoniset kirjanimet ja älykkäät ryhmät (`Joh`, `ROM`, `GEN`, `epistolat`, ...) |
| `search(` / `?` | Hakupohjat, Boolen lausekkeet, regex-literaalit |
| `range(` / `(` | Kirja- ja lukuvälit `..`-syntaksilla |
| `#` | Muuttujapohjat (`! #armo.top(10) =>`) |
| `.` | Kaikki kyseiselle objektille sallitut metodit |
| `.at(` | Kaikki skooppitunnisteet ja kirjalyhenteet |
| `.use(` | Asennettujen käännösten tunnisteet |
| `.vs(` | Kahden käännöksen vertailupohjat |

Liikkuminen valikossa: `↑↓` siirtää valintaa, `Enter/Tab` hyväksyy ja `Escape` sulkee.

---

## Solujen järjestäminen ja siirtely (Drag-and-Drop)

React-käyttöliittymä mahdollistaa solujen sujuvan siirtelyn ja uudelleenjärjestämisen:

- Jokainen solu sisältää eksplisiittisen kokonaislukukentän `position`.
- Tietokantataulu `notebook_cells` valvoo uniikkirajoitetta `UNIQUE (notebook_id, position)`, mikä estää järjestyskonfliktit.
- Kun soluja raahataan uuteen järjestykseen, asiakasohjelma lähettää järjestetyn taulukon rajapinnalle `PUT /api/notebooks/{id}/cells`, joka tallentaa muutokset yhtenä atomisena ACID-tietokantatransaktiona.

---

## Työtilaintegraatio ja skoopit

Tutkimusvihkot voidaan linkittää suoraan **Tutkimustyötilaan (Scope)**:

- Kun vihko luodaan `scopeId`-tunnisteella, se kuuluu kyseiseen tutkimusprojektiin.
- Työtilan lataaminen osoitteesta `GET /api/scopes/workspace?id={scopeId}` palauttaa kaikki siihen kuuluvat vihkot, tallennetut haut ja analyysit yhdellä ainoalla verkkopyynnöllä.
- Jos tutkimustyötila poistetaan, siihen liitettyjen vihkojen `scope_id` asetetaan tilaan `NULL` (`ON DELETE SET NULL`), mikä takaa, että henkilökohtaiset muistiinpanosi eivät koskaan katoa vahingossa.
