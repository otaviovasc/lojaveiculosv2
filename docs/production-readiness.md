# Production Readiness

This document tracks the runtime work needed to run V2 in production after code
deployment. Historical V1 migration execution is intentionally deferred.

## Current Readiness

- `npm run validate` is the required local gate before handoff.
- API runtime uses DB-backed adapters when `DATABASE_URL` is configured.
- Audit uses a separate DB when `AUDIT_DATABASE_URL` is configured.
- Inventory, storefront, CRM, finance, documents, billing, settings, identity,
  external API, marketplace, analytics, fiscal, compliance, and internal health
  routes are mounted under `apps/api/src/infrastructure/http/createApp.ts`.
- Web modules exist for the production-critical workflows. Non-critical modules
  may remain as placeholders.

## Required Production Variables

Core runtime:

- `NODE_ENV=production`
- `APP_ENV=production`
- `PORT`
- `PUBLIC_APP_URL`
- `API_BASE_URL`
- `DATABASE_URL`
- `AUDIT_DATABASE_URL`
- `DB_POOL_MAX`

Authentication:

- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `CLERK_AUDIENCE`
- `CLERK_AUTHORIZED_PARTIES`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `CLERK_SIGN_IN_URL`
- `CLERK_SIGN_UP_URL`
- `CLERK_AFTER_SIGN_IN_URL`
- `CLERK_AFTER_SIGN_UP_URL`

Object storage:

- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`
- `R2_REGION`
- `R2_UPLOAD_URL_EXPIRES_SECONDS`

Billing:

- `ASAAS_RUNTIME_IMPLEMENTATION=http`
- `ASAAS_API_URL`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_SECRET`
- `ASAAS_WEBHOOK_URL`

Fiscal:

- `SPEDY_RUNTIME_IMPLEMENTATION=http`
- `SPEDY_API_URL`
- `SPEDY_API_TOKEN`
- `SPEDY_AUTH_HEADER`
- `SPEDY_AUTH_SCHEME`
- `SPEDY_WEBHOOK_SECRET`
- `SPEDY_ISSUE_PATH`
- `SPEDY_CANCEL_PATH`
- `SPEDY_STATUS_PATH`
- `SPEDY_WEBHOOK_URL`

Public routing:

- `APP_PRIMARY_DOMAIN`
- `API_PRIMARY_DOMAIN`
- `PUBLIC_STOREFRONT_ROOT_DOMAIN`
- `PUBLIC_STOREFRONT_CUSTOM_DOMAIN_CNAME_TARGET`

Marketplace/runtime integrations:

- `MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY`
- `MERCADO_LIVRE_CLIENT_ID`
- `MERCADO_LIVRE_CLIENT_SECRET`
- `MERCADO_LIVRE_AUTHORIZATION_URL`
- `MERCADO_LIVRE_API_BASE_URL`
- `MERCADO_LIVRE_TOKEN_URL`
- `MERCADO_LIVRE_WEBHOOK_URL`
- `OLX_CLIENT_ID`
- `OLX_CLIENT_SECRET`
- `OLX_AUTHORIZATION_URL`
- `OLX_API_BASE_URL`
- `OLX_TOKEN_URL`
- `OLX_LISTINGS_PATH`
- `OLX_WEBHOOK_URL`

Observability:

- `LOG_LEVEL`
- `EXTERNAL_API_RATE_LIMIT_PER_MINUTE`
- `OTEL_EXPORTER_OTLP_ENDPOINT`

## Provider Runtime Rules

Asaas:

- The billing runtime now reports provider readiness through the production
  Asaas gateway.
- The current billing domain exposes readiness and entitlement state, not
  payment creation/capture. Do not present payment mutation as production-ready
  until a billing service entrypoint exists for it.

SPEDY:

- Set `SPEDY_RUNTIME_IMPLEMENTATION=http` only after the provider contract is
  confirmed.
- `SPEDY_ISSUE_PATH`, `SPEDY_CANCEL_PATH`, and `SPEDY_STATUS_PATH` are
  configurable. Use `{providerDocumentId}` in cancel/status paths when the
  provider requires the document id in the URL.
- Fiscal issue/cancel/status-sync fail with `503` if the HTTP gateway is
  enabled but incomplete.

## Production Smoke Checks

The API smoke suite covers:

- Billing provider readiness from production env configuration.
- Fiscal issue requests failing closed when SPEDY HTTP runtime is incomplete.
- Inventory reserve and sell route wiring.
- Public storefront lead capture through CRM and audit.

Run:

```bash
npm run test --workspace @lojaveiculosv2/api -- productionSmoke
npm run validate
```

## Railway Deployment Checklist

1. Create or link the Railway project and production environment.
2. Provision product Postgres and audit Postgres.
3. Configure product API service variables from `.env.example`.
4. Configure web service variables from `.env.example`.
5. Configure R2 values after bucket creation.
6. Configure Clerk production keys and authorized parties.
7. Configure Asaas and SPEDY values manually.
8. Configure public domains and storefront DNS.
9. Deploy API and web.
10. Run health checks, provider status checks, and the critical smoke suite.

Do not mutate production databases, service variables, domains, or deployment
state from an agent session unless the operator explicitly asks for that
specific mutation.
