# Clible Kanban Board

## In Progress

### Kirkkovuoden hetkipalvelusten tarkennukset: Ad Sextam, Completorium ja Aattorukous

  - due: 2026-09-27
  - tags: [liturgical, church-year, prayer-offices, completorium, ad-sextam, eve, backend, frontend]
  - priority: high
  - workload: Easy
  - defaultExpanded: true
  - steps:
      - [x] Korjaa Päivärukouksen nimi muotoon "Päivärukous (Ad Sextam)" i18n.ts-tiedostossa
      - [x] Lisää Completorium (yörukous) Kirkkokäsikirjan pysyvin tekstein (Ps. 4, Ps. 91, Ps. 134, Luuk. 2:29–32)
      - [x] Siirrä pyhäpäivien aattorukous (eve) edeltävän päivän aattoiltaan (D-1) LiturgicalService-palvelussa
      - [x] Käyttäjäasetus kirkkovuosikalenterin oletusnäkymälle (laatikot vs välilehdet) tietokantaan ja profiilinäkymään
      - [x] Päivitä CleanPrayerOffices- ja UserSettings-mallit Go- ja TypeScript-rajapinnoissa
      - [x] Yksikkötestit ja laatuporttien varmistus (task backend:check ja task frontend:check)
    ```md
    Tarkentaa kirkkovuoden hetkipalveluksia ja näkymäpreferenssejä:
    1. Keskipäivän hetkipalveluksen nimi on korjattu virallisen Kirkkokäsikirjan mukaiseen muotoon "Päivärukous (Ad Sextam)".
    2. Lisätty päivän päättävä hetkipalvelus eli Completorium (yörukous) vakiintunein psalmein ja Simeonin kiitosvirsin.
    3. Aattoiltahetkipalvelus (eve / vigilia) on siirretty liturgisen perinteemme mukaisesti edeltävän päivän aattoiltaan.
    4. Lisätty käyttäjäasetuksiin (UserSettingsView) valinta kirkkovuosinäkymän oletustilasta (avattavat laatikot vs. välilehdet) sekä tietokantaan (019_liturgical_view_mode.sql) että selaimeen (localStorage).
    ```

### Semanttisen haun jakeiden kuratointi ja Swipe-triage (Mobiili & Työpöytä)

  - due: 2026-09-28
  - tags: [search, ai, mobile, swipe, gestures, curation, frontend]
  - priority: high
  - defaultExpanded: true
  - steps:
      - [ ] CuratedVerseCard.tsx -komponentti mobiilin kosketuspyyhkäisyillä (Swipe Right = hyväksy, Swipe Left = hylkää)
      - [ ] Työpöydän nopeat hyväksy/hylkää-pikapainikkeet ja pikanäppäintuki
      - [ ] VerseCurationHeader.tsx -suodatuspalkki (Kaikki | Hyväksytyt | Hylätyt) ja tilastolaskurit
      - [ ] Kumoa/palauta-toiminto hylätyille jakeille
      - [ ] Kaksikieliset i18n.ts-käännökset kuratointieleille ja opastukselle
      - [ ] Työtilaan tallennus: tallenna ensisijaisesti vain hyväksytyt kuratoidut jakeet
      - [ ] Yksikkötestit CuratedVerseCardille ja AiSemanticSearch-integraatiolle
    ```md
    Suunnitelma: [.plans/02-luku-ja-haku/30-semanttisen-haun-jakeiden-kuratointi-ja-swipe-triage.md](file:///home/vivaldev/code/clible-v3-go/.plans/02-luku-ja-haku/30-semanttisen-haun-jakeiden-kuratointi-ja-swipe-triage.md)
    Mahdollistaa semanttisen haun löytämien jakeiden nopean kuratoinnin ja karsinnan. Puhelimella jakeita voi pyyhkäistä (swipe) hyväksytyiksi tai hylätyiksi luonnollisilla eleillä, ja työpöydällä kuratointi hoituu intuitiivisilla pikanapeilla ja pikanäppäimillä.
    ```

### Käyttäjäasetukset ja profiilinäkymä (User Settings & Profile View)

  - due: 2026-09-26
  - tags: [ui, settings, user, profile, preferences, frontend, backend]
  - priority: high
  - defaultExpanded: true
  - steps:
      - [ ] Tietokantamigraatio backend/migrations/016_user_preferences.sql (kieli, teema, oletuskäännös)
      - [ ] Backend API /api/user/settings (GET & PUT) ja user_repo.go -kyselyt
      - [ ] Kaksikieliset käännösavaimet i18n.ts asetussivulle (FI/EN)
      - [ ] UserSettingsView.tsx -sivun luonti ja /settings -reititys
      - [ ] UserMenuDropdown.tsx -valikon "Asetukset"-painikkeen kytkeminen navigointiin
      - [ ] Yksikkötestit ja laatuporttien varmistus (task check)
    ```md
    Suunnitelma: [.plans/14-kayttaja-ja-tili/29-kayttaja-asetukset-ja-profiilinakyma.md](file:///home/vivaldev/code/clible-v3-go/.plans/14-kayttaja-ja-tili/29-kayttaja-asetukset-ja-profiilinakyma.md)
    Toteuttaa keskitetyn käyttäjäasetukset- ja profiilinäkymän, josta käyttäjä voi hallita nimeään, oletuskäännöstä, teemaa, käyttöliittymäkieltä sekä tarkastella tilaustaan ja AI-kiintiötään.
    ```

## To Do

### Cliblen SEO & GEO (Generative Engine Optimization) -kokonaisuudistus

  - due: 2026-10-02
  - tags: [seo, geo, ai, llms-txt, schema-org, disambiguation, vitepress]
  - priority: high
  - workload: Medium
  - defaultExpanded: true
  - steps:
      - [ ] Luodaan frontend/public/llms.txt ja llms-full.txt (AI-koneellinen luettavuus & RAG)
      - [ ] Päivitetään frontend/index.html Schema.org JSON-LD (SoftwareApplication + FAQPage disambiguaatio)
      - [ ] Päivitetään hreflang-tagit (fi, en, x-default) ja metatiedot
      - [ ] Sallitaan AI-botit frontend/public/robots.txt (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
      - [ ] Päivitetään sitemap.xml ja varmistetaan staattinen/noscript-semanttinen runko
      - [ ] Optimoidaan GitHub Topics ja README.md entiteettiankkurointi
      - [ ] Validoidaan JSON-LD Schema ja ajetaan laatuportit (task frontend:check)
    ```md
    Suunnitelma: [.plans/15-docs-ja-viestinta/32-seo-ja-geo-generative-engine-optimization.md](file:///home/vivaldev/code/clible-v3-go/.plans/15-docs-ja-viestinta/32-seo-ja-geo-generative-engine-optimization.md)
    Korjataan Google-indeksointi ja tekoälybotti-tunnistus (GEO). Estetään AI-mallien harha 'Clible on kirjoitusvirhe sanasta Bible' luomalla llms.txt, Schema.org FAQPage/SoftwareApplication -entiteettiankkurointi ja AI-indeksointituki.
    ```

### Reader Viewin käyttöliittymäuudistus ja kutsuva lukunäkymä

  - due: 2026-09-29
  - tags: [ui, frontend, readerview]
  - priority: high
  - defaultExpanded: false
  - steps:
      - [ ] Kirkkovuoden tekstit ja pyhäpäivien lukukappaleet helposti avattavina
      - [ ] Käyttäjän omat suosikit, kirjanmerkit ja viimeksi luettu kohta
      - [ ] Kuratoidut nostot ja ydintekstit ensikertalaisille ja syventyville
    ```md
    Uudistetaan itsenäinen Raamatun lukunäkymä (`ReaderView`) siten, että sovellus avaa heti miellyttävän, häiriöttömän ja visuaalisesti rauhoittavan lukutilan.
    ```

### ISLA Frontier 5: Muuttujat (#muuttuja), tulosoperaattorin nimeämistuki ja reaktiivinen graafi

  - due: 2026-09-30
  - tags: [isla, dsl, ast, variables, notebook]
  - priority: high
  - defaultExpanded: false
  - steps:
      - [ ] Poista parserin keinotekoinen esto inline-operaattorin nimeämiseltä (`=> #muuttuja`)
      - [ ] Toteuta `VariableNode` AST-solmuksi ensiluokkaiseksi objektiksi (`! #armo.count(words)`)
      - [ ] Korjaa frontendin normalisointi (`MarkdownCell.tsx` ei saa muuttaa `#muuttujaa` vanhaksi laskuriksi)
      - [ ] Muuttujakontekstin välitys ja tuloksen sidonta muistikirjan reaktiiviseen tilaan
    ```md
    Suunnitelmat: [.plans/13-isla-ide-experience/22-isla-muuttujat-ja-tulosoperaattori.md](file:///home/vivaldev/code/clible-v3-go/.plans/13-isla-ide-experience/22-isla-muuttujat-ja-tulosoperaattori.md) ja [.visions/01-isla-language-horizon.md](file:///home/vivaldev/code/clible-v3-go/.visions/01-isla-language-horizon.md)
    Muuttaa muistikirjan passiivisesta tulostuksesta todelliseksi reaktiiviseksi tutkimusgraafiksi ilman toistuvia tietokantakyselyitä.
    ```

### Yhdistetty Markdown- ja CLI-solu (Unified Hybrid Cell)

  - due: 2026-10-10
  - tags: [notebook, ui, react19]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [ ] Sulauta CLI- ja Markdown-solut yhdeksi intuitiiviseksi soluksi
      - [ ] Optimistiset komentosolut (React 19 useTransition & useOptimistic)
    ```md
    Suunnitelma: [.plans/todos/01-unified-hybrid-cell-and-optimistic-commands.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/01-unified-hybrid-cell-and-optimistic-commands.md)
    ```

### PageSpeed Insights ja Core Web Vitals -optimoinnit

  - due: 2026-10-22
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

## Backlog

### Käyttäjädata, AI-kiintiöt ja lukutilastot (Study Analytics & Reading Streaks)

  - due: 2026-11-01
  - tags: [analytics, streaks, quotas, database, backend]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [ ] Taulu user_study_stats (lukupäivät, lukupäiväputki, jakeiden määrä)
      - [ ] Taulu user_ai_daily_usage päivittäisille AI-tokenkiintiöille
      - [ ] Backend-rajapinta ja lukutilastojen automaattinen kasvatus lukunäkymässä
      - [ ] Frontend-tilastokortti käyttäjäasetusten yhteyteen
    ```md
    Suunnitelma: [.plans/14-kayttaja-ja-tili/17-kayttajadata-ja-tilausarkkitehtuuri.md](file:///home/vivaldev/code/clible-v3-go/.plans/14-kayttaja-ja-tili/17-kayttajadata-ja-tilausarkkitehtuuri.md)
    Mahdollistaa käyttäjän oman lukuhistorian, aktiivisuusseurannan ja lukupäiväputkien (reading streaks) visualisoinnin.
    ```

### ISLA Frontier 1: Alkukielet ja morfologinen analyysi (Strong-numerot)

  - due: 2026-11-05
  - tags: [isla, greek, hebrew, morphology, backend]
  - priority: medium
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [ ] Tietokantataulut greek_words ja hebrew_words (lemma, Strong-numero, jae-FK)
      - [ ] ISLA `.greek()`, `.hebrew()` ja `.morphology()` -metodit AST-tasolle ja suoritukseen
      - [ ] Frontendin MorphologyCard kieliopilliselle tiedolle
    ```md
    Visio: [.visions/01-isla-language-horizon.md](file:///home/vivaldev/code/clible-v3-go/.visions/01-isla-language-horizon.md)
    Mahdollistaa kreikan ja heprean kieliopilliset sanaselitykset ja Strong-numerot suoraan jaevirran päälle.
    ```

### ISLA Frontier 2: Algebralliset joukko-operaatiot

  - due: 2026-11-10
  - tags: [isla, sets, dsl, backend]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [ ] `IntersectNode`, `UnionNode` ja `DiffNode` AST-solmut
      - [ ] SQL INTERSECT / UNION / EXCEPT alikyselyt repositoriotasolle
      - [ ] Metodit `.intersect()`, `.union()` ja `.diff()` parseriin
    ```md
    Visio: [.visions/01-isla-language-horizon.md](file:///home/vivaldev/code/clible-v3-go/.visions/01-isla-language-horizon.md)
    Antaa käyttäjän yhdistää hakuobjekteja ja jaejoukkoja joukko-opin säännöillä (`search("valkeus").intersect(search("elämä"))`).
    ```

### ISLA Frontier 4: Visuaaliset analytiikkadiagrammit

  - due: 2026-11-15
  - tags: [isla, charts, analytics, frontend]
  - priority: low
  - defaultExpanded: false
  - steps:
      - [ ] `.chart(kind: bar | treemap | radar)` -metodi ISLA-dataputkeen
      - [ ] CLIResult.Data["chart"] -rakenne backendissä
      - [ ] Frontend-kaaviokortit teemoille, frekvensseille ja tyylianalyyseille
    ```md
    Visio: [.visions/01-isla-language-horizon.md](file:///home/vivaldev/code/clible-v3-go/.visions/01-isla-language-horizon.md)
    Muodostaa frekvenssi- ja teemakyselyistä suoraan visuaalisia diagrammeja soluun.
    ```

### pgvector-vektoriupotukset ja lokaali samankaltaisuus (Frontier 3)

  - due: 2026-11-20
  - tags: [ai, pgvector, embeddings, postgresql]
  - priority: medium
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [ ] Upotusmallin valinta ja jakeiden vektorointiputki (text-embedding-3-small)
      - [ ] Neon PostgreSQL pgvector -laajennus ja verse_embeddings -taulu
      - [ ] ISLA `.similar(threshold: 0.8)` -metodi suoritustasolle
    ```md
    Visio: [.visions/01-isla-language-horizon.md](file:///home/vivaldev/code/clible-v3-go/.visions/01-isla-language-horizon.md)
    Täydentää Gemini API -semanttista hakua lokaalilla pgvector-samankaltaisuudella suoraan tietokantatasolla.
    ```

### Yhtenäinen API-virheenkäsittely (VULN-004)

  - due: 2026-11-25
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

### VitePress-dokumentaatio: Kaksikielinen ISLA-opas ja arkkitehtuuri

  - due: 2026-12-10
  - tags: [docs, vitepress, dsl, i18n]
  - priority: low
  - defaultExpanded: false
  - steps:
      - [ ] Kirjoita kaksikielinen (FI/EN) DSL-kielioppiopas VitePressiin
      - [ ] Liitä interaktiiviset koodiesimerkit ja visuaaliset arkkitehtuurikaaviot
    ```md
    Suunnitelma: [.plans/15-docs-ja-viestinta/15-vitepress-bilingual-i18n-architecture.md](file:///home/vivaldev/code/clible-v3-go/.plans/15-docs-ja-viestinta/15-vitepress-bilingual-i18n-architecture.md)
    ```

## Done

### Clible v3.* Asiantuntija-arkkitehti ja Spesifit Subagentit (Clible v3.* Expert & Subagents)

  - due: 2026-10-01
  - tags: [agent, skill, architecture, clible-v3, subagent, isla, react, backend]
  - priority: high
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [x] Esitutkimus: olemassa olevien taitojen (skills) ja työnkulkujen (workflows) kartoitus
      - [x] Suunnitelmadokumentin laadinta molemmista poluista (.plans/19-clible-v3-expert-agent/)
      - [x] Polku 1: Pääarkkitehdin taidon (.agents/skills/clible-v3-expert/SKILL.md) rakentaminen
      - [x] Polku 1: Arkkitehtuurikartan ja viitedokumenttien luominen (Go, React 19, ISLA v2, Neon DB)
      - [x] Polku 2: ISLA-subagentin syväperehdytys kattavaan kielioppidokumentaatioon (.plans/isla-v2, .plans/muistiot, .plans/13-isla-ide-experience)
      - [x] Polku 2: isla-engine-specialist -subagentin uudelleenmäärittely kattavalla kielioppipohjalla (v1/v2/v3 ja putkialgebra)
      - [x] Polku 2: react-compiler-auditor -subagentin dynaaminen määrittely ja katselmointitehtävä (React 19.2, 2D Grid Canvas, i18n)
      - [x] Polku 2: backend-pipeline-auditor -subagentin dynaaminen määrittely ja katselmointitehtävä (Go 1.22, O(1) streaming, Neon DB)
      - [x] Polku 2: pr-documentation-specialist -subagentin määrittely ja PR-story -laadintaprosessi
      - [x] Kaikkien subagenttien raporttien arviointi ja koonti
      - [x] .agents/ -hakemiston tuominen versionhallintaan (.gitignore -päivitys)
      - [x] Laaduntarkistukset ja toimivuuden varmennus (task check)
      - [x] PR-tarinan luominen ja PR:n avaaminen (task git:pr -> PR #95)
    ```md
    Suunnitelma: [.plans/19-clible-v3-expert-agent/01-clible-v3-expert-agent-ja-skill.md](file:///home/vivaldev/code/clible-v3-go/.plans/19-clible-v3-expert-agent/01-clible-v3-expert-agent-ja-skill.md)
    Toteutettu PR-tarinassa `pr_stories/089-feat-clible-v3-expert-agent-and-subagents.md` (GitHub PR #95).
    Hybridimallin (Vaihtoehto C) mukainen kokonaisuus:
    1. Polku 1: Pääarkkitehdin asiantuntijataito (.agents/skills/clible-v3-expert/), joka yhdistää Go 1.22+ backendin, React 19.2 -frontendin, ISLA v2 -moottorin ja Neon PostgreSQL -tietokannan sekä ohjaa työnkulkuja.
    2. Polku 2: Neljä erikoistunutta subagenttia (isla-engine-specialist, react-compiler-auditor, backend-pipeline-auditor, pr-documentation-specialist), joille annettu syväperehdytys projektin kattavaan dokumentaatiopohjaan ja suoritettu arkkitehtuurikatselmoinnit.
    3. Versionhallinta: .agents/ -hakemiston vapauttaminen .gitignoresta ja vieminen GitHub PR:ksi #95.
    ```

### i18n-käännöskorjaukset ja -parannukset (FI/EN)

  - due: 2026-10-18
  - tags: [i18n, frontend, localization]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [x] Käyttöliittymän auditointi kovakoodatuille teksteille
      - [x] Täysi kaksikielisyys (FI/EN) i18n.ts kautta
    ```md
    Suunnitelma: [.plans/todos/03-i18n-audit-and-improvements.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/03-i18n-audit-and-improvements.md)
    Auditoitu ja korjattu käyttöliittymän kovakoodatut tekstit ja käännösavaimet (SortableNotebookCard, NotebookCanvasView, CellBadge, UserAvatar, AiTokenUsageModal, i18n.ts).
    ```

### Käyttäjävalikko (User Menu) & Avatar-järjestelmä

  - due: 2026-09-30
  - tags: [ui, avatar, usermenu, header, frontend, i18n]
  - priority: high
  - defaultExpanded: true
  - steps:
      - [x] 10 kpl teema-SVG-avatareja & monogrammilaskenta (avatars.tsx)
      - [x] Kaksikieliset käännösavaimet käyttäjävalikolle (i18n.ts)
      - [x] Korjattu AiTokenUsageModalin asettelu createPortal(..., document.body) -mallilla
      - [x] UserAvatar.tsx -komponentin luonti
      - [x] UserMenuDropdown.tsx -alasvetovalikon luonti
      - [x] AppHeader.tsx -yläpalkin siistiminen uuden käyttäjävalikon alle
      - [x] Yksikkötestit UserAvatarille ja UserMenuDropdownille
    ```md
    Suunnitelma: [.plans/14-kayttaja-ja-tili/28-kayttajavalikko-ja-avatar-jarjestelma.md](file:///home/vivaldev/code/clible-v3-go/.plans/14-kayttaja-ja-tili/28-kayttajavalikko-ja-avatar-jarjestelma.md)
    Toteutettu PR-tarinassa #94 (v3.5.0). Kokoaa käyttäjätoiminnot, kielivalinnan, käännösten hallinnan ja AI-tokenkulutuksen yhteen tyylikkääseen käyttäjävalikkoon.
    ```

### Projektin yleissiivous: Vanhentuneet tiedostot, skill-polut ja koodipohjan eheyttäminen

  - due: 2026-10-15
  - tags: [cleanup, chore, refactor, maintenance]
  - priority: medium
  - defaultExpanded: false
  - steps:
      - [x] Siivottu .agents/skills/ -kansion kirjoitusvirheellinen tiedosto (text_to_speech.,d -> speechify-tts)
      - [x] Rajattu markdown-kanban -säännön ja skillin tiedostohaut projektin juureen
      - [x] Luotu Clible-täsmäskillit (clible-quality-gates, react-compiler-audit, isla-dsl-architecture)
      - [x] Tarkistettu orvot .plans/-luonnokset ja järjestelty aihealuekansioihin
      - [x] Auditoitu ja poistettu käyttämättömät testidumpit ja lokit (.cov/ ja /tmp)
      - [x] Varmistettu että git status ja git diff pysyvät puhtaina
      - [x] Lisätty ohjeisiin developer WIP -eristys ja rajattu laadunvarmistus
    ```md
    Säännöllinen ylläpito- ja siivoustiketti projektin tiedostorakenteen, agenttiskillien ja väliaikaistiedostojen siistimiseksi ja eheyttämiseksi.
    ```

### Go 1.26.x -toolchainin päivitys (VULN-001)

  - due: 2026-12-01
  - tags: [security, backend, go]
  - priority: high
  - workload: Easy
  - defaultExpanded: false
  - steps:
      - [x] Päivitä Go toolchain ja go.mod heti kun uusin korjattu jakeluversio julkaistaan (go1.26.5 aktiivisena)
      - [x] Varmista govulncheck nollatuloksella tai tunnetuilla upstream-rajoitteilla
    ```md
    Go runtime ja backend/go.mod päivitetty versioon go1.26.5. Standardikirjaston loput 6 havaintoa vaativat tulevan upstream-julkaisun go1.26.6.
    ```

### Semanttisen tekoälyhaun perusarkkitehtuuri ja kanoninen resoluutio

  - due: 2026-09-14
  - tags: [search, ai, gemini, backend, frontend]
  - priority: high
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [x] Gemini API -pohjainen semanttinen jaekysely (api/semantic_search_handler.go)
      - [x] Kanoninen jaeviittausten resoluutio suoraan tietokantateksteihin
      - [x] Frontendin AiSemanticSearch-komponentti ja SearchHub-integraatio
    ```md
    Toteutettu PR-tarinassa #92 (v3.4.0).
    ```

### Frontend-komponenttien React Compiler -optimointi ja React 19.2 -yhteensopivuus

  - due: 2026-09-13
  - tags: [frontend, react19, refactor]
  - priority: high
  - defaultExpanded: false
  - steps:
      - [x] React Compiler -raportin epäonnistumisten systemaattinen ratkaiseminen
      - [x] Turhien useEffect- ja useMemo-koukkujen karsiminen ja puhtaan tilan suoraviivaistaminen
      - [x] Laatuporttien varmistus (task check)
    ```md
    Toteutettu PR-tarinassa #91.
    ```

### Reader Viewin ja SearchHubin eriyttäminen omiin itsenäisiin reitteihinsä

  - due: 2026-09-13
  - tags: [ui, navigation, router, frontend]
  - priority: high
  - defaultExpanded: false
  - steps:
      - [x] ReaderViewin eristäminen itsenäiseksi lukutilaksi
      - [x] Uusi SearchHub-keskus hakuille ja tulosnäkymille
      - [x] Päänakypainikkeiden ja tilanhallinnan suoraviivaistaminen
    ```md
    Toteutettu PR-tarinassa #90.
    ```

### ISLA IDE: Reaaliaikainen Syntaksikorostus ja IntelliSense

  - due: 2026-09-12
  - tags: [isla, ide, frontend, dsl]
  - priority: high
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [x] Automaattinen tunnistus `!`-alkuisille riveille
      - [x] Monospaced-koodifokus ja dynaaminen syntaksiväritys
      - [x] IntelliSense-autokompletointi ja Quick Info -dokumentaatiolaatikko
    ```md
    Toteutettu PR-tarinassa #87 (v3.3.0).
    ```

### ISLA v2 Objekti-Metodi -arkkitehtuuri ja analyysiputki

  - due: 2026-09-11
  - tags: [isla, dsl, ast, backend]
  - priority: high
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [x] Kolmivaiheinen Objekti.metodi() >> tulos AST-arkkitehtuuri
      - [x] Putkutus, laskurit ja SQL-lokitus
      - [x] Kattavat AST- ja integraatiotestit
    ```md
    Toteutettu PR-tarinoissa #85 ja #86 (v3.2.0).
    ```

### ISLA Editorin älykkäät kirjoituseleet ja automaattiset sulkeumat

  - due: 2026-10-02
  - tags: [isla, ide, editor, ux]
  - priority: high
  - defaultExpanded: false
  - steps:
      - [x] `@`-älyele: syöttää `@()` ja kursorin sulkujen väliin tai käärii valitun tekstin
      - [x] Automaattiset sulkeumaparit `()`, `""`, `''` ja parin poisto Backspacella
      - [x] Ylikirjoitushyppy (overtype/leapfrog) sulkevan merkin yli
      - [x] Kirjoja ja ryhmiä tarjoavan autotäydennyksen välitön avaus `@`-merkin jälkeen
    ```md
    Suunnitelma: [.plans/13-isla-ide-experience/23-isla-editor-autoclosing-ja-kirjoituselealyt.md](file:///home/vivaldev/code/clible-v3-go/.plans/13-isla-ide-experience/23-isla-editor-autoclosing-ja-kirjoituselealyt.md)
    Modernien koodieditorien kaltainen sulava kirjoituskokemus ISLA-viittauksille ilman syntaksivirheitä.
    ```

### Hakutilan asetteluuudistus, semanttisen haun työtilatallennus & SPA-selainhistoria

  - due: 2026-09-22
  - tags: [search, ai, workspace, spa, navigation]
  - priority: high
  - defaultExpanded: true
  - steps:
      - [x] Hakutilan asetteluuudistus ilman välilehtiä (tekstihaku ja semanttinen haku luontevasti esillä ilman piilottelua)
      - [x] Semanttisen haun tallennuslomake ja Scope-integraatio (AiSemanticSearch.tsx)
      - [x] Tallennetun semanttisen haun palautus sivupalkista (SearchHub.tsx & App.tsx)
      - [x] SPA-selainhistorian (Edellinen- ja Seuraava-nuolet) synkronointi popstate/URL-tilalla
    ```md
    Suunnitelma: [.plans/02-luku-ja-haku/25-semanttisen-haun-tallennus-ja-spa-historia.md](file:///home/vivaldev/code/clible-v3-go/.plans/02-luku-ja-haku/25-semanttisen-haun-tallennus-ja-spa-historia.md)
    Uudistaa hakutilan siten, että semanttinen AI-haku ja perushaku eivät ole toistensa taakse piilotettuina tabeina vaan luontevasti saavutettavissa.
    ```

### Versiointistrategia ja julkaisuprosessi (SemVer 2.0.0 & Taskfile)

  - due: 2026-09-14
  - tags: [ci, semver, devops]
  - priority: low
  - workload: Easy
  - defaultExpanded: false
  - steps:
      - [x] Keskitetty VERSION-tiedosto ja synkronointi (Go, TS, package.json)
      - [x] Backendin /api/version -reitti
      - [x] task version:set ja task version:bump -automaatiot
    ```md
    Keskitetty ja automatisoitu versionhallinta SemVer 2.0.0 -standardin mukaisesti.
    ```

### Vierastila (Guest Mode) ja 1h TTL -väliaikaiset vierasmuistikirjat

  - due: 2026-09-10
  - tags: [auth, guest, backend, frontend]
  - priority: high
  - workload: Hard
  - defaultExpanded: false
  - steps:
      - [x] Vierastilan todennusmiddleware ja sessioiden hallinta
      - [x] 1h TTL väliaikaiset vierasmuistikirjat ja automaattisiivous
      - [x] Työkalujen välimuistitus ja suojaukset
    ```md
    Toteutettu PR-tarinoissa #79 ja #81.
    ```

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
    Toteutettu PR-tarinoissa #80 ja #81.
    ```

### Notebook-solujen muotoilu (Psalttari, Runous & Taikalinkit)

  - due: 2026-10-14
  - tags: [typography, formatting, ui]
  - priority: medium
  - workload: Easy
  - defaultExpanded: false
  - steps:
      - [x] Säkeistöasettelut runouskirjoille ja psalmeille
      - [x] Sisäiset [[Viite]]-taikalinkit ja esikatselut
    ```md
    Suunnitelma: [.plans/todos/02-poetry-formatting-and-magic-links.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/02-poetry-formatting-and-magic-links.md)
    ```

