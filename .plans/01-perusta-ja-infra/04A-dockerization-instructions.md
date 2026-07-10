# Ohjeet ja konteksti: Docker-kontitus (Vaihe 1.1 & 1.2)

Tämä tiedosto sisältää yksityiskohtaiset ohjeet ja arkkitehtuuriselitykset Clible-v3-go -sovelluksen Docker-kontituksen alustamiseksi.

---

## 1. `.dockerignore`

Luo projektin juureen tiedosto `.dockerignore` ja aseta sen sisällöksi seuraava:

```ignore
# Git ja dokumentaatio
.git
.gitignore
.github
.plans
.notes
docs
docs-site

# Paikalliset riippuvuudet ja build-tulokset
**/node_modules
**/dist
**/.cov
**/cache

# Paikalliset tietokannat ja salaisuudet
*.db
*.db-journal
*.db-shm
*.db-wal
.env*

# Go-binäärit
backend/clible-server
clible-v3-go
```

### Miksi tarvitsemme `.dockerignore`-tiedoston?

Kun ajetaan komento `docker build .`, Docker kopioi koko nykyisen hakemiston (ns. *build context*) Docker-daemonille.

- Koska monorepossamme on suuret `node_modules`-hakemistot (sekä `frontend/`- että `docs/`-kansioissa) ja suuri paikallinen `clible.db`-tietokantatiedosto, tämän siirtäminen vie aikaa ja hidastaa kontin kääntämistä.
- `.dockerignore` toimii aivan kuten `.gitignore` ja estää turhien tiedostojen ja hakemistojen siirtämisen build-contextiin.

---

## 2. `Dockerfile`

Luo projektin juureen tiedosto `Dockerfile` ja aseta sen sisällöksi seuraava:

```dockerfile
# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Asennetaan pnpm globaalisti paketinhallintaa varten
RUN npm install -g pnpm

# Kopioidaan riippuvuusmääritykset ja asennetaan paketit
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Kopioidaan lähdekoodi ja käännetään tuotanto-bundle
COPY frontend/ ./
RUN pnpm run build

# --- Stage 2: Build Go Backend ---
FROM golang:1.22-alpine AS backend-builder

# Asennetaan gcc ja musl-dev SQLite CGO-käännöstä varten
RUN apk add --no-cache gcc musl-dev

WORKDIR /app/backend

# Kopioidaan Go-moduulit ja ladataan riippuvuudet
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Kopioidaan backendin koodi ja käännetään binääri CGO päällä
COPY backend/ ./
ENV CGO_ENABLED=1
RUN go build -o clible-server main.go

# --- Stage 3: Runtime Image ---
FROM alpine:3.19

# Asennetaan ca-certificates ulkoisia HTTPS-kutsuja (Gemini API) varten
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Kopioidaan ainoastaan valmiit build-tulokset aiemmista vaiheista
COPY --from=backend-builder /app/backend/clible-server /app/clible-server
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Luodaan hakemisto, johon SQLite-tietokanta (ja myöhemmin GCS FUSE mount) sijoitetaan
RUN mkdir -p /data

# Asetetaan oletusympäristömuuttujat tuotantoa varten
ENV PORT=8080
ENV DATABASE_PATH=/data/clible.db
ENV FRONTEND_DIR=/app/frontend/dist

EXPOSE 8080

ENTRYPOINT ["/app/clible-server"]
```

### Arkkitehtuuriselitykset (Dockerfile)

Käytämme tässä **multi-stage build (monivaiheinen rakennus)** -tekniikkaa. Tässä menetelmässä kontti rakennetaan useassa vaiheessa, jolloin lopulliseen tuotantokuvaan (runtime image) kopioidaan ainoastaan tarvittavat valmiit tiedostot (Go-palvelimen binääri ja käännetty frontend) ilman kääntämiseen tarvittavia raskaita SDK-työkaluja.

#### 1. React-frontend (Stage 1)

- Käytetään kevyttä `node:20-alpine` -kuvaa.
- Koska frontend käyttää `pnpm`-paketinhallintaa (kuten `pnpm-lock.yaml` osoittaa), asennamme sen globaalisti `npm install -g pnpm` -komennolla.
- Kopioimme ensin vain riippuvuusmääritykset ja asennamme ne (`pnpm install --frozen-lockfile`). Tämä varmistaa, että Dockerin välimuisti (cache layer) pysyy voimassa, eikä riippuvuuksia asenneta uudelleen, jos vain React-koodi muuttuu.
- Käännämme sovelluksen komennolla `pnpm run build`, joka tuottaa staattiset tiedostot `frontend/dist`-hakemistoon.

#### 2. Go-backend (Stage 2)

- Käytetään `golang:1.22-alpine` -kuvaa.
- **Tärkeää (CGO ja SQLite):** Koska sovelluksemme käyttää SQLiteä, se vaatii CGO-käännöksen (`CGO_ENABLED=1`), jotta Go voi linkittyä SQLite-tietokantamoottorin C-kielisiin osiin. Tämän vuoksi asennamme kääntäjän ja standardikirjaston otsikkotiedostot (`apk add --no-cache gcc musl-dev`).
- Käännämme binäärin nimellä `clible-server`.

#### 3. Lopullinen runtime-kontti (Stage 3)

- Käytämme mahdollisimman pientä `alpine:3.19` -ajonaikaista kuvaa.
- Koska käänsimme Go-binäärin Alpine-ympäristössä (joka käyttää `musl`-C-kirjastoa perinteisen `glibc`:n sijaan), ajoympäristön on myös oltava Alpine, jotta binäärin dynaaminen linkitys toimii oikein.
- Asennamme `ca-certificates`-paketin. Tämä on välttämätöntä, jotta Go-palvelin voi tehdä salattuja HTTPS-pyyntöjä ulkopuolisiin palveluihin, kuten **Gemini API** -rajapintaan.
- Luomme `/data`-hakemiston, johon SQLite-tietokanta tallennetaan ja johon myöhemmin Terraformilla mountataan Google Cloud Storage (GCS) -levy.
- Määritämme oletusympäristömuuttujat (`PORT`, `DATABASE_PATH`, `FRONTEND_DIR`), jotka voidaan ylikirjoittaa Cloud Runissa.
