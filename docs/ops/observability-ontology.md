# Observability Ontology

This is the source of truth for server and deploy observability in Loja
Veiculos V2. Logs answer “what happened in the running process?” Audit events
answer “what operation was attempted against the business system?” Both must
share the same identifiers so an operator or AI agent can follow one failure
across HTTP, service code, providers, and the audit database.

## Canonical record types

| Record      | Schema                            | Producer                            | Primary use                                                                |
| ----------- | --------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| HTTP log    | `loja.http_log.v1`                | HTTP middleware/error boundary      | Request lifecycle, status, latency, returned error code                    |
| Service log | `loja.service_log.v1`             | `ServiceLogger` and job entrypoints | Operational steps, diagnostics, provider results, deployment/runtime state |
| Audit event | Audit contract `schemaVersion: 1` | `context.audit.record(...)`         | Business action, actor, scope, outcome, compliance trail                   |

`event` is the stable name of a log record. `action` is the stable name of an
audited business operation. Names use dot-separated lowercase nouns and verbs,
for example `request.failed`, `billing.webhook.asaas.processed`, and
`vehicle.create`.

Every log line includes an ISO `timestamp`; persisted audit events use
`occurredAt`. Log ingestion time must not replace the event time.

## Shared identity and causality

| Field                     | Meaning                                       | Invariant                                                                       |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `requestId`               | One inbound HTTP, worker, or provider request | Always present on HTTP logs and audit events                                    |
| `correlationId`           | The complete investigation/workflow trace     | Preserve inbound value; otherwise use the request id                            |
| `causationId`             | The event/request that caused this operation  | Use when a retry, webhook, job, or asynchronous action has a parent             |
| `providerEventId`         | Provider-owned event identifier               | Use for webhook/idempotency investigations; never substitute a local request id |
| `entityType` + `entityId` | Business object affected                      | Use the canonical domain entity name and stable identifier                      |

`requestId` identifies one attempt. `correlationId` links attempts and
downstream work. A retry must get a new `requestId` while retaining the same
`correlationId` and setting `causationId` when known.

## Scope, actor, and deployment dimensions

Every service/audit record should carry these dimensions when known:

- `tenantId`, `storeId`: authorization and data-isolation scope. They may be
  null for public or tenant-only operations; an event may still identify a
  target store.
- `actorId`, `actorKind`, `actorExternalId`: who or what initiated the action.
- `service`, `component`, `environment`, `region`, `version`: where the action
  ran. The API runtime uses `service=api`.
- `providerName`, `providerEventId`: external system identity.

`createServiceContext` is the canonical source for context enrichment. HTTP
context creation and worker entrypoints must use it. A service must not accept
caller-supplied actor/request/scope values over the context values; business
target identifiers may remain in the event when the context is intentionally
public- or tenant-scoped.

## Operation meaning

Audit events use:

- `category`: `authentication`, `authorization`, `data_access`, `data_change`,
  `integration`, or `system`.
- `outcome`: `attempted`, `succeeded`, `failed`, or `denied`.
- `severity`: `debug`, `info`, `warning`, `error`, or `critical`.
- `criticality`: business impact (`low`, `medium`, `high`, `critical`).
- `failureTier`: audit durability requirement (`best_effort`, `important`,
  `required`).
- `metadata`: safe, structured diagnostics only. Never put secrets, tokens,
  raw provider payloads, message bodies, or unnecessary personal data here.

HTTP/service logs use `level` (`info`, `warn`, `error`) for operational
severity. A failed HTTP request should include `code`, `errorName`, and a
sanitized path; an internal error may include a stack in server logs.

## AI debugging workflow

An agent debugging a production issue should use this sequence:

1. Start with the HTTP log and capture `requestId`, `correlationId`, `code`,
   `status`, and `tookMs`.
2. For a platform incident, query `GET /api/v1/internal/platform/health` with
   `correlationId` or `requestId` and the smallest useful `limit`. For a store
   investigation, use `GET /api/v1/internal/health`. Narrow further with
   `entityId`, `action`, `actorId`, `providerName`, `outcome`, `severity`,
   `criticality`, or a time range.
3. Read each returned event’s `metadata`, `requestContext`, `source`, summary,
   provider identifiers, and outcome. These fields are deliberately returned
   by the internal monitoring projection for diagnosis.
4. Compare the sequence of attempted, failed, denied, and succeeded actions.
   A provider event id links webhook/provider records; a correlation id links
   the broader workflow.
5. Check `failures` and `sinkMetrics` for audit persistence failures before
   concluding that no business event occurred.

Both endpoints require `audit.read`; the platform endpoint additionally
requires a platform administrator context. The web console at
`/platform/observability` is the operator home for this workflow: it runs the
platform query, displays health and event context, and copies a bounded
AI-debug bundle. This is an investigation projection, not a replacement for
the audit database. The audit database remains the durable source of truth;
logs are the low-latency operational projection.

## Local console

The local seed includes the platform administrator `clerk_platform_admin`.
Start the databases and seed them, then run the API and web processes with that
identity in separate terminals:

```bash
pnpm run db:up
pnpm run db:push:local
pnpm run db:seed:local
```

```bash
APP_ENV=local LOCAL_AUTH_BYPASS=true DEV_CLERK_USER_ID=clerk_platform_admin DATABASE_URL=postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2 AUDIT_DATABASE_URL=postgresql://lojaveiculosv2_audit:lojaveiculosv2_audit_dev@localhost:54322/lojaveiculosv2_audit pnpm run dev:api
```

```bash
VITE_LOCAL_AUTH_BYPASS=true VITE_DEV_CLERK_USER_ID=clerk_platform_admin pnpm --filter @lojaveiculosv2/web exec vite --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174/platform/observability`. Vite proxies `/api` to
the local API on port `8787`. The standard `dev:all:local` shortcut uses the
store-owner fixture, so use the platform identity override above when opening
this console.

## Repository rules

- Emit application logs through `ServiceLogger`; HTTP/error-boundary emitters
  may write directly to the process console only when they emit one of the
  canonical versioned schemas. Do not add free-form console lines in server or
  worker code.
- Emit business/audit operations through `ServiceContext.audit`; do not create
  parallel audit shapes in feature code.
- Preserve the canonical field names and schemas when adding providers,
  workers, or deploy hooks.
- Add an action/event name and its entity, outcome, and failure behavior when
  introducing a new operational workflow.
