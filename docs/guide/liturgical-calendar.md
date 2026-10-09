# Liturgical Calendar & Prayer Offices

Clible integrates the **Finnish Evangelical Lutheran Church year calendar** directly into the
application. The embedded dataset covers the full liturgical year with daily prayer offices,
lectionary cycles, psalm assignments, hymn recommendations, and liturgical colour metadata.

---

## Overview

The liturgical calendar answers the question: *"What day is the church celebrating today, and
what scriptures and prayers accompany it?"* In Clible, this data powers:

- The **Liturgical Calendar view** — showing today's liturgical day, colour banner,
  and psalm of the day, with one-click navigation into the Scripture Reader for any lectionary reading.
- The **Prayer Office panel** — structured morning, noon, evening, eve, and Completorium
  prayer offices with scripture texts and antiphons.
- The **Lectionary sidebar** — listing the three lectionary cycles (I, II, III) for the day
  with Old Testament, Epistle, and Gospel readings.
- **ISLA v2 notebook integration** — referencing today's or any day's readings directly in
  notebook cells.

---

## Data Structure

Each day in the calendar is represented as a `LiturgicalDay` object. The following table
describes the primary fields returned by the API:

| Field | Type | Description |
|---|---|---|
| `date` | `string` | Finnish date format: `"27.9.2026"` |
| `iso_date` | `string` | ISO 8601: `"2026-09-27"` |
| `day_of_week` | `string` | Localized weekday name, e.g. `"sunnuntai"` |
| `day_title` | `string` | Short liturgical title, e.g. `"17. sunnuntai helluntaista"` |
| `title` | `string` | Full celebration title |
| `subtitle` | `string` | Secondary subtitle or theme phrase |
| `period` | `string` | Church year season, e.g. `"Helluntaiaika"`, `"Paastonaika"` |
| `color` | `string` | Liturgical colour: `"vihreä"`, `"valkoinen"`, `"violetti"`, `"punainen"`, `"musta"` |
| `candles` | `string` | Advent candle count or empty |
| `psalms` | `[]string` | Psalm references for the day |
| `day_psalm` | `CleanTextItem` | Full psalm text for the liturgical day |
| `week_psalm` | `CleanTextItem` | Full psalm text for the liturgical week |
| `prayer_offices` | `CleanPrayerOffices` | Structured daily prayer offices |
| `years` | `map[string]Cycle` | Lectionary readings for cycles `"I"`, `"II"`, `"III"` |
| `hymns` | `[]CleanHymnGroup` | Hymn recommendations by category |
| `celebrations` | `[]CleanCelebration` | Alternative celebrations on the same date |

---

## Prayer Offices (Hetkipalvelukset)

The `prayer_offices` field contains up to six daily offices, each holding an ordered list
of `CleanTextItem` elements (scripture reference + cleaned plain text):

| Office | Field | Typical Time |
|---|---|---|
| Aamupalvelus | `morning` | Morning |
| Päiväpalvelus | `noon` | Midday |
| Iltapalvelus | `evening` | Evening |
| Ehtoopalvelus | `eve` | Late evening |
| Completorium | `completorium` | Night prayer (Ps. 4, fixed text) |
| Apokryfit | `apocrypha` | Apocryphal texts (optional) |

Each `CleanTextItem`:

```json
{
  "verse": "Joh 1:1",
  "text": "Alussa oli Sana. Sana oli Jumalan luona, ja Sana oli Jumala."
}
```

---

## Lectionary Cycles

The `years` map contains three lectionary cycles used in Finnish Lutheran liturgy:

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

Cycle rotation follows the three-year ecumenical lectionary (A/B/C → I/II/III).
The current cycle is displayed in the Reader view's lectionary sidebar.

---

## Liturgical Colours

| Finnish | English | Season |
|---|---|---|
| `vihreä` | Green | Ordinary time (Helluntaiaika, Kolminaisuudenaika) |
| `valkoinen` | White | Feasts of Christ, saints (Joulu, Pääsiäinen, Helluntai) |
| `violetti` | Violet/Purple | Advent, Lent (Adventti, Paastonaika) |
| `punainen` | Red | Pentecost Sunday, Reformation, martyrs |
| `musta` | Black | Good Friday (Pitkäperjantai) |

---

## API Endpoints

### `GET /api/liturgical/today`

Returns the `LiturgicalDay` for the current server date (Helsinki timezone).

**Example response:**
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

Returns the `LiturgicalDay` for a specific ISO date (`YYYY-MM-DD`) or Finnish date (`D.M.YYYY`).
If the `date` query parameter is omitted or empty, it automatically falls back to today's liturgical day.
Returns `404` if the specified date is outside the embedded dataset range.

**Example:**

```
GET /api/liturgical/day?date=2026-12-25
```

### `GET /api/liturgical/month?year=2026&month=12`

Returns an array of `LiturgicalDay` objects for the specified month, useful for
calendar grid rendering and monthly office browsing. If `year` or `month` query
parameters are omitted or invalid, they fall back to the current year and month.

---

## Embedded Dataset

The 2026 church year data is statically compiled into the Go binary via `//go:embed`:

```go
//go:embed kirkkovuosi_2026.json
var Kirkkovuosi2026JSON []byte
```

This means:

- **No runtime file dependency** — the calendar works offline and in container environments
  without any external file mounts.
- **Zero latency** — all date lookups are O(1) in-memory hash map reads.
- **Atomic deployments** — the correct calendar version ships with the binary.

To extend coverage to future church years, place a new `kirkkovuosi_YYYY.json` file in
`backend/internal/parsers/` and update the embed directive. The JSON schema is identical
across years.

---

## Reader View Integration

When a user opens the **Reader**, Clible automatically:

1. Calls `GET /api/liturgical/today` on page load.
2. Renders the liturgical colour as a top banner (green/white/violet/red/black).
3. Displays the day title, subtitle, and period in the header.
4. Populates the **Psalm of the Day** card with the `day_psalm` text.
5. Populates the **Prayer Office** panel tabs (Aamu / Päivä / Ilta / Ehtoo / Completorium).
6. Populates the **Lectionary** sidebar with the three cycle readings.

---

## See Also

- [ISLA v2 Language Guide](/guide/isla-guide) — embed scripture queries in notebook cells.
- [Notebooks](/guide/notebooks) — structure liturgical research across dated notebook cells.
- [Reader](/guide/reader) — reading mode with integrated liturgical calendar display.
