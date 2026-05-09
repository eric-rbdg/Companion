# Terraform remote state — bootstrap (one-time)

Creates:

- **Versioned, encrypted S3 bucket** for the main stack’s `terraform.tfstate`
- **DynamoDB table** for state locking (`terraform plan` / concurrent applies)

This folder keeps its **own small local state file** (gitignored). If you lose it, you can import existing bucket/table or recreate naming from `${project}-tf-state-<account_id>`.

## Apply

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply
```

Edit **`infra/terraform/versions.tf`**: set the `backend "s3"` bucket to match output `state_bucket`, then run **`terraform init -migrate-state`** from `infra/terraform` (see parent README).
