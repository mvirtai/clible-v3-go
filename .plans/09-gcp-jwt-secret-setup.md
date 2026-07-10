# Ohje: JWT_SECRET-salaisuuden vieminen GCP Secret Manageriin ja Cloud Runiin

Tämä ohje kuvailee, miten äskettäin lisätty `JWT_SECRET`-ympäristömuuttuja integroidaan osaksi GCP-infrastruktuuria Terraformilla, jotta Cloud Run -kontti käynnistyy ja läpäisee terveystarkastuksen (health check) CD-vaiheessa.

---

## 1. Muutokset Terraformiin

Tarvitsemme kolme asiaa:

1. Uuden Secret Manager -salaisuuden `jwt-secret`.
2. Oikeuden (`roles/secretmanager.secretAccessor`) Cloud Runin palvelutilille salaisuuden lukemiseen.
3. Muuttujan linkityksen Cloud Run -kontin ympäristömuuttujaksi nimellä `JWT_SECRET`.

### Vaihe A: Muuttuja (`terraform/variables.tf`)

Lisää seuraava muuttuja tiedostoon [variables.tf](file:///home/vivaldev/code/clible-v3-go/terraform/variables.tf):

```hcl
variable "jwt_secret" {
  description = "JWT secret token used for session signature verification (min 32 chars)"
  type        = string
  sensitive   = true
  default     = "PLACEHOLDER_CHANGE_ME_IMMEDIATELY_MIN_32_CHARS"
}
```

### Vaihe B: Resurssit (`terraform/main.tf`)

1. Etsi tiedostosta [main.tf](file:///home/vivaldev/code/clible-v3-go/terraform/main.tf) kohta `--- 5B. Secret Manager Neon Database URL ---`.
2. Lisää sen alapuolelle uusi osio salaisuudelle:

```hcl
# --- 5C. Secret Manager JWT Secret ---

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "jwt_secret_initial" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

# Palvelutilille oikeus lukea JWT-avain
resource "google_secret_manager_secret_iam_member" "clible_sa_jwt_access" {
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.clible_sa.email}"
}
```

1. Etsi `google_cloud_run_v2_service.clible_v3`-resurssin `containers`-lohkon `env`-muuttujat ja lisää sinne uusi `JWT_SECRET`-ympäristömuuttuja:

```hcl
      # JWT Secret luetaan Secret Managerista
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
```

1. Päivitä `depends_on`-lohko Cloud Run -resurssin lopussa sisältämään uusi oikeusresurssi:

```hcl
  depends_on = [
    google_project_service.run,
    google_artifact_registry_repository.clible_v3,
    google_secret_manager_secret_iam_member.clible_sa_db_access,
    google_secret_manager_secret_iam_member.clible_sa_secret_access,
    google_secret_manager_secret_iam_member.clible_sa_jwt_access
  ]
```

---

## 2. Infran päivitys (Terraform Apply)

Kun tiedostot on muutettu, voit ajaa paikallisesti Terraformin päivittääksesi infran.

1. Avaa terminaalissa `terraform`-hakemisto:

   ```bash
   cd terraform
   ```

2. Aja Terraform-suunnittelu ja varmista muutokset:

   ```bash
   terraform plan
   ```

3. Aja muutokset (Terraform kysyy tarvittaessa uutta `jwt_secret`-arvoa, jos sitä ei ole määritetty `terraform.tfvars`-tiedostossa):

   ```bash
   terraform apply
   ```

> [!TIP]
> Voit luoda paikallisen ja turvallisen arvon `jwt_secret`-muuttujalle `terraform.tfvars`-tiedostoon (tämä tiedosto on jo `.gitignore`-suojattu):
>
> ```hcl
> # terraform/terraform.tfvars
> jwt_secret = "paljon-yli-kolmekymmentäkaksi-merkkiä-pitkä-satunnaisjono"
> ```

---

## 3. Salaisuuden asettaminen manuaalisesti gcloud-työkalulla

Jos haluat välttää salaisuuden syöttämistä Terraformin kautta tai haluat päivittää sen suoraan tuotantoon myöhemmin ilman uutta `terraform apply` -ajoa, voit luoda uuden version salaisuudesta suoraan gcloud-komennolla:

```bash
# Luo uusi versio olemassa olevaan jwt-secret -salaisuuteen
echo -n "TÄHÄN_PAIKALLE_GENEROITU_SALAISUUS_VÄHINTÄÄN_32_MERKKIÄ" | \
gcloud secrets versions add jwt-secret --data-file=- --project=clible-v3-go
```

Tämän jälkeen voit käynnistää CD-pipelinen (tai ajaa `Deploy to Cloud Run` uudestaan Github Actionsissa) ja Cloud Run pystyy noutamaan uuden version automaattisesti!
