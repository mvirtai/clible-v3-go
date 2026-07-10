# Vaihe 5F: Continuous Deployment (CD) ja Workload Identity Federation (WIF)

Tämä tiedosto opastaa sinua laajentamaan Terraform-infrastruktuuriasi ja ottamaan käyttöön automaattisen Continuous Deployment (CD) -putken GitHub Actionsiin.

---

## 1. variables.tf -tiedoston laajennus

Lisää tiedostoon [variables.tf](file:///home/vivaldev/code/clible-v3-go/terraform/variables.tf) seuraava muuttuja:

```hcl
variable "github_repository" {
  description = "The GitHub repository in the format owner/repo"
  type        = string
  default     = "mvirtai/clible-v3-go"
}
```

---

## 2. main.tf -tiedoston laajennus

Lisää tiedoston [main.tf](file:///home/vivaldev/code/clible-v3-go/terraform/main.tf) loppuun seuraavat resurssimäärittelyt. Nämä resurssit luovat WIF-altaan, sille GitHub Actions -tarjoajan, deployer-palvelutilin sekä tarvittavat IAM-oikeudet automaattiselle julkaisulle:

```hcl
# --- 8. Workload Identity Federation (WIF) ---

resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Identity pool for GitHub Actions authentication"
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# --- 9. CI/CD Deployer Service Account ---

resource "google_service_account" "clible_deployer" {
  account_id   = "clible-v3-deployer"
  display_name = "clible-v3 CI/CD Deployer Service Account"
}

# Sallitaan vain määritetyn GitHub-repositorion käyttää tätä palvelutiliä WIF:n kautta
resource "google_service_account_iam_member" "wif_deployer" {
  service_account_id = google_service_account.clible_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repository}"
}

# Oikeus kirjoittaa Artifact Registryyn
resource "google_artifact_registry_repository_iam_member" "deployer_registry" {
  location   = google_artifact_registry_repository.clible_v3.location
  repository = google_artifact_registry_repository.clible_v3.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.clible_deployer.email}"
}

# Oikeus hallinnoida ja päivittää Cloud Runia
resource "google_cloud_run_v2_service_iam_member" "deployer_run" {
  location = google_cloud_run_v2_service.clible_v3.location
  name     = google_cloud_run_v2_service.clible_v3.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.clible_deployer.email}"
}

# Oikeus käyttää Cloud Runin suorituspalvelutiliä (act as clible-v3-sa)
resource "google_service_account_iam_member" "deployer_act_as" {
  service_account_id = google_service_account.clible_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.clible_deployer.email}"
}
```

---

## 3. outputs.tf -tiedoston laajennus

Lisää tiedoston [outputs.tf](file:///home/vivaldev/code/clible-v3-go/terraform/outputs.tf) loppuun seuraavat tulosteet, joita tarvitaan GitHub Actionsin konfiguroinnissa:

```hcl
output "workload_identity_provider" {
  description = "The Workload Identity Provider resource name"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "deployer_service_account" {
  description = "The email of the CI/CD deployer service account"
  value       = google_service_account.clible_deployer.email
}
```

---

## 4. Infrastruktuurin päivitys

Aja muutokset pilveen suorittamalla `terraform/`-hakemistossa:

```bash
terraform apply
```

Ota ajon jälkeen talteen tulosteet `workload_identity_provider` (muodossa `projects/NUMERO/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider`) ja `deployer_service_account` (muodossa `clible-v3-deployer@clible-v3-go.iam.gserviceaccount.com`).

---

## 5. GitHub Actions ci.yml -tiedoston päivitys

Päivitetään tiedosto [.github/workflows/ci.yml](file:///home/vivaldev/code/clible-v3-go/.github/workflows/ci.yml). Lisäämme sinne uuden `deploy-pipeline` -jobin loppuun.

Koska emme halua tallentaa GCP-projektin tai palvelutilin tietoja selkokielisenä koodiin, käytämme GitHub Repository Secrets -asetuksia:
1. Mene GitHub-repositoriossasi: **Settings -> Secrets and variables -> Actions -> New repository secret**.
2. Luo seuraavat salaisuudet:
   * `GCP_WIF_PROVIDER` = `workload_identity_provider` -tulosteen arvo.
   * `GCP_DEPLOYER_SA` = `deployer_service_account` -tulosteen arvo.

### Uusi `.github/workflows/ci.yml` kokonaisuus:

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
  id-token: write # Pakollinen WIF-autentikointia varten

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
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-pipeline:
    name: Continuous Deployment (CD) to GCP
    runs-on: ubuntu-latest
    # Ajetaan vain main-haaran pushauksissa (eli kun PR mergetään mainiin)
    # ja vaaditaan, että kaikki testit ja Docker-build verification menevät läpi
    if: github.ref == 'refs/heads/main'
    needs: [backend-pipeline, frontend-pipeline, docker-pipeline]
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      # 1. Autentikoituminen GCP:hen WIF:n kautta
      - name: Authenticate to Google Cloud
        id: auth
        uses: google-github-actions/auth@v2
        with:
          token_format: "access_token"
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_DEPLOYER_SA }}

      # 2. Kirjautuminen Artifact Registryyn
      - name: Login to Artifact Registry
        uses: docker/login-action@v3
        with:
          registry: europe-north1-docker.pkg.dev
          username: oauth2accesstoken
          password: ${{ steps.auth.outputs.access_token }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # 3. Käännetään ja pushataan uusi Docker-kuva
      - name: Build and push production image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: europe-north1-docker.pkg.dev/clible-v3-go/clible-v3/clible-v3:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # 4. Päivitetään Cloud Run uuteen imagiin
      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: clible-v3
          region: europe-north1
          image: europe-north1-docker.pkg.dev/clible-v3-go/clible-v3/clible-v3:latest
```
