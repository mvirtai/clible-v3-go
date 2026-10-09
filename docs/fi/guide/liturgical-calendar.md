# Kirkkovuosikalenteri ja hetkipalvelukset

Clible integroi **Suomen evankelis-luterilaisen kirkon kirkkovuosikalenterin** suoraan osaksi sovellusta. Sisäänrakennettu aineisto kattaa täyden liturgisen vuoden päivittäisine hetkipalveluksineen, vuosikertoineen, psalmiteksteineen, virsisuosituksineen ja liturgisine väreineen.

---

## Yleiskatsaus

Kirkkovuosikalenteri vastaa kysymykseen: *"Mitä pyhää tai juhlaa kirkko tänään viettää, ja mitkä raamatuntekstit ja rukoukset siihen liittyvät?"* Cliblessä tämä aineisto ohjaa seuraavia toimintoja:

- **Kirkkovuosikalenterin näkymä** — esittää kuluvan liturgisen päivän, väribannerin ja päivän psalmin yhdellä klikkauksella lukutilaan siirtymistä varten.
- **Hetkipalveluspaneeli** — valmiiksi jäsennellyt aamu-, päivä-, ilta-, ehtoo- ja Completorium-rukoushetket raamatunteksteineen ja antifoneineen.
- **Evankeliumikirjan vuosikerrat** — luettelee kolme vuosikertaa (I, II, III) Vanhan testamentin, kirje- ja evankeliumiteksteineen.
- **ISLA v2 -tutkimusvihkot** — mahdollisuus viitata tämän päivän tai minkä tahansa päivän lukukappaleisiin suoraan vihkon soluissa.

---

## Tietorakenne

Jokainen kalenterin päivä esitetään `LiturgicalDay`-oliona. Seuraava taulukko kuvaa rajapinnan palauttamat keskeiset kentät:

| Kenttä | Tyyppi | Kuvaus |
|---|---|---|
| `date` | `string` | Suomalainen päivämäärämuoto: `"27.9.2026"` |
| `iso_date` | `string` | ISO 8601 -muoto: `"2026-09-27"` |
| `day_of_week` | `string` | Viikonpäivän nimi, esim. `"sunnuntai"` |
| `day_title` | `string` | Lyhyt liturginen nimi, esim. `"17. sunnuntai helluntaista"` |
| `title` | `string` | Täysi pyhän nimi |
| `subtitle` | `string` | Toissijainen alaotsikko tai teemalause |
| `period` | `string` | Kirkkovuoden jakso, esim. `"Helluntaiaika"`, `"Paastonaika"` |
| `color` | `string` | Liturginen väri: `"vihreä"`, `"valkoinen"`, `"violetti"`, `"punainen"`, `"musta"` |
| `candles` | `string` | Adventtikynttilöiden määrä tai tyhjä |
| `psalms` | `[]string` | Päivän psalmiviitteet |
| `day_psalm` | `CleanTextItem` | Pyhäpäivän täysi psalmiteksti |
| `week_psalm` | `CleanTextItem` | Viikon täysi psalmiteksti |
| `prayer_offices` | `CleanPrayerOffices` | Päivittäiset jäsennellyt hetkipalvelukset |
| `years` | `map[string]Cycle` | Lukukappaleet vuosikerroille `"I"`, `"II"`, `"III"` |
| `hymns` | `[]CleanHymnGroup` | Virsisuositukset kategorioittain |
| `celebrations` | `[]CleanCelebration` | Rinnakkaiset pyhät samalle päivämäärälle |

---

## Hetkipalvelukset (Prayer Offices)

`prayer_offices`-kenttä sisältää jopa kuusi päivittäistä rukoushetkeä, joista jokainen koostuu jäsennellystä `CleanTextItem`-listasta (raamattuviite + puhdistettu tekstisisältö):

| Hetki | Kenttä | Ajankohta |
|---|---|---|
| Aamupalvelus | `morning` | Aamu |
| Päiväpalvelus | `noon` | Keskipäivä |
| Iltapalvelus | `evening` | Ilta |
| Ehtoopalvelus | `eve` | Myöhäisilta |
| Completorium | `completorium` | Yörukous (Ps. 4, kiinteä teksti) |
| Apokryfit | `apocrypha` | Apokryfiset tekstit (valinnainen) |

Esimerkki `CleanTextItem`-rakenteesta:

```json
{
  "verse": "Joh 1:1",
  "text": "Alussa oli Sana. Sana oli Jumalan luona, ja Sana oli Jumala."
}
```

---

## Vuosikerrat ja lukukappaleet

`years`-rakenne sisältää kolme Suomen evankelis-luterilaisessa kirkossa käytettävää vuosikertaa:

```json
{
  "I": {
    "old_testament": ["Jes 43:1–7"],
    "epistle": ["Room 6:3–11"],
    "gospel": ["Joh 11:1–45"]
  },
  "II": { ... },
  "III": { ... }
}
```

Vuosikertojen kierto noudattaa ekumeenista kolmivuotista rytmiä (A/B/C → I/II/III). Kuluva vuosikerta esitetään automaattisesti lukutilan sivupalkissa.

---

## Liturgiset värit

| Väri | Merkitys | Kirkkovuoden jakso |
|---|---|---|
| `vihreä` | Kasvu, toivo, arki | Helluntaiaika, Kolminaisuuden jälkeinen aika |
| `valkoinen` | Ilo, puhtaus, Kristus-juhlat | Joulu, Pääsiäinen, Ilmestyspäivä |
| `violetti` | Katumus, parannus, odotus | Adventti, Paastonaika |
| `punainen` | Pyhä Henki, veri, todistus | Helluntaipäivä, Pyhäinpäivä, marttyyrien muistopäivät |
| `musta` | Suru, kuolema | Pitkäperjantai |

---

## REST API -päätepisteet

### `GET /api/liturgical/today`

Palauttaa kuluvan palvelinpäivän `LiturgicalDay`-olion (Helsingin aikavyöhykkeen mukaan).

**Esimerkkivastaus:**
```json
{
  "date": "28.9.2026",
  "iso_date": "2026-09-27",
  "day_of_week": "sunnuntai",
  "day_title": "17. sunnuntai helluntaista",
  "title": "17. sunnuntai helluntaista",
  "color": "vihreä",
  "period": "Helluntaiaika",
  "psalms": ["Ps. 86"],
  "prayer_offices": {
    "morning": [
      { "verse": "Ps. 86:1–7", "text": "Kuule minua, Herra..." }
    ],
    "evening": [ ... ]
  },
  "years": {
    "I": {
      "old_testament": ["5. Moos. 4:1–8"],
      "epistle": ["Room 8:14–17"],
      "gospel": ["Matt. 9:35–38"]
    }
  }
}
```

### `GET /api/liturgical/day?date=YYYY-MM-DD`

Palauttaa tietyn ISO-päivämäärän (`YYYY-MM-DD`) tai suomalaisen päivämäärän (`D.M.YYYY`) kirkkovuosipäivän. Mikäli parametri jätetään pois, oletuksena käytetään kuluvaa päivää.

### `GET /api/liturgical/month?year=2026&month=12`

Palauttaa valitun kuukauden kaikki päivät taulukkona, mikä soveltuu kuukausikalenterin ja hetkipalvelusten selaamiseen.

---

## Sulautettu tietoaineisto

Vuoden 2026 kirkkovuosidata on käännetty staattisesti suoraan Go-binaariin `//go:embed`-direktiivillä:

```go
//go:embed kirkkovuosi_2026.json
var Kirkkovuosi2026JSON []byte
```

Tämän ansiosta:
- **Ei riippuvuuksia tiedostojärjestelmään** — kalenteri toimii täysin offline-tilassa ja konteissa ilman ulkoisia levykiinnityksiä.
- **Nollalatenssi** — kaikki päivämäärähaut ovat O(1)-muistiin sijoitettuja hajautustauluhakuja.
- **Atomiset julkaisut** — oikea kalenteriversio toimitetaan aina binaarin mukana.

---

## Integrointi lukutilaan

Kun avaat **Raamatun lukunäkymän**, Clible suorittaa automaattisesti:

1. Kutsuu `GET /api/liturgical/today` sivun latautuessa.
2. Piirtää päivän liturgisen väribannerin yläosaan (vihreä/valkoinen/violetti/punainen/musta).
3. Esittää pyhäpäivän nimen, teeman ja jakson otsikossa.
4. Täyttää **Päivän psalmi** -kortin tekstillä.
5. Avaa **Hetkipalvelus**-välilehdet (Aamu / Päivä / Ilta / Ehtoo / Completorium).
6. Listaa **Vuosikerta**-sivupalkkiin kyseisen pyhän lukukappaleet.

---

## Katso myös

- [ISLA v2 -kieliopas](/fi/guide/isla-guide) — upota kalenteriviitteitä suoraan muistiinpanosoluihin.
- [2D Canvas -tutkimusvihkot](/fi/guide/notebooks) — jäsennä liturgista tutkimusta päivättyihin muistiinpanoihin.
- [Raamatun lukunäkymä](/fi/guide/reader) — lue tekstejä kalenterilinkkien kautta.
