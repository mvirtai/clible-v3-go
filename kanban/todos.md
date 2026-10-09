# Clible Kanban Board

## To Do

### Reader Viewin käyttöliittymäuudistus ja kutsuva lukunäkymä

- due: 2026-09-29
- tags: [ui, frontend, readerview\]
- priority: high
- defaultExpanded: false
- steps:
  - [ ] Kirkkovuoden tekstit ja pyhäpäivien lukukappaleet helposti avattavina
  - [ ] Käyttäjän omat suosikit, kirjanmerkit ja viimeksi luettu kohta
  - [ ] Kuratoidut nostot ja ydintekstit ensikertalaisille ja syventyville

    ```md
    Uudistetaan itsenäinen Raamatun lukunäkymä (`ReaderView`) siten, että sovellus avaa heti miellyttävän, häiriöttömän ja visuaalisesti rauhoittavan lukutilan.
    ```

### Yhdistetty Markdown- ja CLI-solu (Unified Hybrid Cell)

- due: 2026-10-10
- tags: [notebook, ui, react19\]
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
- tags: [performance, cwv, backend, frontend\]
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

## In Progress

## Done

### Semanttisen haun jakeiden kuratointi ja Swipe-triage (Mobiili & Työpöytä)

- due: 2026-09-28
- tags: [search, ai, mobile, swipe, gestures, curation, frontend]
- priority: high
- defaultExpanded: false
- steps:
  - [x] CuratedVerseCard.tsx -komponentti mobiilin kosketuspyyhkäisyillä (Swipe Right = hyväksy, Swipe Left = hylkää)
  - [x] Työpöydän nopeat hyväksy/hylkää-pikapainikkeet ja pikanäppäintuki
  - [x] VerseCurationHeader.tsx -suodatuspalkki (Kaikki | Hyväksytyt | Hylätyt) ja tilastolaskurit
  - [x] Kumoa/palauta-toiminto hylätyille jakeille
  - [x] Kaksikieliset i18n.ts-käännökset kuratointieleille ja opastukselle
  - [x] Työtilaan tallennus: tallenna ensisijaisesti vain hyväksytyt kuratoidut jakeet
  - [x] Yksikkötestit CuratedVerseCardille ja AiSemanticSearch-integraatiolle

    ```md
    Suunnitelma: [.plans/02-luku-ja-haku/30-semanttisen-haun-jakeiden-kuratointi-ja-swipe-triage.md](file:///home/vivaldev/code/clible-v3-go/.plans/02-luku-ja-haku/30-semanttisen-haun-jakeiden-kuratointi-ja-swipe-triage.md)
    Mahdollistaa semanttisen haun löytämien jakeiden nopean kuratoinnin ja karsinnan. Puhelimella jakeita voi pyyhkäistä (swipe) hyväksytyiksi tai hylätyiksi luonnollisilla eleillä, ja työpöydällä kuratointi hoituu intuitiivisilla pikanapeilla ja pikanäppäimillä.
    ```

### VitePress-dokumentaation suomentaminen (Kaksikielinen EN/FI -dokumentaatio)

- due: 2026-11-20
- tags: [docs, vitepress, i18n, finnish, guide, architecture]
- priority: medium
- workload: Medium
- defaultExpanded: false
- steps:
  - [x] Vaihe 0: VitePress locales-konfiguraatio (docs/.vitepress/config.ts root: en, fi: suomi)
  - [x] Vaihe 1 (Ydinosa): Etusivu ja keskeiset käyttöoppaat (fi/index.md, getting-started, reader, search-and-analytics, compare-and-diff, liturgical-calendar, notebooks, workspaces)
  - [x] Vaihe 2 (Edistyneet): ISLA DSL -kieliopas ja työkalut (isla-guide, ai-study-tools, original-languages, import-and-seeding, self-hosting, terms-and-privacy)
  - [x] Vaihe 3 (Arkkitehtuuri): Tekninen dokumentaatio (architecture/overview, database, isla-specification)
  - [x] Vaihe 4: Laadunvarmistus (pnpm run docs:build linkkitarkastuksineen ja kielikytkimen toiminta)

    ```md
    Toteutettu PR-tarinassa `pr_stories/114-docs-vitepress-finnish-translation-and-locale-routing.md`.
    VitePress-dokumentaation kääntäminen suomeksi (17 tiedostoa, ml. ISLA-kieliopas ja arkkitehtuuridokumentit) ja reitityksen sekä sivupalkkien korjaus säilyttämään kieliasetus eheänä `/fi/`-lokaalissa.
    ```

### Yhtenäinen API-virheenkäsittely ja tietovuotojen esto (VULN-004)

- due: 2026-11-25
- tags: [backend, api, security, refactor, frontend\]
- priority: high
- workload: Medium
- defaultExpanded: false
- steps:
  - [x] Refaktoroitu käsittelijät käyttämään api.ErrorResponse- ja writeErrorResponse-rakennetta
  - [x] Estetty raakojen virheviestien ja sisäisten tietokantarakenteiden paljastuminen asiakkaalle
  - [x] Yhdenmukaistettu virheiden lokitus slog.Error-funktiolla backendissä
  - [x] Yhdenmukaistettu frontendin ApiService virheiden jäsennykseen ja käsittelyyn
  - [x] Nostettu sovelluksen versio 3.13.1:een ja ajettu laatuportit

    ```md
    Toteutettu PR-tarinassa `pr_stories/091-fix-unify-api-error-responses-and-prevent-information-leakage.md` ja yhdistetty haaraan main (#125).
    Korjattu tietoturva-auditoinnin havainto VULN-004: rajapinnat palauttavat nyt yhdenmukaisen JSON-virherakenteen eivätkä vuoda sisäisiä järjestelmä- tai tietokantavirheitä ulospäin.
    PR: [#125](https://github.com/mvirtai/clible-v3-go/pull/125).
    ```

### Teknisen suunnittelun pohja ja suunnitelmien dokumentointikäytännöt

- due: 2026-10-02
- tags: [docs, planning, agents, kanban\]
- priority: medium
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Lisää suomenkielinen teknisen suunnittelun Markdown-pohja
  - [x] Päivitä agenttiohjeet kielistä, suunnitelmien opetustavasta ja `.plans/`-hakemistorakenteesta
  - [x] Lisää vaatimus Kanban-taulun pitämisestä ajan tasalla
  - [x] Tarkista ohjeiden ja taulun rakenne sekä siirrä kortti valmistuneisiin

    ```md
    Suunnitelmapohja: [pr_stories/templates/TECHNICAL_DESIGN.template.md](../pr_stories/templates/TECHNICAL_DESIGN.template.md)
    Päivittää teknisen suunnittelun pohjan sekä agenttien kieli-, suunnittelu-, suunnitelmahakemisto- ja Kanban-käytännöt.
    ```

### Käyttäjäasetukset ja profiilinäkymä (User Settings & Profile View)

- due: 2026-09-26
- tags: [ui, settings, user, profile, preferences, frontend, backend\]
- priority: high
- defaultExpanded: false
- steps:
  - [x] Tietokantamigraatio backend/migrations/016_user_preferences.sql (kieli, teema, oletuskäännös)
  - [x] Backend API /api/user/settings (GET & PUT) ja user_repo.go -kyselyt
  - [x] Kaksikieliset käännösavaimet i18n.ts asetussivulle (FI/EN)
  - [x] UserSettingsView.tsx -sivun luonti ja /settings -reititys
  - [x] UserMenuDropdown.tsx -valikon "Asetukset"-painikkeen kytkeminen navigointiin
  - [x] Yksikkötestit ja laatuporttien varmistus (task check)

    ```md
    Suunnitelma: [.plans/14-kayttaja-ja-tili/29-kayttaja-asetukset-ja-profiilinakyma.md](file:///home/vivaldev/code/clible-v3-go/.plans/14-kayttaja-ja-tili/29-kayttaja-asetukset-ja-profiilinakyma.md)
    Toteutettu ja yhdistetty PR:ssä [#97](https://github.com/mvirtai/clible-v3-go/pull/97).
    ```

### Mobiililähtöinen responsiivinen käyttöliittymä

- tags: [ui, frontend, responsive, mobile\]
- priority: high
- defaultExpanded: false
- steps:
  - [x] Responsiivisuuden parannukset toteutettu ja yhdistetty

    ```md
    PR: [#98](https://github.com/mvirtai/clible-v3-go/pull/98).
    ```

### Henkilökohtainen AI-käyttö ja ryhmitellyt käännökset

- tags: [ai, usage, translations, frontend, backend\]
- priority: high
- defaultExpanded: false
- steps:
  - [x] Henkilökohtainen AI-käyttö ja ryhmitellyt käännökset toteutettu ja yhdistetty

    ```md
    PR: [#99](https://github.com/mvirtai/clible-v3-go/pull/99).
    ```

### Telemetrian ja käyttäjäasetusten tietoturvakovennukset

- tags: [security, telemetry, settings, backend\]
- priority: high
- defaultExpanded: false
- steps:
  - [x] Tietoturvakovennukset toteutettu ja yhdistetty

    ```md
    PR: [#100](https://github.com/mvirtai/clible-v3-go/pull/100).
    ```

### Kirkkovuoden ja rukoushetkien stop-sanojen ja URL-linkkien suodatus ISLA-viennissä

- due: 2026-09-27
- tags: [liturgical, isla, notebook, export, links, sanitize, frontend\]
- priority: high
- workload: Easy
- defaultExpanded: true
- steps:
  - [x] Lisää cleanStopWordsAndUrls(text) -siistintäfunktio tiedostoon frontend/src/utils/liturgicalIslaExport.ts
  - [x] Lisää stripLinks-optio ja suodata URL-osoitteet sekä markdown-linkit officesToISLA- ja liturgicalToISLA-funktioissa
  - [x] Lisää kattavat Vitest-yksikkötestit frontend/src/utils/liturgicalIslaExport.test.ts
  - [x] Suorita laatuportit (task frontend:check)

    ```md
    Suunnitelma: [.plans/02-luku-ja-haku/34-stop-sanojen-ja-linkkien-suodatus-isla-rukoushetkissa.md](file:///home/vivaldev/code/clible-v3-go/.plans/02-luku-ja-haku/34-stop-sanojen-ja-linkkien-suodatus-isla-rukoushetkissa.md)
    Poistaa ylimääräiset stop-sanat, Markdown-linkit ja raa'at URL-osoitteet rukoushetkien ja kirkkovuoden ISLA-tekstiviennistä, taaten puhtaan komentosyntaksin ja luettavuuden muistikirjasoluissa.
    Toteutettu ja yhdistetty PR:ssä [#105](https://github.com/mvirtai/clible-v3-go/pull/105).
    ```

### Suomen kielen taivutusmuotojen lemmatisointi ja sanojen klusterointi ISLA DSL:ssä

- due: 2026-10-05
- tags: [isla, dsl, nlp, lemmatization, finnish, analytics\]
- priority: high
- defaultExpanded: false
- steps:
  - [x] Suunnittele ja toteuta suomen kielen sääntöpohjainen vartalo-/päätteiden leikkaaja ja poikkeussanakirja (`lemmatizer_fi.go`)
  - [x] Toteuta sanojen aggregoiva ryhmittely `AnalyticsService`:en (niputetaan esim. Jeesus / Jeesuksen, Herra / Herran / Herralle)
  - [x] Lisää ISLA v2 DSL:ään `.categorize(true)` / `.lemma()` -metodit AST-suorittimeen
  - [x] Kirjoita kattavat yksikkötestit raamatullisella sanastolla (`lemmatizer_fi_test.go`)
  - [x] Varmista kaksikielisyys ja aja laatuportit (`task backend:check` & `task check`)

    ```md
    Suunnitelma: [.plans/02-luku-ja-haku/35-suomen-kielen-taivutusmuotojen-lemmatisointi-ja-klusterointi-isla.md](file:///home/vivaldev/code/clible-v3-go/.plans/02-luku-ja-haku/35-suomen-kielen-taivutusmuotojen-lemmatisointi-ja-klusterointi-isla.md)
    Toteutettu suomen kielen taivutusmuotojen tunnistus ja klusterointi ISLA DSL:n frekvenssianalyysiin (esim. `! ^.top(20).categorize(true)` tai `.lemma()`), jolloin saman sanan eri sijamuodot (Jeesus/Jeesuksen, Herra/Herralle) yhdistyvät yhdeksi ryhmäksi kanonisen perusmuodon alle.
    Toteutettu ja yhdistetty PR:ssä [#110](https://github.com/mvirtai/clible-v3-go/pull/110).
    ```

### Opiskelumenetelmien mallit ja monilukusuunnitelmat

- tags: [study, reading-plans, templates, frontend\]
- priority: medium
- defaultExpanded: false
- steps:
  - [x] Opiskelumenetelmien mallit ja monilukusuunnitelmat toteutettu ja yhdistetty

    ```md
    PR: [#111](https://github.com/mvirtai/clible-v3-go/pull/111).
    ```

### Muistikirja-API:n viiveoptimointi

- tags: [performance, notebook, api, backend\]
- priority: high
- defaultExpanded: false
- steps:
  - [x] Muistikirja-API:n viiveoptimoinnit toteutettu ja yhdistetty

    ```md
    PR: [#112](https://github.com/mvirtai/clible-v3-go/pull/112).
    ```

### Kattavat suorituskykyoptimoinnit

- tags: [performance, backend, frontend\]
- priority: high
- workload: Hard
- defaultExpanded: false
- steps:
  - [x] Kattavat suorituskykyoptimoinnit toteutettu ja yhdistetty

    ```md
    PR: [#113](https://github.com/mvirtai/clible-v3-go/pull/113).
    ```

### Muistikirjakankaan vieritys ja kirkkovuoden hymnilinkit

- tags: [notebook, ui, liturgical, frontend\]
- priority: medium
- defaultExpanded: false
- steps:
  - [x] Muistikirjakankaan vieritys ja hymnilinkit parannettu sekä yhdistetty

    ```md
    PR: [#114](https://github.com/mvirtai/clible-v3-go/pull/114).
    ```

### Clible v3:n koodikatselmointitaito

- tags: [agents, skills, docs, code-review\]
- priority: medium
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Koodikatselmointitaito dokumentoitu ja yhdistetty

    ```md
    PR: [#115](https://github.com/mvirtai/clible-v3-go/pull/115).
    ```

### Tokenien uudelleenkäyttö käännösvertailun analytiikassa

- tags: [performance, analytics, backend\]
- priority: medium
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Tokenien uudelleenkäyttö toteutettu ja yhdistetty

    ```md
    PR: [#116](https://github.com/mvirtai/clible-v3-go/pull/116).
    ```

### Frontend-testit CI-putkeen

- tags: [ci, frontend, tests\]
- priority: high
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Frontend-testit lisätty CI-putkeen ja PR yhdistetty

    ```md
    PR: [#117](https://github.com/mvirtai/clible-v3-go/pull/117).
    ```

### Version merkkijonojen synkronointi versioon 3.12.0

- tags: [release, versioning, fix\]
- priority: medium
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Versiomerkkijonot synkronoitu ja PR yhdistetty

    ```md
    PR: [#118](https://github.com/mvirtai/clible-v3-go/pull/118).
    ```

### Tuotannon runtime-asetusten koventaminen Terraformissa

- tags: [terraform, security, deployment\]
- priority: high
- defaultExpanded: false
- steps:
  - [x] Tuotannon runtime-asetukset kovennettu ja PR yhdistetty

    ```md
    PR: [#119](https://github.com/mvirtai/clible-v3-go/pull/119).
    ```

### Lisenssitiedon korjaus ja NOTICE-attribuutio

- tags: [docs, license, compliance\]
- priority: low
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Lisenssiviite korjattu, NOTICE-attribuutio lisätty ja PR yhdistetty

    ```md
    PR: [#120](https://github.com/mvirtai/clible-v3-go/pull/120).
    ```

### Olemassa olevan tekstianalytiikan avaaminen rajapinnan kautta

- tags: [analytics, api, backend\]
- priority: medium
- defaultExpanded: false
- steps:
  - [x] Tekstianalytiikka avattu rajapinnan kautta ja PR yhdistetty

    ```md
    PR: [#121](https://github.com/mvirtai/clible-v3-go/pull/121).
    ```

### Työtilan navigoinnin ryhmittely

- tags: [workspace, navigation, ui, frontend\]
- priority: medium
- defaultExpanded: false
- steps:
  - [x] Työtilan navigoinnin ryhmittely toteutettu ja PR yhdistetty

    ```md
    PR: [#122](https://github.com/mvirtai/clible-v3-go/pull/122).
    ```

### Polun käsittelyn koodiskannauskorjaus

- tags: [security, code-scanning, backend\]
- priority: high
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Polun käsittelyn koodiskannauskorjaus toteutettu ja PR yhdistetty

    ```md
    PR: [#123](https://github.com/mvirtai/clible-v3-go/pull/123).
    ```

### Kirkkovuoden datan upottaminen Go-binääriin ja tuotannon 404-korjaus

- due: 2026-09-27
- tags: [liturgical, docker, backend, go, embed, bugfix\]
- priority: high
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Upota kirkkovuosi_2026.json Go-binääriin (//go:embed) paketissa backend/internal/parsers/
  - [x] Päivitä backend/main.go käyttämään ensisijaisesti upotettua dataa (fallback os.Getenv("LITURGICAL_DATA_PATH"))
  - [x] Päivitä Dockerfile kopioimaan parsers/data varmuudeksi
  - [x] Päivitä ja suorita backendin testit (LiturgicalService_ActualFile & LiturgicalService_DefaultEmbedded)
  - [x] Aja laatuportit (task backend:check)

    ```md
    Toteutettu PR-tarinassa #97 ja yhdistetty haaraan main (#104).
    Korjaa tuotannossa (clible.fi) esiintyvän 404-virheen /api/liturgical/day -reiteissä upottamalla kirkkovuosi_2026.json suoraan Go-binääriin //go:embed -direktiivillä.
    PR: [#104](https://github.com/mvirtai/clible-v3-go/pull/104).
    ```

### Kirkkovuoden tekstien ISLA DSL -kooste muistiinpanoihin ja pikanäppäin

- due: 2026-09-28
- tags: [liturgical, isla, dsl, notebook, export, keyboard-shortcut, frontend\]
- priority: high
- defaultExpanded: true
- steps:
  - [x] Toteuta puhdas ISLA-tekstigeneraattori liturgicalToISLA() frontend/src/utils/liturgicalIslaExport.ts
  - [x] Lisää Vitest-yksikkötestit generaattorille (liturgicalIslaExport.test.ts)
  - [x] Lisää kaksikieliset i18n-käännökset vientitoiminnolle ja pikanäppäinvihjeille
  - [x] Lisää handleExportLiturgicalToNotebook()-reititys App.tsx:ään (kirjautunut + vierastila)
  - [x] Lisää LiturgicalView.tsx-näkymään toimintopainike ja Alt+N -pikanäppäinkuuntelija
  - [x] Varmista laatuportit (task frontend:check ja task check)

    ```md
    Suunnitelma: [.plans/02-luku-ja-haku/33-kirkkovuoden-tekstien-isla-muistiinpanokooste.md](file:///home/vivaldev/code/clible-v3-go/.plans/02-luku-ja-haku/33-kirkkovuoden-tekstien-isla-muistiinpanokooste.md)
    Kokoaa päivän liturgiset tekstit, teemat, rukoukset ja lukukappaleet suoraan interaktiiviseksi ISLA v2 DSL -muistikirjasoluksi yhdellä pikanäppäimellä (Alt+N) tai painikkeella.
    Toteutettu ja yhdistetty PR:ssä [#102](https://github.com/mvirtai/clible-v3-go/pull/102).
    ```

### Cliblen SEO & GEO (Generative Engine Optimization) -kokonaisuudistus

- due: 2026-10-02
- tags: [seo, geo, ai, llms-txt, schema-org, disambiguation, vitepress\]
- priority: high
- defaultExpanded: true
- steps:
  - [x] Luodaan frontend/public/llms.txt ja llms-full.txt (AI-koneellinen luettavuus & RAG)
  - [x] Päivitetään frontend/index.html Schema.org JSON-LD (SoftwareApplication + FAQPage disambiguaatio)
  - [x] Päivitetään hreflang-tagit (fi, en, x-default) ja metatiedot
  - [x] Sallitaan AI-botit frontend/public/robots.txt (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
  - [x] Päivitetään sitemap.xml ja varmistetaan staattinen/noscript-semanttinen runko
  - [x] Optimoidaan GitHub Topics ja README.md entiteettiankkurointi
  - [x] Validoidaan JSON-LD Schema ja ajetaan laatuportit (task frontend:check)

    ```md
    Suunnitelma: [.plans/15-docs-ja-viestinta/32-seo-ja-geo-generative-engine-optimization.md](file:///home/vivaldev/code/clible-v3-go/.plans/15-docs-ja-viestinta/32-seo-ja-geo-generative-engine-optimization.md)
    Korjataan Google-indeksointi ja tekoälybotti-tunnistus (GEO). Estetään AI-mallien harha 'Clible on kirjoitusvirhe sanasta Bible' luomalla llms.txt, Schema.org FAQPage/SoftwareApplication -entiteettiankkurointi ja AI-indeksointituki.
    Toteutettu ja yhdistetty PR:ssä [#103](https://github.com/mvirtai/clible-v3-go/pull/103).
    ```

### Kirkkovuoden hetkipalvelusten tarkennukset: Ad Sextam, Completorium ja Aattorukous

- due: 2026-09-27
- tags: [liturgical, church-year, prayer-offices, completorium, ad-sextam, eve, backend, frontend\]
- priority: high
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Korjaa Päivärukouksen nimi muotoon "Päivärukous (Ad Sextam)" i18n.ts-tiedostossa
  - [x] Lisää Completorium (yörukous) Kirkkokäsikirjan pysyvin tekstein (Ps. 4, Ps. 91, Ps. 134, Luuk. 2:29–32)
  - [x] Siirrä pyhäpäivien aattorukous (eve) edeltävän päivän aattoiltaan (D-1) LiturgicalService-palvelussa
  - [x] Käyttäjäasetus kirkkovuosikalenterin oletusnäkymälle (laatikot vs välilehdet) tietokantaan ja profiilinäkymään
  - [x] Päivitä CleanPrayerOffices- ja UserSettings-mallit Go- ja TypeScript-rajapinnoissa
  - [x] Yksikkötestit ja laatuporttien varmistus (task backend:check ja task frontend:check)

    ```md
    Toteutettu PR-tarinassa #94 ja yhdistetty haaraan main (#101).
    Keskipäivän hetkipalvelus korjattu (Ad Sextam), lisätty Completorium pysyvin tekstein, siirretty vigilia edeltävälle päivälle ja lisätty oletusnäkymäasetus käyttäjälle.
    PR: [#101](https://github.com/mvirtai/clible-v3-go/pull/101).
    ```

### Clible v3.*Asiantuntija-arkkitehti ja Spesifit Subagentit (Clible v3.* Expert & Subagents)

- due: 2026-10-01
- tags: [agent, skill, architecture, clible-v3, subagent, isla, react, backend\]
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
- tags: [i18n, frontend, localization\]
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
- tags: [ui, avatar, usermenu, header, frontend, i18n\]
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
- tags: [cleanup, chore, refactor, maintenance\]
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
- tags: [security, backend, go\]
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
- tags: [search, ai, gemini, backend, frontend\]
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
- tags: [frontend, react19, refactor\]
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
- tags: [ui, navigation, router, frontend\]
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
- tags: [isla, ide, frontend, dsl\]
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
- tags: [isla, dsl, ast, backend\]
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
- tags: [isla, ide, editor, ux\]
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
    Toteutettu PR-tarinoissa #82 ja #87 (v3.3.0).
    ```

### ISLA Frontier 5: Muuttujat (#muuttuja), tulosoperaattorin nimeämistuki ja reaktiivinen graafi

- due: 2026-09-30
- tags: [isla, dsl, ast, variables, notebook\]
- priority: high
- workload: Hard
- defaultExpanded: false
- steps:
  - [x] Poistettu parserin keinotekoinen esto inline-operaattorin nimeämiseltä (`=> #muuttuja`)
  - [x] Toteutettu `VariableNode` AST-solmuksi ensiluokkaiseksi objektiksi (`! #armo.count(words)`)
  - [x] Korjattu frontendin normalisointi (`MarkdownCell.tsx` ja regex-reititys)
  - [x] Muuttujakontekstin välitys ja tuloksen sidonta muistikirjan reaktiiviseen tilaan

    ```md
    Toteutettu PR-tarinoissa `pr_stories/082-feat-isla-v2-variables-and-operation-ops.md` ja `pr_stories/081-feat-isla-editor-syntax-highlighting-and-intellisense.md` (PR #87 / v3.3.0).
    Muuttaa muistikirjan passiivisesta tulostuksesta todelliseksi reaktiiviseksi tutkimusgraafiksi ilman toistuvia tietokantakyselyitä.
    PR: [#87](https://github.com/mvirtai/clible-v3-go/pull/87).
    ```

### ISLA v2 Piste-piste -alueoperaattori (..) ja monikirjaspannit

- due: 2026-09-11
- tags: [isla, dsl, parser, range, backend, frontend\]
- priority: high
- workload: Medium
- defaultExpanded: false
- steps:
  - [x] Piste-piste-alueoperaattorin `..` lisäys ISLA v2 -leksikeriin ja -parseriin
  - [x] Kanoninen monikirjainterpolaatio kaikkien 66 kirjan yli (esim. `MAT .. JOH`)
  - [x] Kirjalyhenteiden (mm. "joh") normalisointi ja kielikohtainen oletuskäännös
  - [x] Syntaksikorostus ja IntelliSense-ehdotukset alueille

    ```md
    Toteutettu PR-tarinassa `pr_stories/083-feat-isla-v2-range-operator-and-multi-book-span.md` (PR #87 / #88, v3.3.0).
    PR: [#87](https://github.com/mvirtai/clible-v3-go/pull/87).
    ```

### Hakutilan asetteluuudistus, semanttisen haun työtilatallennus & SPA-selainhistoria

- due: 2026-09-22
- tags: [search, ai, workspace, spa, navigation\]
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
- tags: [ci, semver, devops\]
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
- tags: [auth, guest, backend, frontend\]
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
- tags: [isla, notebook, backend, frontend\]
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
- tags: [typography, formatting, ui\]
- priority: medium
- workload: Easy
- defaultExpanded: false
- steps:
  - [x] Säkeistöasettelut runouskirjoille ja psalmeille
  - [x] Sisäiset [[Viite]]-taikalinkit ja esikatselut

    ```md
    Suunnitelma: [.plans/todos/02-poetry-formatting-and-magic-links.md](file:///home/vivaldev/code/clible-v3-go/.plans/todos/02-poetry-formatting-and-magic-links.md)
    ```

## Backlog

### Käyttäjädata, AI-kiintiöt ja lukutilastot (Study Analytics & Reading Streaks)

- due: 2026-11-01
- tags: [analytics, streaks, quotas, database, backend\]
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
- tags: [isla, greek, hebrew, morphology, backend\]
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
- tags: [isla, sets, dsl, backend\]
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
- tags: [isla, charts, analytics, frontend\]
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
- tags: [ai, pgvector, embeddings, postgresql\]
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
