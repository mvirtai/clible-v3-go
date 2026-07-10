# Vaihe 5E: Docker Build -varmistus CI-työnkulussa (GitHub Actions)

Tämä tiedosto kuvailee, miten Docker-kuvan rakentaminen (Smoke Test) lisätään GitHub Actionsin CI-putkeen, jotta jokainen Pull Request varmistaa kontin kääntymisen ennen mergeä.

---

## 1. Miksi tämä on hyödyllistä?

Vaikka testit (`go test`, `pnpm test`) ja linterit menevät paikallisesti läpi, itse Docker-kuvan kääntö voi rikkoutua esimerkiksi:
* Hakemistorakenteen muutosten takia.
* Riippuvuuksien asennusongelmien takia Docker-ympäristössä (esim. gcc-puute SQLiteä käännettäessä).
* Tiedostopolkujen virheiden vuoksi monivaiheisessa (multi-stage) buildissa.

Lisäämällä Docker build-vaiheen osaksi CI-putkea varmistamme, että `Dockerfile` on aina toimintakuntoinen ja valmis deployattavaksi.

---

## 2. Ehdotetut muutokset tiedostoon ci.yml

Päivitetään tiedosto [.github/workflows/ci.yml](file:///home/vivaldev/code/clible-v3-go/.github/workflows/ci.yml) lisäämällä sinne uusi job `docker-pipeline`.

### Uusi `.github/workflows/ci.yml` sisältö:

Korvaa [.github/workflows/ci.yml](file:///home/vivaldev/code/clible-v3-go/.github/workflows/ci.yml) seuraavalla kokonaisuudella:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: read

jobs:
  backend-pipeline:
    name: Backend Quality & Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      - name: Set up Go environment
        uses: actions/setup-go@v5
        with:
          go-version-file: "backend/go.mod"
          cache: true

      - name: Run golangci-lint natively
        run: go run github.com/golangci/golangci-lint/cmd/golangci-lint@latest run --timeout=5m

      - name: Download Go modules
        run: go mod download

      - name: Run unit and integration tests
        run: go test -v -race -coverprofile=coverage.txt ./...

  frontend-pipeline:
    name: Frontend Quality & Build Verification
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      - name: Set up Node.js environment
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Set up pnpm dependency engine
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Install locked dependencies
        run: pnpm install --frozen-lockfile

      - name: Verify TypeScript strict compilation
        run: pnpm exec tsc --noEmit

      - name: Run ESLint quality code gates
        run: pnpm lint

      - name: Execute production build smoke-test
        run: pnpm build

  docker-pipeline:
    name: Docker Build Verification
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image (Smoke Test)
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: false # Vain testataan buildia, ei pushata vielä mihinkään
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

> [!TIP]
> `cache-from: type=gha` ja `cache-to: type=gha` hyödyntävät GitHub Actionsin sisäänrakennettua välimuistia Docker-layerille. Tämä nopeuttaa toistuvia buildeja huomattavasti!
