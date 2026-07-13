# Production Readiness

This document tracks the runtime work needed to run V2 in production after code
deployment. Technical deployment readiness does not imply commercial launch or
active-customer cutover readiness.

## Commercial Launch Blockers

Before broad customer onboarding or any V1 shutdown:

- Rehearse and accept at least three representative V1 store migrations with
  rerunnable importers, parity evidence, and rollback.
- Fix server-owned price-book versioning, CRM packaging, trial expiry,
  subscription-to-entitlement reconciliation, quotas, dunning, and cancellation
  reasons.
- Add minimal SaaS product events, activation milestones, account health, and
  cohort retention reporting.
- Split private documents/finance artifacts from public media storage and move
  CRM/provider secrets behind an encrypted credential boundary.
- Add a reviewed production schema-migration path, backup/restore evidence, and
  real dependency readiness checks.
- Integrate an independent authorized RENAVE provider before displaying or
  claiming official RENAVE success.
- Verify SPEDY's typed NF-e contract for the required 2026 IBS/CBS fields and
  reconcile fiscal and RENAVE vehicle movements.
- Replace long synchronous provider work with durable idempotent execution where
  the workflow can outlive one HTTP request.

The complete business and scale gate is documented in
`docs/strategy/product-operating-model.md`.

## Current Readiness

- `pnpm run validate` is the required local gate before handoff.
- API runtime uses DB-backed adapters when `DATABASE_URL` is configured.
- Audit uses a separate DB when `AUDIT_DATABASE_URL` is configured.
- Inventory, storefront, CRM, finance, documents, billing, settings, identity,
  external API, marketplace, analytics, fiscal, compliance, and internal health
  routes are mounted under `apps/api/src/infrastructure/http/createApp.ts`.
- Web modules exist for the production-critical workflows. Non-critical modules
  may remain as placeholders.

## Web Bundle Regression Gate

`pnpm run check:web-bundle` validates policy and wiring only. It deliberately
does not inspect `apps/web/dist`, because commit and push guardrails must not
pass or fail based on artifacts left by an older build. `pnpm run
build:deployables` instead performs these steps in order:

1. run the typed Vite production build with `emptyOutDir: true`;
2. emit `.vite/manifest.json` with automatic Rolldown code splitting enabled;
3. verify the fresh web artifacts against byte budgets;
4. build the API deployable.

The budgets are raw, minified artifact bytes rather than gzip estimates. Vite
compares its chunk warning with uncompressed JavaScript because that size also
tracks browser execution cost. The current measured production baseline and
reviewed ceilings are:

| Artifact class                    |        Measured |         Ceiling |
| --------------------------------- | --------------: | --------------: |
| Largest ordinary JavaScript chunk |   565,634 bytes |   580,000 bytes |
| Largest stylesheet                |   628,100 bytes |   645,000 bytes |
| PDF.js worker                     | 1,046,214 bytes | 1,075,000 bytes |

The worker has a narrow hashed-filename exception and its own ceiling. Public
images, fonts, SVGs, and downloadable PDFs are an explicit non-code allowlist;
unknown extensions and unreviewed executable workers fail verification. Any
budget increase requires a fresh measured build plus an intentional policy,
rule-test, and documentation review. Keep automatic code splitting unless a
measured optimization justifies a reviewed `output.codeSplitting` policy;
Rolldown warns that manual grouping can change execution order.

References: [Vite build options](https://vite.dev/config/build-options.html),
[Vite production chunking](https://vite.dev/guide/build#chunking-strategy), and
[Rolldown code splitting](https://rolldown.rs/reference/OutputOptions.codeSplitting).

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
- `CLERK_AUTHORIZED_PARTIES`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SIGN_IN_URL`
- `CLERK_SIGN_UP_URL`
- `CLERK_AFTER_SIGN_IN_URL`
- `CLERK_AFTER_SIGN_UP_URL`
- `CLERK_INVITATION_REDIRECT_URL`

Optional auth hardening and future webhook support:

- `CLERK_JWT_KEY` for networkless JWT verification.
- `CLERK_AUDIENCE` only after Clerk tokens include the matching `aud` claim.
- `CLERK_WEBHOOK_SECRET` when a Clerk webhook endpoint is mounted.

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
- `ASAAS_CHECKOUT_URL` when the checkout host cannot be inferred from
  `ASAAS_API_URL`
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
pnpm run test:smoke:api
pnpm run validate
```

## Railway Deployment Checklist

1. Create or link the Railway project and production environment.
2. Provision product Postgres and audit Postgres.
3. Configure product API service variables from `.env.example`.
4. Configure web service variables from `.env.example`.
5. Configure R2 values after bucket creation.
6. Configure Clerk production keys, authorized parties, invitation redirect URL,
   and Portuguese invitation/auth templates.
7. Configure Asaas and SPEDY values manually.
8. Configure public domains and storefront DNS.
9. Deploy API and web.
10. Run health checks, provider status checks, and the critical smoke suite.

Do not mutate production databases, service variables, domains, or deployment
state from an agent session unless the operator explicitly asks for that
specific mutation.
