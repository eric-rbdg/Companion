output "elastic_beanstalk_environment_url" {
  value       = aws_elastic_beanstalk_environment.env.endpoint_url
  description = "Beanstalk environment URL (HTTP). Put CloudFront/ALB+ACM in front for HTTPS + Twilio."
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.address
  description = "RDS hostname"
}

output "rds_port" {
  value       = aws_db_instance.postgres.port
  description = "RDS port"
}

