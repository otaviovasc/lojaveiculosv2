# Billing observability

Run both billing jobs on recurring Railway schedules after migrations:

```bash
pnpm --filter @lojaveiculosv2/api billing:asaas:reconcile
pnpm --filter @lojaveiculosv2/api billing:product-events:process
```

Both jobs run every five minutes as short-lived Railway cron services with
restart policy `NEVER`. The product-event worker owns only product Postgres and
its sink settings. Keep `BILLING_PRODUCT_EVENT_SINK_URL` and
`BILLING_PRODUCT_EVENT_SINK_TOKEN` as sealed service variables; never replace
them with literals in `.railway/railway.ts`.

The reconciliation job emits `metric.billing.lifecycle` with pending and oldest
reconciliation age, unmatched webhook count, activation/projection failures,
missing contracts, reconciliation-failed hires, and 24-hour grace/fallback
counts. `alert.billing_reconciliation.attention_required` is actionable and
must page the billing owner when its numeric fields are non-zero or the oldest
pending event is over 15 minutes.

The product-event worker uses bounded `FOR UPDATE SKIP LOCKED` claims and lease
tokens. Delivery is at least once; the configured HTTP receiver must honor the
`Idempotency-Key` header. Retryable HTTP/network failures use capped exponential
backoff. Permanent failures and exhausted retries remain in the outbox as
`failed`; rows are never deleted by the worker.

When `BILLING_PRODUCT_EVENT_SINK_URL` is absent, the job emits
`billing.product_event.worker_disabled`, reports the durable backlog, and does
not claim or mark events as processed. It still emits backlog alerts when age
or failed-row thresholds are exceeded. This is a degraded configuration, not a
successful delivery.

The URL must be the HTTPS ingestion endpoint of a real analytics collector and
the token must be a bearer credential issued by that collector. Do not invent
either value or point the worker back to the Loja Veiculos API unless a reviewed
ingestion endpoint exists. Staging may intentionally leave both variables
absent while validating the Asaas lifecycle; the durable backlog is expected in
that mode and does not invalidate the payment-state test. Production readiness
still requires a selected collector, successful idempotent delivery, and an
empty healthy backlog.

## Requeue one terminal failure

Inspect sanitized logs and the outbox status first. Only a terminal `failed`
row can start a new delivery cycle. Supply the exact event and tenant UUIDs,
then run:

```bash
BILLING_PRODUCT_EVENT_REQUEUE_EVENT_ID=<event-uuid> \
BILLING_PRODUCT_EVENT_REQUEUE_TENANT_ID=<tenant-uuid> \
pnpm --filter @lojaveiculosv2/api billing:product-events:requeue
```

The command requires both product and audit database connections, enforces the
tenant scope, records a high-criticality audit event, increments
`requeue_count`, and resets only the per-cycle attempt count. Repeating the
command after a successful requeue returns `already_pending` without creating a
second delivery cycle. Processed events are never requeued. There is no bulk or
wildcard mode.

Alert on:

- `alert.billing_product_event.delivery_attention_required`;
- `alert.billing_reconciliation.attention_required`;
- `oldestPendingAgeSeconds > 900` or
  `oldestPendingReconciliationAgeSeconds > 900`;
- any `failedCount`, `activationOrProjectionFailureCount`,
  `missingContractCount`, or `reconciliationFailedHireCount` above zero.

Logs contain only operational identifiers and bounded failure codes. Do not add
event properties, provider response bodies, tokens, or customer data to them.
