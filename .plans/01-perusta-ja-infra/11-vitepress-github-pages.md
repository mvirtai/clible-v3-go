# Ohjesuunnitelma: VitePress-dokumentaation päivitys ja GitHub Pages -julkaisu

Tämä dokumentti opastaa vaiheittain, miten dokumentaation sisältö päivitetään ajan tasalle ja kuinka automaattinen julkaisuputki otetaan käyttöön GitHub Pages -alustalla.

Teemme muutokset seuraavassa järjestyksessä:

1. **Luodaan kehityshaara** muutoksia varten.
2. **Päivitetään dokumentaation sisältö** (esim. API-viitteet ja opas).
3. **Lisätään GitHub Actions -automaatio**.
4. **Verifioidaan ja julkaistaan**.

---

## Vaihe 1: Kehityshaaran luominen

Käytetään projektin Taskfile-komentoa uuden aiheenmukaisen haaran luomiseen:

```bash
task git:new-branch FEAT_TYPE=ci BRANCH_NAME=docs-github-pages
```

Tämä luo haaran `ci/docs-github-pages` ja siirtyy sille.

---

## Vaihe 2: Dokumentaation sisällön päivitys

Ennen julkaisua on hyvä varmistaa, että dokumentit ovat ajan tasalla. Käynnistä paikallinen dokumentaation kehityspalvelin, jotta näet muutokset reaaliajassa selaimessa:

```bash
cd docs
pnpm run docs:dev
```

*(Tämä avaa paikallisen palvelimen osoitteeseen `http://localhost:5173`.)*

### Päivitettävät tiedostot

* [docs/guide/getting-started.md](file:///home/vivaldev/code/clible-v3-go/docs/guide/getting-started.md) — Tarkista asennusohjeet.
* [docs/api/reference.md](file:///home/vivaldev/code/clible-v3-go/docs/api/reference.md) — Voit lisätä Notebooks-rajapinnan (kunhan Notebooks on valmis ja mergetty) tai tarkistaa nykyiset API-endpointit.

Kun tekstit on muokattu ja ne näyttävät paikallisesti hyvältä, pysäytä kehityspalvelin (`Ctrl + C`).

---

## Vaihe 3: GitHub Actions -automaation lisääminen

Luodaan uusi GitHub-työnkulku tiedostoon [deploy-docs.yml](file:///home/vivaldev/code/clible-v3-go/.github/workflows/deploy-docs.yml).

### Tiedoston sisältö

```yaml
name: Deploy VitePress site to Pages

on:
  push:
    branches: [main]
    # Laukaisujoukko: vain main-haaran muutoksissa docs-hakemistoon
    paths:
      - 'docs/**'
      - '.github/workflows/deploy-docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    name: Build VitePress
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@v5
        with:
          fetch-depth: 0 # Tarvitaan 'lastUpdated' -toimintoa varten (VitePress)

      - name: Set up pnpm dependency engine
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Set up Node.js environment
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
          cache-dependency-path: docs/pnpm-lock.yaml

      - name: Install locked dependencies
        run: pnpm install --frozen-lockfile
        working-directory: docs

      - name: Build with VitePress
        run: pnpm run docs:build
        working-directory: docs

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    name: Deploy to GitHub Pages
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## Vaihe 4: Paikallinen build-verifiointi

Ennen muutosten lähettämistä varmistetaan, että tuotanto-build menee puhtaasti läpi paikallisesti docs-hakemistossa:

```bash
pnpm run docs:build
```

Jos build valmistuu onnistuneesti ilman virheitä, olemme valmiita viemään muutokset Git-repositorioomme.

---

## Vaihe 5: GitHub Pages -asetusten valmistelu

Jotta Actions-työnkulku voi julkaista sivuston, käy asettamassa oikea lähde GitHub-repositoriossasi:

1. Avaa selaimeen: `https://github.com/mvirtai/clible-v3-go`
2. Siirry välilehdelle **Settings** (Asetukset).
3. Valitse vasemmasta valikosta **Pages**.
4. Kohdasta **Build and deployment -> Source** valitse **GitHub Actions** (oletuksena saattaa olla *Deploy from a branch*).

---

## Vaihe 6: Muutosten vieminen ja julkaisu

Tehdään PR-tarina tai commit-viesti ja lähetetään muutokset haaraan:

```bash
# Lisätään tiedostot commitiin ja lähetetään
task git:stage-commit-push MESSAGE="ci: add github actions workflow for vitepress deployment"
```

Luo ja mergetä PR `main`-haaraan. Heti kun merge tapahtuu, `Deploy VitePress site to Pages` -työnkulku käynnistyy ja julkaisee sivusi osoitteeseen `https://mvirtai.githubclible-v3-go/`.
