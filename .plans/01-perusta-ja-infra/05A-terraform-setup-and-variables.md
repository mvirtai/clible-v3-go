# Vaihe 5A: Terraform-alustus ja muuttujat

Tämä tiedosto sisältää ohjeet Terraform-kehityksen alustamiseksi ja tarvittavien muuttujamäärittelyjen luomiseksi.

---

## 1. Uuden Git-haaran luominen ja hakemiston alustus

Ennen kuin aloitat tiedostojen luomisen, varmista, että olet luonut uuden topic-branchin:

```bash
git switch -c feat-gcp-terraform
mkdir terraform
```

---

## 2. variables.tf -tiedoston luominen

Luo tiedosto [variables.tf](file:///home/vivaldev/code/clible-v3-go/terraform/variables.tf) ja sijoita sinne seuraava sisältö. 

Tässä tiedostossa määritämme ne muuttujat, joita pilvi-infrastruktuurimme tarvitsee. Käytämme oletuksena projektia `clible-v3-go` ja alueena Haminaa (`europe-north1`), jotta vasteajat Suomessa ovat mahdollisimman lyhyet.

```hcl
variable "project_id" {
  description = "GCP Project ID where resources will be created"
  type        = string
  default     = "clible-v3-go"
}

variable "region" {
  description = "GCP region for resources (europe-north1 is Hamina, Finland)"
  type        = string
  default     = "europe-north1"
}

variable "gemini_api_key" {
  description = "Gemini API key (optional initial value, can be updated later directly in GCP Secret Manager)"
  type        = string
  sensitive   = true
  default     = "PLACEHOLDER"
}
```

---

## 3. terraform.tfvars.example -tiedoston luominen

Luo tiedosto [terraform.tfvars.example](file:///home/vivaldev/code/clible-v3-go/terraform/terraform.tfvars.example) ja aseta sinne seuraava sisältö. Tämä tiedosto toimii pohjana kehittäjille omien muuttujien (kuten todellisen API-avaimen) asettamiseen paikallisesti.

```hcl
project_id     = "clible-v3-go"
region         = "europe-north1"
gemini_api_key = "AIzaSy..." # Korvaa omalla oikealla Gemini API-avaimellasi
```
