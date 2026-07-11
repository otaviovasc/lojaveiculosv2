# V1 To V2 Basic Migration Runbook

This is the short operational guide for moving Loja Veiculos from V1 to V2.
The deeper data and domain policy remains in `docs/migration.md`.

## Current Routing Stance

- Keep `cdn.lojaveiculos.com.br` serving the current V1 bucket until V2 cutover
  is complete.
- Use `assets-v2.lojaveiculos.com.br` for new V2 R2 uploads.
- Keep V1 as the production source of truth until a tenant/store migration wave
  has passed rehearsal, parity checks, smoke tests, and rollback review.

## R2 Setup

V2 expects the API service to receive these variables:

```text
R2_BUCKET_NAME=lojaveiculosv2
R2_ENDPOINT=https://<cloudflare-account-id>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://assets-v2.lojaveiculos.com.br
R2_REGION=auto
R2_UPLOAD_URL_EXPIRES_SECONDS=900
R2_ACCESS_KEY_ID=<secret>
R2_SECRET_ACCESS_KEY=<secret>
```

`R2_ENDPOINT` is used for signed S3-compatible uploads. `R2_PUBLIC_BASE_URL`
is the public URL stored on media records.

Configure R2 CORS before testing uploads from the web app. Browser uploads use
presigned `PUT` requests and will fail preflight without CORS.

Use the project-owned policies:

- `docs/ops/r2-cors-lojaveiculosv2.json` for the Cloudflare dashboard JSON tab.
- `docs/ops/r2-cors-lojaveiculosv2-wrangler.json` for
  `wrangler r2 bucket cors set`.

The policies include deployed V2 origins plus local Playwright and parallel
agent ports used by the QA workflow. See `docs/ops/r2-cors.md` for application
and verification steps. Add any new agent port as an exact origin before using
browser uploads from that port.

Keep the bucket public only if sensitive document and finance uploads are not
enabled for production. The current storage adapter is shared by vehicle media,
generated documents, and finance attachments, so the production-safe target is
separate public/private storage or a gated media delivery layer.

## Deployment Domains

Use parallel V2 domains first:

- `app-v2.lojaveiculos.com.br` -> V2 web service
- `api-v2.lojaveiculos.com.br` -> V2 API service
- `assets-v2.lojaveiculos.com.br` -> V2 R2 bucket

Later cut over final domains only after V2 is accepted:

- `lojaveiculos.com.br` and `www.lojaveiculos.com.br` -> V2 public/app routing
- `api.lojaveiculos.com.br` -> V2 API
- storefront wildcard routing -> V2 web/API storefront resolution

For Railway custom domains, add the CNAME and TXT verification records. For
wildcards, also add the ACME challenge record and keep the challenge record
unproxied when required.

## Data Migration Basics

1. Rehearse against a recent local or sanitized V1 backup.
2. Create deterministic legacy id maps for every migrated table.
3. Start with a small pilot store, then a multi-user store, then an agency.
4. Keep legacy media URLs as-is during the first import when practical.
5. Send all new V2 uploads to `assets-v2.lojaveiculos.com.br`.
6. Copy old bucket objects into V2 later and rewrite media URLs in a controlled
   background migration.
7. Run parity checks for stores, users, permissions, inventory, leads,
   documents, billing, integrations, and audit events.

### Legacy storefront banners

Rehearse banner copies with a local V2 product database and the target R2
credentials. The command is a dry run unless `--apply` is present:

```bash
pnpm run r2:migrate:legacy-banners -- \
  --tenant-id <v2-tenant-id> \
  --store-id <v2-store-id> \
  --store-slug <v1-store-slug>
```

The default source set includes the shared V1 `banners/` library. Supplying
`--store-slug` also includes that store's `tenant-banners/<slug>/` objects. Use
`--source-prefix <prefix[,prefix...]>` to override both defaults. Review the
reported object and asset counts, then repeat the same command with `--apply`.
The apply pass copies objects into the V2 tenant/store prefix and upserts local
`storefront_media_assets` rows; it refuses non-local `DATABASE_URL` values.

## Cutover Flow

1. Deploy V2 to staging and run `pnpm run validate` plus smoke checks.
2. Deploy V2 to production on parallel domains.
3. Rehearse the selected store wave using the same code and schema.
4. Announce the write freeze or maintenance window if one is needed.
5. Run the migration wave.
6. Run parity checks and critical user journey smoke tests.
7. Point the selected production traffic to V2.
8. Monitor API logs, HTTP error rate, Sentry, uploads, auth, storefront, and
   billing/fiscal readiness.
9. Keep V1 rollback available until the wave acceptance deadline passes.

## Rollback Rules

- If DNS was switched, point traffic back to V1.
- If only app deployment failed, redeploy the previous healthy V2 deployment.
- If migrated data is suspect, keep V1 as source of truth and discard/rebuild
  the V2 wave from the rehearsed migration inputs.
- Do not run destructive production rollback migrations without an explicit
  operator decision.

## Do Not

- Do not repoint `cdn.lojaveiculos.com.br` to the V2 bucket before V1 media
  dependencies are understood.
- Do not run migration scripts directly against production from an agent
  session.
- Do not expose private documents or finance attachments through a public bucket
  as the long-term production design.
- Do not cut over all stores at once before pilot wave acceptance.
