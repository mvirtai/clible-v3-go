# Tietokanta-arkkitehtuuri ja kokotekstihaku (FTS)

clible-v3-go hyödyntää kaksoistietokanta-arkkitehtuuria. Se on suunniteltu ajettavaksi **PostgreSQL**:ssä (erityisesti **Neon PostgreSQL** -pilvipalvelussa kehitys- ja tuotantoympäristöissä) ensisijaisena relaatiomoottorina, tarjoten vankan pilvitallennuksen ja pistepalautuksen (Point-in-Time Recovery).

Yksikkö- ja integraatiotesteissä sovellus käyttää automaattisesti muistipohjaista **SQLite 3** -tietokantaa pitääkseen testit nopeina, eristettyinä ja itsenäisinä.

---

## ER-kaavio (Entity-Relationship Diagram)

Tietokantarakenne jakautuu kahteen pääalueeseen: staattisiin raamatunkäännöstauluihin ja dynaamisiin, käyttäjän tuottamiin työtila- ja historiatauluihin.

```mermaid
erDiagram
    users {
        text id PK
        text email
        text password_hash
        timestamp created_at
        timestamp updated_at
    }

    books {
        text id PK
        text name
        text testament
        integer position
        integer chapters
    }

    translations {
        text id PK
        text name
        text language
        text format
        text source_url
        boolean is_global
        timestamp installed_at
    }

    user_translations {
        text user_id PK_FK
        text translation_id PK_FK
    }

    verses {
        text id PK
        text translation_id FK
        text book_id FK
        integer chapter
        integer verse
        text text
    }

    scopes {
        text id PK
        text user_id FK
        text name
        timestamp created_at
    }

    saved_searches {
        text id PK
        text scope_id FK
        text name
        text query_text
        text search_scope
        text scope_value
        text translation_id FK
        text result_json
        timestamp created_at
    }

    saved_analyses {
        text id PK
        text scope_id FK
        text name
        text reference
        text analysis_type
        text translation_id FK
        text params_json
        text result_json
        timestamp created_at
    }

    search_history {
        text id PK
        text user_id FK
        text query_text
        text search_scope
        text scope_value
        text translation_id FK
        text mode
        integer result_count
        timestamp searched_at
    }

    notebooks {
        text id PK
        text title
        text user_id FK
        text scope_id FK
        timestamp create_at
        timestamp update_at
    }

    notebook_cells {
        text id PK
        text notebook_id FK
        text content
        text cell_type
        text result_json
        integer position
        timestamp create_at
        timestamp update_at
    }

    users ||--o{ scopes : "omistaa"
    users ||--o{ notebooks : "omistaa"
    users ||--o{ search_history : "omistaa"
    users ||--o{ user_translations : "linkittää"
    translations ||--o{ user_translations : "linkitetty"
    translations ||--o{ verses : "sisältää"
    books ||--o{ verses : "sisältää"
    scopes ||--o{ saved_searches : "sisältää"
    scopes ||--o{ saved_analyses : "sisältää"
    scopes ||--o{ notebooks : "linkittää"
    notebooks ||--o{ notebook_cells : "sisältää"
```

---

## Keskeiset tietokantataulut

### 1. `books`

Sisältää Raamatun 66 kanonisen kirjan metatiedot:
- `id` (TEXT, PK): Kanoninen kirjalyhenne (esim. `GEN`, `EXO`, `JHN`).
- `name` (TEXT): Kirjan virallinen nimi.
- `testament` (TEXT): Testamentti (`OT` tai `NT`).
- `position` (INTEGER): Järjestysnumero kaanonissa (1–66).
- `chapters` (INTEGER): Lukujen kokonaismäärä kirjassa.

### 2. `translations`

Tallentaa käännöskatalogin metatiedot:
- `id` (TEXT, PK): Uniikki slug (esim. `kr92`, `kr38`, `web`, `kjv`).
- `name` (TEXT): Näyttönimi (esim. *Pyhä Raamattu 1992*).
- `language` (TEXT): 3-kirjaiminen kielikoodi (`FIN`, `ENG`).
- `is_global` (BOOLEAN): Tieto siitä, onko käännös kaikkien käytettävissä.

### 3. `verses`

Sisältää kaikki yksittäiset raamatunjakeet:
- `id` (TEXT, PK): Yhdistelmätunnus `translation:book:chapter:verse`.
- `translation_id` (TEXT, FK): Viittaus `translations.id`-kenttään.
- `book_id` (TEXT, FK): Viittaus `books.id`-kenttään.
- `chapter` (INTEGER): Luvun numero.
- `verse` (INTEGER): Jakeen numero.
- `text` (TEXT): Jakeen tekstisisältö.

---

## Kokotekstihaku (Dual FTS)

### PostgreSQL GIN -indeksointi

Tuotantoympäristössä nopea kokotekstihaku perustuu PostgreSQL:n natiiviin `tsvector`-vektoriin ja GIN-indeksiin:

```sql
CREATE INDEX idx_verses_fts ON verses 
USING gin(to_tsvector('simple', text));
```

Hakukyselyt suoritetaan parametrisoidusti `to_tsquery('simple', ...)` -funktiolla, mikä mahdollistaa alimillisekunnin haut ilman ulkoisia hakupalvelimia.

### SQLite FTS5 -varajärjestelmä testeissä

Muistissa ajettavia yksikkötestejä varten luodaan FTS5-virtuaalitaulu triggereineen:

```sql
CREATE VIRTUAL TABLE verses_fts USING fts5(
    text,
    content='verses',
    content_rowid='rowid'
);
```
