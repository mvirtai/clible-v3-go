---
layout: home

hero:
  name: clible-v3
  text: Verkkopohjainen alusta Raamatun tutkimiseen ja tekstianalyysiin
  tagline: >
    Go-rajapinta + React 19 + ISLA v2 -kyselykieli,
    2D Canvas -tutkimusvihkot, kokotekstihaku, tekstianalyysi
    ja rinnakkaiset käännösvertailut. Pilvipalveluna toimiva, avoimen lähdekoodin ja maksuton.
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
      Helppokäyttöinen objekti-metodi-kyselykieli, jonka voi upottaa suoraan Markdowniin.
      @(Joh 3:16).vs(KR92, KJV) =>  search("armo").at(epistolat).stats() >>
      Deterministinen AST-jäsennin, Monaco IntelliSense ja Levenshtein-virhediagnostiikka.
  - icon: 📓
    title: 2D Canvas -tutkimusvihkot
    details: >
      24-sarakkeinen ruudukko Markdown-muistiinpanoille,
      päivittyville ISLA-kyselyille ja jatkuvasti käytettävälle komentorivilehtiölle,
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
      Sanaston monimuotoisuus (Type-Token Ratio), sanatiheydet,
      teemojen avainsanat ja rinnakkaiset käännösvertailut
      — kaikki käytettävissä yhdellä ISLA-komennolla.
  - icon: ⚡
    title: O(1)-muistinkäytön XML-tuonti
    details: >
      Muistitehokas XML-jäsennin tuo Raamatun käännökset suoraan
      tietokantaan ilman väliaikaistiedostoja. Se käsittelee suuretkin
      USFX- ja OSIS-tiedostot yhdellä läpikäynnillä.
  - icon: 🗂️
    title: Tutkimustyötilat
    details: >
      Erilliset tutkimustyötilat kokoavat tallennetut haut, sanastoanalyysit
      analyysit ja tutkimusvihkot yhtenäisiksi kokonaisuuksiksi.
      Lataus yhdellä pyynnöllä: GET /api/scopes/workspace.
  - icon: 🤖
    title: Gemini-tekoäly
    details: >
      Kreikan ja heprean morfologinen analyysi, luonnollisen kielen semanttinen haku,
      raamatunkohtien tulkinta ja käännösvertailut Google Geminin avulla.
  - icon: 🚀
    title: Natiivi Go REST API
    details: >
      Suorituskykyinen, tilaton Go 1.22+ -verkkopalvelu.
      Pyyntöjen peruutusten välitys, O(1)-muistinkäytön suoratoisto ja
      selkeä nelikerroksinen arkkitehtuuri.
  - icon: 🌐
    title: Kaksikielinen ja saavutettava
    details: >
      Käyttöliittymä suomeksi tai englanniksi yhdellä napsautuksella.
      Lämminsävyinen kultateema sekä tumma ja vaalea tila.
---

## Järjestelmäarkkitehtuuri pähkinänkuoressa

clible-v3 on verkkopohjainen tutkimusympäristö, jota käytetään selaimessa.
ISLA-kyselymoottori toimii palvelinpuolella itsenäisenä Go-pakettina ja suorittaa lausekkeet
alle 50 mikrosekunnissa lekseristä tulosprojektioon:

```mermaid
graph TD
    User(["Tutkija / Käyttäjä"]) --> UI["Verkkosovellus: React 19 + Tailwind v4"]

    subgraph Core_Features ["Ydintoiminnot"]
        UI --> R["Raamatun lukunäkymä ja navigaatio"]
        UI --> C["Käännösvertailu ja tekstierot"]
        UI --> S["Kokotekstihaku ja Boolen logiikka"]
        UI --> O["Alkukielet ja morfologia"]
        UI --> A["Tekstianalytiikka ja ISLA-kyselyt"]
        UI --> N["2D Canvas -tutkimusvihkot"]
        UI --> W["Tutkimustyötilat"]
        UI --> AI["Teologinen tekoälypalvelu"]
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
| Vertaile käännöksiä rinnakkain ja tarkastele tekstieroja | [Käännösvertailu ja tekstierot](/fi/guide/compare-and-diff) |
| Hallitse kokoteksti- ja regex-haku sekä sanastoanalytiikka | [Haku ja tekstianalytiikka](/fi/guide/search-and-analytics) |
| Tutki kreikan ja heprean alkukieliä ja morfologiaa | [Alkukielet ja morfologia](/fi/guide/original-languages) |
| Hyödynnä teologisia tekoälytyökaluja ja semanttista hakua | [Teologiset tekoälytyökalut](/fi/guide/ai-study-tools) |
| Järjestä tutkimuksesi työtiloihin ja tallenna hakuja | [Tutkimustyötilat](/fi/guide/workspaces) |
| Tee 2D Canvas -muistiinpanoja ja tallenna komentorivikyselyiden tuloksia | [2D Canvas -tutkimusvihkot](/fi/guide/notebooks) |
| Opi ISLA v2 -kyselykielen syntaksi ja komennot | [ISLA v2 -kieliopas](/fi/guide/isla-guide) |
| Hallitse käännösluetteloa ja tuo käännöksiä XML-muodossa | [Käännökset ja tuonti](/fi/guide/import-and-seeding) |
| Asenna sovellus omalle palvelimelle tai kehitä paikallisesti | [Itseisännöinti ja asennus](/fi/guide/self-hosting) |
| Ymmärrä Go + React -kerrosarkkitehtuuria | [Arkkitehtuurin yleiskatsaus](/fi/architecture/overview) |
| Tutustu PostgreSQL GIN- ja SQLite FTS5 -skeemoihin | [Tietokanta ja kaksois-FTS](/fi/architecture/database) |
| Lue ISLA v2:n formaali kielioppimäärittely ja EBNF | [ISLA v2 -kielioppimäärittely](/fi/architecture/isla-specification) |
| Selaa kattavaa REST API -rajapintaviitettä | [Web API -viite](/api/reference) |
