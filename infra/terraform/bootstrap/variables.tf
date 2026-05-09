variable "project_name" {
  type        = string
  description = "Short name; used in bucket and DynamoDB names"
  default     = "apricity"
}

variable "aws_region" {
  type        = string
  description = "Region for state bucket and lock table"
  default     = "us-east-1"
}
