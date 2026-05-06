provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "by_id" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  name_prefix = "${var.project_name}-${random_id.suffix.hex}"
  # Filter out Local Zones / wavelength/etc. Keep only standard AZs like us-east-1a..f
  standard_az_names = [
    for az in data.aws_availability_zones.available.names : az
    if can(regex("^${var.aws_region}[a-z]$", az)) && !contains(var.excluded_az_names, az)
  ]
  standard_subnet_ids = [
    for s in data.aws_subnet.by_id :
    s.id
    if contains(local.standard_az_names, s.availability_zone)
  ]
}

# --- Security groups ---

resource "aws_security_group" "eb_instances" {
  name        = "${local.name_prefix}-eb-instances"
  description = "EB instances security group"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds"
  description = "RDS PostgreSQL security group"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Postgres from EB instances"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eb_instances.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- RDS Postgres ---

resource "aws_db_subnet_group" "default" {
  name       = "${local.name_prefix}-dbsubnets"
  subnet_ids = local.standard_subnet_ids
}

resource "aws_db_instance" "postgres" {
  identifier             = "${local.name_prefix}-pg"
  engine                 = "postgres"
  engine_version         = var.postgres_engine_version
  instance_class         = var.postgres_instance_class
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_encrypted      = true
  username               = var.db_username
  password               = var.db_password
  db_name                = var.db_name
  port                   = 5432
  multi_az               = false
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.default.name
  skip_final_snapshot    = true
  deletion_protection    = false

  backup_retention_period = 3
}

# --- Elastic Beanstalk (Docker single container) ---

resource "aws_elastic_beanstalk_application" "app" {
  name        = local.name_prefix
  description = "Apricity (POC) — Twilio webhook + opt-in site + Postgres"
}

#
# Elastic Beanstalk IAM roles
# New AWS accounts often don't have these pre-created, and EB environment creation can fail instantly.
#

data "aws_iam_policy_document" "eb_service_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["elasticbeanstalk.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eb_service_role" {
  name               = "${local.name_prefix}-eb-service-role"
  assume_role_policy = data.aws_iam_policy_document.eb_service_assume.json
}

resource "aws_iam_role_policy_attachment" "eb_service_role_managed" {
  role       = aws_iam_role.eb_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkService"
}

data "aws_iam_policy_document" "eb_ec2_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eb_ec2_role" {
  name               = "${local.name_prefix}-eb-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.eb_ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "eb_web_tier" {
  role       = aws_iam_role.eb_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
}

resource "aws_iam_role_policy_attachment" "eb_worker_tier" {
  role       = aws_iam_role.eb_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier"
}

resource "aws_iam_role_policy_attachment" "eb_multicontainer" {
  role       = aws_iam_role.eb_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker"
}

resource "aws_iam_instance_profile" "eb_instance_profile" {
  name = "${local.name_prefix}-eb-instance-profile"
  role = aws_iam_role.eb_ec2_role.name
}

data "aws_elastic_beanstalk_solution_stack" "docker" {
  most_recent = true
  name_regex  = var.elastic_beanstalk_solution_stack_regex
}

resource "aws_elastic_beanstalk_environment" "env" {
  name                = "${local.name_prefix}-env"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = data.aws_elastic_beanstalk_solution_stack.docker.name

  # Minimal scaling for POC
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = "1"
  }
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = "1"
  }

  # Attach our instance security group (so RDS ingress can target it)
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = aws_security_group.eb_instances.id
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb_instance_profile.name
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.eb_service_role.name
  }

  # Use /health as the app health check
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/health"
  }

  # Use the default VPC/subnets (simple bootstrap)
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = data.aws_vpc.default.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", local.standard_subnet_ids)
  }

  # Ensure the load balancer and instances use the same AZ subnets.
  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = join(",", local.standard_subnet_ids)
  }

  # Pick an instance type that exists in the chosen subnets/AZs.
  # Beanstalk validates this under launchconfiguration/InstanceType.
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.elastic_beanstalk_instance_type
  }

  # Some solution stacks also accept InstanceTypes; set it too for compatibility.
  setting {
    namespace = "aws:ec2:instances"
    name      = "InstanceTypes"
    value     = var.elastic_beanstalk_instance_type
  }

  # Env vars (you will still set secrets in EB console)
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "NODE_ENV"
    value     = "production"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PORT"
    value     = "3000"
  }

  # Helpful output if env var validation fails during boot.
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "LOG_LEVEL"
    value     = "info"
  }
}

