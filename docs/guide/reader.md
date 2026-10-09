# Scripture Reader & Exploration

The **Scripture Reader** is the primary reading environment in clible-v3, designed for distraction-free reading, swift navigation across the entire biblical canon, and fluid translation switching.

---

## 1. Interface & Typography Design

The Reader is engineered with editorial typography to make continuous reading comfortable across all screen sizes:

- **Serif Typography**: Renders scriptures in elegant Georgia/Lora typography with balanced line heights and optimized character tracking.
- **Clear Verse Markers**: Verse numbers are styled with subtle gold/neutral badges that never disrupt reading flow.
- **Adaptive Color Themes**: Automatic dark and light themes with soft contrast to prevent eye strain during long research sessions.
- **Fluid Layout**: Responsive column widths optimized for desktop widescreen monitors, tablets, and mobile devices.

```
┌────────────────────────────────────────────────────────────────────────┐
│  📖 John 3 (World English Bible)                    [ ⚙️ Translation ] │
├────────────────────────────────────────────────────────────────────────┤
│  1  Now there was a man of the Pharisees named Nicodemus, a ruler...   │
│  2  He came to Jesus by night, and said to him, "Rabbi, we know...     │
│  ...                                                                   │
│  16 For God so loved the world, that he gave his only born Son, that   │
│     whoever believes in him should not perish, but have eternal life.  │
│  ...                                                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Book & Chapter Navigation

Navigating through the 66 canonical books of the Bible is instantaneous:

- **Testament Grouping**: Quick selector divided into the **Old Testament** (39 books, Genesis to Malachi) and the **New Testament** (27 books, Matthew to Revelation).
- **Chapter Grid**: Click any book to expand its full grid of chapters.
- **Previous / Next Chapter Controls**: Sticky footer buttons allow seamless forward and backward reading without returning to the main menu.
- **Direct Coordinate Jumping**: Enter references like `John 3`, `Romans 8`, or `Psalm 23` in the quick reference bar for instant jumping.

---

## 3. Dynamic Translation Switching

From the top right of the reader view, click the **Translation Selector** dropdown:

- Switch instantly between installed translations (e.g. *KR92*, *KR38*, *World English Bible*, *King James Version*).
- When you switch translations, your exact book, chapter, and scroll position are preserved.
- If you need additional translations, open the [Translation Catalog](/guide/import-and-seeding) to activate other language packs.

---

## 4. Verse Selection & Actions

Clicking or tapping any individual verse in the Reader opens the **Verse Action Bar**:

- **Copy Citation**: Copies the verse reference and text directly to your clipboard in standard citation format (e.g. `John 3:16 (WEB)`).
- **Send to Compare**: Opens the selected verse directly in the [Comparison Matrix](/guide/compare-and-diff) to analyze translations side-by-side.
- **Analyze in Original Language**: Opens the [Original Languages View](/guide/original-languages) to inspect the Greek or Hebrew root words, lemmas, and grammatical morphology.
- **Generate AI Insight**: Triggers the [Theological AI Engine](/guide/ai-study-tools) to provide exegesis commentary and literary context.
- **Send to Notebook**: Appends the verse into an active 2D canvas study sheet.

---

## 5. Navigation & Workspace Integration

The Scripture Reader acts as the central hub for reading and cross-view study transitions:

- **Top Navigation Bar**: Seamlessly switch between study modes (Reader, Search Hub, Comparison Matrix, Lexical Analytics, Original Languages, Notebooks, Liturgical Calendar, and Reading Plans).
- **Cross-View Reference Jumping**: Clicking any scripture reading in the Liturgical Calendar, Search Hub, or Reading Plans automatically navigates directly to the Scripture Reader at that exact passage.
- **Mobile Floating Workspace Button (FAB)**: On touchscreens, a dedicated floating button docked at the bottom-right corner with Safe Area Inset support provides instant access to the Workspace Drawer without cluttering the reading view.
- **Desktop Workspace Sidebar**: Provides persistent access to custom study scopes, saved searches, and recent search history alongside scripture text.

For church year celebrations, prayer offices, and lectionary readings, explore the dedicated [Liturgical Calendar & Prayer Offices](/guide/liturgical-calendar) guide.
