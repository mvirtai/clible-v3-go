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

variable "gemini-api-key" {
  description = "GEMINI API key (optional initial value, can be updated later directly in GCP Secret Manager)"
  type        = string
  sensitive   = true
  default     = "PLACEHOLDER"
}

variable "github_repository" {
  description = "The GitHub repository in the format owner/repo"
  type        = string
  default     = "mvirtai/clible-v3-go"
}
