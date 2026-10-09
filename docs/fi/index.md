---
layout: home

hero:
  name: clible-v3
  text: Web-natiivi Raamatuntutkimuksen ja tekstianalytiikan alusta
  tagline: >
    Go REST API + React 19 + ISLA v2 — räätälöity kyselykieli,
    2D canvas -tutkimusvihkot, kokotekstihaku, tekstianalytiikka
    ja vertailevat käännösmatriisit. Pilvinatiivi, täysin avoin ja maksuton.
  actions:
    - theme: brand
      text: Tutustu alustaan
      link: /fi/guide/getting-started
    - theme: alt
      text: Katso GitHubissa
      link: https://github.com/mvirtai/clible-v3-go

features:
  - icon: ✦
    title: ISLA v2 -kyselykieli
    details: >
      Ergonominen objekti-metodi-DSL upotettuna suoraan Markdowniin.
      @(Joh 3:16).vs(KR92, KJV) =>  search("armo").at(epistolat).stats() >>
      Deterministinen AST-jäsennin, Monaco IntelliSense ja Levenshtein-virhediagnostiikka.
  - icon: 📓
    title: 2D Canvas -tutkimusvihkot
    details: >
      24 sarakkeen skaalautuva ruudukkotyötila hybridimuistiinpanoilla,
      reaktiivisilla ISLA-upotuksilla ja jatkuvalla CLI-luonnoslehtiöllä,
      jossa on interaktiivinen jakeiden valinta ja Freeze-to-Markdown-toiminto.
  - icon: 🔎
    title: Kaksoiskokotekstihaku (Dual FTS)
    details: >
      Huippunopea PostgreSQL GIN tsvector -indeksointi sekä FTS5-varajärjestelmä
      muistissa suoritettavia testejä varten. Boolen AND/OR-logiikka,
      säännölliset lausekkeet (regex) ja älykäs genrerajaus.
  - icon: 📊
    title: Tekstianalytiikka
    details: >
      Sanaston rikkaus (Type-Token Ratio), frekvenssilistaukset,
      teemallinen avainsanaerottelu ja rinnakkaiset käännösmatriisit
      — kaikki käytettävissä yhdellä ISLA-komennolla.
  - icon: ⚡
    title: O(1) Suoratoistava tuonti
    details: >
      Muistitehokas XML-suoratoistojäsennin tuo Raamatun käännökset suoraan
      tietokantaan ilman väliaikaistiedostoja käsitellen monen megatavun
      USFX- ja OSIS-tiedostot yhdellä lineaarisella läpikäynnillä.
  - icon: 🗂️
    title: Tutkimustyötilat
    details: >
      Eristetyt projektiskoopit järjestävät tallennetut haut, leksikaaliset
      analyysit ja tutkimusvihkot yhtenäisiksi kokonaisuuksiksi.
      Lataus yhdellä pyynnöllä: GET /api/scopes/workspace.
  - icon: 🤖
    title: Gemini AI -integraatiot
    details: >
      Kreikan ja heprean morfologiset erittelyt, semanttinen käsitteellinen haku,
      hermeneuttinen analyysi ja käännösvertailukommentaarit
      Google Geminin tukemana.
  - icon: 🚀
    title: Natiivi Go REST API
    details: >
      Suorituskykyinen tilaton monoliitti Go 1.22+ -vakioreitityksellä.
      Kontekstin peruutussignaalien välitys, O(1) suoratoistolähetykset ja
      selkeä nelikerroksinen arkkitehtuuri.
  - icon: 🌐
    title: Kaksikielinen ja saavutettava
    details: >
      Täysi suomen (fi) ja englannin (en) kielituki yhdellä klikkauksella.
      Lämmin kultasävyinen teema saumattomalla tumman ja vaalean tilan tuella.
---

## Järjestelmäarkkitehtuuri pähkinänkuoressa

clible-v3 on suunniteltu web-natiiviksi tutkimusympäristöksi, jota käytetään suoraan selaimessa.
ISLA-kyselymoottori toimii palvelinpuolella itsenäisenä Go-pakettina ja suorittaa lausekkeet
alle 50 mikrosekunnissa lekseristä tulosprojektioon:

```mermaid
graph TD
    User(["Tutkija / Käyttäjä"]) --> UI["Verkkosovellus: React 19 + Tailwind v4"]

    subgraph Core_Features ["Ydintoiminnot"]
        UI --> R["Raamatun lukunäkymä ja navigaatio"]
        UI --> C["Käännösvertailumatriisi ja diff"]
        UI --> S["Kokotekstihaku ja Boolen logiikka"]
        UI --> O["Alkukielet ja morfologia"]
        UI --> A["Tekstianalytiikka ja ISLA-kyselyt"]
        UI --> N["2D Canvas -tutkimusvihkot"]
        UI --> W["Projektityötilat ja skoopit"]
        UI --> AI["Teologinen AI-moottori"]
    end

    subgraph Cloud_Infrastructure ["Pilvi-infrastruktuuri"]
        R & C & S & O & A & N & W & AI --> API["Go REST API -monoliitti"]
        API --> ISLA["ISLA v2 -moottori (new_dsl/)"]
        API --> DB[("Neon PostgreSQL")]
        API --> AICloud["Gemini AI"]
        ISLA --> DB
    end
```

---

## Dokumentaatiokartta

| Mitä haluat tehdä? | Aloita tästä |
|---|---|
| Opi liikkumaan ja käyttämään verkkokäyttöliittymää | [Yleiskatsaus ja pikaopas](/fi/guide/getting-started) |
| Lue raamatuntekstejä ja selaa kaanonia | [Raamatun lukunäkymä ja navigaatio](/fi/guide/reader) |
| Kirkkovuosikalenteri ja päivän hetkipalvelukset | [Kirkkovuosikalenteri ja hetkipalvelukset](/fi/guide/liturgical-calendar) |
| Vertaile käännöksiä rinnakkain visuaalisella sanadiffillä | [Käännösvertailu ja diff](/fi/guide/compare-and-diff) |
| Hallitse kokoteksti- ja regex-haku sekä sanastoanalytiikka | [Haku ja tekstianalytiikka](/fi/guide/search-and-analytics) |
| Tutki kreikan ja heprean alkukieliä ja morfologiaa | [Alkukielet ja morfologia](/fi/guide/original-languages) |
| Hyödynnä teologisia AI-työkaluja ja semanttista hakua | [Teologiset AI-työkalut](/fi/guide/ai-study-tools) |
| Järjestä tutkimuksesi skoopeihin ja tallennettuihin hakuihin | [Työtilat ja skoopit](/fi/guide/workspaces) |
| Luo 2D canvas -muistiinpanoja ja jäädytä CLI-kyselyitä | [2D Canvas -tutkimusvihkot](/fi/guide/notebooks) |
| Opi ISLA v2 -kyselykielen syntaksi ja komennot | [ISLA v2 -kieliopas](/fi/guide/isla-guide) |
| Hallitse käännöskatalogia ja XML-suoratoistotuontia | [Käännökset ja tuonti](/fi/guide/import-and-seeding) |
| Asenna sovellus omalle palvelimelle tai kehitä paikallisesti | [Itseisännöinti ja asennus](/fi/guide/self-hosting) |
| Ymmärrä Go + React -kerrosarkkitehtuuria | [Arkkitehtuurin yleiskatsaus](/fi/architecture/overview) |
| Tutustu PostgreSQL GIN- ja SQLite FTS5 -skeemoihin | [Tietokanta ja kaksois-FTS](/fi/architecture/database) |
| Lue ISLA v2:n formaali kielioppimäärittely ja EBNF | [ISLA v2 -kielioppimäärittely](/fi/architecture/isla-specification) |
| Selaa kattavaa REST API -rajapintaviitettä | [Web API -viite](/api/reference) |
