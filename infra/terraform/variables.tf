variable "project_name" {
  type        = string
  description = "Name prefix for resources"
  default     = "apricity"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "db_username" {
  type        = string
  description = "RDS master username"
  default     = "apricity"
}

variable "db_password" {
  type        = string
  description = "RDS master password (set via TF_VAR_db_password)"
  sensitive   = true
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "apricity"
}

variable "postgres_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t4g.micro"
}

variable "postgres_engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  # Use major version to let AWS select the latest minor for the region/account.
  # You can pin a specific minor later (e.g. 15.10) once you confirm availability.
  default = "15"
}

variable "elastic_beanstalk_solution_stack_regex" {
  type        = string
  description = "Regex used to pick a Docker solution stack"
  default     = "64bit Amazon Linux.*running Docker"
}

variable "elastic_beanstalk_instance_type" {
  type        = string
  description = "EC2 instance type for the Beanstalk environment"
  default     = "t3.micro"
}

variable "excluded_az_names" {
  type        = list(string)
  description = "Availability zones to exclude (e.g. us-east-1e often has limited instance support)"
  default     = ["us-east-1e"]
}

