# Itseisännöinti ja paikallinen kehitys

Tämä opas on tarkoitettu kehittäjille, tutkijoille ja järjestelmäylläpitäjille, jotka haluavat ajaa clible-v3-alustaa paikallisesti, osallistua koodin kehitykseen tai ottaa käyttöön itsenäisen tuotantoasennuksen.

---

## 1. Järjestelmäarkkitehtuuri ja käyttöönotto

clible-v3 on suunniteltu pilvinatiiviksi, tilattomaksi asiakas-palvelin-sovellukseksi:

- **Backend**: Yksi staattisesti käännetty Go 1.22+ -binaari vakiokirjaston HTTP-reitityksellä ja sisäänrakennetuilla SQL-migraatioilla.
- **Frontend**: Moderni Single Page Application (SPA), joka on toteutettu React 19:llä, TypeScriptillä ja TailwindCSS v4:llä.
- **Tietokanta**: PostgreSQL (kuten Neon PostgreSQL, Amazon Aurora tai oma PostgreSQL-palvelin). Muistissa toimivaa SQLitea käytetään automaattisesti eristettyihin yksikkötesteihin.

```mermaid
flowchart LR
    subgraph Asiakas ["Asiakasohjelma"]
        Browser["Verkkoselain / Mobiili"]
    end
    
    subgraph Palvelin ["Yksi Go-binaari / Kontti"]
        API["Go HTTP -palvelin :8080"]
        SPA["Staattinen asset-palvelin /dist"]
    end
    
    subgraph Pilvi ["Pilviympäristö"]
        DB[("PostgreSQL-tietokanta")]
        AI["Gemini AI API"]
    end
    
    Browser -->|HTTP / JSON| API
    Browser -->|Käyttöliittymä| SPA
    API -->|SQL-kyselyt| DB
    API -->|AI-pyynnöt| AI
```

---

## 2. Esivaatimukset

Järjestelmän kääntämiseen ja ajamiseen lähdekoodista tarvitaan seuraavat työkalut:

- **Go**: 1.22+ ([Lataa](https://go.dev/dl/))
- **Node.js**: 18+ ([Lataa](https://nodejs.org/))
- **pnpm**: Pakettienhallinta frontendille ja dokumentaatiolle ([Asenna](https://pnpm.io/installation))
- **Task**: Tehtäväautomaatio ([Asenna](https://taskfile.dev/))
- **golangci-lint**: Go-linteri laadunvarmistukseen ([Asenna](https://golangci-lint.run/usage/install/))

---

## 3. Asennus ja alustus

```bash
# 1. Kloonaa repositorio
git clone https://github.com/mvirtai/clible-v3-go.git
cd clible-v3-go

# 2. Asenna frontend-riippuvuudet
task frontend:install

# 3. Asenna dokumentaatioriippuvuudet (valinnainen)
cd docs && pnpm install && cd ..
```

---

## 4. Konfiguraatio ja ympäristömuuttujat

Luo `.env`-tiedosto projektin juureen (`.env.example`-pohjan mukaisesti):

```env
# Palvelimen portti
PORT=8080

# Ympäristötila (development tai production)
ENV=development

# Tietokantayhteys (Neon PostgreSQL -yhteysmerkkijono)
DATABASE_URL=postgres://kayttaja:salasana@ep-cool-cloud.neon.tech/clible?sslmode=require

# Staattisten tiedostojen polku (tuotannossa)
FRONTEND_DIR=../frontend/dist

# Istuntotunnisteiden salaisuus (vähintään 32 merkkiä)
JWT_SECRET=oma_turvallinen_satunnainen_jwt_salaisuus_min_32_merkkia

# Valinnainen: Google Gemini API -avain AI-ominaisuuksille
GEMINI_API_KEY=oma_gemini_api_avain
```

| Muuttuja | Pakollinen | Kuvaus | Oletusarvo |
|---|---|---|---|
| `PORT` | Ei | Portti, jota HTTP-palvelin kuuntelee. | `8080` |
| `ENV` | Ei | `development` tai `production`. | `development` |
| `DATABASE_URL` | Kyllä | PostgreSQL-yhteyden URI (Neon PostgreSQL). | *Pakollinen tuotannossa* |
| `FRONTEND_DIR` | Ei | Polku käännettyihin React-tiedostoihin. | `../frontend/dist` |
| `JWT_SECRET` | Kyllä | Avain istunnon JWT-evästeiden allekirjoitukseen. | *Pakollinen* |
| `GEMINI_API_KEY` | Ei | API-avain teologisille AI-työkaluille ja semanttiselle haulle. | *Tyhjä (AI pois käytöstä)* |

---

## 5. Paikallinen suoritus

### Vaihtoehto A: Backend ja Frontend rinnakkain (Suositeltu)

```bash
task dev
```

Käynnistää sekä Go REST API -palvelimen (`:8080`) että Vite React -kehityspalvelimen (`:5173`) automaattisella kuumalatauksella (hot-reload).

### Vaihtoehto B: Palveluiden käynnistys erikseen

1. **Käynnistä Go-backend:**

   ```bash
   task backend:dev
   ```

   *Suorittaa tietokantamigraatiot automaattisesti ja alustaa kanoniset kirjatiedot.*

2. **Käynnistä React-frontend:**

   ```bash
   task frontend:dev
   ```

   *Käytettävissä osoitteessa `http://localhost:5173`.*

3. **Käynnistä VitePress-dokumentaatiopalvelin:**

   ```bash
   cd docs && pnpm run docs:dev
   ```

   *Käytettävissä osoitteessa `http://localhost:5174`.*

---

## 6. Docker-konttiasennus

clible-v3 sisältää monivaiheisen `Dockerfile`-tiedoston, joka kääntää Go-backendin ja React-frontendin kevyeksi, turvalliseksi distroless-konttikuvaksi:

```bash
# Rakenna Docker-kuva
docker build -t clible-v3:latest .

# Käynnistä kontti
docker run -d -p 8080:8080 \
  -e DATABASE_URL="postgres://..." \
  -e JWT_SECRET="..." \
  clible-v3:latest
```
