terraform {
  required_version = ">= 1.6.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = ">= 6.0.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
}

module "repository_rules" {
  source = "../../modules/github-repository-rules"

  repository_name  = var.github_repository
  protected_branch = "main"
  required_checks = [
    "Validate",
    "Production smoke checks",
  ]
}
