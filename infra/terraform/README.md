# Apricity AWS (Elastic Beanstalk + RDS) — Terraform

This Terraform creates:
- **RDS PostgreSQL** (private, reachable from the Beanstalk instances)
- **Elastic Beanstalk** Application + Environment (single Docker container)

You will still deploy the app code separately (zip upload / EB CLI / console). This keeps Terraform focused on infra.

## Remote state (recommended)

**Today:** If you have been applying from this folder without extra setup, state lives in **`terraform.tfstate`** next to these `.tf` files (gitignored).

**Target:** State in **S3** with **DynamoDB locking**, configured inline in **`versions.tf`** (`backend "s3"` block). No separate `backend.hcl` file—fine for a single AWS account / solo workflow.

### One-time bootstrap

From `infra/terraform/bootstrap`:

```bash
terraform init
terraform apply
```

Then edit **`versions.tf`**: replace `YOUR_ACCOUNT_ID` in the `bucket` name with your numeric account id (must match bootstrap naming: `apricity-tf-state-<id>` unless you changed `project_name` in bootstrap).

### Migrate existing local state

From **`infra/terraform`**:

```bash
terraform init -migrate-state
```

Confirm when prompted so the current `terraform.tfstate` is copied into S3. Afterward verify **`terraform plan`** is clean before removing local `.tfstate` files.

### Validate without talking to S3 (syntax checks)

```bash
terraform init -backend=false
terraform validate
```

## Prereqs

- AWS CLI authenticated (`aws sts get-caller-identity`)
- Terraform installed

## Quick start

From `infra/terraform` (after bootstrap + replacing `YOUR_ACCOUNT_ID` in `versions.tf`):

```bash
terraform init
terraform apply
```

After apply, Terraform outputs:
- Beanstalk environment URL (HTTP)
- RDS endpoint

## Configure environment variables in Beanstalk

In the Beanstalk Environment → Configuration → Software → Environment properties, set:

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=postgresql://<db_user>:<db_pass>@<rds_endpoint>:5432/<db_name>?schema=public`
- `TWILIO_ACCOUNT_SID=...`
- `TWILIO_AUTH_TOKEN=...`
- `TWILIO_MESSAGING_SERVICE_SID=MG...` (or `TWILIO_PHONE_NUMBER=+1...`)
- `TWILIO_MAX_OUTBOUND_CHARS=120`
- `TWILIO_WEBHOOK_URL=https://<your-domain>/webhook/sms` (must match exactly)
- `DEEPSEEK_API_KEY=...`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-chat`
- `RATE_LIMIT_WINDOW_MS=3600000`
- `RATE_LIMIT_MAX=20`

## Notes

- The container runs `prisma migrate deploy` on startup (see `Dockerfile`), so once `DATABASE_URL` is set, the schema will be applied automatically.
- For Twilio signature validation, use a **real HTTPS hostname** (Route53 + ACM) rather than the default EB URL.

