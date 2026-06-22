# Terraform

Terraform is reserved for infrastructure around Railway, not Railway app
deployments themselves.

Use Terraform here for:

- GitHub branch protection and required checks
- GitHub environment rules
- DNS records
- Sentry projects and alert rules
- uptime monitors
- notification routing

Do not store application secret values in Terraform state. Use Railway, GitHub,
and vendor secret stores for secret values.

## Layout

```text
infra/terraform/
  modules/
  environments/
    staging/
    production/
```

Each environment keeps separate state. Production applies require human review.

## Commands

Run from an environment directory:

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan
```

Apply only after review:

```bash
terraform apply
```
