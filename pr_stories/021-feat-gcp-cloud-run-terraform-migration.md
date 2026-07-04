# PR Story: GCP Cloud Run and Terraform Infrastructure Migration

## Business Context

To enable stateless, cost-effective, and highly-scalable hosting for the Clible-v3-go Bible study platform, we have migrated the application deployment path to Google Cloud Platform (GCP). Using Infrastructure as Code (IaC) with Terraform, we ensure consistent, reproducible environments while adhering to the security principle of least privilege.

## Architectural Changes

### 1. Terraform Infrastructure Configuration (`terraform/`)

Introduced a complete Terraform workspace located in the `terraform/` directory, implementing the following resources:

* **APIs**: Enabled `run.googleapis.com`, `artifactregistry.googleapis.com`, `storage.googleapis.com`, and `secretmanager.googleapis.com` dynamically on deployment.
* **Artifact Registry**: Created a Docker repository (`clible-v3`) in `europe-north1` (Hamina, Finland) to host the unified backend/frontend production image.
* **Google Cloud Storage (GCS) Bucket**: Provisioned `${project_id}-clible-v3-data` with Uniform Bucket-Level Access and Versioning enabled to store the SQLite database.
* **Service Account & IAM**: Dedicated `clible-v3-sa` service account granted `roles/storage.objectAdmin` on the database bucket and `roles/secretmanager.secretAccessor` on the Gemini API key secret.
* **GCP Secret Manager**: Configured a Secret named `gemini-api-key` to manage the AI integration credentials securely.
* **Google Cloud Run v2**:
  * Deployed a container running the unified Go server (React frontend + REST API).
  * Allocated resources optimized for Go: `1 CPU` and `512Mi` RAM.
  * Restricted concurrency/scaling: `max_instance_count = 1` to prevent parallel write locks on the SQLite database.
  * **GCS FUSE Integration**: Mounted the GCS bucket directly to `/data` in the container.
  * **Secret Manager Integration**: Injected `GEMINI_API_KEY` directly from Secret Manager's `latest` version into the container's environment variables.
* **Public Access**: Allowed unauthenticated access (`roles/run.invoker` for `allUsers`).

### 2. Documentation and Instruction Guides

* Added [.plans/05A-terraform-setup-and-variables.md](file:///home/vivaldev/code/clible-v3-go/.plans/05A-terraform-setup-and-variables.md) for variable and workspace configuration.
* Added [.plans/05B-terraform-main-and-outputs.md](file:///home/vivaldev/code/clible-v3-go/.plans/05B-terraform-main-and-outputs.md) for infrastructure definition code details.
* Added [.plans/05C-terraform-execution.md](file:///home/vivaldev/code/clible-v3-go/.plans/05C-terraform-execution.md) explaining how to resolve the Artifact Registry / Cloud Run circular dependency using target-based execution, followed by image building and full deployment.
* Modified [.agents/AGENTS.md](file:///home/vivaldev/code/clible-v3-go/.agents/AGENTS.md) to formally document the rule that tutorials and instruction guides must be stored under `.plans/`.
* Updated [.plans/00_projektikartta.md](file:///home/vivaldev/code/clible-v3-go/.plans/00_projektikartta.md) to record progress on DevOps and Docker deployment milestones.

### 3. CI/CD GitHub Actions Pipeline Enhancement (`.github/workflows/ci.yml`)

* Introduced a new `docker-pipeline` job that runs a Docker build smoke test on every push and pull request targeting `main`.
* Leveraged `docker/setup-buildx-action@v3` and `docker/build-push-action@v5` with GitHub Actions local caching (`cache-from: type=gha`, `cache-to: type=gha,mode=max`) to ensure fast, optimized build times.
* Added [.plans/05E-ci-docker-build-verification.md](file:///home/vivaldev/code/clible-v3-go/.plans/05E-ci-docker-build-verification.md) detailing these CI integration setup and caching strategies.

## Verification & Testing

### 1. Terraform Deployment Execution

1. Initialized Terraform providers (`hashicorp/google ~> 5.0`).
2. Run targeted execution to resolve circular dependencies:

   ```bash
   terraform apply -target=google_artifact_registry_repository.clible_v3 -target=google_storage_bucket.clible_data
   ```

3. Compiled unified container image and pushed it to the registry:

   ```bash
   docker build -t europe-north1-docker.pkg.dev/clible-v3-go/clible-v3/clible-v3:latest .
   docker push europe-north1-docker.pkg.dev/clible-v3-go/clible-v3/clible-v3:latest
   ```

4. Executed full apply to configure Cloud Run, IAM, and Secrets:

   ```bash
   terraform apply
   ```

5. Verified output URL: `https://clible-v3-4ocsudqe4q-lz.a.run.app`

### 2. Browser and Service Verification

* Accessed the Cloud Run service URL and verified that the React 19 single-page application loaded perfectly.
* Confirmed database initialization: Go server successfully initialized and booted the SQLite database at `/data/clible.db` directly on the GCS FUSE volume.
* Verified that the UI displays default translation prompt states, showing active communication between client and backend API layers.

### 3. CI Pipeline Verification

* Verified that the GitHub Actions pipeline correctly triggers on push and pull requests, and that the `docker-pipeline` job successfully builds the Docker image and manages cache layers.
