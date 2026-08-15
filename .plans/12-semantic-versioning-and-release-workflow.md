# Versiointistrategia ja Julkaisuprosessi (Semantic Versioning & Release Workflow)

Tässä dokumentissa määritellään Clible-v3-go -projektin versiointistandardi, versiotiedostojen hallinta, muutoslokin (`CHANGELOG.md`) ylläpito sekä Taskfile-automaatio.

---

## 1. Tausta ja Tarve

Projektissa ei ole toistaiseksi käytetty virallista versiointia:
- Git-tageja ei ole luotu (`git tag -l` on tyhjä).
- `frontend/package.json` -versiomerkintä on `0.0.0`.
- Backendissä ei ole ollut keskitettyä versiopistettä tai `/api/version` -päätepistettä.

Koska olemme siirtymässä merkittävään uuteen arkkitehtuurivaiheeseen (**Unified Hybrid Cell & Clible Magic DSL**), on erinomainen hetki ottaa käyttöön kurinalainen **SemVer 2.0.0** (Semantic Versioning) -malli.

---

## 2. Versiointimalli (SemVer 2.0.0)

Koska repositorio on nimeltään `clible-v3-go`, otetaan perusversioksi **v3.x.x**:

* **MAJOR (3.x.x)**: Suuret arkkitehtuurimullistukset ja taaksepäin yhteensopimattomat rajapintamuutokset.
* **MINOR (v3.1.0, v3.2.0)**: Uudet suuret ominaisuudet (kuten Unified Hybrid Cell & DSL, 2D Grid Canvas, AI-integraatiot).
* **PATCH (v3.0.1, v3.1.1)**: Virheenkorjaukset, suorituskykyparannukset ja pienet tyylikorjaukset.

---

## 3. Keskitetty Versiolähde ja Arkkitehtuuri

```text
               ┌──────────────────────┐
               │    VERSION (root)    │  (esim. 3.1.0)
               └──────────┬───────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
┌──────────────────┐             ┌────────────────────┐
│ frontend/        │             │ backend/           │
│ package.json     │             │ internal/version/  │
│ ("version": ...) │             │ version.go         │
└──────────────────┘             └─────────┬──────────┘
                                           │
                                           ▼
                                 GET /api/version
                                 GET /api/health
```

### A. Juuritiedosto: `VERSION`
Juurihakemistossa oleva yksinkertainen tekstitiedosto, esim:
```text
3.1.0
```

### B. Backend: `backend/internal/version/version.go`
```go
package version

var (
	// Version on sovelluksen SemVer-versio.
	Version = "3.1.0"
	// GitCommit on käännöksen git SHA.
	GitCommit = "dev"
	// BuildDate on käännösajankohta.
	BuildDate = "unknown"
)
```
*Huom:* Käännöksessä voidaan injektoida arvot `go build -ldflags "-X github.com/mvirtai/clible-v3-go/internal/version.GitCommit=$(git rev-parse --short HEAD)"`.

### C. Backend API: `GET /api/version`
Palauttaa JSON-muodossa:
```json
{
  "version": "3.1.0",
  "commit": "8374bbd",
  "buildDate": "2026-08-15T16:20:00Z"
}
```

### D. Frontend: `frontend/package.json` & UI-versioindikaattori
- `package.json` pitää version synkronoituna `VERSION`-tiedoston kanssa.
- Sovelluksen sivupalkin (Sidebar) tai asetusten alapalkissa näytetään tyylikäs ja huomaamaton badge: `v3.1.0`.

---

## 4. Muutosloki (`CHANGELOG.md`)

Juureen luodaan standardi `CHANGELOG.md` [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) -formaatissa:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Clible Magic DSL Lexer and AST Parser specification
- Unified Hybrid Cell architecture plans

## [3.0.0] - 2026-08-15
### Added
- Complete Go 1.22+ backend rewrite with PostgreSQL and SQLite test support
- 2D Canvas Grid Matrix Notebook architecture with resizable card overlays
- Interactive Verse Reader with multilingual citation formatting (FI/EN)
- Advanced verse search, analytics and comparison views
- Cloud Run & Terraform production infrastructure
```

---

## 5. Taskfile-automaatio (`Taskfile.yml`)

Lisätään `Taskfile.yml` -tiedostoon komennot version hallintaan:

```yaml
  # --- Versioning & Release Tasks --- #
  version:
    desc: Print current application version
    cmds:
      - cat VERSION

  version:bump:
    desc: "Bump version. Usage: task version:bump PART=patch|minor|major"
    vars:
      PART: '{{default "patch" .PART}}'
    cmds:
      - |
        bash -c '
          CURRENT=$(cat VERSION 2>/dev/null || echo "3.0.0")
          IFS="." read -r MAJOR MINOR PATCH <<< "$CURRENT"
          case "{{.PART}}" in
            major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
            minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
            patch) PATCH=$((PATCH + 1)) ;;
            *) echo "Unknown part: {{.PART}}"; exit 1 ;;
          esac
          NEW_VERSION="$MAJOR.$MINOR.$PATCH"
          echo "$NEW_VERSION" > VERSION
          # Päivitetään frontend/package.json
          cd frontend && pnpm version "$NEW_VERSION" --no-git-tag-version && cd ..
          # Päivitetään backend version.go
          sed -i "s/Version = \".*\"/Version = \"$NEW_VERSION\"/" backend/internal/version/version.go 2>/dev/null || true
          echo "Version bumped to: $NEW_VERSION"
        '

  git:tag:
    desc: Create annotated git release tag for current version
    cmds:
      - |
        bash -c '
          VER=$(cat VERSION)
          git tag -a "v$VER" -m "Release v$VER"
          echo "Created git tag: v$VER"
        '
```

---

## 6. Käyttöönottoaskeleet

1. Luodaan `VERSION` (arvolla `3.0.0` tai `3.1.0-alpha.1`).
2. Luodaan `CHANGELOG.md` ja dokumentoidaan v3.0.0 perusta.
3. Luodaan `backend/internal/version/version.go` ja lisätään `/api/version` -reitti.
4. Päivitetään `frontend/package.json` versio.
5. Luodaan ensimmäinen virallinen Git-tagi `v3.0.0`.
