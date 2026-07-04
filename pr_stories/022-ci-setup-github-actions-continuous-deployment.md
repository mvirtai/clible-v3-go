# PR Story: WIF-based Continuous Deployment (CD) to GCP Cloud Run

## Business Context

To automate the release lifecycle of the Clible-v3-go Bible study platform, we have introduced a Continuous Deployment (CD) pipeline. Instead of relying on manual deployments or insecure long-lived Service Account JSON keys, this CD pipeline uses **Workload Identity Federation (WIF)** to authenticate GitHub Actions to Google Cloud Platform dynamically and securely.

## Architectural Changes

### 1. Workload Identity Federation (WIF) IaC (`terraform/`)

We expanded the Terraform configuration to provision all WIF resources and the deployer identity locally in the `terraform/` directory:

* **WIF Pool & Provider**: Created a Workload Identity Pool (`github-actions-pool`) and OIDC Provider (`github-actions-provider`) mapped to GitHub's identity issuer.
* **Security Constraint**: Added a strict `attribute_condition` to the provider mapping:
  `assertion.repository == 'mvirtai/clible-v3-go'`
  This mitigates confused deputy attacks by ensuring only workflows from this specific repository can exchange tokens.
* **Deployer Service Account**: Created `clible-v3-deployer` with least-privilege roles:
  * `roles/artifactregistry.writer` — to push Docker images.
  * `roles/run.developer` — to trigger Cloud Run redeployments.
  * `roles/iam.serviceAccountUser` — allowed to act as the runtime service account (`clible-v3-sa`).
  * `roles/iam.workloadIdentityUser` — authorized to be assumed by the WIF principal set.
* **Terraform Outputs**: Exposed `workload_identity_provider` and `deployer_service_account` to easily link GitHub secrets.

### 2. GitHub Actions CD Pipeline (`.github/workflows/ci.yml`)

Extended the workflow pipeline by adding a new `deploy-pipeline` job:

* **Execution Trigger**: Configured to run only on pushes to the default branch (`if: github.ref == 'refs/heads/main'`) and only after the backend, frontend, and docker verification pipelines have successfully completed.
* **WIF Authentication**: Used `google-github-actions/auth@v2` with `id-token: write` permissions to authenticate keylessly using the repository secrets `GCP_WIF_PROVIDER` and `GCP_DEPLOYER_SA`.
* **Docker Registry Login**: Logs into `europe-north1-docker.pkg.dev` utilizing the secure output token from the authentication step.
* **Build & Push**: Builds the production-ready Docker container and pushes it with the `latest` tag, utilizing GitHub Actions layer caching.
* **Cloud Run Deploy**: Triggers a rollout of the new image to Cloud Run using `google-github-actions/deploy-cloudrun@v2`.

### 3. Documentation

* Created [.plans/05F-ci-cd-pipeline-setup.md](file:///home/vivaldev/code/clible-v3-go/.plans/05F-ci-cd-pipeline-setup.md) documenting step-by-step setup guides, Terraform extensions, and GitHub secrets configuration.

## Verification & Testing

1. Successfully executed `terraform apply` to create the WIF provider, WIF pool, and deployer service account.
2. Verified the generated Outputs:
   * `workload_identity_provider` = `projects/421720438581/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider`
   * `deployer_service_account` = `clible-v3-deployer@clible-v3-go.iam.gserviceaccount.com`
3. Verified the syntax and structure of the updated `.github/workflows/ci.yml`.
4. Triggered pipeline verification locally. The new CD deployment step is ready to execute upon merging to the `main` branch.
