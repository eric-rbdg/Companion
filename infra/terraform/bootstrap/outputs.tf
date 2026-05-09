output "state_bucket" {
  value       = aws_s3_bucket.tf_state.bucket
  description = "S3 bucket for main Terraform state"
}

output "lock_table" {
  value       = aws_dynamodb_table.tf_lock.name
  description = "DynamoDB table for Terraform state locking"
}

output "backend_hcl_snippet" {
  description = "Values for the backend \"s3\" block in infra/terraform/versions.tf (bucket / region / dynamodb_table)"
  value       = <<-EOT
    bucket         = "${aws_s3_bucket.tf_state.bucket}"
    key            = "apricity/main.tfstate"
    region         = "${var.aws_region}"
    encrypt        = true
    dynamodb_table = "${aws_dynamodb_table.tf_lock.name}"
  EOT
}
