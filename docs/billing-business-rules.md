# Billing Business Rules

This document is the source of truth for Loja Veiculos V2 billing behavior.
Update it whenever pricing, ownership, provider integration, or entitlement
rules change.

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
  - `addon` items price optional recurring modules, such as CRM WhatsApp.
- Current seed pricing:
  - Growth plan: `29900` cents monthly.
  - CRM WhatsApp add-on: `24999` cents monthly.
- CRM WhatsApp has lower gross margin because the Z-API instance cost is about
  R$100/month; keep that cost visible when changing price.

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
- Every entitlement change must record `store_entitlement_events` and an audit
  event.

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
