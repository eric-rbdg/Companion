terraform {
  required_version = ">= 1.6.0"

  # Solo-dev friendly: full backend here (no separate backend.hcl).
  # After bootstrap apply, replace YOUR_ACCOUNT_ID with your numeric AWS account id
  # (`aws sts get-caller-identity --query Account --output text`, or bootstrap output).
  # Must match bootstrap bucket name: {project}-tf-state-{account_id} (default project apricity).
  backend "s3" {
    bucket         = "apricity-tf-state-759957796768"
    key            = "apricity/main.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "apricity-tf-state-lock"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }
}

