# Suunnitelma 05D: Clible Notebooks — Visualisoinnit, tietograafi ja opintomoduulit

Tämä dokumentti ohjaa tietograafin (Knowledge Graph) rakentamista, `/graph` -komennon toteuttamista ja opintomoduulien (Study Paths) dynaamisten mallipohjien hallintaa.

---

## 1. Teologinen tietograafi (Database & Backend)

Luodaan tietokantamigraatio henkilöiden, paikkojen ja teologisten käsitteiden suhteiden tallentamiseen.

```sql
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- 'person' | 'location' | 'concept' | 'event'
    description TEXT
);

CREATE TABLE entity_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL, -- 'father_of', 'travelled_to', 'associated_with'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entity_verses (
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    verse_id UUID NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
    PRIMARY KEY (entity_id, verse_id)
);
```

### Palvelukerros (`GraphService`)
Toteutetaan backend-palvelu, joka hakee tietyn entiteetin lähiverkoston (depth=1 tai depth=2) ja palauttaa sen solmuina (nodes) ja linkkeinä (links).

```go
type Node struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type Link struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type"`
}

type GraphResponse struct {
	Nodes []Node `json:"nodes"`
	Links []Link `json:"links"`
}
```

---

## 2. `/graph` -komento ja visualisointi (Frontend)

Kun käyttäjä ajaa komennon `/graph Moses`, backendin palauttama `GraphResponse` lähetetään koodisolun tulosalueelle. 

### Graafikomponentti (`GraphRenderer.tsx`)
* Käytetään kevyttä visualisointia (kuten D3-force, vis.js tai suora kevyt SVG-voimamallinnus), joka piirtää verkoston.
* **Asetukset:**
  * Solmut väritetään tyypin mukaan (esim. henkilöt kultaisella, paikat sinisellä ja käsitteet vihreällä).
  * Viivat kuvaavat suhteita ja näyttävät suhteen tyypin leijutettaessa (hover).
  * Solmun klikkaaminen avaa sivupaneelin, joka listaa kyseiseen henkilöön/paikkaan liittyvät tärkeimmät jakeet ja selitykset.

---

## 3. Opintomoduulit ja lukusuunnitelmat (Study Paths)

Opintomoduulit eivät ole staattisia lukulistoja, vaan dynaamisia **Notebook-malleja** (Templates).

* **Mallikirjasto (Templates Gallery):**
  * Luodaan backend-kantaan muutama järjestelmätason "Read-Only" Notebook (esim. `/plans/templates/`), jotka ovat kaikille saatavilla.
  * *Esimerkkiopintomoduuli: "Paavalin matkat"*
    * Ensimmäinen solu: Markdown-alustus ja historiallinen konteksti.
    * Toinen solu: `/graph Paul` (suhteiden visualisointi).
    * Kolmas solu: `/read Acts 13:1-4` (ensimmäinen matka).
    * Neljäs solu: Tyhjä markdown-solu käyttäjän omille muistiinpanoille ja kysymyksille.
* **Monistaminen (Clone Notebook):**
  * Käyttäjä voi selata opintomoduulien luetteloa, valita aiheen ja klikata "Start Study Path".
  * Tämä kopioi kyseisen mallipohjan solut uudeksi omaksi Notebookiksi, jota käyttäjä voi vapaasti muokata, suorittaa ja laajentaa.
