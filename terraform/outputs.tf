output "service_url" {
  description = "The public URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.clible_v3.uri
}

output "artifact_registry_url" {
  description = "The URL of the Artifact Registry repository"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.clible_v3.repository_id}/clible-v3"
}

output "gcs_bucket_name" {
  description = "The name of the Google Cloud Storage bucket"
  value       = google_storage_bucket.clible_data.name
}

output "secret_manager_id" {
  description = "The Secret Manager Secret ID for Gemini API Key"
  value       = google_secret_manager_secret.gemini_key.id
}
