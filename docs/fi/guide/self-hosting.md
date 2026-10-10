# Asennus omalle palvelimelle ja paikallinen kehitys

Tämä opas on tarkoitettu kehittäjille, tutkijoille ja järjestelmäylläpitäjille, jotka haluavat käyttää clible-v3:a paikallisesti, osallistua sen kehittämiseen tai asentaa sen omalle palvelimelleen.

---

## 1. Järjestelmäarkkitehtuuri ja käyttöönotto

clible-v3 on tilaton asiakas-palvelinsovellus, joka soveltuu pilviympäristöön:

- **Taustapalvelu**: Yksi staattisesti käännetty Go 1.22+ -ohjelma, joka käyttää Go-vakiokirjaston HTTP-reititystä ja sisältää SQL-migraatiot.
- **Käyttöliittymä**: React 19:llä, TypeScriptillä ja Tailwind CSS v4:llä toteutettu yhden sivun sovellus (SPA).
- **Tietokanta**: PostgreSQL (esimerkiksi Neon, Amazon Aurora tai oma PostgreSQL-palvelin). Yksikkötesteissä käytetään eristettyä, muistissa toimivaa SQLite-tietokantaa.

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
    API -->|Tekoälypyynnöt| AI
```

---

## 2. Esivaatimukset

Järjestelmän kääntämiseen ja ajamiseen lähdekoodista tarvitaan seuraavat työkalut:

- **Go**: 1.22+ ([Lataa](https://go.dev/dl/))
- **Node.js**: 18+ ([Lataa](https://nodejs.org/))
- **pnpm**: Frontendin ja dokumentaation pakettienhallintaan ([Asenna](https://pnpm.io/installation))
- **Task**: Tehtäväautomaatio ([Asenna](https://taskfile.dev/))
- **golangci-lint**: Go-koodin laadun tarkistamiseen ([Asenna](https://golangci-lint.run/usage/install/))

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

# Valinnainen: Google Gemini API -avain tekoälyominaisuuksille
GEMINI_API_KEY=oma_gemini_api_avain
```

| Muuttuja | Pakollinen | Kuvaus | Oletusarvo |
|---|---|---|---|
| `PORT` | Ei | Portti, jota HTTP-palvelin kuuntelee. | `8080` |
| `ENV` | Ei | `development` tai `production`. | `development` |
| `DATABASE_URL` | Kyllä | PostgreSQL-yhteyden URI (Neon PostgreSQL). | *Pakollinen tuotannossa* |
| `FRONTEND_DIR` | Ei | Polku käännettyihin React-tiedostoihin. | `../frontend/dist` |
| `JWT_SECRET` | Kyllä | Avain istunnon JWT-evästeiden allekirjoitukseen. | *Pakollinen* |
| `GEMINI_API_KEY` | Ei | API-avain teologisille tekoälytyökaluille ja semanttiselle haulle. | *Tyhjä (tekoälyominaisuudet pois käytöstä)* |

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

3. **Käynnistä VitePress-dokumentaatiosivuston palvelin:**

   ```bash
   cd docs && pnpm run docs:dev
   ```

   *Käytettävissä osoitteessa `http://localhost:5174`.*

---

## 6. Docker-konttiasennus

clible-v3 sisältää monivaiheisen `Dockerfile`-tiedoston, joka kääntää Go-taustapalvelun ja React-käyttöliittymän kevyeksi distroless-konttikuvaksi:

```bash
# Rakenna Docker-kuva
docker build -t clible-v3:latest .

# Käynnistä kontti
docker run -d -p 8080:8080 \
  -e DATABASE_URL="postgres://..." \
  -e JWT_SECRET="..." \
  clible-v3:latest
```
