# Environment Variables

This document is the canonical checklist for Loja Veiculos V2 runtime variables.
Keep `.env.example`, Railway variables, and this file aligned.

Do not commit real secrets. Use Railway service variables, Railway reference
variables, sealed variables for high-risk secrets, and GitHub environment
secrets for CI-only values.

## Core Runtime

| Name                 | Required | Environments               | Secret | Notes                                                                      |
| -------------------- | -------- | -------------------------- | ------ | -------------------------------------------------------------------------- |
| `NODE_ENV`           | Yes      | staging, production        | No     | Use `production` in deployed environments.                                 |
| `APP_ENV`            | Yes      | local, staging, production | No     | Runtime environment classifier.                                            |
| `PORT`               | Yes      | staging, production        | No     | Railway injects this for services.                                         |
| `PUBLIC_APP_URL`     | Yes      | staging, production        | No     | Public web URL.                                                            |
| `API_BASE_URL`       | Yes      | staging, production        | No     | Public API URL consumed by the web app.                                    |
| `DATABASE_URL`       | Yes      | staging, production        | Yes    | Product database URL. Prefer `${{ Postgres.DATABASE_URL }}` on Railway.    |
| `AUDIT_DATABASE_URL` | Yes      | staging, production        | Yes    | Audit database URL. Prefer `${{ AuditPostgres.DATABASE_URL }}` on Railway. |
| `DB_POOL_MAX`        | Yes      | staging, production        | No     | Runtime DB pool limit.                                                     |
| `LOG_LEVEL`          | Yes      | staging, production        | No     | Usually `info`; use `debug` only temporarily.                              |

## Authentication

| Name                         | Required | Environments        | Secret | Notes                              |
| ---------------------------- | -------- | ------------------- | ------ | ---------------------------------- |
| `CLERK_SECRET_KEY`           | Yes      | staging, production | Yes    | Clerk backend secret.              |
| `CLERK_JWT_KEY`              | Yes      | staging, production | Yes    | JWT verification key.              |
| `CLERK_AUDIENCE`             | Yes      | staging, production | No     | Expected token audience.           |
| `CLERK_AUTHORIZED_PARTIES`   | Yes      | staging, production | No     | Allowed frontend origins.          |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes      | staging, production | No     | Frontend publishable key.          |
| `CLERK_WEBHOOK_SECRET`       | Yes      | staging, production | Yes    | Clerk webhook verification secret. |
| `CLERK_SIGN_IN_URL`          | Yes      | staging, production | No     | Frontend sign-in URL.              |
| `CLERK_SIGN_UP_URL`          | Yes      | staging, production | No     | Frontend sign-up URL.              |
| `CLERK_AFTER_SIGN_IN_URL`    | Yes      | staging, production | No     | Post sign-in redirect.             |
| `CLERK_AFTER_SIGN_UP_URL`    | Yes      | staging, production | No     | Post sign-up redirect.             |

## Object Storage

| Name                            | Required | Environments        | Secret | Notes                            |
| ------------------------------- | -------- | ------------------- | ------ | -------------------------------- |
| `R2_BUCKET_NAME`                | Yes      | staging, production | No     | Vehicle media bucket.            |
| `R2_ACCESS_KEY_ID`              | Yes      | staging, production | Yes    | Storage access key.              |
| `R2_SECRET_ACCESS_KEY`          | Yes      | staging, production | Yes    | Storage secret key.              |
| `R2_ENDPOINT`                   | Yes      | staging, production | No     | S3-compatible endpoint.          |
| `R2_PUBLIC_BASE_URL`            | Yes      | staging, production | No     | Public media base URL.           |
| `R2_REGION`                     | Yes      | staging, production | No     | S3 region value expected by SDK. |
| `R2_UPLOAD_URL_EXPIRES_SECONDS` | Yes      | staging, production | No     | Presigned upload TTL.            |

## Integrations

| Name                                    | Required | Environments        | Secret | Notes                                              |
| --------------------------------------- | -------- | ------------------- | ------ | -------------------------------------------------- |
| `ASAAS_RUNTIME_IMPLEMENTATION`          | Yes      | staging, production | No     | Use `http` only when Asaas config is complete.     |
| `ASAAS_API_URL`                         | Yes      | staging, production | No     | Asaas API base URL.                                |
| `ASAAS_API_KEY`                         | Yes      | staging, production | Yes    | Asaas API key.                                     |
| `ASAAS_WEBHOOK_SECRET`                  | Yes      | staging, production | Yes    | Asaas webhook secret.                              |
| `ASAAS_WEBHOOK_URL`                     | Yes      | staging, production | No     | Public webhook URL.                                |
| `SPEDY_RUNTIME_IMPLEMENTATION`          | Yes      | staging, production | No     | Use `http` only when SPEDY config is complete.     |
| `SPEDY_API_URL`                         | Yes      | staging, production | No     | SPEDY API base URL.                                |
| `SPEDY_API_TOKEN`                       | Yes      | staging, production | Yes    | SPEDY API token.                                   |
| `SPEDY_WEBHOOK_SECRET`                  | Yes      | staging, production | Yes    | SPEDY webhook secret.                              |
| `API_PLACA_KEY`                         | No       | staging, production | Yes    | APIBrasil bearer token for vehicle plate lookup.   |
| `API_PLACA_BASE_URL`                    | No       | staging, production | No     | Defaults to `https://gateway.apibrasil.io/api/v2`. |
| `API_PLACA_DADOS_PATH`                  | No       | staging, production | No     | Defaults to `/vehicles/base/000/dados`.            |
| `API_OPENAI_KEY`                        | No       | staging, production | Yes    | OpenAI API key for inventory resale analysis.      |
| `API_OPENAI_MODEL`                      | No       | staging, production | No     | Defaults to `gpt-5-mini`.                          |
| `MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY` | Yes      | staging, production | Yes    | Encrypts marketplace credentials.                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT`           | No       | staging, production | Yes    | OpenTelemetry collector endpoint.                  |

## Vehicle Catalog Sync

| Name                                   | Required | Environments               | Secret | Notes                                                                                         |
| -------------------------------------- | -------- | -------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `FIPE_API_BASE_URL`                    | No       | local, staging, production | No     | FIPE-compatible API base URL. Defaults to Parallelum FIPE v2.                                 |
| `FIPE_API_TOKEN`                       | No       | staging, production        | Yes    | Optional FIPE subscription token, sent as `X-Subscription-Token`.                             |
| `FIPE_CATALOG_SYNC_VEHICLE_TYPES`      | No       | local, staging, production | No     | Comma-separated `cars`, `motorcycles`, `trucks`. Defaults to `cars`.                          |
| `FIPE_CATALOG_SYNC_CONCURRENCY`        | No       | local, staging, production | No     | Brand worker count, capped by service logic. Defaults to `1`.                                 |
| `FIPE_CATALOG_SYNC_BRAND_LIMIT`        | No       | local                      | No     | Optional local/testing limit for brands per run.                                              |
| `FIPE_CATALOG_SYNC_HTTP_MAX_ATTEMPTS`  | No       | local, staging, production | No     | HTTP attempts for retryable FIPE responses. Defaults to `5`.                                  |
| `FIPE_CATALOG_SYNC_HTTP_RETRY_BASE_MS` | No       | local, staging, production | No     | Exponential retry base delay in milliseconds. Defaults to `1000`.                             |
| `FIPE_CATALOG_SYNC_REFRESH_AFTER_DAYS` | No       | local, staging, production | No     | Refresh existing version years after this age. Defaults to `30`; `0` only fills missing rows. |
| `FIPE_CATALOG_SYNC_REFRESH_EXISTING`   | No       | local, staging, production | No     | Set `true` to force a full refresh of existing version-year lookups.                          |

## CI Smoke Test Secrets

| Name                      | Required | Environments   | Secret | Notes                           |
| ------------------------- | -------- | -------------- | ------ | ------------------------------- |
| `STAGING_API_BASE_URL`    | Yes      | GitHub Actions | Yes    | Used by `staging-smoke.yml`.    |
| `PRODUCTION_API_BASE_URL` | Yes      | GitHub Actions | Yes    | Used by `production-smoke.yml`. |

## Railway Reference Pattern

Use Railway references for internal service links:

```text
DATABASE_URL=${{ Postgres.DATABASE_URL }}
AUDIT_DATABASE_URL=${{ AuditPostgres.DATABASE_URL }}
API_BASE_URL=https://${{ lojaveiculosv2-api.RAILWAY_PUBLIC_DOMAIN }}
PUBLIC_APP_URL=https://${{ lojaveiculosv2-web.RAILWAY_PUBLIC_DOMAIN }}
```

Keep production and staging values separate. Do not copy sealed production
secrets into staging.
