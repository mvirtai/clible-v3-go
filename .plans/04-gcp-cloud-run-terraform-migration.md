# Suunnitelma: Clible-v3-go pilvi-integraatio (GCP & Terraform)

Tämän dokumentin tarkoituksena on hahmotella arkkitehtuurisuunnitelma Clible-v3-go -sovelluksen viemiseksi Google Cloud Platform (GCP) -ympäristöön käyttäen Terraformia (Infrastructure as Code, IaC). Samalla vertaamme tätä ratkaisua vanhan `clible-v2` -version pilvitoteutukseen ja tuomme esille Go-kielen tarjoamat edut.

---

## 1. Arkkitehtuurivertailu: Clible-v2 vs. Clible-v3-go

Vanha `clible-v2` ja uusi `clible-v3-go` eroavat merkittävästi arkkitehtuuriltaan, mikä vaikuttaa suoraan pilvi-integraation tehokkuuteen ja kustannuksiin.

| Ominaisuus | Clible-v2 | Clible-v3-go (Suunniteltu) |
| :--- | :--- | :--- |
| **Teknologiastack** | Python (FastAPI/CLI) + Node.js (Express web app) + React | Puhdas Go (REST API) + React (Vite) |
| **Konttien määrä** | 2 konttia (Caddy reverse proxy + Node.js/Python web app) | 1 kontti (Go REST API, joka tarjoaa myös staattisen React-frontendin) |
| **Kylmäkäynnistys** | Hidas (3–8 sekuntia) Pythonin ja Noden ajoympäristön latautumisen takia | Erittäin nopea (< 0.2 sekuntia) natiivin Go-binäärin ansiosta |
| **Resurssien kulutus** | Suuri (vaatii vähintään 512MiB RAM / instanssi) | Erittäin pieni (pyörii helposti 128MiB–256MiB RAM -resursseilla) |
| **CORS-hallinta** | Monimutkaisempi (erilliset portit/kontit, vaatii reverse proxyn tai CORS-otsikot) | Yksinkertainen (sama domain ja portti, ei CORS-ongelmia tuotannossa) |
| **SQLite-kannan synkronointi** | Manuaalinen CLI-komento (`clible backup gcs`) tai monimutkainen taustasynkka | Cloud Storage FUSE -mounttaus `/data`-hakemistoon tai Litestream-replikointi |

### Go-kielen tarjoamat edut pilvessä

Go-kieli on suunniteltu pilvipohjaisiin mikropalveluihin, ja se tarjoaa meille useita etuja:

1. **Minimaalinen kylmäkäynnistysviive (Cold Start)**: Cloud Run skaalautuu nollaan instanssiin, kun sovelluksella ei ole liikennettä. Kun uusi pyyntö saapuu, uuden kontin käynnistys Go-binäärillä kestää vain murto-osan sekunnista, kun taas Python/Node-sovelluksilla viive on käyttäjälle häiritsevän pitkä.
2. **Yhden kontin monoliitti**: React-frontend buildataan staattiseksi tiedostokansioksi (`frontend/dist`), ja se upotetaan Go-binääriin (`//go:embed`) tai tarjotaan Go-palvelimen kautta (`http.FileServer`). Näin vältytään erilliseltä web-palvelimelta (kuten Caddy tai Nginx) ja pienennetään infran monimutkaisuutta.
3. **Pieni muistijalanjälki**: Voimme käyttää Cloud Runissa kaikkein halvimpia instansseja (esim. 128MiB tai 256MiB RAM), mikä minimoi GCP-kustannukset lähes nollaan pienellä käytöllä.

---

## 2. Gemini API -integraatio Go-kielellä

Kun sovellukseen liitetään Gemini API (esimerkiksi tekstianalyysiin, sävy-yhteenvetoihin tai käännösvertailuihin), Go-kieli tarjoaa merkittäviä etuja verrattuna Pythoniin tai Nodeen:

1. **Virallinen Google AI Go SDK (`github.com/google/generative-ai-go/genai`)**:
   - Google tarjoaa erittäin tehokkaan ja tyyppiturvallisen kirjaston Gemini 1.5 Flash / Pro ja Gemini 2.0 -malleille.
   - API-kutsut ja vastausten käsittely ovat selkeitä ja tyypitettyjä Go-structeilla.
2. **Tehokas rinnakkaisuus (Goroutines & Channels)**:
   - Jos halutaan analysoida tai vertailla useita raamatunkäännöksiä tekoälyllä samanaikaisesti, voimme käynnistää jokaiselle käännökselle oman gorutiinin, joka kutsuu Gemini API:a rinnakkain.
   - Go hallitsee tuhansia samanaikaisia verkkoyhteyksiä ja odottavia I/O-operaatioita minimaalisella muistinkulutuksella ilman async/await-sotkuja.
3. **Resurssien ja kustannusten hallinta (Rate Limiting)**:
   - Gemini API -avainten suojana on tärkeää olla palvelinpuolen rajoitin (Rate Limiter), jotta käyttäjät eivät pääse kuluttamaan API-kiintiötä tai aiheuttamaan suuria kustannuksia.
   - Go-backendissa rate limiting voidaan toteuttaa erittäin suorituskykyisesti käyttäen `golang.org/x/time/rate` -pakettia (Token Bucket -algoritmi), jolloin voimme rajoittaa kutsuja per IP tai per istunto suoraan muistissa ilman Redis-tietokantariippuvuuksia.

---

## 3. SQLite-tietokannan hallintastrategia pilvessä

Koska Cloud Run -instanssit ovat tilattomia (stateless), SQLite-tietokannan (`clible.db`) käsittelyyn pilvessä on kaksi järkevää lähestymistapaa:

### Vaihtoehto A: Staattinen tietokanta osana Docker-kuvaa (Read-Only)
- **Idea**: Raamatun tekstit (käännökset, kirjat, jakeet, FTS5-indeksit) siemennetään valmiiksi tietokantaan kehitysvaiheessa tai build-vaiheessa, ja valmis `clible.db` pakataan suoraan osaksi Docker-kuvaa.
- **Plussat**: Äärimmäisen yksinkertainen toteutus. Haut ja FTS5-tekstihaut ovat salamannopeita, koska ne tapahtuvat paikallisesti kontin muistista/levyltä ilman verkkokutsuja tai pilvilevyviiveitä.
- **Miinukset**: Jos käyttäjä haluaa tuoda uuden käännöksen lennosta (`POST /api/translations/import`), tai tallentaa hakuhistoriaa/workspaceja, nämä muutokset häviävät heti, kun Cloud Run -instanssi kierrätetään tai skaalataan nollaan.

### Vaihtoehto B: Cloud Storage FUSE -mounttaus (Suositeltu)
- **Idea**: Luodaan Google Cloud Storage (GCS) bucket, johon tietokanta (`clible.db`) tallennetaan. Cloud Runissa mountataan tämä bucket suoraan kontin tiedostojärjestelmään (esim. kansioon `/data`) käyttäen GCP:n natiivia GCS FUSE -tukea.
- **Plussat**: Tietokanta säilyy pysyvästi instanssien sammumisesta huolimatta. Käyttäjät voivat edelleen ladata omia käännöksiä ja tallentaa workspace-scopeja lennosta.
- **Miinukset**: Koska kyseessä on verkkotallennustila, usean instanssin samanaikainen kirjoittaminen SQLite-kantaan voi aiheuttaa lukitusongelmia. Tämän vuoksi pilvessä Cloud Runin instanssimäärä kannattaa rajoittaa yhteen (`max_instances = 1`), mikä riittää mainiosti sovelluksen kuormalle.

*Päätös*: Aloitamme **Vaihtoehdolla B (Cloud Storage FUSE)**, jotta säilytämme täyden toiminnallisuuden (käännösten tuonti ja scopet). Määrittelemme GCS bucketin ja sen oikeudet Terraformilla.

---

## 4. Terraform-arkkitehtuuri

Käytämme Terraformia luomaan tarvittavat GCP-resurssit. Suunniteltu Terraform-konfiguraatio sisältää seuraavat osat:

1. **Provider-konfiguraatio**: Yhteys Google Cloud -projektiin (esim. alueena `europe-north1` eli Haminan datakeskus, mikä takaa minimaalisen latenssin Suomessa).
2. **API Services**: Otetaan automaattisesti käyttöön tarvittavat rajapinnat:
   - `run.googleapis.com` (Cloud Run)
   - `artifactregistry.googleapis.com` (Artifact Registry)
   - `storage.googleapis.com` (Cloud Storage)
3. **Artifact Registry**: Luodaan repositorio nimeltään `clible-v3` Docker-kuville.
4. **Cloud Storage (GCS) Bucket**: Luodaan ämpäri (esim. `${project_id}-clible-v3-data`) SQLite-tietokannan säilyttämiseen.
5. **Service Account & IAM**:
   - Luodaan dedikoitu palvelutili `clible-v3-sa`.
   - Annetaan palvelutilille lukuoikeus Artifact Registryyn ja luku-/kirjoitusoikeus luotuun GCS Bucketiin.
6. **Cloud Run v2 Service**:
   - Määritellään Cloud Run -palvelu, joka ajaa Go-konttiamme.
   - Konfiguroidaan volume mount käyttäen Cloud Storage -ämpäriä (FUSE mount polkuun `/data`).
   - Viedään tarvittavat ympäristömuuttujat (`PORT`, `DATABASE_PATH=/data/clible.db`, `GEMINI_API_KEY` Secret Managerista tai muuttujana).
   - Asetetaan `max_instances = 1` SQLite-lukitusongelmien välttämiseksi.
7. **IAM Policy**: Sallitaan julkinen pääsy (`allUsers` roolissa `roles/run.invoker`), jotta sovellus näkyy internetiin.

---

## 5. Vaiheittainen etenemissuunnitelma

Etenemme pilvityössä seuraavissa vaiheissa:

### Vaihe A: Docker-kontituksen perusta
1. Luodaan `Dockerfile` projektin juureen.
   - Käytetään monivaiheista (multi-stage) buildia:
     - Vaihe 1: Buildataan React-frontend (`pnpm build`).
     - Vaihe 2: Käännetään Go-backend (`go build`).
     - Vaihe 3: Luodaan kevyt runtime-kontti (esim. `alpine` tai `debian-slim`), johon kopioidaan Go-binääri ja frontendin staattiset tiedostot.
2. Muokataan Go-backendia (`backend/main.go`) siten, että se osaa tarjota staattiset tiedostot `http.FileServerilla` silloin, kun pyyntö ei ala `/api/` -etuliitteellä.

### Vaihe B: Terraform-tiedostojen luonti
1. Luodaan hakemisto `terraform/` projektin juureen.
2. Kirjoitetaan `terraform/main.tf` ja `terraform/variables.tf` kuvaamaan GCP-infrastruktuuri.
3. Luodaan `terraform/outputs.tf` tulostamaan palvelun URL-osoite ja Artifact Registryn osoite.

### Vaihe C: Paikallinen testaus Dockerilla
1. Testataan konttia paikallisesti `docker-compose.yml`-tiedoston avulla.
2. Varmistetaan, että tietokantatiedosto luodaan oikeaan paikkaan ja että frontend sekä backend toimivat saumattomasti yhdessä.

### Vaihe D: Käyttöönotto GCP:hen
1. Alustetaan Terraform (`terraform init`, `terraform apply`).
2. Käännetään Docker-kuva, pushataan se Artifact Registryyn.
3. Deployataan sovellus Cloud Runiin.
4. Testataan toiminta ja opetellaan seuraamaan lokitietoja GCP:n Cloud Loggingin kautta.
