# Environment Variables

This document is the canonical checklist for Loja Veiculos V2 runtime variables.
Keep `.env.example`, Railway variables, and this file aligned.

Do not commit real secrets. Use Railway service variables, Railway reference
variables, sealed variables for high-risk secrets, and operator-local
environment variables for public smoke-test URLs.

## Core Runtime

| Name                                 | Required | Environments               | Secret | Notes                                                                      |
| ------------------------------------ | -------- | -------------------------- | ------ | -------------------------------------------------------------------------- |
| `NODE_ENV`                           | Yes      | staging, production        | No     | Use `production` in deployed environments.                                 |
| `APP_ENV`                            | Yes      | local, staging, production | No     | Runtime environment classifier.                                            |
| `PORT`                               | Yes      | staging, production        | No     | Railway injects this for services.                                         |
| `PUBLIC_APP_URL`                     | Yes      | staging, production        | No     | Public web URL.                                                            |
| `API_BASE_URL`                       | Yes      | staging, production        | No     | Public API URL consumed by the web app.                                    |
| `DATABASE_URL`                       | Yes      | staging, production        | Yes    | Product database URL. Prefer `${{ Postgres.DATABASE_URL }}` on Railway.    |
| `AUDIT_DATABASE_URL`                 | Yes      | staging, production        | Yes    | Audit database URL. Prefer `${{ AuditPostgres.DATABASE_URL }}` on Railway. |
| `DB_POOL_MAX`                        | Yes      | staging, production        | No     | Runtime DB pool limit.                                                     |
| `AUDIT_DB_POOL_MAX`                  | No       | staging, production        | No     | Audit DB pool limit. Defaults to `DB_POOL_MAX`.                            |
| `DB_CLOSE_TIMEOUT_SECONDS`           | Yes      | staging, production        | No     | Graceful database close timeout in seconds.                                |
| `SHUTDOWN_TIMEOUT_MS`                | Yes      | staging, production        | No     | Overall graceful shutdown timeout in milliseconds.                         |
| `READINESS_TIMEOUT_MS`               | No       | staging, production        | No     | Per-database readiness probe timeout. Defaults to `2000`.                  |
| `WEB_DIST_DIR`                       | No       | local, staging, production | No     | Web static asset directory override. Defaults to `apps/web/dist`.          |
| `EXTERNAL_API_RATE_LIMIT_PER_MINUTE` | Yes      | staging, production        | No     | Per-minute external API rate limit.                                        |
| `LOG_LEVEL`                          | Yes      | staging, production        | No     | Usually `info`; use `debug` only temporarily.                              |

`DRIZZLE_AUTOMATION_BOOTSTRAP` is an internal, local-only schema tooling flag.
The product DB push wrapper sets it automatically during the first phase that
creates automation scope indexes before their composite foreign keys. Leave it
unset in staging, production, and Railway service variables.

## Authentication

Use a dedicated Clerk project for V2. Do not reuse V1 Clerk secrets or
publishable keys across V1 and V2 environments; this keeps redirect URLs,
JWT/audience settings, webhooks, invitations, and rollout testing isolated.

| Name                                           | Required | Environments               | Secret | Notes                                                                                                       |
| ---------------------------------------------- | -------- | -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `CLERK_SECRET_KEY`                             | Yes      | staging, production        | Yes    | Clerk backend secret for the V2 Clerk project. Rotate immediately if exposed.                               |
| `CLERK_JWT_KEY`                                | No       | staging, production        | Yes    | Optional Clerk JWT public key for networkless verification; `CLERK_SECRET_KEY` is enough for baseline auth. |
| `CLERK_AUDIENCE`                               | No       | staging, production        | No     | Optional advanced check; set only after frontend tokens intentionally include the same `aud` claim.         |
| `CLERK_AUTHORIZED_PARTIES`                     | Yes      | staging, production        | No     | Comma-separated allowed frontend origins, for example `https://app.example.com`.                            |
| `VITE_CLERK_PUBLISHABLE_KEY`                   | Yes      | staging, production        | No     | Frontend publishable key for the V2 Clerk project.                                                          |
| `CLERK_WEBHOOK_SECRET`                         | No       | staging, production        | Yes    | Reserved until a Clerk webhook route is mounted; use the endpoint signing secret from Clerk.                |
| `CLERK_SIGN_IN_URL`                            | Yes      | staging, production        | No     | Frontend sign-in URL.                                                                                       |
| `CLERK_SIGN_UP_URL`                            | Yes      | staging, production        | No     | Frontend sign-up URL.                                                                                       |
| `CLERK_AFTER_SIGN_IN_URL`                      | Yes      | staging, production        | No     | Post sign-in redirect. Use `/auth/session`.                                                                 |
| `CLERK_AFTER_SIGN_UP_URL`                      | Yes      | staging, production        | No     | Post sign-up redirect. Use `/auth/session`.                                                                 |
| `CLERK_INVITATION_REDIRECT_URL`                | No       | local, staging, production | No     | Absolute URL Clerk should send accepted invitations back to. Defaults to `PUBLIC_APP_URL/auth/session`.     |
| `VITE_API_BASE_URL`                            | Yes      | staging, production        | No     | Public API base URL used by the web app runtime.                                                            |
| Professional Clerk baseline for this codebase: |

- Keep `CLERK_AUDIENCE` empty until the frontend explicitly calls Clerk
  `getToken()` with a JWT template or token configuration that emits a matching
  `aud` claim.
- Set `CLERK_AUTHORIZED_PARTIES` in staging and production to the exact deployed
  frontend origin list.
- Do not use `*` for `CLERK_AUTHORIZED_PARTIES`. Clerk verifies this as an
  exact authorized-party value, not as a wildcard. For local development, leave
  it empty or use `http://localhost:5173,http://127.0.0.1:5173`.
- Add `CLERK_JWT_KEY` only when you want offline JWT verification; otherwise the
  backend verifier can use `CLERK_SECRET_KEY`.
- Set `CLERK_INVITATION_REDIRECT_URL` to the public app session URL when it
  differs from `PUBLIC_APP_URL/auth/session`. Local development can rely on
  `PUBLIC_APP_URL=http://localhost:5173`; production should use the deployed app
  URL, for example `https://app.example.com/auth/session`.
- Customize the Clerk invitation email template, invitation sign-up screen, and
  hosted auth copy in Portuguese before production. The invitation email must
  clearly say that access is granted only after accepting the invite and landing
  back on `/auth/session`.
- Treat `CLERK_WEBHOOK_SECRET` as future-required only when Clerk webhook sync is
  implemented.

## Local Frontend Development

The web package is configured with Vite `envDir` pointing at the workspace
root, so local `pnpm dev` reads the root `.env`. In deployed environments, keep
variables service-scoped: only `VITE_*` public build-time values belong on the
web service, while Clerk secrets and database credentials belong on the API
service.

| Name                                 | Required | Environments | Secret | Notes                                                                                     |
| ------------------------------------ | -------- | ------------ | ------ | ----------------------------------------------------------------------------------------- |
| `LOCAL_AUTH_BYPASS`                  | No       | local        | No     | Authless seeded preview only. Leave empty when testing real Clerk.                        |
| `DEV_CLERK_USER_ID`                  | No       | local        | No     | API-side seeded preview Clerk id. Only used when `LOCAL_AUTH_BYPASS=true`.                |
| `DEV_STORE_SLUG`                     | No       | local        | No     | API-side seeded preview store slug. Only used when `LOCAL_AUTH_BYPASS=true`.              |
| `VITE_LOCAL_AUTH_BYPASS`             | No       | local        | No     | Enables the browser-only seeded account switcher. Never set in staging or production.     |
| `VITE_DEV_CLERK_USER_ID`             | No       | local        | No     | Frontend seeded preview Clerk id. Leave empty when testing real Clerk.                    |
| `VITE_DEV_STORE_SLUG`                | No       | local        | No     | Frontend seeded preview store slug. Leave empty when testing real Clerk.                  |
| `VITE_DEV_CLERK_SESSION_TOKEN`       | No       | local        | Yes    | Optional local Clerk session token override for CRM API calls.                            |
| `VITE_DEV_API_PROXY_TARGET`          | No       | local        | No     | Vite dev proxy target for `/api/v1`.                                                      |
| `VITE_DEV_PUBLIC_STORE_HOST`         | No       | local        | No     | Forwarded storefront host used by local public-site previews.                             |
| `DEV_SUPERVISOR_SHUTDOWN_TIMEOUT_MS` | No       | local        | No     | Local multi-process supervisor shutdown timeout.                                          |
| `PLAYWRIGHT_BASE_URL`                | No       | local        | No     | Base URL Playwright and the UI-audit tooling target. Defaults to `http://127.0.0.1:5173`. |
| Use one auth mode at a time:         |

- Real Clerk QA: configure `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`,
  `CLERK_AUTHORIZED_PARTIES`, `PUBLIC_APP_URL`, and Clerk redirect URLs; leave
  all dev bypass variables empty.
- Authless seeded preview: prefer `pnpm run dev:all:local`, which sets
  `LOCAL_AUTH_BYPASS=true`, clears Clerk verifier secrets for the API child
  process, and sets `VITE_LOCAL_AUTH_BYPASS=true` for the web child process.
  This exposes the local `/sign-in` account switcher for seeded agency, owner,
  supervisor, salesman, and investor personas.
- Permission QA: after `pnpm run db:clean:local` and `pnpm run dev:all:local`,
  run `pnpm run qa:permissions:local`.

## CRM WhatsApp Development

The seeded local database creates a sandbox `crm_connections` row for a ZAPI
test connection; it stores only env var names in `credentials_ref`, not
secrets.

Redis is part of the complete CRM WhatsApp migration for ephemeral
coordination: ticketed SSE fanout, future rate limits, distributed locks, and
queue scheduling. Postgres remains the durable source of truth for webhook
payloads, leads, sessions, messages, activities, and idempotency through
`provider_events`.

| Name                                | Required | Environments               | Secret | Notes                                                                                                                                                   |
| ----------------------------------- | -------- | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REDIS_URL`                         | Deployed | local, staging, production | Yes    | Local default is `redis://localhost:63790`; Railway API and CRM cron use `${{ lojaveiculosv2-redis.REDIS_URL }}`. In-process fallback is degraded mode. |
| `CRM_ZAPI_API_BASE_URL`             | No       | local                      | No     | ZAPI base URL for the CRM test connection.                                                                                                              |
| `CRM_ZAPI_TEST_INSTANCE_ID`         | No       | local                      | Yes    | Dedicated ZAPI test instance id. Never commit a real value.                                                                                             |
| `CRM_ZAPI_TEST_INSTANCE_TOKEN`      | No       | local                      | Yes    | Dedicated ZAPI test instance token. Never commit a real value.                                                                                          |
| `CRM_ZAPI_TEST_CLIENT_TOKEN`        | No       | local                      | Yes    | ZAPI client token for the test instance. Never commit a real value.                                                                                     |
| `CRM_ZAPI_CLIENT_TOKEN`             | No       | staging, production        | Yes    | ZAPI client token fallback for stored CRM credentials. Prefer credentials refs per connection.                                                          |
| `ZAPI_CLIENT_TOKEN`                 | No       | staging, production        | Yes    | Legacy ZAPI client-token alias. Prefer `CRM_ZAPI_CLIENT_TOKEN` for new environments.                                                                    |
| `CRM_ZAPI_TEST_PAIR_PHONE`          | No       | local                      | Yes    | Optional phone number used by `crm:zapi:diagnose` to request a pairing code.                                                                            |
| `CRM_ZAPI_WEBHOOK_TOKEN`            | Yes      | preview, production        | Yes    | Shared secret required outside local dev. Send it as `x-crm-webhook-token` or callback URL `?token=`.                                                   |
| `RUN_ZAPI_E2E`                      | No       | local, CI                  | No     | Must be `true` before any real-send ZAPI end-to-end test is allowed to run.                                                                             |
| `CRM_WHATSAPP_SCHEDULE_BATCH_SIZE`  | No       | local, staging, production | No     | Scheduled-message worker send limit per store scope. Defaults to `25`.                                                                                  |
| `CRM_WHATSAPP_SCHEDULE_SCOPE_LIMIT` | No       | local, staging, production | No     | Scheduled-message worker due store-scope discovery limit per run. Defaults to `100`.                                                                    |
| `CRM_WHATSAPP_SCHEDULE_DUE_AT`      | No       | local                      | No     | Optional ISO datetime override for local/manual scheduled-message worker runs. Leave empty in deployed cron runs.                                       |

ZAPI callback URLs use the public API base URL plus the CRM connection id:

- Received messages: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/received`
- Delivery receipts: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/delivery`
- Message status: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/status`
- Connected: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/connected`
- Disconnected: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/disconnected`
- Chat presence: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/chat-presence`

For local ngrok testing, use the ngrok HTTPS origin as the public API base URL.
Outside `APP_ENV=local`, include `CRM_ZAPI_WEBHOOK_TOKEN` with the callback as
`?token=...` or send it in the `x-crm-webhook-token` header.

CRM WhatsApp scheduled messages are stored durably in Postgres. Run
`pnpm run crm:whatsapp:schedule:process` from a local shell or Railway cron
worker to process due messages. The worker discovers due store scopes, then
sends through the same scoped CRM service path used by authenticated requests.
Railway runs the worker every five minutes in UTC. Because it composes the API
runtime, it also needs the API's Clerk, R2, Z-API, product DB, audit DB, and
Redis configuration. Do not set `CRM_WHATSAPP_SCHEDULE_DUE_AT` on Railway.

## Object Storage

| Name                              | Required | Environments        | Secret | Notes                                                                                                               |
| --------------------------------- | -------- | ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `R2_BUCKET_NAME`                  | Yes      | staging, production | No     | Application media bucket for inventory, documents, finance attachments, and CRM WhatsApp inbound media mirrors.     |
| `R2_ACCESS_KEY_ID`                | Yes      | staging, production | Yes    | Storage access key.                                                                                                 |
| `R2_SECRET_ACCESS_KEY`            | Yes      | staging, production | Yes    | Storage secret key.                                                                                                 |
| `R2_ENDPOINT`                     | Yes      | staging, production | No     | S3-compatible endpoint.                                                                                             |
| `R2_PUBLIC_BASE_URL`              | Yes      | staging, production | No     | Public media base URL.                                                                                              |
| `R2_REGION`                       | Yes      | staging, production | No     | S3 region value expected by SDK.                                                                                    |
| `R2_SEED_WRITE_BUCKET`            | No       | local               | No     | Exact dedicated test bucket name that opts `db:seed`/`db:reset` into R2 writes. Never set in staging or production. |
| `R2_UPLOAD_URL_EXPIRES_SECONDS`   | Yes      | staging, production | No     | Presigned upload TTL.                                                                                               |
| `R2_DOWNLOAD_URL_EXPIRES_SECONDS` | No       | staging, production | No     | Presigned download TTL for private/download flows. Defaults to `300`.                                               |

CRM WhatsApp inbound media is mirrored best-effort through the shared object
storage adapter. Successful mirrors store the public R2 URL on
`crm_whatsapp_messages.media_url` and persist provider URL, storage key, content
type, byte size, and mirror timestamp under `metadata.media`. Failed mirrors
keep the provider URL and set `metadata.media.mirrorStatus=failed`.

R2 browser uploads require a bucket-level CORS policy in addition to these
runtime variables. Use `docs/ops/r2-cors-lojaveiculosv2.json` for the
Cloudflare dashboard or `docs/ops/r2-cors-lojaveiculosv2-wrangler.json` for
Wrangler. The local policy includes Playwright and parallel-agent web ports;
if a new lane uses another port, add the exact `http://localhost:<port>` and
`http://127.0.0.1:<port>` origins.

## Integrations

| Name                                    | Required    | Environments        | Secret | Notes                                                                                         |
| --------------------------------------- | ----------- | ------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `ASAAS_RUNTIME_IMPLEMENTATION`          | Yes         | staging, production | No     | Use `http` only when Asaas config is complete.                                                |
| `ASAAS_API_URL`                         | Yes         | staging, production | No     | Asaas API base URL. Sandbox default is `https://api-sandbox.asaas.com/v3`.                    |
| `ASAAS_API_KEY`                         | Yes         | staging, production | Yes    | Asaas API key.                                                                                |
| `ASAAS_CHECKOUT_URL`                    | No          | local, staging      | No     | Optional hosted checkout base URL override. Sandbox default is inferred from `ASAAS_API_URL`. |
| `ASAAS_BILLING_SYNC_TYPE`               | No          | local, staging      | No     | Billing sync smoke payment type. Defaults to `PIX`.                                           |
| `ASAAS_BILLING_SYNC_NEXT_DUE_DATE`      | No          | local, staging      | No     | Optional `YYYY-MM-DD` due date for billing sync smoke.                                        |
| `BILLING_SYNC_STORE_ID`                 | No          | local, staging      | No     | Optional store id override for the billing sync job.                                          |
| `BILLING_SYNC_TENANT_ID`                | No          | local, staging      | No     | Optional tenant id override for the billing sync job.                                         |
| `ASAAS_WEBHOOK_SECRET`                  | Yes         | staging, production | Yes    | Asaas webhook secret.                                                                         |
| `ASAAS_WEBHOOK_URL`                     | Yes         | staging, production | No     | Public URL for `POST /api/v1/billing/webhooks/asaas`.                                         |
| `SPEDY_RUNTIME_IMPLEMENTATION`          | Yes         | staging, production | No     | Use `http` only when SPEDY config is complete.                                                |
| `SPEDY_API_URL`                         | Yes         | staging, production | No     | SPEDY API base URL.                                                                           |
| `SPEDY_API_TOKEN`                       | Yes         | staging, production | Yes    | SPEDY API token.                                                                              |
| `SPEDY_AUTH_HEADER`                     | No          | staging, production | No     | Header name used for SPEDY authentication. Defaults to `Authorization`.                       |
| `SPEDY_AUTH_SCHEME`                     | No          | staging, production | No     | Authorization scheme used with `SPEDY_API_TOKEN`. Defaults to `Bearer`.                       |
| `SPEDY_ISSUE_PATH`                      | Conditional | staging, production | No     | Generic issue path. Required unless both kind-specific paths are configured.                  |
| `SPEDY_NFE_ISSUE_PATH`                  | Conditional | staging, production | No     | NF-e issue path; overrides `SPEDY_ISSUE_PATH` when configured.                                |
| `SPEDY_NFSE_ISSUE_PATH`                 | Conditional | staging, production | No     | NFS-e issue path; overrides `SPEDY_ISSUE_PATH` when configured.                               |
| `SPEDY_CANCEL_PATH`                     | Yes         | staging, production | No     | Provider path for canceling fiscal documents.                                                 |
| `SPEDY_STATUS_PATH`                     | Yes         | staging, production | No     | Provider path for polling fiscal document status.                                             |
| `SPEDY_WEBHOOK_SECRET`                  | Yes         | staging, production | Yes    | SPEDY webhook secret.                                                                         |
| `API_PLACA_KEY`                         | No          | staging, production | Yes    | APIBrasil bearer token for vehicle plate lookup.                                              |
| `API_PLACA_BASE_URL`                    | No          | staging, production | No     | Defaults to `https://gateway.apibrasil.io/api/v2`.                                            |
| `API_PLACA_DADOS_PATH`                  | No          | staging, production | No     | Defaults to `/vehicles/base/000/dados`.                                                       |
| `API_PLACA_CACHE_TTL_DAYS`              | No          | staging, production | No     | Plate lookup reuse window. Defaults to `30`.                                                  |
| `API_OPENAI_KEY`                        | No          | staging, production | Yes    | OpenAI API key for inventory resale analysis.                                                 |
| `API_OPENAI_DEFAULT_MODEL`              | No          | staging, production | No     | Defaults AI tasks to `gpt-5.4-mini`.                                                          |
| `API_OPENAI_DOCUMENTS_MODEL`            | No          | staging, production | No     | Optional override for document-builder template suggestions.                                  |
| `API_OPENAI_INVENTORY_RESALE_MODEL`     | No          | staging, production | No     | Optional override for inventory resale analysis.                                              |
| `API_OPENAI_MODEL`                      | No          | staging, production | No     | Legacy fallback after task-specific model vars.                                               |
| `MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY` | Yes         | staging, production | Yes    | Encrypts marketplace credentials.                                                             |
| `MERCADO_LIVRE_CLIENT_ID`               | Yes         | staging, production | Yes    | Enables Mercado Livre OAuth and stock sync.                                                   |
| `MERCADO_LIVRE_CLIENT_SECRET`           | No          | staging, production | Yes    | OAuth client secret when required by the provider app.                                        |
| `MERCADO_LIVRE_AUTHORIZATION_URL`       | No          | staging, production | No     | Defaults to `https://auth.mercadolivre.com.br/authorization`.                                 |
| `MERCADO_LIVRE_API_BASE_URL`            | No          | staging, production | No     | Defaults to `https://api.mercadolibre.com`.                                                   |
| `MERCADO_LIVRE_TOKEN_URL`               | No          | staging, production | No     | Defaults to `https://api.mercadolibre.com/oauth/token`.                                       |
| `MERCADO_LIVRE_ACCOUNT_PATH`            | No          | staging, production | No     | Defaults to `/users/me`.                                                                      |
| `OLX_CLIENT_ID`                         | Yes         | staging, production | Yes    | Required with the OLX client secret to enable OLX stock sync.                                 |
| `OLX_CLIENT_SECRET`                     | Yes         | staging, production | Yes    | Required OLX OAuth client secret.                                                             |
| `OLX_AUTHORIZATION_URL`                 | No          | staging, production | No     | Defaults to `https://auth.olx.com.br/oauth`.                                                  |
| `OLX_API_BASE_URL`                      | No          | staging, production | No     | Defaults to `https://apps.olx.com.br`.                                                        |
| `OLX_TOKEN_URL`                         | No          | staging, production | No     | Defaults to `https://auth.olx.com.br/oauth/token`.                                            |
| `OLX_LISTINGS_PATH`                     | No          | staging, production | No     | Defaults to `/autoupload/import`.                                                             |
| `OLX_REQUIREMENT_CONFIG`                | No          | staging, production | No     | Optional JSON account-check and requirement override. Invalid JSON fails closed.              |
| `HEDRA_API_KEY`                         | No          | staging, production | Yes    | Hedra API key for Inventory Estudio Digital IA.                                               |
| `HEDRA_API_BASE_URL`                    | No          | staging, production | No     | Defaults to `https://api.hedra.com`; override if Hedra provides another endpoint.             |
| `HEDRA_ASSET_PATH`                      | No          | staging, production | No     | Source image asset create/list path. Defaults to `/web-app/public/assets`.                    |
| `HEDRA_ASSET_UPLOAD_PATH`               | No          | staging, production | No     | Source image asset upload path with `{id}`. Defaults to `/web-app/public/assets/{id}/upload`. |
| `HEDRA_IMAGE_TO_IMAGE_PATH`             | No          | staging, production | No     | Image-to-image generation path. Defaults to `/web-app/public/generations`.                    |
| `HEDRA_GENERATION_STATUS_PATH`          | No          | staging, production | No     | Polling path with `{id}`. Defaults to `/web-app/public/generations/{id}/status`.              |
| `HEDRA_AUTH_HEADER`                     | No          | staging, production | No     | Defaults to `X-API-Key`.                                                                      |
| `HEDRA_AUTH_SCHEME`                     | No          | staging, production | No     | Optional auth scheme; blank for `X-API-Key`.                                                  |
| `HEDRA_FLUX_2_PRO_MODEL_ID`             | No          | staging, production | No     | Hedra model id mapped from the internal `flux_2_pro` image-to-image model.                    |
| `HEDRA_POLL_INTERVAL_MS`                | No          | staging, production | No     | Async Hedra polling interval. Defaults to `1500`.                                             |
| `HEDRA_POLL_MAX_ATTEMPTS`               | No          | staging, production | No     | Async Hedra polling attempts. Defaults to `120`.                                              |
| `HEDRA_REQUEST_TIMEOUT_MS`              | No          | staging, production | No     | Per-request timeout for Hedra create/status/download HTTP calls. Defaults to `60000`.         |
| `HTTP_REQUEST_TIMEOUT_MS`               | No          | staging, production | No     | Node HTTP server inbound timeout. Defaults to `240000`; external gateways can enforce less.   |

## Vehicle Catalog Sync

| Name                                   | Required | Environments               | Secret | Notes                                                                                         |
| -------------------------------------- | -------- | -------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `FIPE_API_BASE_URL`                    | No       | local, staging, production | No     | FIPE-compatible API base URL. Defaults to Parallelum FIPE v2.                                 |
| `FIPE_API_TOKEN`                       | No       | staging, production        | Yes    | Optional FIPE subscription token, sent as `X-Subscription-Token`.                             |
| `FIPE_CATALOG_SYNC_VEHICLE_TYPES`      | No       | local, staging, production | No     | Comma-separated `cars`, `motorcycles`, `trucks`. Defaults to `cars`.                          |
| `FIPE_CATALOG_SYNC_CONCURRENCY`        | No       | local, staging, production | No     | Brand worker count, capped by service logic. Defaults to `1`.                                 |
| `FIPE_CATALOG_SYNC_BRAND_CODES`        | No       | local, staging, production | No     | Optional comma-separated FIPE brand codes for targeted raw-data refreshes.                    |
| `FIPE_CATALOG_SYNC_BRAND_LIMIT`        | No       | local                      | No     | Optional local/testing limit for brands per run.                                              |
| `FIPE_CATALOG_SYNC_HTTP_MAX_ATTEMPTS`  | No       | local, staging, production | No     | HTTP attempts for retryable FIPE responses. Defaults to `5`.                                  |
| `FIPE_CATALOG_SYNC_INCLUDE_YEARS`      | No       | local, staging, production | No     | Set `false` to refresh only brands, model families, and versions before year backfill.        |
| `FIPE_CATALOG_SYNC_HTTP_TIMEOUT_MS`    | No       | local, staging, production | No     | Per-request FIPE HTTP timeout in milliseconds. Defaults to `30000`.                           |
| `FIPE_CATALOG_SYNC_HTTP_RETRY_BASE_MS` | No       | local, staging, production | No     | Exponential retry base delay in milliseconds. Defaults to `1000`.                             |
| `FIPE_CATALOG_SYNC_REFERENCE_CODE`     | No       | local, staging, production | No     | Optional FIPE reference month code. Defaults to the latest code returned by `/references`.    |
| `FIPE_CATALOG_SYNC_REFRESH_AFTER_DAYS` | No       | local, staging, production | No     | Refresh existing version years after this age. Defaults to `30`; `0` only fills missing rows. |
| `FIPE_CATALOG_SYNC_REFRESH_EXISTING`   | No       | local, staging, production | No     | Set `true` to force a full refresh of existing version-year lookups.                          |
| `FIPE_CATALOG_NORMALIZE_DRY_RUN`       | No       | local, staging, production | No     | Dry-run flag for the vehicle catalog name-normalization job.                                  |

Parallelum FIPE brand responses currently include `code` and `name`, but no
logo URL. The catalog sync enriches brands from the legacy `brands.json` logo
catalog, including aliases like `GM - Chevrolet` and `VW - VolksWagen`, and
persists the resolved URL to `vehicle_catalog_brands.logo_url`.
The sync also stores raw FIPE JSON responses in
`vehicle_catalog_raw_responses` for provider-evidence audits and parser
validation.

## Operator Smoke Test URLs

| Name                      | Required | Environments   | Secret | Notes                               |
| ------------------------- | -------- | -------------- | ------ | ----------------------------------- |
| `STAGING_API_BASE_URL`    | Yes      | operator shell | No     | Used by `release:smoke:staging`.    |
| `STAGING_WEB_BASE_URL`    | Yes      | operator shell | No     | Used by `release:smoke:staging`.    |
| `PRODUCTION_API_BASE_URL` | Yes      | operator shell | No     | Used by `release:smoke:production`. |
| `PRODUCTION_WEB_BASE_URL` | Yes      | operator shell | No     | Used by `release:smoke:production`. |

## Railway Reference Pattern

Use Railway references for internal service links:

```text
DATABASE_URL=${{ Postgres.DATABASE_URL }}
AUDIT_DATABASE_URL=${{ AuditPostgres.DATABASE_URL }}
REDIS_URL=${{ lojaveiculosv2-redis.REDIS_URL }}
API_BASE_URL=https://${{ lojaveiculosv2-api.RAILWAY_PUBLIC_DOMAIN }}
PUBLIC_APP_URL=https://${{ lojaveiculosv2-web.RAILWAY_PUBLIC_DOMAIN }}
```

For the current staging topology, environment-owned runtime values are Railway
shared variables. The API references `${{ shared.KEY }}`, the web references
only `VITE_API_BASE_URL` and `VITE_CLERK_PUBLISHABLE_KEY`, and the CRM schedule
worker references the corresponding API variables. This keeps one editable
staging value for every credential or public URL while still giving the worker
the complete API runtime contract.

Unknown staging values use conspicuous `keepme_*` placeholders in Railway, not
in source. Replace core Clerk, R2, marketplace-encryption, and CRM values before
the first manual upload. Provider implementation selectors must remain
fail-closed until their entire credential and endpoint set is real; only then
set `ASAAS_RUNTIME_IMPLEMENTATION=http` or
`SPEDY_RUNTIME_IMPLEMENTATION=http`.
