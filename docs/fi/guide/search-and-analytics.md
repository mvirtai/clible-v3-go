# Haku ja tekstianalytiikka

clible-v3 tarjoaa suorituskykyisen haku- ja analyysimoottorin, joka on suunniteltu sekä nopeisiin jaehakuihin että syvälliseen lingvistiseen tutkimukseen useiden raamatunkäännösten yli.

---

## 1. Hakumoottorin tilat ja ominaisuudet

Alusta tukee kolmea toisistaan erottuvaa hakutilaa:

```mermaid
flowchart TD
    QUERY["Käyttäjän hakukysely"] --> MODE{"Hakutilan valinta"}

    MODE -->|Oletus: FTS| FTS["Kokotekstihakumoottori"]
    MODE -->|Tarkka fraasi| PHRASE["Tarkan sanajonon sovitus"]
    MODE -->|Regex-kuvio| REGEX["Säännöllisten lausekkeiden moottori"]

    FTS --> GIN[("PostgreSQL GIN tsvector")]
    PHRASE --> ILIKE[("Kirjainkoosta riippumaton alimerkkijono")]
    REGEX --> RE2[("Go RE2 POSIX Regex -moottori")]

    GIN --> SCOPE{"Käytä skooppirajasta"}
    ILIKE --> SCOPE
    RE2 --> SCOPE

    SCOPE -->|Koko Raamattu| R1["Hae koko kaanonista"]
    SCOPE -->|Vanha testamentti| R2["Rajaa VT:n kirjoihin"]
    SCOPE -->|Uusi testamentti| R3["Rajaa UT:n kirjoihin"]
    SCOPE -->|Tietty kirja| R4["Rajaa valittuun kirjaan esim. ROM"]

    R1 --> OUT["Yhtenäinen hakutulosdata"]
    R2 --> OUT
    R3 --> OUT
    R4 --> OUT
```

### Kokotekstihaku (FTS)

- **PostgreSQL**: Haut suoritetaan **GIN-indeksoitua (Generalized Inverted Index)** `to_tsvector('simple', text) @@ to_tsquery('simple', ...)` -kyselyä vasten. Tämä takaa alle millisekunnin vasteajat kymmenientuhansien jakeiden yli.
- **SQLite-testit**: Yksikkötesteissä hyödynnetään **FTS5-virtuaalitaulua**, joka synkronoidaan automaattisilla triggereillä.
- **Monisanahaut**: Tukee usean hakusanan yhdistelmiä ja relevanssijärjestystä.

### Fraasihaku

Etsii tarkan peräkkäisen sanajonon kirjainkoosta riippumatta:

```text
"vanhurskaaksi uskosta"
"taivasten valtakunta"
"armo ja rauha"
```

### Säännölliset lausekkeet (Regex)

Kielitieteelliseen ja morfologiseen analyysiin voit aktivoida **Regex**-kytkimen hakukentän vierestä. Haut arvioidaan Go-kielen turvallisella `regexp` (RE2) -moottorilla:

- `/vanhurska.*/` — Löytää muodot *vanhurskas*, *vanhurskaus*, *vanhurskauttaa*.
- `/\b(valkeus|valo)\b/` — Etsii täsmälliset sanat *valkeus* tai *valo*.
- `/liitto.*veri/` — Etsii jakeet, joissa sanaa *liitto* seuraa myöhemmin sana *veri*.

---

## 2. Hakuskoopit ja rajaus

Voit rajata minkä tahansa haun tiettyyn raamatunosioon hakutulosten tarkentamiseksi:

| Skooppi | Kohdealue | Kuvaus |
|---|---|---|
| **Koko Raamattu (`all`)** | 1. Moos.–Ilm. | Etsii kaikista 66 kanonisesta kirjasta. |
| **Vanha testamentti (`ot`)** | 1. Moos.–Mal. | Rajaa haun heprealaisen kaanonin 39 kirjaan. |
| **Uusi testamentti (`nt`)** | Matt.–Ilm. | Rajaa haun kreikankielisen UT:n 27 kirjaan. |
| **Tietty kirja (`book`)** | esim. `ROM`, `JHN`, `GEN` | Rajaa haun tarkasti vain valittuun kirjaan. |

---

## 3. Hakuhistoria ja nopea uudelleenhaku

Jokainen suoritettu haku tallentuu automaattisesti henkilökohtaiseen **Hakuhistoriaasi**:

- **Aikaleima ja tila**: Tallentaa tarkan hakulausekkeen, hakutilan (FTS, fraasi, regex), kohdekäännöksen ja skoopin.
- **Tulosten määrä**: Näyttää löytyneiden jakeiden lukumäärän yhdellä silmäyksellä.
- **Uudelleenajo yhdellä klikkauksella**: Historian rivin klikkaaminen suorittaa haun heti uudelleen ilman tekstin uudelleenkirjoittamista.
- **Synkronoitu istuntojen yli**: Hakuhistoria tallentuu tietokantaan ja kulkee mukanasi eri laitteilla.

---

## 4. Tekstianalytiikkamoottori

**Analytiikka**-näkymä (`/analytics`) tarjoaa numeerisia ja tilastollisia näkökulmia raamatuntekstin sanastoon, kielelliseen monimuotoisuuteen ja tyylillisiin piirteisiin.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tekstianalytiikka: Johannes 3 (Pyhä Raamattu 1992)                    │
│  ────────────────────────────────────────────────────────────────────  │
│  Sanoja yhteensä  │  Uniikkeja sanoja │  Sanaston rikkaus (TTR)        │
│  789              │  210              │  0.266 (26.6%)                 │
│  ─────────────────┴───────────────────┴──────────────────────────────  │
│  Yleisimmät sanat:                                                     │
│  1. Jumala (14)    2. elämä (11)    3. uskoa (9)    4. valo (8)        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Sanaston rikkaus ja sanastolliset mittarit

- **Sanoja yhteensä**: Valitun luvun tai jakson kokonaissanamäärä.
- **Uniikit sanat**: Esiintyvien eri sanamuotojen määrä.
- **Sanaston rikkaus (Type-Token Ratio / TTR)**:
  $$\text{TTR} = \frac{\text{Uniikit sanat}}{\text{Kaikki sanat}}$$
  Korkeampi suhdeluku viittaa rikkaaseen ja vaihtelevaan sanastoon (tyypillistä kirjekirjallisuudelle kuten Heprealaiskirjeelle), kun taas matalampi luku kertoo toistuvasta, teemallisesta sanastosta (tyypillistä Johanneksen teksteille).
- **Hapax legomena**: Laskee sanat, jotka esiintyvät tekstijaksossa vain kerran. Täydentää TTR-arvoa nostamalla esiin harvinaiset sanat.

### 2. Sanatiheydet ja frekvenssilistat

- Erittelee tekstin yleisimmät sanat poistaen välimerkit ja normalisoiden kielen.
- Piirtää interaktiiviset pylväsdiagrammit ja sanajakaumataulukot.

### 3. Käännösvertailumatriisi

Vertailee samaa tekstijaksoa kahdesta eri käännöksestä rinnakkain:

- **Samankaltaisuusasteikko**: Laskettu leksikaalinen vastaavuus käännösten välillä.
- **Visuaalinen diff-korostus**: Korostaa lisäykset, poistot ja ilmaisulliset erot käännösten välillä (esim. KR92 vs. KR38 tai KJV vs. WEB).

---

## 5. Teologiset AI-työkalut

Kun järjestelmään on kytketty Google Gemini API -avain, clible-v3 tarjoaa edistyneet tekoälytyökalut suoraan käyttöliittymässä:

- **Teologiset näkökulmat**: Tuottaa eksegeettisiä huomioita liiton, historiallisen taustan tai kirjallisten teemojen näkökulmasta.
- **Alkukielten analyysit**: Kreikan ja heprean kantasanajakaumat, kieliopillinen morfologia ja sanakirjalinkitykset.
- **Semanttinen haku**: Kysy käsitteellisiä luonnollisen kielen kysymyksiä (esim. *"Missä Paavali puhuu hengellisestä taistelusta?"*) löytääksesi aiheeseen liittyvät jakeet, vaikka täsmälliset hakusanat vaihtelisivat.
- **AI-käännösvertailu**: Yksityiskohtainen analyyttinen erittely kahden eri käännöksen teologisista sävyeroista.
