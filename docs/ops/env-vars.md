# Environment Variables

This document is the canonical checklist for Loja Veiculos V2 runtime variables.
Keep `.env.example`, Railway variables, and this file aligned.

Do not commit real secrets. Use Railway service variables, Railway reference
variables, sealed variables for high-risk secrets, and operator-local
environment variables for public smoke-test URLs.

## Core Runtime

| Name                                 | Required | Environments               | Secret | Notes                                                                                                    |
| ------------------------------------ | -------- | -------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                           | Yes      | staging, production        | No     | Use `production` in deployed environments.                                                               |
| `APP_ENV`                            | Yes      | local, staging, production | No     | Runtime environment classifier. Also selects the mandatory R2 key prefix: `l/`, `s/`, or `p/`.           |
| `PORT`                               | Yes      | staging, production        | No     | Railway injects this for services.                                                                       |
| `PUBLIC_APP_URL`                     | Yes      | staging, production        | No     | Public web URL.                                                                                          |
| `API_BASE_URL`                       | Yes      | staging, production        | No     | Public API URL consumed by the web app.                                                                  |
| `DATABASE_URL`                       | Yes      | staging, production        | Yes    | Product database URL. Prefer `${{ Postgres.DATABASE_URL }}` on Railway.                                  |
| `AUDIT_DATABASE_URL`                 | Yes      | staging, production        | Yes    | Audit database URL. Prefer `${{ AuditPostgres.DATABASE_URL }}` on Railway.                               |
| `STAGING_DB`                         | No       | staging                    | Yes    | Staging product database URL alias for maintenance and grant scripts.                                    |
| `STAGING_AUDIT_DB`                   | No       | staging                    | Yes    | Staging audit database URL alias for maintenance and grant scripts.                                      |
| `SEED_SOURCE_DATABASE_URL`           | No       | local, staging             | Yes    | Local source database URL for staging store seed migration scripts.                                      |
| `DB_POOL_MAX`                        | Yes      | staging, production        | No     | Runtime DB pool limit.                                                                                   |
| `AUDIT_DB_POOL_MAX`                  | No       | staging, production        | No     | Audit DB pool limit. Defaults to `DB_POOL_MAX`.                                                          |
| `DB_CLOSE_TIMEOUT_SECONDS`           | Yes      | staging, production        | No     | Graceful database close timeout in seconds.                                                              |
| `SHUTDOWN_TIMEOUT_MS`                | Yes      | staging, production        | No     | Overall graceful shutdown timeout in milliseconds.                                                       |
| `READINESS_TIMEOUT_MS`               | No       | staging, production        | No     | Per-database readiness probe timeout. Defaults to `2000`.                                                |
| `WEB_DIST_DIR`                       | No       | local, staging, production | No     | Web static asset directory override. Defaults to `apps/web/dist`.                                        |
| `EXTERNAL_API_RATE_LIMIT_PER_MINUTE` | Yes      | staging, production        | No     | Per-minute external API rate limit.                                                                      |
| `LOG_LEVEL`                          | Yes      | staging, production        | No     | Usually `info`; use `debug` only temporarily.                                                            |
| `LOG_HTTP_REQUESTS`                  | No       | local, staging, production | No     | Structured HTTP request logs default on outside tests; set `false` only for an approved noise reduction. |
| `RAILWAY_GIT_COMMIT_SHA`             | No       | staging, production        | No     | Railway-injected commit used by the API/web build-contract handshake. Do not configure manually.         |
| `BUILD_COMMIT_SHA`                   | No       | local, staging, production | No     | Optional non-Railway commit override used by the same build-contract handshake.                          |
| `RAILPACK_DEPLOY_APT_PACKAGES`       | Yes      | staging, production        | No     | API build setting. Keep `... ffmpeg` so every outbound CRM audio is normalized to WhatsApp OGG/Opus.     |

Railway injects `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, and
`RAILWAY_ENVIRONMENT_NAME`; deployments also expose
`RAILWAY_GIT_COMMIT_SHA`, and some runtime surfaces expose
`RAILWAY_ENVIRONMENT` as a name or opaque identifier. Do not configure these
manually. The non-production reset command uses them only as additional
fail-closed environment signals.

`DRIZZLE_AUTOMATION_BOOTSTRAP` is an internal, local-only schema tooling flag.
The product DB push wrapper sets it automatically during the first phase that
creates automation scope indexes before their composite foreign keys. Leave it
unset in staging, production, and Railway service variables.

`DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP` is an internal, local-only schema tooling
flag. The product DB push wrapper sets it automatically while it creates the
composite tenant/store indexes required by financing scope foreign keys. Leave
it unset in staging, production, and Railway service variables.

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
- Treat a successful Clerk invitation response as a delivery request, not proof
  that the recipient mailbox accepted the message. The authorized create/resend
  responses expose the sensitive Clerk acceptance URL so the manager can copy it
  as a fallback; never log, audit, or persist that URL outside Clerk.
- Development instances send from `@accounts.dev` and Clerk limits its delivery
  allowance. Use a production instance with authenticated sending-domain setup
  for customer delivery. When a production recipient is suppressed, inspect
  Clerk Email Logs, resolve the bounce/block cause, remove the suppression only
  when safe, and then request a new send.
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

## CRM Messaging Development

The seeded local database may create a sandbox `crm_channel_connections` row
for a Z-API test route. Z-API credentials are entered per store and connection,
are write-only, and never appear in environment variables or committed files.

V2 recognizes three canonical transport providers:

- `zapi`
- `meta_cloud`
- `olx`

Composio is a credential broker for `meta_cloud`; it is not a provider or
channel alias.

Official WhatsApp and Instagram sends use Composio's HTTP REST proxy. The API
does not install the Composio TypeScript SDK because its current Node runtime
requirement would remove this repository's supported Node 20 path. Official
inbound messages and WhatsApp delivery statuses arrive directly from Meta at
`/api/v1/crm/webhooks/meta` and require Meta challenge and signature
verification.

Redis is part of the complete CRM messaging migration for ephemeral
coordination: ticketed SSE fanout, future rate limits, distributed locks, and
queue scheduling. Postgres remains the durable source of truth for webhook
payloads, leads, conversation threads/cycles, messages, activities, and
idempotency through `provider_events`.

| Name                                       | Required                                                              | Environments               | Secret | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------- | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REDIS_URL`                                | Deployed                                                              | local, staging, production | Yes    | Local default is `redis://localhost:63790`; Railway API and CRM cron use `${{ lojaveiculosv2-redis.REDIS_URL }}`. In-process fallback is degraded mode.                                                                                                                                                                                                                                                                        |
| `CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY` | When managed provider connections or CRM bot integrations are enabled | local, staging, production | Yes    | Versioned key in the exact format `v1:<base64url>` where the decoded canonical base64url value is exactly 32 random bytes. It encrypts connection credentials entered by an entitled authorized customer actor or support, per-connection webhook secrets, CRM bot webhook secrets, and durable OLX lead recovery envelopes at rest. Keep one key per environment; rotation requires the CRM runbook procedure.                |
| `CRM_ZAPI_API_BASE_URL`                    | No                                                                    | local, staging, production | No     | ZAPI API base URL used by CRM connection setup and provider-locked sends. Defaults to the official API URL; override only for an explicitly controlled test endpoint.                                                                                                                                                                                                                                                          |
| `CRM_ZAPI_CONNECTION_FILE`                 | No                                                                    | local                      | Yes    | Path used only by the explicit Z-API diagnostic and local seed-smoke tools. The untracked JSON contains one sandbox connection's `instanceId`, `instanceToken`, and `clientToken`; runtime provider I/O never reads it and store BYOK credentials remain encrypted and store-scoped.                                                                                                                                           |
| `CRM_ZAPI_REQUEST_TIMEOUT_MS`              | No                                                                    | local, staging, production | No     | Timeout for ZAPI setup requests. Defaults to `10000` and is capped at `60000`.                                                                                                                                                                                                                                                                                                                                                 |
| `CRM_ZAPI_TEST_PAIR_PHONE`                 | No                                                                    | local                      | Yes    | Optional phone number used by `crm:zapi:diagnose` to request a pairing code.                                                                                                                                                                                                                                                                                                                                                   |
| `RUN_ZAPI_E2E`                             | No                                                                    | local, CI                  | No     | Must be `true` before any real-send ZAPI end-to-end test is allowed to run.                                                                                                                                                                                                                                                                                                                                                    |
| `CRM_UAZAPI_ADMIN_TOKEN`                   | When uazapi instances are provisioned                                 | local, staging, production | Yes    | Account-wide uazapi admin token sent as the `admintoken` header for `POST /instance/create` and `DELETE /instance`. Provisioning fails closed when it is missing; the value is never stored per connection.                                                                                                                                                                                                                    |
| `CRM_UAZAPI_BASE_URL`                      | No                                                                    | local, staging, production | No     | uazapi base URL fallback used by connection setup, provisioning, and provider-locked sends when the connection does not carry a sealed per-instance base URL. Normalized to the URL origin (http/https only) and defaults to `https://free.uazapi.com`.                                                                                                                                                                        |
| `CRM_UAZAPI_REQUEST_TIMEOUT_MS`            | No                                                                    | local, staging, production | No     | Timeout for uazapi setup, admin, and messaging requests. Defaults to `30000` and is capped at `60000`.                                                                                                                                                                                                                                                                                                                         |
| `CRM_OLX_CHAT_ENABLED`                     | No                                                                    | local, staging, production | No     | Server-owned OLX Chat release gate. Defaults to disabled and enables ingress, outbound routing, and customer read models only when the exact value is `true`. Access tokens must be encrypted per CRM connection with `CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY`; provider URL and security limits are server constants. Keep false until the official V2 redirect URI, chat contract, and provider acceptance evidence exist. |
| `CRM_OLX_WEBHOOK_ALLOWED_IPS`              | No                                                                    | staging, production        | No     | Comma-separated exact-IP allowlist for OLX callbacks. Defaults to OLX's official `54.162.151.93`; an explicit value replaces the default. Invalid configuration and missing, malformed, multi-value, or unlisted request addresses fail closed.                                                                                                                                                                                |
| `CRM_OLX_TRUST_PROXY_HEADERS`              | OLX callbacks in deployed environments                                | staging, production        | No     | Must be exactly `true` only when Railway is the sole public ingress and overwrites `x-real-ip`. OLX callbacks fail closed without this explicit deployment contract; `x-forwarded-for` is not used for authorization.                                                                                                                                                                                                          |
| `COMPOSIO_API_KEY`                         | When official enabled                                                 | local, staging, production | Yes    | Dedicated Composio project API key. Official connection rows may reference only this exact variable name; they never store the key itself.                                                                                                                                                                                                                                                                                     |
| `COMPOSIO_API_BASE_URL`                    | No                                                                    | local, staging, production | No     | Optional Composio REST base override. Defaults to `https://backend.composio.dev`; outbound proxy requests use `/api/v3.1/tools/execute/proxy`.                                                                                                                                                                                                                                                                                 |
| `COMPOSIO_META_GRAPH_VERSION`              | When official enabled                                                 | local, staging, production | No     | Required `vN.N` Meta Graph version unless the connection stores an explicit `graphVersion` in non-secret metadata. The adapter fails closed if neither source is valid.                                                                                                                                                                                                                                                        |
| `COMPOSIO_REQUEST_TIMEOUT_MS`              | No                                                                    | local, staging, production | No     | Timeout for Composio proxy and connected-account status requests. Defaults to `10000` and is capped at `60000`.                                                                                                                                                                                                                                                                                                                |
| `COMPOSIO_WHATSAPP_TOOLKIT_VERSION`        | No                                                                    | local, staging, production | No     | Composio toolkit version used to discover official WhatsApp sender actions. Defaults to the server-tested version in code; change only after provider contract verification.                                                                                                                                                                                                                                                   |
| `COMPOSIO_WHATSAPP_AUTH_CONFIG_ID`         | When official self-service is enabled                                 | local, staging, production | No     | Server-owned `ac_` auth-config ID used by the official WhatsApp onboarding flow and operator diagnostics. It is not a `ca_` connected-account ID.                                                                                                                                                                                                                                                                              |
| `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`        | When Instagram self-service is enabled                                | local, staging, production | No     | Server-owned `ac_` auth-config ID used by Instagram onboarding and operator diagnostics. It must belong to the same Loja Veiculos-owned Meta app that signs the direct webhook; it is not a `ca_` connected-account ID.                                                                                                                                                                                                        |
| `COMPOSIO_INSTAGRAM_LOGIN_MODE`            | When Instagram self-service is enabled                                | local, staging, production | No     | Required server-owned contract selector: `facebook` for Facebook Login for Business with a linked Page, or `instagram` for Instagram Login. Missing or unknown values fail closed before OAuth because discovery and webhook subscription targets differ.                                                                                                                                                                      |
| `CRM_META_WEBHOOK_VERIFY_TOKEN`            | When official enabled                                                 | local, staging, production | Yes    | Token used for Meta's GET webhook challenge at `/api/v1/crm/webhooks/meta`.                                                                                                                                                                                                                                                                                                                                                    |
| `CRM_META_APP_SECRET`                      | When official enabled                                                 | local, staging, production | Yes    | Meta app secret used to verify the POST webhook `X-Hub-Signature-256` over the raw request body.                                                                                                                                                                                                                                                                                                                               |
| `CRM_WEBHOOK_SECRET`                       | External bot client                                                   | customer bot runtime       | Yes    | Example environment variable used by the copyable TypeScript and Python client snippets for the connection-scoped `X-Webhook-Secret`. Configure it in the external bot deployment; the Loja API and web services do not read it.                                                                                                                                                                                               |
| `CRM_EXTERNAL_BOT_EFFECT_BATCH_SIZE`       | No                                                                    | local, staging, production | No     | Maximum durable external-bot provider effects claimed per worker run. Defaults to `25` and is capped at `100`. The worker remains disabled unless it is explicitly deployed with complete server-owned authorization and executor wiring.                                                                                                                                                                                      |
| `CRM_CONNECTION_CLEANUP_BATCH_SIZE`        | No                                                                    | local                      | No     | Maximum abandoned-connection and expired outbound-recovery rows handled by a manual cleanup run. Defaults to `100` and is capped at `500`; the deployed scheduled worker uses its own bounded batch.                                                                                                                                                                                                                           |
| `CRM_RETENTION_TENANT_ID`                  | No                                                                    | local, staging, production | No     | Optional manual-run tenant filter. Deployed retention discovers all non-deleted stores from durable scope state; leave this unset for scheduled runs.                                                                                                                                                                                                                                                                          |
| `CRM_RETENTION_STORE_ID`                   | No                                                                    | local, staging, production | No     | Optional manual-run store filter; requires `CRM_RETENTION_TENANT_ID`. Leave both unset for the scheduled global worker.                                                                                                                                                                                                                                                                                                        |
| `CRM_RETENTION_DRY_RUN`                    | Deployed retention worker                                             | local, staging, production | No     | Safe default is dry-run. Railway pins this to `true` for the first staging release. Only a reviewed IaC change to the exact value `false` enables anonymization/purge; missing legal-hold storage blocks both preview and execution.                                                                                                                                                                                           |
| `CRM_RETENTION_BATCH_SIZE`                 | No                                                                    | local, staging, production | No     | Candidate limit per CRM retention batch. Defaults to `100` and is capped at `500`.                                                                                                                                                                                                                                                                                                                                             |
| `CRM_RETENTION_MAX_BATCHES`                | No                                                                    | local, staging, production | No     | Maximum cursor pages handled by one run. Defaults to `20` and is capped at `1000`.                                                                                                                                                                                                                                                                                                                                             |
| `CRM_RETENTION_SCOPE_LIMIT`                | No                                                                    | local, staging, production | No     | Maximum store scopes leased by one run. Defaults to `100` and is capped at `1000`; continuation cursors live only in the durable scope table.                                                                                                                                                                                                                                                                                  |
| `CRM_RETENTION_LEASE_SECONDS`              | No                                                                    | local, staging, production | No     | Per-store worker lease duration. Defaults to `900` seconds and is capped at `3600`; expired leases are reclaimable after crashes.                                                                                                                                                                                                                                                                                              |
| `CRM_WHATSAPP_SCHEDULE_BATCH_SIZE`         | No                                                                    | local, staging, production | No     | Scheduled-message worker send limit per store scope. Defaults to `25`.                                                                                                                                                                                                                                                                                                                                                         |
| `CRM_WHATSAPP_SCHEDULE_SCOPE_LIMIT`        | No                                                                    | local, staging, production | No     | Scheduled-message worker due store-scope discovery limit per run. Defaults to `100`.                                                                                                                                                                                                                                                                                                                                           |
| `CRM_WHATSAPP_SCHEDULE_DUE_AT`             | No                                                                    | local                      | No     | Optional ISO datetime override for local/manual scheduled-message worker runs. Leave empty in deployed cron runs.                                                                                                                                                                                                                                                                                                              |
| `CRM_PUSH_DELIVERY_MODE`                   | No                                                                    | local, staging, production | No     | CRM browser-push release gate: `off` (default; no SDK config and the worker lease-releases pending intents without provider calls), `shadow` (browser subscription and durable recipient evaluation using a separate environment app, with no provider send), or `live` (OneSignal delivery). Invalid values fail closed.                                                                                                      |
| `ONESIGNAL_APP_ID`                         | Shadow or live CRM push                                               | local, staging, production | No     | Public OneSignal app id returned to authenticated CRM clients. Staging/parallel origins must use a separate app. Reuse the V1 production app only after the exact `lojaveiculos.com.br` origin has cut over to V2.                                                                                                                                                                                                             |
| `ONESIGNAL_API_KEY`                        | Live CRM push                                                         | local, staging, production | Yes    | Server-only OneSignal REST API key. Configure only on the API and CRM push worker; never expose it through Vite or browser configuration.                                                                                                                                                                                                                                                                                      |
| `CRM_PUSH_REQUEST_TIMEOUT_MS`              | No                                                                    | local, staging, production | No     | OneSignal request timeout. Defaults to `10000` and is capped at `60000`.                                                                                                                                                                                                                                                                                                                                                       |
| `CRM_PUSH_BATCH_SIZE`                      | No                                                                    | local, staging, production | No     | Maximum outbox intents claimed per one-minute worker run. Defaults to `25` and is capped at `100`.                                                                                                                                                                                                                                                                                                                             |
| `CRM_PUSH_MAX_ATTEMPTS`                    | No                                                                    | local, staging, production | No     | Maximum attempts for retryable or indeterminate OneSignal outcomes before dead-lettering. Defaults to `8` and is capped at `25`. Stable provider idempotency keys are reused for every retry.                                                                                                                                                                                                                                  |
| `CRM_PUSH_LEASE_DURATION_MS`               | No                                                                    | local, staging, production | No     | Durable claim lease. Defaults to `60000`, must exceed the request timeout by at least 15 seconds, and is capped at 15 minutes. Every claim rotates a UUID lease token, so stale workers cannot complete a newer attempt.                                                                                                                                                                                                       |
| `CRM_PUSH_CLEANUP_BATCH_SIZE`              | No                                                                    | local, staging, production | No     | Maximum delivered/dead-letter rows deleted per worker run. Defaults to `100` and is capped at `500`. Cleanup never selects pending or processing rows.                                                                                                                                                                                                                                                                         |
| `CRM_PUSH_TERMINAL_RETENTION_DAYS`         | No                                                                    | local, staging, production | No     | Retention for delivered and dead-letter push intents. Defaults to `30` days and is capped at `365`; cleanup is bounded and runs after each worker batch.                                                                                                                                                                                                                                                                       |

ZAPI callback URLs use the public API base URL plus the CRM connection id:

- Received messages: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/received`
- Delivery receipts: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/delivery`
- Message status: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/status`
- Connected: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/connected`
- Disconnected: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/disconnected`
- Chat presence: `/api/v1/crm/whatsapp/webhooks/zapi/{connectionId}/chat-presence`

For local ngrok testing, use the ngrok HTTPS origin as the public API base URL.
Each managed connection receives a random webhook secret generated and sealed
by the server. Automatic configuration binds that secret to the connection in
the callback; never log, display, or manually reuse the callback URL.

Official Meta providers use one shared callback:

- Verification and events:
  `/api/v1/crm/webhooks/meta`

Configure the Meta app with `CRM_META_WEBHOOK_VERIFY_TOKEN`. Every POST must
carry a valid `X-Hub-Signature-256` generated with `CRM_META_APP_SECRET`; there
is no query-token bypass. The
`crm_channel_connections.external_connection_id` stores
the native Meta phone-number id or Instagram professional-account id used to
route the event. Composio connected-account ids and API-key env references live
in `credentials_ref`; raw provider secrets must not be stored in connection
metadata or returned by the API.

Provider routing is fail-closed. A Composio/Meta failure never falls back to
ZAPI because a second provider attempt could duplicate delivery. Only an
explicit HTTP 429 is retried with bounded `Retry-After`; ambiguous timeouts and
5xx responses are returned as provider failures without automatic replay.

CRM messaging scheduled messages are stored durably in Postgres. Run
`pnpm run crm:schedule:process` from a local shell or Railway cron
worker to process due messages. The worker discovers due store scopes, then
sends through the same scoped CRM service path used by authenticated requests.
Railway runs the worker every five minutes in UTC. Because it composes the API
runtime, it also needs the API's Clerk, R2, selected messaging-provider, product
DB, audit DB, and Redis configuration. Do not set
`CRM_WHATSAPP_SCHEDULE_DUE_AT` on Railway.

CRM push intents are inserted in the same product-database transaction as a
new inbound CRM message. Run `pnpm run crm:push:process` locally to process one
bounded batch; Railway runs the worker once per minute. Provider requests use a
stable idempotency key, expired claims are recoverable, and subscription ids,
message bodies, and the OneSignal API key are excluded from worker logs. Keep
delivery `off` until the schema is deployed. Validate staging in `shadow` with
its own OneSignal app, then switch production to `live` only during the exact
V1-origin cutover.
While delivery is `off`, the scheduled worker drains intents through the normal
lease and fencing path without calling OneSignal. This prevents historical
messages accumulated behind the release gate from replaying when delivery is
enabled later.

For the self-service connection workflow, follow
[`docs/runbooks/crm-channel-connection-self-service.md`](../runbooks/crm-channel-connection-self-service.md).
The runbook covers setup, re-authentication, key rotation, provider webhook
diagnostics, degraded state, and rollback. It does not contain provider
secrets or customer message data.

## Object Storage

| Name                              | Required | Environments        | Secret | Notes                                                                                                               |
| --------------------------------- | -------- | ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `R2_BUCKET_NAME`                  | Yes      | staging, production | No     | Application media bucket for inventory, documents, finance attachments, and ZAPI CRM inbound media mirrors.         |
| `R2_ACCESS_KEY_ID`                | Yes      | staging, production | Yes    | Storage access key.                                                                                                 |
| `R2_SECRET_ACCESS_KEY`            | Yes      | staging, production | Yes    | Storage secret key.                                                                                                 |
| `R2_ENDPOINT`                     | Yes      | staging, production | No     | S3-compatible endpoint.                                                                                             |
| `R2_PUBLIC_BASE_URL`              | Yes      | staging, production | No     | Public media base URL.                                                                                              |
| `R2_REGION`                       | Yes      | staging, production | No     | S3 region value expected by SDK.                                                                                    |
| `R2_SEED_WRITE_BUCKET`            | No       | local               | No     | Exact dedicated test bucket name that opts `db:seed`/`db:reset` into R2 writes. Never set in staging or production. |
| `R2_UPLOAD_URL_EXPIRES_SECONDS`   | Yes      | staging, production | No     | Presigned upload TTL.                                                                                               |
| `R2_DOWNLOAD_URL_EXPIRES_SECONDS` | No       | staging, production | No     | Presigned download TTL for private/download flows. Defaults to `300`.                                               |

Every runtime R2 key is namespaced from `APP_ENV`: local/development/test uses
`l/`, staging uses `s/`, and production uses `p/`. The API refuses to read,
publish, or delete a key outside its own prefix. This lets staging and
production share one bucket without sharing objects. Do not include the prefix
in feature-level `scopeSegments`; the R2 adapter owns it.

ZAPI CRM WhatsApp inbound media is mirrored best-effort through the shared
object storage adapter. Successful mirrors store the public R2 URL on
`crm_messages.media_url` and persist provider URL, storage key, content
type, byte size, and mirror timestamp under `metadata.media`. Failed mirrors
keep the provider URL and set `metadata.media.mirrorStatus=failed`. The
downloader accepts only public HTTPS destinations, validates and pins DNS
resolution, revalidates every bounded redirect, enforces per-media byte limits,
and aborts slow requests after a hard timeout. URLs rejected by that safety
policy are not persisted as displayable media or thumbnail URLs.

Official Meta WhatsApp and Instagram inbound media is different: the webhook
stores an opaque provider media reference and leaves
`crm_messages.media_url` empty. It does not fetch or mirror a remote
provider URL. A future authenticated media-resolution flow must be designed and
verified before that reference can become displayable media.

## Credere Financing

Credere financing uses tenant-owned OAuth connections: agencies connect once
for affiliated stores, while direct owner-operated stores can connect their own
Credere account. Do not commit real client credentials or encryption keys.

| Name                                | Required     | Environments               | Secret | Notes                                                                                                                                                                                                   |
| ----------------------------------- | ------------ | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CREDERE_CLIENT_ID`                 | When enabled | staging, production        | Yes    | OAuth client id issued by Credere. All four core values must be configured together.                                                                                                                    |
| `CREDERE_ENVIRONMENT`               | When enabled | staging, production        | No     | Required explicit provider environment: `production` or `sandbox`. There is no implicit production default; partial or invalid configuration leaves Credere unavailable without preventing API startup. |
| `CREDERE_API_ROOT`                  | Sandbox only | local, staging             | No     | Explicit HTTPS API root required for sandbox. Production uses the allowlisted official Credere API root; an absent or invalid sandbox root disables the integration.                                    |
| `CREDERE_CLIENT_SECRET`             | When enabled | staging, production        | Yes    | OAuth client secret issued by Credere.                                                                                                                                                                  |
| `CREDERE_REDIRECT_URI`              | When enabled | staging, production        | No     | Public API OAuth callback URI registered with Credere.                                                                                                                                                  |
| `CREDERE_CREDENTIAL_ENCRYPTION_KEY` | When enabled | staging, production        | Yes    | Key material for persisted provider credentials.                                                                                                                                                        |
| `CREDERE_BANK_POLICY_CODES`         | No           | local, staging, production | No     | Optional comma-separated FEBRABAN allowlist. When unset, runtime uses all Credere active/okay banks for the mapped store.                                                                               |

Store simulation routes require the `simulations` entitlement and explicit
customer consent. Provider errors must be returned as stable JSON API errors
without raw provider payloads, tokens, CPF/CNPJ, email, or phone details.
When all Credere values are absent, the API remains healthy and these routes
return `CREDERE_FINANCING_UNAVAILABLE` without claiming an official provider
operation. A partial configuration fails closed during startup.

R2 browser uploads require a bucket-level CORS policy in addition to these
runtime variables. Use `docs/ops/r2-cors-lojaveiculosv2.json` for the
Cloudflare dashboard or `docs/ops/r2-cors-lojaveiculosv2-wrangler.json` for
Wrangler. The local policy includes Playwright and parallel-agent web ports;
if a new lane uses another port, add the exact `http://localhost:<port>` and
`http://127.0.0.1:<port>` origins.

## Integrations

| Name                                            | Required    | Environments               | Secret | Notes                                                                                                         |
| ----------------------------------------------- | ----------- | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `ASAAS_RUNTIME_IMPLEMENTATION`                  | Yes         | staging, production        | No     | Use `http` only when Asaas config is complete.                                                                |
| `ASAAS_API_URL`                                 | Yes         | staging, production        | No     | Asaas API base URL. Sandbox default is `https://api-sandbox.asaas.com/v3`.                                    |
| `ASAAS_API_KEY`                                 | Yes         | staging, production        | Yes    | Asaas API key.                                                                                                |
| `ASAAS_CHECKOUT_URL`                            | No          | local, staging             | No     | Optional hosted checkout base URL override. Sandbox default is inferred from `ASAAS_API_URL`.                 |
| `ASAAS_BILLING_SYNC_TYPE`                       | No          | local, staging             | No     | Billing sync smoke payment type. Defaults to `PIX`.                                                           |
| `ASAAS_BILLING_SYNC_NEXT_DUE_DATE`              | No          | local, staging             | No     | Optional `YYYY-MM-DD` due date for billing sync smoke.                                                        |
| `BILLING_SYNC_STORE_ID`                         | No          | local, staging             | No     | Optional store id override for the billing sync job.                                                          |
| `BILLING_SYNC_TENANT_ID`                        | No          | local, staging             | No     | Optional tenant id override for the billing sync job.                                                         |
| `ASAAS_WEBHOOK_SECRET`                          | Yes         | staging, production        | Yes    | Asaas webhook secret.                                                                                         |
| `ASAAS_WEBHOOK_URL`                             | Yes         | staging, production        | No     | Public URL for `POST /api/v1/billing/webhooks/asaas`.                                                         |
| `BILLING_PRODUCT_EVENT_SINK_URL`                | No          | staging, production        | No     | HTTPS analytics collector endpoint. When absent, durable events stay pending and the worker reports disabled. |
| `BILLING_PRODUCT_EVENT_SINK_TOKEN`              | Conditional | staging, production        | Yes    | Bearer token required whenever the product-event sink URL is configured.                                      |
| `BILLING_PRODUCT_EVENT_BATCH_SIZE`              | No          | staging, production        | No     | Events claimed per run; defaults to `50` and is capped at `100`.                                              |
| `BILLING_PRODUCT_EVENT_MAX_ATTEMPTS`            | No          | staging, production        | No     | Delivery attempt cap before a retained failed state; defaults to `10`.                                        |
| `BILLING_PRODUCT_EVENT_LEASE_DURATION_MS`       | No          | staging, production        | No     | Claim lease duration; defaults to `30000`.                                                                    |
| `BILLING_PRODUCT_EVENT_SINK_TIMEOUT_MS`         | No          | staging, production        | No     | Per-request sink timeout; defaults to `5000`.                                                                 |
| `BILLING_PRODUCT_EVENT_MAX_PENDING_AGE_SECONDS` | No          | staging, production        | No     | Alert threshold for the oldest pending event; defaults to `900`.                                              |
| `BILLING_PRODUCT_EVENT_REQUEUE_EVENT_ID`        | Operator    | local, staging, production | No     | Exact failed outbox event UUID for one explicit requeue command; wildcards are unsupported.                   |
| `BILLING_PRODUCT_EVENT_REQUEUE_TENANT_ID`       | Operator    | local, staging, production | No     | Exact tenant UUID used as the mandatory requeue scope.                                                        |
| `SPEDY_RUNTIME_IMPLEMENTATION`                  | Yes         | staging, production        | No     | Use `http` only when every SPEDY value is real; placeholders keep the gateway fail-closed.                    |
| `SPEDY_API_URL`                                 | Yes         | staging, production        | No     | SPEDY v1 API base URL, normally `https://api.spedy.com.br/v1/`.                                               |
| `SPEDY_OWNER_API_KEY`                           | Yes         | staging, production        | Yes    | Main key used only for company subaccounts, settings, certificates, and webhooks.                             |
| `FISCAL_CREDENTIAL_ENCRYPTION_KEY`              | Yes         | staging, production        | Yes    | Stable environment-specific 32-byte base64/hex key used to encrypt store subaccount keys.                     |
| `SPEDY_WEBHOOK_URL`                             | Yes         | staging, production        | Yes    | Public callback ending in an opaque token; webhook documents are re-fetched from Spedy.                       |
| `API_PLACA_KEY`                                 | No          | staging, production        | Yes    | APIBrasil bearer token for vehicle plate lookup.                                                              |
| `API_PLACA_BASE_URL`                            | No          | staging, production        | No     | Defaults to `https://gateway.apibrasil.io/api/v2`.                                                            |
| `API_PLACA_DADOS_PATH`                          | No          | staging, production        | No     | Defaults to `/vehicles/base/000/dados`.                                                                       |
| `API_PLACA_CACHE_TTL_DAYS`                      | No          | staging, production        | No     | Plate lookup reuse window. Defaults to `30`.                                                                  |
| `OPENROUTER_API_KEY`                            | No          | staging, production        | Yes    | OpenRouter API key for document suggestions and inventory resale analysis.                                    |
| `OPENROUTER_DEFAULT_MODEL`                      | No          | staging, production        | No     | Defaults AI tasks to the exact OpenRouter model slug `openai/gpt-5.4-mini`.                                   |
| `OPENROUTER_DOCUMENTS_MODEL`                    | No          | staging, production        | No     | Document-builder override. Use an exact OpenRouter slug; defaults to `OPENROUTER_DEFAULT_MODEL`.              |
| `OPENROUTER_INVENTORY_RESALE_MODEL`             | No          | staging, production        | No     | Inventory resale override. Use an exact OpenRouter slug; defaults to `OPENROUTER_DEFAULT_MODEL`.              |
| `MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY`         | Yes         | staging, production        | Yes    | Encrypts marketplace credentials.                                                                             |
| `MARKETPLACE_JOB_BATCH_SIZE`                    | No          | staging, production        | No     | Marketplace worker jobs per store run. Defaults to `25`.                                                      |
| `MARKETPLACE_JOB_SCOPE_LIMIT`                   | No          | staging, production        | No     | Marketplace store scopes discovered per worker run. Defaults to `100`.                                        |
| `MERCADO_LIVRE_CLIENT_ID`                       | Yes         | staging, production        | Yes    | Enables Mercado Livre OAuth and stock sync.                                                                   |
| `MERCADO_LIVRE_CLIENT_SECRET`                   | No          | staging, production        | Yes    | OAuth client secret when required by the provider app.                                                        |
| `MERCADO_LIVRE_AUTHORIZATION_URL`               | No          | staging, production        | No     | Defaults to `https://auth.mercadolivre.com.br/authorization`.                                                 |
| `MERCADO_LIVRE_API_BASE_URL`                    | No          | staging, production        | No     | Defaults to `https://api.mercadolibre.com`.                                                                   |
| `MERCADO_LIVRE_TOKEN_URL`                       | No          | staging, production        | No     | Defaults to `https://api.mercadolibre.com/oauth/token`.                                                       |
| `MERCADO_LIVRE_ACCOUNT_PATH`                    | No          | staging, production        | No     | Defaults to `/users/me`.                                                                                      |
| `OLX_CLIENT_ID`                                 | Yes         | staging, production        | Yes    | Required with the OLX client secret to enable OLX stock sync.                                                 |
| `OLX_CLIENT_SECRET`                             | Yes         | staging, production        | Yes    | Required OLX OAuth client secret.                                                                             |
| `HEDRA_API_KEY`                                 | No          | staging, production        | Yes    | Hedra API key for Inventory Estudio Digital IA.                                                               |
| `HEDRA_API_BASE_URL`                            | No          | staging, production        | No     | Defaults to `https://api.hedra.com`; override if Hedra provides another endpoint.                             |
| `HEDRA_ASSET_PATH`                              | No          | staging, production        | No     | Source image asset create/list path. Defaults to `/web-app/public/assets`.                                    |
| `HEDRA_ASSET_UPLOAD_PATH`                       | No          | staging, production        | No     | Source image asset upload path with `{id}`. Defaults to `/web-app/public/assets/{id}/upload`.                 |
| `HEDRA_IMAGE_TO_IMAGE_PATH`                     | No          | staging, production        | No     | Image-to-image generation path. Defaults to `/web-app/public/generations`.                                    |
| `HEDRA_GENERATION_STATUS_PATH`                  | No          | staging, production        | No     | Polling path with `{id}`. Defaults to `/web-app/public/generations/{id}/status`.                              |
| `HEDRA_AUTH_HEADER`                             | No          | staging, production        | No     | Defaults to `X-API-Key`.                                                                                      |
| `HEDRA_AUTH_SCHEME`                             | No          | staging, production        | No     | Optional auth scheme; blank for `X-API-Key`.                                                                  |
| `HEDRA_FLUX_2_PRO_MODEL_ID`                     | No          | staging, production        | No     | Hedra model id mapped from the internal `flux_2_pro` image-to-image model.                                    |
| `HEDRA_POLL_INTERVAL_MS`                        | No          | staging, production        | No     | Async Hedra polling interval. Defaults to `1500`.                                                             |
| `HEDRA_POLL_MAX_ATTEMPTS`                       | No          | staging, production        | No     | Async Hedra polling attempts. Defaults to `120`.                                                              |
| `HEDRA_REQUEST_TIMEOUT_MS`                      | No          | staging, production        | No     | Per-request timeout for Hedra create/status/download HTTP calls. Defaults to `60000`.                         |
| `HTTP_REQUEST_TIMEOUT_MS`                       | No          | staging, production        | No     | Node HTTP server inbound timeout. Defaults to `240000`; external gateways can enforce less.                   |

OLX provider URLs, Autoupload path, basic-user account check, and requested
OAuth scopes are fixed server contracts. The deployed callback is derived from
`PUBLIC_APP_URL` at `/api/v1/marketplaces/oauth/olx/callback`; use
`https://staging.lojaveiculos.com.br` in staging and
`https://v2.lojaveiculos.com.br` in production. The production web server
proxies `/api/v1/*` to the server-owned `VITE_API_BASE_URL` API origin.
OLX Chat and lead webhooks are server callbacks and are registered directly
against the server-owned `API_BASE_URL`; they do not pass through the web SPA
or its API proxy.

Local and test runtimes derive the same canonical callback from the local
`PUBLIC_APP_URL`, normally
`http://localhost:5173/api/v1/marketplaces/oauth/olx/callback`, only for mocked
provider tests. HTTP is accepted only for a loopback local/test origin. OLX has
no sandbox and localhost is not registered, so live OAuth validation must use
the registered staging or V2 production callback.

OpenRouter requests are external processing. Current adapters set
`provider.data_collection` to `deny`, so routing is limited to provider
endpoints that OpenRouter identifies as not collecting request data.

V1 migration commands require `FISCAL_CREDENTIAL_ENCRYPTION_KEY` to be
explicitly exported. They never inherit it from the repository `.env`, which
prevents a remote database target from being combined with a local encryption
key.

## Vehicle Catalog Sync

| Name                                   | Required | Environments               | Secret | Notes                                                                                                                    |
| -------------------------------------- | -------- | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `FIPE_API_BASE_URL`                    | No       | local, staging, production | No     | FIPE-compatible API base URL. Defaults to Parallelum FIPE v2.                                                            |
| `FIPE_API_TOKEN`                       | No       | staging, production        | Yes    | Optional FIPE subscription token, sent as `X-Subscription-Token`.                                                        |
| `FIPE_CATALOG_SYNC_VEHICLE_TYPES`      | No       | local, staging, production | No     | Comma-separated `cars`, `motorcycles`, `trucks`. Defaults to `cars`.                                                     |
| `FIPE_CATALOG_SYNC_CONCURRENCY`        | No       | local, staging, production | No     | Brand worker count, capped by service logic. Defaults to `1`.                                                            |
| `FIPE_CATALOG_SYNC_BRAND_CODES`        | No       | local, staging, production | No     | Optional comma-separated FIPE brand codes for targeted raw-data refreshes.                                               |
| `FIPE_CATALOG_SYNC_BRAND_LIMIT`        | No       | local                      | No     | Optional local/testing limit for brands per run.                                                                         |
| `FIPE_CATALOG_SYNC_HTTP_MAX_ATTEMPTS`  | No       | local, staging, production | No     | HTTP attempts for retryable FIPE responses. Defaults to `5`.                                                             |
| `FIPE_CATALOG_SYNC_INCLUDE_YEARS`      | No       | local, staging, production | No     | Set `false` to refresh only brands, model families, and versions before year backfill.                                   |
| `FIPE_CATALOG_SYNC_HTTP_TIMEOUT_MS`    | No       | local, staging, production | No     | Per-request FIPE HTTP timeout in milliseconds. Defaults to `30000`.                                                      |
| `FIPE_CATALOG_SYNC_HTTP_RETRY_BASE_MS` | No       | local, staging, production | No     | Exponential retry base delay in milliseconds. Defaults to `1000`.                                                        |
| `FIPE_CATALOG_SYNC_REFERENCE_CODE`     | No       | local, staging, production | No     | Optional FIPE reference month code. Defaults to the latest code returned by `/references`.                               |
| `FIPE_CATALOG_SYNC_REFRESH_AFTER_DAYS` | No       | local, staging, production | No     | Refresh existing version years after this age. Defaults to `30`; `0` only fills missing rows.                            |
| `FIPE_CATALOG_SYNC_REFRESH_EXISTING`   | No       | local, staging, production | No     | Set `true` to force a full refresh of existing version-year lookups.                                                     |
| `FIPE_CATALOG_NORMALIZE_DRY_RUN`       | No       | local, staging, production | No     | Dry-run flag for the vehicle catalog name-normalization job.                                                             |
| `FIPE_CSV_PATH`                        | No       | local                      | No     | Optional path to the FIPE table CSV for the `catalog:import-csv` job. Defaults to repository-root `tabela-fipe-335.csv`. |

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
shared variables. The API references `${{ shared.KEY }}`, the web receives
`VITE_API_BASE_URL` from the API service's `API_BASE_URL` reference and reads
`VITE_CLERK_PUBLISHABLE_KEY` from shared variables, and the CRM schedule worker
references the corresponding API variables. This keeps one editable staging
value for the API public URL while still giving the worker the complete API
runtime contract.

Unknown staging values use conspicuous `keepme_*` placeholders in Railway, not
in source. Replace core Clerk, R2, marketplace-encryption, and CRM values before
the first manual upload. Provider implementation selectors must remain
fail-closed until their entire credential and endpoint set is real; only then
set `ASAAS_RUNTIME_IMPLEMENTATION=http` or
`SPEDY_RUNTIME_IMPLEMENTATION=http`.

### External CRM bot manager (disabled unless complete)

- `CRM_EXTERNAL_BOT_MODEL_VERSION`: server-approved model release bound to
  grants and model-version kill switches.
- `CRM_EXTERNAL_BOT_EVENT_SIGNING_KEY`: separate HMAC key used only by the
  durable CRM-to-bot event dispatcher. Signatures cover timestamp, nonce and
  SHA-256 body digest; receivers must enforce the replay window and consume a
  nonce once.
- `CRM_EXTERNAL_BOT_EVENT_URL`: HTTPS receiver used by the separately deployed
  `crm:bot:events:process` durable outbox worker.

Partial configuration does not enable bot actions. The runtime uses the
canonical database grant/command/proposal/outbox records; missing relations fail
closed rather than falling back to the legacy webhook dispatcher.
Inbound bearer hashes are stored per scoped integration account in
`externalBotApiBearerHash`; plaintext bearer values and global tenant/store
bindings are not runtime variables.
