# Vaihe 5D: Terraform ja Git-käytännöt (Best Practices)

Tämä tiedosto kuvailee, mitkä Terraform-tiedostot tulee lisätä Git-versionhallintaan ja mitkä tulee ehdottomasti pitää poissa sieltä.

---

## 1. Mitkä tiedostot tallennetaan Gitiin (Commit & Push)

Nämä tiedostot kuvaavat infrastruktuurin määrittelyä ja versioriippuvuuksia, ja ne tulisi tallentaa Git-arkistoon, jotta kaikki kehittäjät saavat saman infran:

1. **`*.tf`** (kuten `main.tf`, `variables.tf`, `outputs.tf`):
   * Nämä ovat infrastruktuurisi koodi (Infrastructure as Code).
2. **`terraform.tfvars.example`**:
   * Esimerkkitiedosto, joka ei sisällä oikeita salasanoja. Se opastaa uusia kehittäjiä siitä, mitä muuttujia heidän pitää asettaa.
3. **`.terraform.lock.hcl`**:
   * Lukitustiedosto, joka sisältää tarkat tiedot ladatuista provider-versioista. Tämän tallentaminen varmistaa, että kaikki tiimin jäsenet ja CI/CD-putket ajavat täsmälleen samoja versioita provider-kirjastoista.

---

## 2. Mitkä tiedostot jätetään pois Gitistä (Ignoroidaan)

Nämä tiedostot sisältävät joko raskasta välimuistia, väliaikaisia suunnitelmia tai **sensitiivistä tietoa**, kuten salasanoja ja API-avaimia selkokielisenä. Niitä ei saa koskaan tallentaa Gitiin:

1. **`.terraform/`** -hakemisto:
   * Terraform lataa tänne provider-palikkansa (esim. GCP-provider). Tämä hakemisto luodaan aina uudestaan suorittamalla `terraform init`.
2. **`*.tfstate`** ja **`*.tfstate.backup`**:
   * Terraformin paikallinen tilatiedosto (State file). Tämä sisältää koko infran nykyisen tilan ja voi sisältää luottamuksellista dataa.
   * *Huom: Jos myöhemmin siirrytään tiimikehitykseen, tilatiedosto tallennetaan jaetusti pilveen (esim. GCS Bucketiin).*
3. **`terraform.tfvars`**:
   * Tämä tiedosto sisältää ne todelliset muuttujien arvot (kuten oikean Gemini API-avaimesi), joilla infra pystytetään.
4. **`*.tfplan`**:
   * Väliaikaiset suoritussuunnitelmat, jotka on luotu `terraform plan -out=...` komennolla.

---

## 3. Tarkistus `.gitignore`-tiedostosta

Projektin [.gitignore](file:///home/vivaldev/code/clible-v3-go/.gitignore)-tiedosto on päivitetty seuraavilla säännöillä suojaamaan projektia:

```gitignore
# Terraform ignores
.terraform/
*.tfstate
*.tfstate.backup
terraform.tfvars
*.tfplan
```
