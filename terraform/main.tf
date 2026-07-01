terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# --- 1. Aktivoidaan tarvittavat GCP API:t ---

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# --- 2. Artifact Registry Docker-kuville ---

resource "google_artifact_registry_repository" "clible_v3" {
  location      = var.region
  repository_id = "clible-v3"
  format        = "DOCKER"
  description   = "Docker repository for clible-v3-go backend/frontend app"

  depends_on = [google_project_service.artifact_registry]
}

# --- 3. Cloud Storage (GCS) Bucket SQLite-kannalle ---

resource "google_storage_bucket" "clible_data" {
  name          = "${var.project_id}-clible-v3-data"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.storage]
}

# --- 4. Service Account (Palvelutili) Cloud Runille ---

resource "google_service_account" "clible_sa" {
  account_id   = "clible-v3-sa"
  display_name = "clible-v3 Cloud Run Service Account"
}

# Oikeus lukea/kirjoittaa GCS-ämpäriin
resource "google_storage_bucket_iam_member" "clible_sa_storage" {
  bucket = google_storage_bucket.clible_data.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.clible_sa.email}"
}

# --- 5. Secret Manager Gemini API-avaimelle ---

resource "google_secret_manager_secret" "gemini_key" {
  secret_id = "gemini-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "gemini_key_initial" {
  secret      = google_secret_manager_secret.gemini_key.id
  secret_data = var.gemini-api-key
}

# Palvelutilille oikeus lukea API-avain
resource "google_secret_manager_secret_iam_member" "clible_sa_secret_access" {
  secret_id = google_secret_manager_secret.gemini_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.clible_sa.email}"
}

# --- 6. Cloud Run v2 -palvelu ---

resource "google_cloud_run_v2_service" "clible_v3" {
  name     = "clible-v3"
  location = var.region

  template {
    service_account = google_service_account.clible_sa.email

    scaling {
      max_instance_count = 1 # Tärkeä SQLite-lukitusten välttämiseksi
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.clible_v3.repository_id}/clible-v3:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi" # Go-kieli on kevyt ja tehokas, mutta gen2 vaatii vähintään 512Mi
        }
      }

      env {
        name  = "DATABASE_PATH"
        value = "/data/clible.db"
      }

      env {
        name  = "FRONTEND_DIR"
        value = "/app/frontend/dist"
      }

      # Gemini API-avain luetaan Secret Managerista
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_key.secret_id
            version = "latest"
          }
        }
      }

      # GCS FUSE volume-mounttaus /data kansioon
      volume_mounts {
        name       = "gcs-volume"
        mount_path = "/data"
      }
    }

    volumes {
      name = "gcs-volume"
      gcs {
        bucket    = google_storage_bucket.clible_data.name
        read_only = false
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
    google_artifact_registry_repository.clible_v3,
    google_storage_bucket_iam_member.clible_sa_storage,
    google_secret_manager_secret_iam_member.clible_sa_secret_access
  ]
}

# --- 7. Sallitaan julkinen pääsy sovellukseen ---

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.clible_v3.name
  location = google_cloud_run_v2_service.clible_v3.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

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
