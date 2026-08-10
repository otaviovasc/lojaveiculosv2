# Billing Business Rules

This document is the source of truth for Loja Veiculos V2 billing behavior.
Update it whenever pricing, ownership, provider integration, or entitlement
rules change.

## Commercial Readiness

The base commercial contract is now enforced by the runtime:

- onboarding selects the latest published default catalog and never writes plan,
  feature, or add-on definitions;
- Growth and the expansion add-ons are separate chargeable products. CRM uses
  the immutable `2026-08-v2` catalog; add-ons are not included in the trial or
  base plan;
- a fresh store receives a 14-day trial with only the catalog features explicitly
  marked `included_in_trial`: analytics, automation, compliance, plate lookup,
  and the platform storefront subdomain; custom domain and other cost-bearing
  or critical integrations are excluded;
- trial stores retain an effective Growth plan subscription item so plan quotas
  and core stock operations, including vehicle creation, work throughout the
  original trial period;
- trial grants inherit the subscription start and end, expired grants are
  excluded from authenticated and external-API access, and billing reads expose
  an elapsed trial as `expired`;
- seller/team, vehicle-stock, and monthly plate-lookup limits are checked in the
  business operation before the paid or persistent action runs;
- vehicle creation and store invitations repeat their quota check inside the
  database transaction used for persistence.

The following lifecycle capabilities remain incomplete and are separate from
the base plan/entitlement leakage repaired above:

- cancellation reasons, dunning/grace policy, annual contracts, usage rating,
  and measured provider-cost margin are incomplete.

Target billing and product metrics are documented in
`docs/strategy/product-operating-model.md`.

## Account Authority

- `tenants` are billing/legal accounts.
- `stores` are operating dealerships.
- If a store is managed by an agency, the agency tenant manages billing.
- If a store is not agency-managed, the store owner manages billing.
- There is no agency platform fee and no agency discount in the default model.
- Owners of agency-managed stores must not receive `billing.manage`; operational
  store permissions remain separate from billing authority.

## Commercial Model

- Billing is monthly and denominated in BRL cents.
- A subscription belongs to the tenant that pays.
- Subscription items are the chargeable source of truth:
  - `plan` items price the base store OS plan.
  - `addon` items price optional recurring modules, such as CRM.
- Current `2026-08-v2` pricing:
  - Básico: `0` cents monthly.
  - Premium: `9997` cents monthly.
  - Estoque: `14999` cents monthly.
  - Pro: `17990` cents monthly.
  - Growth: `29900` cents monthly.
  - CRM: `17900` cents monthly. It includes Official WhatsApp and Instagram.
  - Optional Z-API for CRM: `10000` cents monthly, for a combined CRM price of
    `27900` cents monthly.
  - NF-e integrated with Spedy add-on: `5000` cents monthly.
  - Marketplace connectors add-on: `14990` cents monthly.
  - Public API access add-on: `9990` cents monthly.
  - Simulations Pro add-on: `4990` cents monthly.
- A store owner may select products and complete the first Asaas checkout at any
  point during the 14-day trial. Successful provider evidence activates the paid
  subscription; the trial end is not a purchase lock.
- Growth limits in catalog `2026-08-v2`:
  - 8 active/pending team seats per store;
  - 300 non-deleted vehicle listings per store;
  - 300 paid plate lookups per billing period.
- Trial stores may perform 10 plate lookups during the trial. Activating the
  paid Growth plan changes the plate-lookup allowance to 300 per billing period.
- The dealership pays Meta's own messaging charges directly. Loja Veiculos
  pays Composio and includes 10,000 integration tool executions per store and
  billing month in CRM. This allowance is initially soft: exceeding it does
  not create an automatic overage charge or service cutoff.
- Loja Veiculos buys and configures the optional Z-API instance only after the
  matching subscription renewal has been paid. Z-API costs a full provider
  month, so it is never prorated or activated mid-period.
- An active customer can request or cancel Z-API before renewal. The request is
  scheduled for the existing next due date, leaves the current invoice and all
  unrelated add-ons unchanged, and becomes usable only after payment evidence
  and support setup. An active Z-API cancellation remains effective through
  the already-paid period and removes the item at renewal.
- Owners and billing-authorized agency operators can purchase CRM and request
  or cancel Z-API for the store they manage. Prices and add-on identities come
  only from the server-owned catalog.

## Catalog Publication

- The canonical current definition is
  `apps/api/src/domains/billing/catalog/currentBillingCatalog.ts`; it selects an
  immutable version from `catalog/versions/`.
- Every price, feature-composition, or limit change requires a new version and
  new plan/add-on IDs. A deployed version is never edited or reactivated after
  it is superseded. Keep every canonical definition from v2 onward in the
  server registry so deploy reconciliation can finish pending audit evidence
  for the active predecessor before publishing its successor.
- API startup runs migrations and then `pnpm run billing:catalog:reconcile`.
  Reconciliation takes a database advisory lock, validates the complete
  definition, installs missing rows in one transaction, verifies their
  checksum, and atomically changes the explicit active-version pointer.
- Repeated deploys are no-ops. If the same version name differs from its stored
  definition or relational rows, startup fails closed instead of overwriting
  production data. A future-dated version is also rejected.
- Activation emits required audit evidence. If the audit database is
  temporarily unavailable after the product transaction commits, the claim is
  released and the next startup retries the pending evidence. A leased atomic
  claim prevents multiple API replicas from emitting duplicate activation
  events, and the event's deterministic ID makes a retry idempotent if the
  audit insert succeeds before the product-side marker is written.
- Existing `subscription_items.unit_amount_cents` values are contracted prices.
  Catalog publication never rewrites them; any future customer-price migration
  requires a separate, explicit billing-reconciliation policy.
- Local seeds and the memory adapter consume the same current definition. SQL
  migration rows remain immutable historical inputs, not a second editable
  current catalog. The activation migration records the deployed
  `2026-08-v1` relational price book as a superseded historical snapshot before
  v2 becomes active.

## Expansion Package Contract

The first expansion catalog targets independent used-vehicle stores already
operating the Growth plan. Prices are initial commercial hypotheses and must be
changed only through a new catalog version.

| Package         | Customer outcome                                          | Leading metric                           | Entitlement    | Support owner             | Degraded state                                                           |
| --------------- | --------------------------------------------------------- | ---------------------------------------- | -------------- | ------------------------- | ------------------------------------------------------------------------ |
| CRM             | Centralize Official WhatsApp and Instagram conversations  | Median first-response time               | `crm`          | Messaging/provider owner  | Connection unavailable; no message is represented as sent                |
| Z-API for CRM   | Add a Loja-managed WhatsApp Web connection when requested | Paid setups completed within support SLA | `crm_zapi`     | CRM integration support   | Scheduled or awaiting setup; no provider access is represented as active |
| NF-e integrated | Emit and reconcile fiscal documents in the sale flow      | Accepted emission rate                   | `fiscal`       | Fiscal/provider owner     | Provider unavailable; no official document is represented as issued      |
| Marketplaces    | Publish and reconcile inventory across supported channels | Listings synchronized without error      | `marketplace`  | Channel integration owner | Channel unavailable; no listing is represented as published              |
| Public API      | Connect approved external inventory and lead workflows    | Successful scoped API requests           | `external_api` | Platform/API owner        | Access denied or unavailable with an explicit error contract             |
| Simulations Pro | Compare commercial scenarios before closing               | Simulations completed before proposal    | `simulations`  | Sales workflow owner      | Simulation unavailable; no financing approval is implied                 |

Custom domain is excluded from the trial but included in the paid Growth plan.
The platform storefront subdomain and 10 plate lookups are included in the
trial. Plate lookup remains part of Growth with its paid catalog allowance;
neither custom domain nor plate lookup is duplicated as an add-on.

## Charge Calculation

- The charge preview is built from persisted `subscription_items` when present.
- Each chargeable line exposes:
  - unit amount;
  - quantity;
  - full amount;
  - period start and end;
  - starts/ends dates;
  - proration factor;
  - final amount;
  - allocation percent of the monthly total.
- `fullAmountCents = unitAmountCents * quantity`.
- `amountCents = round(fullAmountCents * prorationFactor)`.
- If a line starts or ends inside the current billing period, proration is based
  on active milliseconds inside that period.
- Store allocation is reporting, not pricing. Price must come from chargeable
  subscription items.

## Agency Billing

- Agencies are not charged for being agencies.
- Agency-managed stores roll up to the agency tenant billing account.
- Store billing routes under `/api/v1/billing/*` are store-scoped and require a
  store context with billing authority.
- Agency billing routes under `/api/v1/agency/tenants/:tenantId/*` are tenant
  scoped and require an active agency tenant membership or platform admin
  support access.
- The agency payment method should be charged monthly for all active store
  subscription items and usage attached to the tenant.
- A direct Asaas sync creates or updates the tenant-level provider subscription
  from the current charge preview. It does not invent billing lines; price must
  already exist in `subscription_items`.
- If a subscription spans multiple stores, provider payment records may be
  tenant-level with `store_id = null`; the UI must use charge preview lines for
  per-store allocation.

## Entitlements

- Billing controls entitlements.
- Permissions control who may use or manage entitled features.
- Enabling an entitlement without a matching subscription item is allowed only
  as an explicit billing-console action with audit evidence.
- Customer-facing package cards are commercial read models. They must not call
  the entitlement override endpoint as a substitute for adding or removing a
  subscription item.
- Every entitlement change must record `store_entitlement_events` and an audit
  event.

### Staging operator exception

For time-limited integration testing in staging, an operator may grant every
feature in the active server-owned catalog to all stores reachable through one
user's active store or tenant memberships:

```bash
pnpm billing:grant-all -- <userId> --reason="Integration QA" --apply
```

Without `--apply`, the command is a dry run. Applied grants require
`APP_ENV=staging`, `DATABASE_URL`, and `AUDIT_DATABASE_URL`, expire one calendar
month after execution, write `store_entitlement_events`, and fail if the
required audit database record cannot be persisted. They do not create payment
or provider-success records.

## Provider Integration

- Asaas is the default billing provider.
- Runtime readiness requires:
  - `ASAAS_RUNTIME_IMPLEMENTATION=http`;
  - `ASAAS_API_URL`;
  - `ASAAS_API_KEY`;
  - `PUBLIC_APP_URL`;
  - `ASAAS_WEBHOOK_SECRET`;
  - `ASAAS_WEBHOOK_URL`.
- Customer sync must search Asaas by `externalReference` before creating a
  customer because Asaas can create duplicate customers.
- The customer-facing hire flow is hosted Asaas Checkout:
  - store-scoped owners call `POST /api/v1/billing/provider/checkout`;
  - agencies call
    `POST /api/v1/agency/tenants/:tenantId/billing/provider/checkout`;
  - checkout sessions are persisted in `billing_checkout_sessions`;
  - checkout `externalReference` uses
    `lojaveiculos:subscription:<subscriptionId>:checkout:<nonce>`;
  - callback URLs are generated from `PUBLIC_APP_URL` and route back to the
    billing UI with `?checkout=success|cancelled|expired`;
  - browser redirects improve UX only. They must not mark payments as paid.
- Subscription sync uses:
  - customer `externalReference = lojaveiculos:tenant:<tenantId>`;
  - subscription `externalReference = lojaveiculos:subscription:<subscriptionId>`;
  - `cycle = MONTHLY`;
  - value from `chargePreview.totalCents`;
  - `updatePendingPayments = true` when updating an existing provider
    subscription.
- Seed/local smoke uses `PIX` by default. Production card-on-file still needs a
  card tokenization or hosted-checkout collection flow before `CREDIT_CARD`
  should be made the default.
- Checkout webhooks update `billing_checkout_sessions`. `CHECKOUT_PAID` also
  activates the local subscription linked to the checkout session; payment and
  subscription webhooks remain the source of truth for provider payment and
  provider subscription ids when Asaas sends them.
- The public Asaas webhook endpoint is:

```text
POST /api/v1/billing/webhooks/asaas
```

- The endpoint must validate `asaas-access-token` against
  `ASAAS_WEBHOOK_SECRET`.
- Webhooks are at-least-once delivery. Persist the provider event id before
  processing and treat duplicate processed/ignored events as no-ops.
- Provider events are persisted in `provider_events` with:
  - `provider = asaas`;
  - environment from `APP_ENV`/`NODE_ENV`;
  - the Asaas event `id` as `provider_event_id`.
- Payment webhooks update `payments` by `(provider, provider_payment_id)`.
- Subscription webhooks update `subscriptions` by
  `(provider, provider_subscription_id)`.
- Unknown subscriptions/customers are ignored after event persistence, not
  fabricated.

## Status Mapping

- `PAYMENT_RECEIVED` -> `payments.status = paid`.
- `PAYMENT_OVERDUE` -> `payments.status = overdue`.
- refund events -> `payments.status = refunded`.
- deleted, cancelled boleto, capture refused, or risk reproof events ->
  `payments.status = cancelled`.
- Other payment events remain `pending`.
- `SUBSCRIPTION_CREATED` or `SUBSCRIPTION_UPDATED` with Asaas `ACTIVE` ->
  `subscriptions.status = active`.
- `SUBSCRIPTION_INACTIVATED` or `SUBSCRIPTION_DELETED` ->
  `subscriptions.status = cancelled`.
- Asaas `OVERDUE` -> `subscriptions.status = past_due`.
- Asaas `EXPIRED` -> `subscriptions.status = expired`.

## Live Test Checklist

1. Set local or staging `.env` values for all Asaas variables.
2. Run DB migration/push and seed so the billing subscription/customer rows
   exist.
3. Start the API and confirm:

```bash
curl -H "authorization: Bearer <token>" \
  "$API_BASE_URL/api/v1/billing/provider/status"
```

4. Create a hosted checkout for the authenticated store owner:

```bash
curl -X POST -H "authorization: Bearer <token>" \
  -H "content-type: application/json" \
  "$API_BASE_URL/api/v1/billing/provider/checkout" \
  -d '{"billingTypes":["CREDIT_CARD","PIX"],"minutesToExpire":90}'
```

Open the returned `checkoutUrl`, complete the sandbox payment, and return to
the billing UI. Treat the browser return as pending until the webhook is
processed.

5. Synchronize the seeded billing subscription with Asaas sandbox when testing
   the direct provider sync path:

```bash
pnpm run billing:asaas:sync-smoke
```

This command creates or reuses the Asaas customer, creates or updates the Asaas
subscription from the calculated chargeables, stores provider ids in Postgres,
and prints only masked provider ids.

6. Configure the Asaas webhook URL as:

```text
$PUBLIC_API_URL/api/v1/billing/webhooks/asaas
```

7. Configure the Asaas webhook auth token equal to `ASAAS_WEBHOOK_SECRET`.
8. Enable checkout, payment, and subscription webhook events in Asaas sandbox.
9. Trigger a sandbox checkout/payment/subscription event.
10. Confirm:

- the endpoint returns HTTP 200;
- `provider_events` has one row for the Asaas event id;
- duplicate delivery does not create a second event;
- checkout events update `billing_checkout_sessions`;
- `payments` or `subscriptions` reflects the provider status;
- audit records show `billing.webhook.asaas.processed`.

For a local ngrok smoke against the seeded billing subscription, run:

```bash
pnpm run billing:asaas:webhook-smoke
```

This command reads `.env` directly, sends a synthetic Asaas
`PAYMENT_RECEIVED` webhook to `ASAAS_WEBHOOK_URL`, and expects a processed
response. It does not print provider secrets.
