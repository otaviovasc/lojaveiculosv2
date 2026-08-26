# Billing Business Rules

This document is the source of truth for Loja Veiculos V2 packaging, contracts,
provider activation, and billing-derived access.

## Catalog

The immutable current catalog is `2026-08-v3`. Catalog v2 remains registered
only so historical rows can be interpreted; it must never become active again.
All prices are monthly BRL cents and come from the server-owned catalog.

| Plan      | Monthly cents | Vehicles |  Users | Plate lookups |
| --------- | ------------: | -------: | -----: | ------------: |
| Free      |             0 |       10 |      1 |             3 |
| Essencial |        19,700 |       75 |      3 |            25 |
| Operação  |        39,700 |      150 |      5 |            75 |
| Gestão    |        59,700 |      300 |     10 |           150 |
| Escala    |   from 89,700 |   quoted | quoted |        quoted |

Plans are cumulative:

- Free: storefront builder on the Loja subdomain, inventory control, public
  interest capture, and the basic inbox.
- Essencial: Free plus custom domain, reservations/sales, customers, internal
  financing, and a connected financing provider only when readiness is
  verified.
- Operação: Essencial plus full CRM, official channels, store-owned Z-API
  credentials, and the standalone document workspace/templates.
- Gestão: Operação plus fiscal, finance, commissions, analytics, compliance,
  checklists, and finance auto-entry rules.
- Escala: Gestão plus marketplaces, Public API/webhooks, advanced automation,
  AI Studio, and resale-analysis AI.

Catalog v3 has no active add-ons and no browser-calculated annual discount.
Future add-ons may represent explicit usage packs or professional services, not
features already included in a plan. Standard sale documents remain part of
`sales`; `documents` unlocks the standalone document center.

## Effective Access

Free is a permanent, active, open-ended contract. Every new store is created
atomically with its Free `subscription_items` plan row and entitlement
projection. There is no trial creation, trial projection, or trial expiry in
new-account flows.

`subscription_items` contains effective or scheduled contracts only. A paid
plan choice is recorded in `billing_plan_hires` and cannot change current
access before verified payment. At most one open hire and one effective plan
window may exist per store.

Billing controls entitlements; roles control permissions. A feature action
requires both. Billing and settings remain available to actors with
`billing.manage` while the store is on Free. An inconsistent paid contract
falls back to Free capability and quota behavior until reconciliation repairs
it; customers never receive an internal missing-contract error.

Canonical entitlements are `storefront`, `inventory`, `lead_capture`,
`sales`, `financing`, `documents`, `finance`, `commissions`,
`checklists`, `ai`, `crm`, `fiscal`, `analytics`, `compliance`,
`marketplace`, `external_api`, `automation`, `custom_domain`, and
`plate_lookup`.

Quota windows are server-owned and use the UTC calendar month (`YYYY-MM`),
not the date on which a store was created or a subscription was paid. Plate
lookup usage therefore resets at `00:00 UTC` on the first day of each month.
The vehicle and user quotas are current admission limits. A vehicle creation
or user invitation is rejected when it would exceed the effective plan quota;
an existing user is never deactivated merely because a paid plan is
downgraded. Downgrade handling must preserve existing users and only block
additional invitations until the membership count is within the new limit.

## Plan Hiring

Store managers use:

- `POST /api/v1/billing/plan-hires`;
- `GET /api/v1/billing/plan-hires/:hireId`;
- `POST /api/v1/billing/plan-quotes` for Escala.

Agency routes mirror these operations under the selected tenant/store. Only an
approved, unexpired, versioned quote can create an Escala hire.

Every hire stores the tenant/store, immutable catalog version and plan
snapshot, quoted cents, idempotency key, checkout mode, provider correlation
IDs, status, failure code, and append-only transitions. Relevant phases are
`free_active`, `checkout_created`, `payment_pending`,
`activation_pending`, `paid_active`, `past_due_grace`,
`downgrade_scheduled`, and `reconciliation_failed`.

Paid-to-paid changes and voluntary downgrades are renewal-boundary operations
without proration. An existing paid contract remains effective until its
scheduled end. Customer data is never deleted by a plan change.

## Asaas Evidence and Activation

The server persists the hire before calling Asaas and sends the hire ID as
`externalReference`. The returned checkout ID is the primary correlation key.
Browser redirects are hints only; the UI polls the scoped hire and never marks
payment or access as successful.

Events are correlated, in order, by known payment ID, provider subscription ID,
checkout session ID, external reference, and a bounded provider lookup.
Unmatched events remain `pending_reconciliation`; they are not terminally
ignored. Reconciliation may use checkout-session and subscription-payment
lookups to bind missing provider identities.

`CHECKOUT_PAID` moves a hire to `activation_pending`. Only confirmed or
received payment evidence with an unambiguous hire and exact server-owned
amount can atomically:

1. persist/bind the payment and provider identities;
2. end the prior effective plan;
3. create the new effective contract;
4. project entitlements;
5. complete the hire and record operational evidence.

Duplicate and out-of-order events are idempotent. An overdue subscription keeps
paid access for seven days. When grace expires, the worker atomically activates
Free and reprojects entitlements without deleting business data.

Checkout is disabled unless both Asaas runtime and webhook configuration are
ready. Provider-backed modules must expose ready/degraded states and must never
claim an official operation when the provider is unavailable.

## Z-API BYOK

Z-API is a CRM transport included wherever `crm` is entitled. It has no
billing product, quota, purchase route, or cancellation route.

Each store writes `instanceId`, `instanceToken`, and `clientToken`. All
three are sealed independently with tenant/store/purpose-bound vault context
and are never returned. There is no global Client-Token fallback. Existing
connections have legacy credential-bearing metadata and callback URLs scrubbed
during cutover and become `credentials_incomplete`; conversations, routing,
and history remain intact, but provider I/O stays disabled until credential
re-entry and webhook-secret rotation.

Credential rotation requires `crm.messaging.credentials.rotate`. Scoped
platform support requires `crm.messaging.support.manage`. Z-API webhook
handling applies bounded payload validation, rate limiting, secret rotation,
query-token redaction, and sanitized persisted evidence.

## Authority and Operations

The paying legal account is the tenant; stores are operating dealerships.
Store owners/admins or authorized agency operators may manage billing for the
selected store. Prices, quotas, capabilities, and quotes never come from client
input.

Catalog reconciliation and the idempotent packaging cutover run during deploy.
The billing reconciliation worker replays pending Asaas evidence, processes
provider reconciliation work, and performs expired-grace Free fallbacks.
Every material transition carries request, tenant, store, hire, checkout,
subscription, payment, and provider-event identifiers where available, without
secrets, provider payloads, or customer message/document contents.

### Billing operations and staging acceptance

The billing reconciliation worker runs every five minutes in UTC. Each run
emits `job.billing_provider_reconciliation.completed` with
`pendingReconciliationCount`, `oldestPendingReconciliationAgeSeconds`,
`reconciliationFailedHireCount`, `missingContractCount`,
`replayedProviderEvents`, and `freeFallbacks`. It emits
`alert.billing_reconciliation.attention_required` when a non-deleted store has
no effective plan, a hire is in `reconciliation_failed`, or the oldest pending
provider event is older than 900 seconds. Operators must investigate the
corresponding sanitized identifiers and keep the worker retryable; never mark
an unmatched provider event as successfully reconciled by hand.

Before promoting billing changes, staging must exercise the real Asaas sandbox
for Essencial, Operação, Gestão, and an approved Escala quote. For each paid
hire, verify the local hire is created before checkout, the checkout and
`externalReference` are persisted, a checkout event without a subscription ID
does not activate access, and a later confirmed/received payment binds the
real provider IDs and atomically produces `paid_active`. Repeat or reorder
webhooks, poll the server-owned hire state, cross the first due-date boundary,
and verify the effective entitlements remain correct. Record any
`pending_reconciliation` or `reconciliation_failed` result with its request and
provider-event IDs before promotion.

Billing product milestones are written to the idempotent
`billing_product_event_outbox` with statuses `pending`, `processed`, or
`failed`. The table is a durable product-analytics handoff, separate from the
audit trail and operational logs. Until a delivery consumer is enabled, keep
these rows available for replay and do not treat their presence as proof that
an analytics destination received the event.
