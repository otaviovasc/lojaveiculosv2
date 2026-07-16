terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = ">= 6.0.0"
    }
  }
}

variable "repository_name" {
  description = "GitHub repository name."
  type        = string
}

variable "protected_branch" {
  description = "Branch to protect."
  type        = string
}

resource "github_branch_protection" "branch" {
  repository_id = var.repository_name
  pattern       = var.protected_branch

  allows_deletions                = false
  allows_force_pushes             = false
  require_conversation_resolution = true
  required_linear_history         = true

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }
}
