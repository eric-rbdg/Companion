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

variable "rds_backup_retention_period" {
  type        = number
  description = "Automated backup retention in days (1–35). Point-in-time recovery requires retention >= 1."
  default     = 7

  validation {
    condition     = var.rds_backup_retention_period >= 1 && var.rds_backup_retention_period <= 35
    error_message = "rds_backup_retention_period must be between 1 and 35."
  }
}

variable "rds_backup_window" {
  type        = string
  description = "Daily automated backup window in UTC (hh:mm-hh:mm, minimum 30 minutes). Example: \"06:00-07:00\" avoids overlapping maintenance_window."
  default     = "06:00-07:00"
}

variable "rds_maintenance_window" {
  type        = string
  description = "Weekly maintenance window in UTC (ddd:hh:mm-ddd:hh:mm)."
  default     = "sun:08:00-sun:09:00"
}

variable "rds_copy_tags_to_snapshot" {
  type        = bool
  description = "Copy resource tags to automated and manual snapshots (recommended)."
  default     = true
}

variable "rds_deletion_protection" {
  type        = bool
  description = "Prevent accidental deletion via API/console (recommended once serving real users)."
  default     = false
}

variable "rds_skip_final_snapshot" {
  type        = bool
  description = "If false, Terraform plan destroy creates a final DB snapshot (needs unique identifier)."
  default     = true
}

variable "rds_final_snapshot_identifier" {
  type        = string
  description = "Final snapshot id when rds_skip_final_snapshot is false. Omit or \"\" to default to \"{prefix}-final\"."
  default     = ""
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

