output "elastic_beanstalk_environment_url" {
  value       = aws_elastic_beanstalk_environment.env.endpoint_url
  description = "Beanstalk environment URL (HTTP). Put CloudFront/ALB+ACM in front for HTTPS + Twilio."
}

output "elastic_beanstalk_application_name" {
  value       = aws_elastic_beanstalk_application.app.name
  description = "Elastic Beanstalk application name"
}

output "elastic_beanstalk_environment_name" {
  value       = aws_elastic_beanstalk_environment.env.name
  description = "Elastic Beanstalk environment name"
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.address
  description = "RDS hostname"
}

output "rds_port" {
  value       = aws_db_instance.postgres.port
  description = "RDS port"
}

output "eb_deploy_bucket" {
  value       = aws_s3_bucket.eb_deploy.bucket
  description = "S3 bucket for GitHub Actions deployment bundles"
}

output "kms_key_id" {
  value       = aws_kms_key.app.key_id
  description = "KMS key id used for phoneNumberEnc encryption"
}

output "kms_key_arn" {
  value       = aws_kms_key.app.arn
  description = "KMS key arn used for phoneNumberEnc encryption"
}

