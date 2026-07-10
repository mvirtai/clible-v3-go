# Vaihe 5C: Terraformin suoritus ja käyttöönotto (Deployment)

Tämä tiedosto sisältää ohjeet infrastruktuurin pystyttämiseksi GCP:hen, Docker-kuvan pushaamiseksi uuteen Artifact Registryyn sekä Gemini API-avaimen asettamiseksi Secret Manageriin.

---

## 1. Terraformin alustus ja suoritus

Varmista ensin, että olet kirjautunut sisään Google Cloud CLI -työkalulla (`gcloud auth login`) ja asettanut oikean projektin aktiiviseksi:

```bash
gcloud config set project clible-v3-go
gcloud auth application-default login
```

Siirry `terraform/`-hakemistoon ja aja seuraavat komennot:

```bash
cd terraform

# Alustetaan Terraform ja ladataan tarvittavat providerit
terraform init

# KANA-MUNA-ONGELMAN RATKAISU:
# Cloud Run vaatii, että Docker-kuva on olemassa Artifact Registryssä ennen palvelun luomista.
# Siksi luomme ensimmäisessä vaiheessa VAIN Artifact Registryn ja GCS-bucketin kohdistetulla applylla:
terraform apply -target=google_artifact_registry_repository.clible_v3 -target=google_storage_bucket.clible_data
```

Vahvista luonti kirjoittamalla `yes` kysyttäessä. Tämän jälkeen voimme kääntää ja puskata Docker-kuvan uuteen Artifact Registryyn (Vaihe 2), ja vasta sen jälkeen luoda loput infrastruktuurista (Vaihe 4).

---

## 2. Docker-kuvan kääntäminen ja pushaus Artifact Registryyn

Jotta Cloud Run voi ajaa sovellusta, meidän täytyy kääntää Docker-kuva ja tallentaa se juuri luotuun Artifact Registryyn.

1. **Kirjaudu Artifact Registryyn Docker-työkalulla:**

```bash
gcloud auth configure-docker europe-north1-docker.pkg.dev
```

2. **Käännä ja taggaa Docker-kuva (aja projektin juuresta, ei terraform-kansiosta):**

```bash
cd ..
docker build -t europe-north1-docker.pkg.dev/clible-v3-go/clible-v3/clible-v3:latest .
```

3. **Pushaa kuva Artifact Registryyn:**

```bash
docker push europe-north1-docker.pkg.dev/clible-v3-go/clible-v3/clible-v3:latest
```

---

## 3. Lopun infrastruktuurin luominen (Cloud Run & Secrets)

Nyt kun Docker-kuva on ladattu Artifact Registryyn, voimme ajaa täyden Terraform applyn luomaan Cloud Run -palvelun, palvelutilin ja Secret Manager -salaisuudet:

```bash
cd terraform

# Luodaan kaikki loput resurssit
terraform apply
```

Tämä luo Cloud Run -palvelun ja ottaa sen käyttöön. Ajon jälkeen Terraform tulostaa sovelluksen julkisen osoitteen (`service_url`).

---

## 4. Gemini API-avaimen päivitys Secret Manageriin

Jos annoit Terraformille default-arvona `PLACEHOLDER`, voit nyt päivittää oikean Gemini API-avaimen Secret Manageriin helposti `gcloud`-komennolla:

```bash
echo -n "SINUN_OIKEA_GEMINI_API_AVAIN" | gcloud secrets versions add gemini-api-key --data-file=- --project=clible-v3-go
```

Kun olet päivittänyt salaisuuden, Cloud Run -kontti tulee käynnistää uudelleen, jotta se lukee uuden version (koska käytämme versiona `latest`):

```bash
gcloud run services update clible-v3 --region=europe-north1 --image=europe-north1-docker.pkg.dev/clible-v3-go/clible-v3/clible-v3:latest
```

Tämän jälkeen sovellus on täysin valmis ja testattavissa antamassasi `service_url`-osoitteessa!

