# Clible Kanban Board

## In Progress

### Reader Viewin käyttöliittymäuudistus ja kutsuva lukunäkymä

  - due: 2026-09-20
  - tags: [ui, frontend, readerview]
  - priority: high
  - defaultExpanded: true
  - steps:
      - [ ] Kirkkovuoden tekstit ja pyhäpäivien lukukappaleet helposti avattavina
      - [ ] Käyttäjän omat suosikit, kirjanmerkit ja viimeksi luettu kohta
      - [ ] Kuratoidut nostot ja ydintekstit ensikertalaisille ja syventyville
    ```md
    Uudistetaan Raamatun lukunäkymä (`ReaderView`) siten, että sovellus avaa heti miellyttävän, häiriöttömän ja visuaalisesti rauhoittavan lukutilan.
    ```

## To Do

### Clible Magic DSL Markdown-solussa ja CLI Freeze-resetointi

  - due: 2026-09-30
  - tags: [dsl, markdown, ui]
  - priority: high
  - defaultExpanded: false
  - steps:
      - [ ] Siirrä DSL-lausekkeet Markdown-soluihin (```magic)
      - [ ] Typografian uudistus (Google Fonts Lora & JetBrains Mono)
      - [ ] CLI-solun Freeze-resetointi alkutilaan
    ```md
    Suunnitelma: [.plans/11-dsl-and-hybrid-cells/05-dsl-markdown-magic-blocks-and-cli-cleanup.md](file:///home/vivaldev/code/clible-v3-go/.plans/11-dsl-and-hybrid-cells/05-dsl-markdown-magic-blocks-and-cli-cleanup.md)
    ```

### Yhdistetty Markdown- ja CLI-solu (Unified Hybrid Cell)

  - due: 2026-10-05
  - tags: [notebook, ui, react19]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [ ] Sulauta CLI- ja Markdown-solut yhdeksi intuitiiviseksi soluksi
      - [ ] Optimistiset komentosolut (React 19 useTransition & useOptimistic)
    ```md
    Suunnitelma: [.plans/todos/01-unified-hybrid-cell-and-optimistic-commands.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/01-unified-hybrid-cell-and-optimistic-commands.md)
    ```

### Notebook-solujen muotoilu (Psalttari, Runous & Taikalinkit)

  - due: 2026-10-10
  - tags: [typography, formatting, ui]
  - priority: medium
  - workload: Easy
  - defaultExpanded: false
  - steps:
      - [ ] Säkeistöasettelut runouskirjoille ja psalmeille
      - [ ] Sisäiset [[Viite]]-taikalinkit ja esikatselut
    ```md
    Suunnitelma: [.plans/todos/02-poetry-formatting-and-magic-links.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/02-poetry-formatting-and-magic-links.md)
    ```

### i18n-käännöskorjaukset ja -parannukset (FI/EN)

  - due: 2026-10-15
  - tags: [i18n, frontend, localization]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [ ] Käyttöliittymän auditointi kovakoodatuille teksteille
      - [ ] Täysi kaksikielisyys (FI/EN) i18n.ts kautta
    ```md
    Suunnitelma: [.plans/todos/03-i18n-audit-and-improvements.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/03-i18n-audit-and-improvements.md)
    ```

### PageSpeed Insights ja Core Web Vitals -optimoinnit

  - due: 2026-10-20
  - tags: [performance, cwv, backend, frontend]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [ ] Go-backendin staattisten tiedostojen Cache-Control (~1,1 MB säästö)
      - [ ] Frontendin koodinpilkonta React.lazy()-latauksella (~718 KiB säästö)
      - [ ] Mobiilin puuttuva aria-label asetuspainikkeessa
      - [ ] Asynkroniset fontit ja llms.txt-tekoälyindeksointi
    ```md
    Suunnitelma: [.plans/todos/04-pagespeed-performance-and-cwv-optimizations.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/04-pagespeed-performance-and-cwv-optimizations.md)
    ```

### Yhtenäinen API-virheenkäsittely (VULN-004)

  - due: 2026-10-25
  - tags: [backend, api, security, refactor]
  - priority: high
  - defaultExpanded: false
  - steps:
      - [ ] Refaktoroi käsittelijät käyttämään api.ErrorResponse-rakennetta
      - [ ] Estä raakojen virheviestien ja tietokantarakenteiden paljastuminen
      - [ ] Yhdenmukainen virheiden lokitus slog.Error:lla
    ```md
    Refaktorointikohde: scope_handler, analytics_handler, notebook_handler, translation_handler, book_handler, history_handler.
    ```

## Backlog

### Notebook-solujen tekoälyominaisuudet (ISLA AI)

  - due: 2026-11-15
  - tags: [ai, isla, notebook]
  - priority: medium
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [ ] Summary: !isla summarize --cells=n
      - [ ] Explain: !isla explain @(Joh 3:16)
      - [ ] Translate/Paraphrase: !isla paraphrase @(Room 8:28)
      - [ ] Study Plan: !isla studyplan search("armo").at(kirjeet)
      - [ ] Semantic & Conceptual Search: !isla search semantic "..."
    ```md
    Tekoälypohjaiset toiminnot ISLA-soluihin ja putkituksiin.
    ```

## Done

### Notebook-koodisolun ja CLI-putkituksen perusarkkitehtuuri

  - due: 2026-09-10
  - tags: [isla, notebook, backend, frontend]
  - priority: high
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [x] ISLA v2 AST-jäsennin ja suoritusmoottori
      - [x] CodeCell-komponentti ja reaaliaikainen tulostus
      - [x] Testikattavuus ja laatuportit (task check)
    ```md
    Toteutettu PR-tarinoissa 080 ja 081.
    ```

### ISLA IDE: Reaaliaikainen Syntaksikorostus ja IntelliSense

  - due: 2026-09-25
  - tags: [isla, ide, frontend, dsl]
  - priority: high
  - workload: Hard
  - defaultExpanded: true
  - steps:
      - [x] Automaattinen tunnistus `!`-alkuisille riveille
      - [x] Monospaced-koodifokus ja dynaaminen syntaksiväritys
      - [x] IntelliSense-autokompletointi ja Quick Info -dokumentaatiolaatikko
    ```md
    Suunnitelma: [.plans/13-isla-ide-experience/00-isla-ide-arkkitehtuuri-ja-kokonaiskuva.md](file:///home/vivaldev/code/clible-v3-go/.plans/13-isla-ide-experience/00-isla-ide-arkkitehtuuri-ja-kokonaiskuva.md)
    Moderni IDE-koodauskokemus selaimeen.
    ```

