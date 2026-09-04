# OneSignal V1 to V2 migration

This runbook moves CRM browser notifications from the V1 Loja/Repasses stack to
the CRM built into V2. V2 preserves the V1 notification decisions while using
transactional intents, leased delivery, bounded retries, and explicit browser
and store preference states.

## Decisions and invariants

- Production V2 ultimately takes over the exact `https://lojaveiculos.com.br`
  origin.
- Production reuses the existing V1 OneSignal App ID and API key only after the
  origin cutover. The values live in the deployment secret manager, never in
  Git or a browser environment variable.
- Staging and any parallel V2 origin use a separate OneSignal app and key.
- V2 identifies the OneSignal user with the local V2 user UUID. Returning
  browsers are reassociated when the authenticated V2 shell calls
  `OneSignal.login()`; there is no bulk V1-to-V2 user mapping in this rollout.
- `/OneSignalSDKWorker.js` remains the root service-worker URL.
- V1 and V2 must never send live CRM push notifications for the same migrated
  store at the same time.
- Assigned conversations notify only the active assignee. There is no fallback
  fan-out when that assignee is ineligible.
- Unassigned conversations notify active store users with
  `crm.conversations.read`, `crm.conversations.read_unassigned`, an enabled
  store preference, and an enabled browser subscription.
- Duplicate, outbound, status, receipt, echo, and system events do not enqueue
  a push.

## Runtime design

An inbound provider transaction persists the canonical CRM message and one
outbox intent for the conversation's current notification generation. A unique
cycle/generation constraint collapses concurrent messages into one notification
per unread burst.

The push worker claims due rows with a lease, reloads the current conversation,
message, assignment, membership, permissions, preferences, and subscriptions,
then applies the recipient policy immediately before delivery. It sends to
OneSignal with a stable idempotency key. Network errors, HTTP 429, and HTTP 5xx
are retried; permanent errors are dead-lettered; invalid subscriptions are
disabled. Lease-token and attempt fencing prevent a stale worker from completing
a newer claim.

Marking a conversation read or unread advances its notification generation in
the same compare-and-swap update. A worker releases stale generations without
sending. A no-recipient result releases the active row so a later inbound
message in the same unread burst can try again, matching V1 behavior.

The worker never persists copied message content, phone numbers, or OneSignal
payloads in the outbox. Logs contain stable internal intent IDs and sanitized
error codes only.

## Configuration

Provision these variables for the API and push worker:

| Variable                           | Secret | Meaning                                          |
| ---------------------------------- | ------ | ------------------------------------------------ |
| `ONESIGNAL_APP_ID`                 | No     | App used by the authenticated web SDK and worker |
| `ONESIGNAL_API_KEY`                | Yes    | Server-side OneSignal App API key                |
| `CRM_PUSH_DELIVERY_MODE`           | No     | `off`, `shadow`, or `live`; default `off`        |
| `CRM_PUSH_REQUEST_TIMEOUT_MS`      | No     | Bounded provider request timeout                 |
| `CRM_PUSH_BATCH_SIZE`              | No     | Maximum intents claimed per worker run           |
| `CRM_PUSH_MAX_ATTEMPTS`            | No     | Attempts before dead-lettering                   |
| `CRM_PUSH_LEASE_DURATION_MS`       | No     | At least request timeout plus 15 seconds         |
| `CRM_PUSH_CLEANUP_BATCH_SIZE`      | No     | Bounded terminal cleanup batch; default 100      |
| `CRM_PUSH_TERMINAL_RETENTION_DAYS` | No     | Terminal-row retention; default 30 days          |

Production secret transfer is an operational action: copy the current V1 values
from its secret store to the V2 production API and push-worker services without
printing or committing them. Do not copy the production values into staging.

## Pre-cutover validation

1. Apply the database migration and confirm the three CRM push tables and cycle
   generation column exist.
2. Deploy the API, web, and push worker with `CRM_PUSH_DELIVERY_MODE=off`.
3. Confirm `https://<v2-origin>/OneSignalSDKWorker.js` returns JavaScript with
   HTTP 200 and is not rewritten to the SPA document.
4. On staging, use its isolated OneSignal app to exercise permission allowed,
   denied, dismissed, enabled, disabled, logout, account switch, and store
   switch states.
5. Exercise Z-API, Meta, and OLX inbound messages. Confirm one durable intent,
   no intent for duplicates/outbound events, and no message content in outbox
   rows or logs.
6. Run the worker in `shadow` mode. Confirm browsers register and recipient
   decisions are evaluated for assigned, muted, inactive, and unassigned
   conversations without sending a provider notification.
7. Confirm read-before-delivery suppresses a stale push and read/unread permits a
   new generation.
8. Confirm retry keeps the same idempotency key, expired leases recover, and two
   workers cannot deliver the same claim concurrently.
9. Confirm notification clicks open the authorized V2 store and CRM cycle, and
   foreground notifications are suppressed only while that cycle is visible.

## Store cutover

Cut over one store at a time:

1. Record the target store, providers, V1 sender state, and rollback owner.
2. Disable V1 live delivery for the store.
3. Wait for the V1 in-flight send window to drain and verify its send count is
   zero for that store.
4. Move the store's users to V2 on `https://lojaveiculos.com.br` and confirm the
   root OneSignal service worker is healthy.
5. Keep V2 in `shadow` until at least one representative browser has been
   reassociated to its local V2 user and registered with the V2 API.
6. Set V2 delivery to `live` for the cutover environment.
7. Send controlled assigned and unassigned inbound messages for every enabled
   provider. Verify recipient, preview, latency, foreground suppression, click
   route, and exactly one notification per unread burst.
8. Monitor pending age, retry count, invalid subscriptions, and dead letters
   before expanding to the next store.

The initial implementation uses an environment-wide delivery mode. Therefore,
stores must be migrated as a single sender cohort unless a store-level rollout
gate is added before production cutover.

## Rollback

1. Stop the V2 push worker before changing the delivery mode or inspecting the
   queue. `off` actively lease-releases queued intents; it is not a paused queue.
2. Set V2 `CRM_PUSH_DELIVERY_MODE=off` while the worker remains stopped.
3. Wait for active V2 leases to expire and verify no new OneSignal calls occur.
4. Inspect pending and processing intents; do not restart the off-mode worker
   until the rollback owner has decided whether those rows should be retained.
5. Re-enable V1 delivery for the affected store.
6. Verify V1 sends and browser clicks before closing the incident.

Rollback does not delete V2 subscriptions or preferences. This makes a later
retry idempotent and avoids another browser permission prompt.

## Go-live gates

- Production origin is exactly `https://lojaveiculos.com.br`.
- Production App ID/key match V1 and remain server-side where required.
- Staging uses a separate OneSignal app.
- All three inbound providers create intents transactionally.
- Permission and preference policy matches the rules above.
- Lease, retry, stale-generation, invalid-subscription, and missing-provider-ID
  tests pass.
- Service worker, settings UX, logout/account switch, foreground suppression,
  and deep links pass browser verification.
- V1 is disabled before V2 becomes live.
- Pending-age and dead-letter monitoring has an assigned operator.
