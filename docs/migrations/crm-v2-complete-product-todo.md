# CRM V2 complete-product completion tracker

This is the backend-led completion tracker for the CRM migration. It preserves
the requirements from the prior TODO, but status is evidence-based: a route or
unit test is not customer acceptance, and a UI control is not proof that the
provider effect happened.

## Scope and operating contract

- **References:** `repasses-lojaveiculos-backend`, `repasses-frontend`, and the
  active V2 contracts in `docs/migrations/`.
- **Target outcome:** one dependable store-operated sales inbox for WhatsApp,
  Instagram, and OLX chat, with an external AI bot and multiple sellers.
- **Owners:** CRM Product owns workflow; Platform/Integrations owns providers,
  workers, and reliability; Support owns connection recovery and managed Z-API
  setup; Migration owns V1 rehearsal and cutover.
- **Leading metrics:** lost/duplicated messages, waiting-human time,
  first-response time, provider failure rate, and lead-to-visit/sale conversion.
- **Billing:** CRM entitlement and server-owned provider/add-on catalog only.
  Never accept client-defined pricing or quotas.
- **Degraded state:** keep the inbox readable, disable unsafe sends, name the
  failing provider/worker, and expose a recoverable retry path. Never show
  provider, fiscal, marketplace, or messaging success without provider evidence.
- **Privacy:** evidence in this document names code paths and test files only;
  it must not contain secrets, tokens, raw rows, message bodies, customer
  names, phone numbers, emails, document numbers, or provider payloads.

## Status vocabulary

- **Implemented:** backend behavior is present and covered by focused tests or
  an existing contract; customer acceptance may still be required.
- **Partial:** a bounded backend/UI slice exists, but an invariant, provider,
  recovery path, or acceptance proof is missing.
- **Open:** required behavior is not evidenced in the current checkout.
- **Blocked/manual:** requires a live provider, support action, design partner,
  or operator evidence that must not be simulated by CI.
- **Deferred:** intentionally outside the current V1 cutover; retain the
  requirement and record the trigger before scheduling it.

Every slice below has the same completion rule: backend contract first, then a
frontend acceptance that consumes the contract, then focused automated tests,
then sanitized staging/provider evidence where applicable.

## Evidence register

These are the narrow items that can be marked independently of the larger
slice. They do not imply product or cutover readiness.

- **Implemented:** V2 lead, pipeline, and visit service/controller paths;
  provider-scoped connection/session/message models; Z-API inbound parsing,
  media/content/action/catalog/vehicle paths; Meta WhatsApp/Instagram webhook
  parsing and identity/retry handling; Composio authorization/complete/sender
  route skeleton; campaign, schedule, tag, quick-message, bot-forwarding, and
  provider-event issue/retry paths; provider-neutral role permission vocabulary
  and defaults; OLX text-only CRM chat adapter and webhook ingress; durable OLX
  webhook effect outbox/recovery with security and rate limiting; Redis-backed
  realtime persistence/broker and CRM CAS/origin contracts; Z-API setup
  authorization and QR endpoint authorization tests.
- **Partial:** human-attendance guardrails; external-bot forwarding and media;
  official WhatsApp/Instagram send and webhook support; provider status and
  capability enforcement; Z-API credential references and webhook setup;
  queue/assignee/tag operations; migration mapping/tooling; responsive CRM
  operations coverage.
- **Open:** complete provider echo/native-agent correlation; complete
  capability/media/delivery parity; notifications/team rotation; production
  worker/Redis recovery; full analytics/SLA/retention/runbooks; three-store
  acceptance; controlled live OLX provider evidence.
- **Deferred:** group-broadcast parity until a provider supports it with
  explicit entitlement, consent, throttling, and audit; non-essential legacy
  MiniBot behavior until V2-native conflict and capability rules are agreed.
- **Blocked/manual:** live Z-API customer pairing and recovery; second-run
  Composio/Meta sandbox evidence; controlled OLX production evidence; migration
  cutover, drain, rollback, and operator acceptance.

## Current handoff checkpoint — 2026-08-11

This checkpoint records the implementation and deployment decisions that must
survive handoff. It does not promote a mocked provider response or a local
test into live-provider acceptance.

### Completed and locally evidenced

- Z-API live evidence is limited to the approved status/diagnostic rehearsal;
  no credential, message body, or customer data is recorded here. The real
  customer pairing/recovery rehearsal remains manual.
- The agency permission fix is complete: provider-neutral connection
  setup/pair permissions replace the retired connection-management grant,
  deny-wins and role projection are covered, stale overrides are migrated, and
  the role UI no longer exposes provider-admin language to ordinary store
  roles.
- CRM provider capability contracts, capability-aware UI states, replayable
  realtime/CAS behavior, and bot-origin/security guardrails are implemented in
  the current V2 slice and covered by focused tests. Remaining provider parity,
  production Redis/worker recovery, and customer acceptance are still open.
- OLX Autoupload, connection-scoped Leads ingestion, and the bounded text-only
  Chat adapter/webhook/outbox paths are implemented. Lead delivery is durable,
  idempotent, and recoverable; a failed or unavailable provider never becomes
  synthetic messaging success.
- Local product migrations `0027`, `0028`, and the schema represented by `0029`
  are present locally. Migration `0029` adds a durable OAuth exchange lease and
  encrypted cached token set so a retry does not replay the authorization code.
  The OAuth-to-CRM onboarding flow now validates the returned token and scopes,
  requires marketplace and CRM permission/entitlement gates before effects,
  idempotently provisions one tenant/store-bound `olx_chat` connection, seals
  the access token and webhook secret, and marks setup active only after both
  Leads and Chat webhook registrations succeed. Focused onboarding tests pass;
  no live OLX provider call is claimed.

### Composio/Meta ingress ownership decision

The 2026-08-11 staging audit found that the WhatsApp and Instagram Composio
auth configs are enabled, Composio-managed OAuth configs, while the current
toolkit surface does not expose an inbound customer-message trigger for either
channel. V2 outbound official messages use the Composio proxy, but inbound
WhatsApp and Instagram are implemented as direct Meta webhooks at
`/api/v1/crm/whatsapp/webhooks/meta` and require a Meta app secret owned by the
callback app. A Composio-managed app secret is not a Loja Veiculos or dealership
credential; `COMPOSIO_API_KEY`, a customer secret, or an invented value must
never be used as `CRM_META_APP_SECRET`.

Locked decisions and open work:

- Preserve `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`; Instagram remains part of this
  broad CRM implementation even though its live inbound path is not ready.
- Use Composio for customer OAuth/token custody and outbound proxying only with
  an explicitly verified ingress design. The preferred direct-ingress design is
  a Loja Veiculos-owned Meta app connected to custom Composio auth configs, so
  V2 owns the callback verification token and app secret.
- Choose one authoritative ingress per event type. Do not run direct Meta and a
  future Composio message trigger for the same event without durable cross-source
  deduplication and an explicit cutover plan.
- `CRM_META_WEBHOOK_VERIFY_TOKEN` and `CRM_META_APP_SECRET` are now wired to the
  API contract, but must remain fail-closed placeholders until the owned-app
  provider-contract spike proves permissions, App Review/business verification,
  asset selection, subscription, signatures, reauthorization, revocation, and
  WhatsApp/Instagram inbound and outbound rehearsals.
- Do not represent official WhatsApp or Instagram inbound messaging as ready
  merely because commercial packaging or an auth config exists. The UI must
  expose setup-unavailable/degraded state until the selected assets, provider
  subscription, callback, and outbound effects are all verified.

### OLX support evidence and locked decisions

OLX support confirmed that the client has the four requested OAuth scopes:
`autoupload`, `autoservice`, `chat`, and `basic_user_info`. There is no OLX
sandbox; all provider authorization and effect tests must be performed in
production with a controlled advertiser account and sanitized evidence.

Support confirmed a maximum of three Redirect URIs, currently registered as:

1. `https://staging.lojaveiculos.com.br/api/v1/marketplaces/oauth/olx/callback`
2. `https://v2.lojaveiculos.com.br/api/v1/marketplaces/oauth/olx/callback`
3. `https://lojaveiculos.com.br/api/integrations/olx/callback`

The canonical V2 callback is the `/api/v1/marketplaces/oauth/olx/callback`
route. OAuth state/redirect binding and one-time durable transaction handling
remain mandatory; do not add a localhost or port-`3000` callback. The legacy
production URI remains registered only because OLX permits three entries and
the migration still needs it; it is not the V2 implementation contract.

For Leads, support documented `POST https://apps.olx.com.br/autoservice/v1/lead`
with a bearer access token and a unique advertiser URL/token per account. For
Chat, support documented webhook receipt and
`POST https://apps.olx.com.br/autoservice/v1/chat/send` with
`textMessage`, `messageId`, and `chatId`. The documented source-IP allowlist
value is `54.162.151.93`. OLX clarified that `origin` (`buyer`/`seller`) is
distinct from `senderType` (`account`/`system`); V2 preserves both concepts and
does not infer a human sender from the ambiguous example payload.

There is still no real OLX OAuth authorization, Autoupload effect, Lead
webhook, or Chat receive/send test recorded for V2. The implementation and
support answers are not a substitute for that production evidence.

### Railway staging and variable cleanup

- The Railway staging web custom domain
  `staging.lojaveiculos.com.br` is active, ownership-verified, and has a valid
  Railway certificate. Its traffic record is CNAME `staging` to
  `a428rlyl.up.railway.app`. Railway detects Cloudflare as the CDN; the proxied
  CNAME may remain proxied while domain/certificate status stays active. The
  Railway API can report an empty current CNAME value behind the proxy, so
  certificate and sync status are the release checks.
- The five obsolete OLX endpoint/configuration overrides were removed from the
  staging API variable set: `OLX_AUTHORIZATION_URL`, `OLX_API_BASE_URL`,
  `OLX_LISTINGS_PATH`, `OLX_TOKEN_URL`, and `OLX_REQUIREMENT_CONFIG`. Official
  OLX URLs and limits are server-owned constants. `OLX_CLIENT_ID` and
  `OLX_CLIENT_SECRET` remain, and `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID` is
  explicitly preserved because Instagram/Composio is part of this broader CRM
  delivery. No values are recorded here. Internal service references and the
  environment-correct `PUBLIC_APP_URL`/`VITE_API_BASE_URL` still require the
  normal pre-deploy plan review.
- Production Railway remains unprovisioned. Merging to `main` currently does
  not deploy a production environment; production setup is a later operator
  decision after staging acceptance.

### Deploy blockers and next steps

The next safe sequence is: review the final Railway plan without applying
unrelated drift; deploy the verified `staging` branch; run staging API/web/worker
smoke checks; perform the controlled production OLX OAuth and provider-effect
rehearsal; then record sanitized evidence for callback, Autoupload, Leads, and
Chat. Remaining blockers are staging deployment and smoke evidence, real OLX
production evidence, live Z-API pairing/recovery, the second-run Composio/Meta
evidence, and three-store migration acceptance.

The final parent `pnpm run validate` passed after the OLX onboarding, migration,
Leads line split, and capability-aware frontend fixture fixes. It includes all
core guardrails, workspace typechecks/lint, 1,155 web tests, 1,689 API tests,
the database/package suites, migration tooling, and quality-tool suites. The
fresh empty-database rehearsal also applied all 30 product migrations. Remaining
validation is environment-dependent: `release:verify`, staging smoke/API checks,
Railway deployment health, worker execution, DNS resolution, and controlled
live-provider tests. No deployment or live OLX test is claimed by this document.

### Iteration-1 deployment checkpoint

This is the handoff status for the next deploy review; it is not a claim that
the provider integrations are live:

- **OLX onboarding:** mocked/local flow only. OLX has no sandbox, and no
  controlled production authorization or provider-effect evidence is recorded.
- **Database migration:** the fresh-migration blocker is fixed; the full chain
  of 30 migrations is green in the verified local run.
- **OLX review fixes:** Chat webhook registration now sends the official
  `webhook` field, and a lost setup lease cannot be reported as active. Focused
  request-body and lease-loss tests are green.
- **Staging web:** `staging.lojaveiculos.com.br` is active, ownership-verified,
  and has a valid certificate.
- **Railway plan:** the reviewed plan has only two pending, safe
  `CRM_OLX_CHAT_ENABLED` references; the plan was not applied. No values are
  recorded here.

### Second iteration backlog — ownership and status

This section is intentionally split by who must perform or verify the work.
The human/operator owns live-provider accounts, secrets, approvals, deploy
promotion, and evidence checkboxes. Engineering owns code, contracts, tests,
observability, and documentation updates. A checked engineering test never
substitutes for a human/provider acceptance check.

#### HUMAN / operator tasks

- [ ] **Confirm Meta ownership per environment.** Create or verify one
      Loja Veiculos-owned Meta app for each environment that will receive direct
      callbacks; keep App Secret and verify token in the approved secret manager.
      Do not provide dealership secrets, `COMPOSIO_API_KEY`, or secret values in
      this tracker.
- [ ] **Run the provider-contract spike.** With controlled staging assets,
      verify WhatsApp and Instagram permissions, business verification/App Review,
      Composio redirect URIs, asset selection, app subscriptions, callback
      signatures, reauthorization, revocation, and whether one Meta app can serve
      both toolkits. Record sanitized evidence and provider/version uncertainty.
- [ ] **Create custom Composio auth configs only after the spike.** Preserve
      `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`; record IDs and ownership in the secret
      manager, not this document. Do not replace active IDs until rollback and
      connected-account impact are understood.
- [ ] **Configure and rehearse staging.** Set only the variables required by
      the selected ingress mode, deploy through the approved release flow, and
      verify inbound, outbound, status, duplicate delivery, tenant isolation,
      reauthorization, and revocation for both channels.
- [ ] **Review and apply Railway changes deliberately.** The two pending
      `CRM_OLX_CHAT_ENABLED` references are safe but remain unapplied until the
      parent release decision. Capture plan/apply/deploy evidence without values.
- [ ] **Perform OLX production rehearsal.** Use one controlled advertiser
      account because OLX has no sandbox; prove OAuth, Autoupload, Leads, and Chat
      receive/send effects, recovery, and rollback. Keep customer data and
      provider payloads out of evidence.
- [ ] **Accept migration and rollback.** Rehearse three representative stores,
      drain/rollback, and obtain named operator acceptance before declaring V1
      cutover-ready.

#### ENGINEERING tasks — provider and deployment contract

- [ ] **Implement explicit ingress mode and fail-closed preflight.** Reject a
      direct Meta ingress when the configured auth relationship is still
      Composio-managed or when app/secret ownership cannot be proven. Never log
      secret values.
- [ ] **Finish custom-app wiring.** Keep `COMPOSIO_WHATSAPP_AUTH_CONFIG_ID`
      and `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID` distinct and server-owned; route
      `CRM_META_WEBHOOK_VERIFY_TOKEN` and `CRM_META_APP_SECRET` only to the API
      service when direct ingress is selected. Keep worker variables minimal.
- [ ] **Make connection setup reconciliable.** Persist authorization intent,
      connected-account reference, selected WABA/phone/Page/Instagram asset,
      subscription and callback rehearsal outcomes, expiry/revocation state, and
      retryable work without raw credentials. Expose `pending`, `failed`, and
      `needs_reauthorization`; never synthetic success.
- [ ] **Complete Instagram parity.** Add creation, authorization/complete,
      asset selection, reconnect/remove, permissions, audit, and provider-aware
      capability handling without WhatsApp-only assumptions.
- [ ] **Keep one authoritative inbound.** Direct Meta is the source for
      inbound customer messages unless a future provider spike proves a different
      contract. If another source is introduced, add persisted cross-source
      deduplication and an explicit cutover before enabling it.
- [ ] **Harden and test ingress.** Cover raw-body signature verification,
      replay/idempotency, unknown or ambiguous account mapping, tenant isolation,
      partial batches, monotonic status, secret rotation, and sanitized logs.
- [ ] **Make OLX Chat receipt recovery self-contained.** Persist only the
      normalized fields needed to reconstruct a failed Chat ingestion attempt and
      recover it from a worker without assuming OLX will replay the webhook.
      Keep raw payloads, tokens, and message content outside logs/audit; keep the
      release gate controlled until retry behavior is proven.
- [ ] **Align contracts after implementation.** Update IaC, env-var docs,
      integration contracts, diagnostics, runbooks, support guidance, and UI copy
      together so managed/custom ownership cannot drift.

#### ENGINEERING tasks — frontend-heavy slices

These slices are mapped to the existing CRM web surface; exact component names
remain subject to the current module layout and API contract.

- [ ] **Connection setup state machine UI.** In the CRM integrations/connection
      screens, render `pending`, `failed`, `active`, and
      `needs_reauthorization` from server state. Acceptance: refresh/reconnect
      preserves state, no provider is shown active before callback and outbound
      rehearsal evidence, and every failure has a safe retry or support path.
- [ ] **Instagram onboarding slice.** Add a provider-aware connect action,
      Composio authorization redirect, returned Page/professional-account picker,
      selected-asset confirmation, and reconnect/remove actions. Acceptance:
      `composio_instagram` is not routed through WhatsApp assumptions, and unknown
      or multiple assets cannot be silently selected.
- [ ] **Capability-driven composer.** Consume the backend capability matrix for
      text/media/reply/reaction/template actions. Acceptance: unsupported controls
      are hidden or disabled with an explanation; forged/unsupported requests are
      represented as recoverable API errors; no UI guesses provider support.
- [ ] **Ingress/degraded banner and recovery.** Show provider, connection,
      webhook/subscription health, last failure, and retry/reauthorize actions.
      Acceptance: the inbox remains readable, unsafe sends are disabled, and the
      UI never displays success without provider evidence.
- [ ] **Realtime correctness pass.** Consume canonical mutation responses,
      preserve one SSE cursor across filter changes, ignore stale list/count
      responses, and display reconnect/degraded states. Acceptance: duplicate or
      reordered events do not duplicate messages or regress attendance/unread
      state, and totals come from server counts rather than page size.
- [ ] **Provider/channel identity in inbox.** Display explicit provider and
      channel badges, origin, attendance, and connection scope on sessions and
      messages. Acceptance: WhatsApp, Instagram, and OLX threads remain distinct;
      cross-store data is never rendered under the active store.
- [ ] **Responsive acceptance pass.** Cover desktop and mobile list/chat
      navigation, safe-area behavior, empty/loading/error states, keyboard focus,
      accessible icon labels/tooltips, and offline/reconnect handling. Acceptance:
      no fixed toolbar or animation obscures composer, conversation, or recovery
      controls.
- [ ] **Frontend tests and staging evidence.** Add focused component/API tests
      for the above states plus Playwright desktop/mobile flows. Acceptance: tests
      prove honest degraded/error states, while staging evidence proves real
      provider effects separately.

#### Second-iteration uncertainty register

- [ ] **Provider behavior:** Composio toolkit trigger inventory, supported Meta
      permissions, one-app versus separate-app viability, and subscription APIs
      require a dated provider spike; do not infer them from mocked routes or old
      toolkit versions.
- [ ] **OLX behavior:** production-only effects, rate limits, and support
      responses require controlled operator evidence because no sandbox exists.
- [ ] **Release state:** the Railway plan is informational until explicitly
      reviewed/applied; staging certificate status does not prove application
      health or provider readiness.

## Non-negotiable domain invariants — Partial

Backend contract:

- Persist outbound origin as `HUMAN`, `EXTERNAL_BOT`, `SYSTEM`, or `UNKNOWN`.
  Only `HUMAN` may transition a session to `IN_HUMAN_SERVICE`.
- `set_intervention(enabled: true)` is the only ordinary bot action that creates
  `WAITING_HUMAN`; ordinary bot messages do not change attendance.
- Provider is mandatory on every connection, session DTO, message action, SSE
  event, and counter query. Reject inconsistent data; never default to Z-API.
- Uncorrelated provider echoes remain `UNKNOWN` until reconciled. Reactions do
  not affect attendance, assignment, queue, or first-response metrics.
- Return a server-owned capability contract per connection/channel and enforce
  it in controllers and services.

Frontend acceptance:

- The inbox renders origin, attendance, provider, channel, and capability state
  from the API; it never infers human attendance or provider support locally.
- Unsupported actions are hidden or disabled with an honest explanation, while
  stale/unknown state prevents unsafe sends and shows a recovery action.

Dependencies: provider-neutral CRM messaging contract; scoped `ServiceContext`;
durable outbound intent and intervention ledgers; frontend API error handling.

Evidence and remaining work: `humanAttendanceTransition` tests and bot-action
tests cover important transitions; provider echo correlation, a durable ledger,
and the complete capability matrix remain incomplete. **V1 disposition:** keep
these invariants in the V1 cutover gate; do not migrate sessions that cannot be
classified safely.

## Slice 1 — realtime, ordering, and counters — Partial

Backend contract:

- Redis health, logs, metrics, alerts, and a visible degraded state; no silent
  process-local fallback in multi-instance deployment.
- One monotonic session revision for messages, attendance, assignment, tags,
  read state, status, and contact changes. Older HTTP/SSE snapshots are ignored.
- Durable replayable event/outbox sequence with `Last-Event-ID` resume; one
  stable SSE subscription whose filter changes do not reset the cursor.
- Abort or generation-cancel stale list/count requests. Mutations for send,
  intervention, assignment, tags, close, read, and contact return canonical
  updated session state.
- Close, reopen, ad handback, assignment, and attendance clearing are atomic
  compare-and-set mutations. Counters honor connection, channel, search, tag,
  status, queue, unread, and exact assignee filters.

Frontend acceptance: reconnect from the last cursor without a missing or
duplicated visible event; filter changes keep the same subscription; stale
responses cannot replace current results; totals come from server counts, not
the loaded page size; Redis/provider degradation is visible and never presented
as real-time success.

Dependencies: Redis/runtime health seam, durable outbox/event storage, DB
transaction/CAS support, and API contract tests. **V1 disposition:** Open;
block cutover until recovery and counter correctness are demonstrated.

Evidence: `crmRealtimeBroker`, Redis persistence, outbound-intent/CAS session
updates, realtime controller tests, Redis broker lifecycle tests, scoped DB
consistency tests, and the local DB push/reseed smoke are present. Durable
replay/recovery under worker restart, Redis outage evidence, and every counter
dimension remain open; keep this slice Partial until those failures are
demonstrated.

## Slice 2 — sender origin, attendance, and bot handoff — Partial

Backend contract:

- Correlate Z-API and Meta echoes with outbound intents and retain the original
  `HUMAN`, `EXTERNAL_BOT`, or `SYSTEM` origin.
- Bot Action API sends persist `EXTERNAL_BOT`; their echoes/delivery events never
  trigger human attendance. Native WhatsApp/Instagram agent replies count as
  human only with provider evidence or configured native-agent policy; otherwise
  `UNKNOWN`.
- Parse Meta `is_echo` and equivalent events; preserve reactions as non-human.
- Store every intervention generation and idempotency key, not only the latest
  tombstone. Validate UUID intervention IDs, bounded reason/source strings,
  known actions, and scoped connection/session IDs with stable 4xx errors.
- Attendance begins when the provider accepts an agent send; later delivery
  failure remains visible and does not rewrite history.
- Bot webhook outbox is ordered per session, retried with backoff, replayable by
  an operator, and exposes sanitized delivery state.
- Provider-neutral bot actions resolve capabilities and messaging windows first;
  explicit AI request, seller acknowledgement, close/reopen/ad handback,
  summary, timestamps, and current intervention history are persisted.

Frontend acceptance: show human/AI/system/unknown labels and intervention history;
show a waiting-human handoff only on explicit intervention; display accepted,
pending, indeterminate, failed, and delivery states separately; provide safe
retry/replay controls without duplicating a send.

Dependencies: Slice 1 revisions/outbox, provider echo identities, bot contract,
and per-session ordering. **V1 disposition:** Partial; migrate only after the
three sender-origin classes and unknown-origin fail-safe pass hard tests.

Evidence: sender-origin and attendance transition tests, bot forwarding/media,
official media parity, Meta retry/identity, outbound intent/idempotency, and
provider-event tests exist. Durable cross-provider echo correlation,
native-agent proof, and production replay evidence are open.

## Slice 3 — provider lifecycle and connection control — Partial

Backend contract:

- Provider and channel are immutable and non-null, with DB consistency linking
  Z-API WhatsApp, official WhatsApp, official Instagram, and the future OLX chat
  provider to the correct channel.
- Z-API is an always-visible optional buyable integration in the customer
  Conexao tab. Its price/SKU comes only from the active server-owned catalog and
  existing paid add-on flow; no client constant or synthetic purchase success
  is allowed. Only an entitled, authorized customer store owner/admin, or a
  billing-authorized scoped actor under existing policy, may enter initial
  instance credentials. Store them write-only and encrypted/reference-backed;
  never return or log them, and show status rather than stored credential
  fields. The customer pairs through QR or phone code after setup. Backend/
  support owns automatic webhook configuration; it is never exposed to the
  customer. Support retains recovery, troubleshooting, rotation/revocation,
  disconnect, and exceptional setup ownership.
- Official Composio setup persists authorization intent, connected account,
  selected WABA/phone/page, and webhook subscription state; local failures are
  reconciled. Reauthorization/revocation and multi-asset selection are explicit
  states.
- Every connection exposes last webhook, failure, retry, subscription, and
  provider status; manual retry is audited and provider-scoped.
- Multiple connections are scoped by tenant/store and never mix inbox,
  campaign, agent, or settings state.

Frontend acceptance: Z-API is visible as an optional buyable integration in
Conexao, with server-catalog pricing and the existing paid add-on flow. An
entitled authorized store actor can enter initial credentials, then the
customer can see status and pair it through QR or phone code; the UI never
returns or displays stored credential fields, and never exposes webhook setup.
Support retains recovery and exceptional setup ownership. Official connections
show authorization, asset selection, expired/disconnected, reauthorize, and
revoked states. All provider failures remain visible and recoverable.

Dependencies: encrypted credential vault/ref, provider setup ports, webhook
signature validation, billing entitlement, and support runbook.

Evidence: setup/pair route authorization tests, credential tests, webhook setup
tests, Composio authorize/complete/sender routes, and provider status tests
exist. The real Z-API diagnostic has connected in status-only mode, with no
credential or message payload recorded here. Customer credential-entry and
QR/phone-code pairing UI, durable subscription reconciliation, and live support
acceptance are not proven. **V1 disposition:** Partial; customer setup and
Z-API pairing remain a manual/blocking gate until live pairing is rehearsed.

## Slice 4 — provider/channel matrix and unified inbox — Partial

Backend contract:

| Provider/channel            | Current evidence                                                                                                                                                            | Required contract                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Z-API WhatsApp              | Implemented/Partial runtime and webhook paths                                                                                                                               | Complete lifecycle, origin correlation, capabilities, recovery, and live evidence.                                                                                                                    |
| Composio official WhatsApp  | Partial setup, send, Meta webhook paths                                                                                                                                     | Enforce template/window rules, asset selection, delivery limits, and reconciliation.                                                                                                                  |
| Composio official Instagram | Partial Meta parsing and text/image paths                                                                                                                                   | Keep customer-initiated scope and truthful unsupported delivery/read/media states.                                                                                                                    |
| OLX chat                    | Text-only adapter, webhook parser/ingress, durable effect outbox/recovery, OAuth onboarding, webhook registration, origin/capability wiring, security, and rate-limit tests | Prove the support-confirmed receive/send contract with a controlled production advertiser; define operational consent/limits and reconciliation evidence. Marketplace stock sync is not chat support. |

OLX Leads inbound is a separate completed acquisition slice for V1 dealerships
using OLX: the connection-scoped endpoint durably and idempotently captures
each inquiry as an `olx` CRM lead plus inbound activity, including deliveries
without phone. It uses the existing `marketplace` and `crm` entitlements, is
owned operationally by Customer Success with Engineering escalation, and
tracks delivery acceptance and time-to-first-response. If authentication,
entitlement, provider runtime, or persistence is unavailable, delivery fails
closed and reports no official messaging or synthetic WhatsApp success.

Use provider-neutral CRM messaging names while isolating provider adapters. Model
WhatsApp phone/LID, Instagram scoped user ID, and OLX conversation identity as
separate identities linked to one V2 lead. Merge only with provider evidence or
an audited operator decision, with duplicate review and undo. Preserve
independent thread ordering, unread state, windows, and external IDs.

Frontend acceptance: one lead view can show independent WhatsApp, Instagram,
and OLX threads with clear channel/provider badges and a safe channel switcher;
filters cover search, channel, provider, connection, tags, assignee, queue,
status, unread, attendance, source, and saved views. Server totals and
capabilities drive the UI.

Dependencies: Slice 1, explicit identity model, the support-confirmed OLX
provider contract, and tenant-safe lead linking. **V1 disposition:**
WhatsApp/Instagram Partial; OLX chat is implemented behind a server-owned
feature flag but must not be advertised as available until its controlled
production rehearsal succeeds. Existing OLX marketplace sync is not that
evidence.

Evidence: official Meta webhook tests and CRM lead/WhatsApp routes exist;
`parseOlxChatWebhook`, `ingestOlxChatWebhook`, `olxCrmChatGateway`,
`olxWebhookEffectOutbox`, `recoverOlxWebhookEffects`, and their focused schema,
security, gateway, controller, and outbox tests evidence a bounded text-only
OLX slice. OLX has no sandbox; controlled production evidence and full
capability parity remain manual/open, so this slice stays Partial.

## Slice 5 — message capabilities, media, and recovery — Partial

Backend contract: publish and enforce one matrix for text, image, video, audio,
document, location, contact, reply, forward, reaction, delete, templates,
catalog/product, vehicle, scheduling, and read receipts per provider/channel.
Fetch/scan/validate inbound media safely with retention/TTL; apply sent,
delivered, read, failed, deleted, and retry states monotonically; use official
WhatsApp service-window/template rules; keep Instagram text/image and
customer-initiated limitations truthful; use durable intent, idempotency,
reconciliation, and retry for every provider effect.

Frontend acceptance: unsupported controls are absent or explained; uploads show
progress and pending/indeterminate/failed states; retries cannot duplicate a
send; quoted context/previews/errors are provider-specific. Quick messages,
catalog/product behavior, and vehicle cards/links are capability-aware across
channels.

Dependencies: Slice 3 capability source, media storage/scanning, outbound
outbox, template catalog, and provider evidence. **V1 disposition:** Partial;
Z-API text/media/catalog/vehicle/quick-message paths have focused coverage, but
official delivery/read/media limits and complete parity remain open.

Evidence: Z-API media/content/action/catalog tests, official bot media parity,
official template-start tests, provider event issue retry tests, durable
outbound intent/idempotency tests, OLX webhook effect outbox/recovery tests,
and safe webhook/media handling tests exist. Official delivery/read/media limits
and complete parity remain open.

## Slice 6 — leads, queue, contacts, team, permissions, and notifications — Partial

Backend contract: implement assign, transfer, claim, unassign, read/unread,
close/reopen, block/unblock, guarded bulk actions, close dispositions (sold,
lost, no-response, duplicate, spam, custom), and intentional lead/pipeline
synchronization. Expose allowed buyer data, notes, interested vehicles, visits,
financing context, source/ad attribution, and lead activity. Add team member
state, roles, presence, concurrency, queue visibility, push preferences,
read-receipt preferences, audited round-robin rotation, and operation-specific
permissions for read/send/assign/transfer/close/block/delete/tags/campaigns/
schedules/connections/integrations/analytics/settings.

Frontend acceptance: queue and contact screens use canonical API state, show
dispositions and audit-safe errors, and hide unauthorized actions. Notifications
provide deduplicated push/desktop/in-app assignment/new-message alerts with
deep links, quiet states, and provider-aware read receipts.

Dependencies: V2 identity/permissions, lead and visit contracts, Slice 1 CAS,
notification transport. **V1 disposition:** Partial; preserve imported leads,
agents, tags, visits, and settings only after parity review; do not infer
permission parity from legacy roles.

Evidence: CRM lead/pipeline/visit routes, queue/assignee/tag tests, permissions
tests, and mobile operations E2E exist. Full team/presence/notification/rotation
acceptance remains open.

### Role permission vocabulary and defaults — Complete

- Review `dashboard#/settings?tab=roles` after every CRM channel capability
  change so store-facing labels and descriptions describe unified messaging,
  never a single provider unless the permission truly is provider-specific.
- Keep Z-API webhook registration, credential recovery/rotation, and provider
  administration out of customer role controls. Store roles may independently
  receive `crm.messaging.connection.setup` for one-time write-only channel
  configuration and `crm.messaging.connection.pair` for QR/phone pairing.
- Migrate grants and explicit overrides from the retired
  `crm.whatsapp.connection.manage` permission with deny-wins behavior, then
  remove the retired base permission and override rows.
- Update the canonical permission catalog, shared permission type, base role
  projection, local seed, seed invariants, role-editor fixtures, API/service
  checks, permission smoke tests, schema migration tests, and Playwright role
  editor coverage together.
- Acceptance: owner/agency/admin/supervisor receive both connection capabilities
  by default; salesperson/investor do not; inherited/allowed/blocked overrides
  remain deterministic; the UI contains no “campanhas WhatsApp”, “mensagens
  WhatsApp agendadas”, “etiquetas do WhatsApp”, “Gerenciar conexão ZAPI”, or
  customer-facing webhook/credential-rotation language.

Evidence: canonical provider-neutral descriptors in the permission catalog and
shared permission type; base-role seed projection; migration
`0024_split_crm_connection_permissions`; `crmConnectionPermissionMigration`,
`rolePermissionSeedProjection`, role-service/controller, and web role-permission
tests; `tools/qa/local-permission-smoke.mjs` assertions; and focused role-editor
E2E coverage in `tests/e2e/settings-roles-scroll.spec.ts`. Stale browser-saved
custom roles are migrated to the setup/pair split, unknown keys are filtered,
and deny-wins is covered by five focused role-panel tests. The migration chain
was applied to a fresh local database, then the schema push and product reseed
completed locally; the rollback-only raw PostgreSQL migration test reports four
passing cases for grant splitting, override conflicts, deny precedence, and
retired-row cleanup. `pnpm run test:seed-tools` reports 35 passing tests, the
focused DB contract run covering
`packages/db/src/crmConnectionPermissionMigration.test.ts`,
`crmOlxProviderSchema.test.ts`, `crmWebhookEffectOutboxSchema.test.ts`, and
`crmWhatsappConsistencySchema.test.ts` reports 20 passing tests, API and web
typechecks pass, and the CRM connection/mobile/roles Playwright run covering
`tests/e2e/crm-whatsapp-connection.spec.ts`,
`tests/e2e/crm-whatsapp-operations-mobile.spec.ts`, and
`tests/e2e/settings-roles-scroll.spec.ts` reports 8 passing tests, and the full
`pnpm run validate` handoff gate passes. No secrets or customer data are
included in this evidence.

## Slice 7 — bot, campaigns, schedules, and follow-up — Partial

Backend contract: durable ordered bot webhook outbox; provider-neutral bot
actions; conflict precedence among external AI, MiniBot, campaigns, scheduled
messages, and human attendance; campaign draft/schedule/start/pause/resume/
cancel, recipient inspection, deduplication, consent/opt-out, quiet hours,
rate/capacity limits, failure retry, reply tracking, secondary messages, and tag
transitions. Workers need leases, metrics, dead-letter recovery, cleanup, and
provider-aware windows/templates. Instagram campaigns are limited to supported
Meta conversation follow-ups. Group broadcast is only ported where the provider
supports it with entitlement, consent, throttling, and audit. Include one-off,
auto-archive/reopen, special-date, and purchase-anniversary follow-ups.

Frontend acceptance: Integrations and campaign screens show durable state,
provider restrictions, consent/opt-out, previewed variables, attempts, and
recovery; no rejected or indeterminate send appears successful.

Dependencies: Slice 2 outbox/origin, durable Railway jobs, billing/entitlement,
provider windows, and consent model. **V1 disposition:** Partial; migrate only
campaigns/schedules with an explicit parity report and a safe pause/drain plan.

Evidence: campaign lifecycle/reply tracking, scheduled-message, bot forwarding,
and campaign E2E files exist. Worker production/recovery evidence, MiniBot
V2-native port, and conflict rules are open.

## Slice 8 — settings, analytics, SLA, PWA, security, and operations — Open

Backend contract: CRM settings for rotation, auto-archive, AI enablement, special
dates, defaults, quiet hours, and provider policies; allowlisted product events
separate from audit; operational analytics for sessions, queues, first response,
human/AI/system messages, channel/provider/source, workload, funnel, visits,
sales dispositions, campaigns, and trends; SLA/health for waiting-human age,
oldest unassigned lead, failed sends, disconnected providers, webhook backlog,
and worker backlog.

Verify Z-API and Meta webhook authentication, replay rejection, rate limiting,
batch isolation, sanitized durable audit delivery, scoped DB foreign keys/checks,
write-only credential vaulting, rotation/revocation, retention/deletion/export,
and operator runbooks for disconnected providers, stuck outboxes, indeterminate
sends, Redis outage, failed workers, and reauthorization.

Frontend acceptance: responsive PWA list/chat navigation, safe areas,
offline/reconnect, loading/empty/error states, accessibility, no hidden actions,
settings permission gates, analytics without message bodies, and visible health
states. No secrets, raw provider payloads, or customer content may appear in
logs, audit, SSE, errors, or UI diagnostics.

Dependencies: all prior slices, observability, retention policy, DB constraints,
and deploy/runbook ownership. **V1 disposition:** Open; security and degraded
state are cutover blockers. Responsive UI has partial E2E evidence, but complete
operational analytics and production runbooks do not.

## Explicit developer-only hard tests

These are not customer acceptance and must never run against real customer data
or print provider payloads. Keep provider credentials in environment secret
stores; tests may use redacted IDs and synthetic fixtures only.

- Contract matrix for Z-API WhatsApp, official WhatsApp, official Instagram,
  and OLX chat: provider required, channel/provider mismatch rejected, every
  capability enforced server-side, and unsupported actions fail closed.
- Sender-origin matrix: customer, authenticated seller, external bot, system/
  campaign, native provider agent, unknown echo, delivery failure, duplicate,
  and reordered webhook; assert attendance, assignment, queue, and metrics.
- Tenant/permission matrix for every read, mutation, webhook, bot action, and
  realtime subscription; assert cross-store/cross-tenant rejection.
- Realtime hard failures: Redis unavailable, worker restart, duplicate/reordered
  SSE, old cursor resume, stale HTTP response, CAS conflict, and exact counters.
- Durable-effect failures: DB failure after provider acceptance, timeout after
  provider acceptance, retry/replay, idempotency collision, webhook backlog,
  and operator recovery without duplicate sends.
- Pairing/setup hard tests: entitled-authorized customer credential route and
  denial matrix, encrypted-at-rest assertion without inspecting secret values,
  no-return/no-log checks, QR/phone-code state transitions, abandoned cleanup,
  token rotation/revocation, automatic webhook configuration, Composio account
  selection, and webhook subscription reconciliation.
- Media/privacy hard tests: no raw payload/body/secret leakage in logs, audit,
  errors, SSE, or diagnostics; provider media URL is not treated as durable
  storage without authenticated ingestion.
- V1 migration hard tests: deterministic mapping, idempotent rerun, duplicate
  identity review, scope isolation, unsupported-provider disposition, and
  rollback-safe checkpoints.

## Provider sandbox and manual evidence gates

- **Z-API:** developer-only real E2E requires the explicit opt-in already
  documented by the diagnostic tooling; capture only sanitized status,
  capability, timing, and correlation evidence. Support must manually rehearse
  entitled customer credential entry, customer QR and phone-code pairing,
  reconnect, token rotation, disconnect, recovery, and abandoned setup. Webhook
  configuration remains backend/support-managed and is not a customer-facing
  evidence step.
- **Composio/Meta:** retain the second-run sandbox work. First run establishes
  the local/staging connection and callback prerequisites; second run must prove
  authorization/asset selection, signed Meta webhook ingress, WhatsApp template
  and window behavior, Instagram supported text/image behavior, reauthorization,
  revocation, retry, and provider limitation messages. Do not mark a sandbox
  run successful from a local seed or mocked provider response.
- **OLX chat:** OLX support confirmed there is no sandbox and that testing must
  use the production provider. Marketplace stock-sync evidence cannot satisfy
  this gate. Keep the server-owned feature flag off until a controlled
  advertiser proves OAuth, per-account Leads and Chat webhook registration,
  Lead delivery, Chat receive/send, retry/recovery, and sanitized audit evidence
  in staging.

## V1 migration, cutover, drain, and rollback

### Migration disposition

1. Keep V1 as source of truth until three representative Repasses stores pass
   rehearsal, parity, smoke, operator acceptance, billing/entitlement review,
   and rollback review.
   The supplied `repasses-2-export` contains project/connection metadata but no
   row-bearing CRM database archive, so it cannot prove counts, nullability,
   orphan checks, or three-store parity. A sanitized SQL/custom-format archive
   is required for that manual rehearsal; this does not block local contract
   implementation and automated tests.
2. Import leads, inbox threads, agents, tags, campaigns, schedules, visits,
   settings, and provider references through idempotent, scoped mapping. Preserve
   external IDs only as references; do not copy legacy tables/controllers.
3. Classify unsupported or ambiguous records explicitly (including OLX chat
   history or provider capabilities not yet implemented); never silently drop or
   synthesize success. Require duplicate identity review and an import report.

### Cutover and drain

1. Announce a store-scoped freeze window, record a migration checkpoint, and
   verify billing entitlement, support owner, provider health, webhook secrets,
   outbox/worker health, and backup/restore evidence.
2. Quiesce V1 mutations and start a bounded drain of inbound/outbound work;
   preserve provider events arriving during the window in a replayable queue.
3. Run V2 import/reconciliation, compare counts and sampled state without
   exposing customer content, then obtain named operator acceptance.
4. Switch the store routing flag only after health checks pass. Monitor failed
   sends, duplicate/reordered events, waiting-human age, webhook lag, and worker
   lag for the agreed observation window. Keep V1 read-only fallback available.

### Rollback

Rollback is a store-scoped routing reversal, not a destructive database rewrite:

- stop new V2 mutations and drain or quarantine in-flight provider effects;
- mark indeterminate effects for reconciliation before retrying;
- point traffic back to V1, retain V2 checkpoint/audit evidence, and do not
  duplicate provider sends;
- investigate and repair from the checkpoint, then rehearse a forward fix;
- only retire V1 after the observation window, acceptance, and rollback deadline.

Dependencies: `docs/runbooks/v1-to-v2-basic-migration.md`, V1 CRM import
contracts, durable outbox/reconciliation, and a named migration/support owner.
**Status: Blocked/manual.** The tracker has migration tooling and mapping tests,
but no evidence of three representative-store acceptance or a completed live
cutover/drain/rollback rehearsal.

## Completion gate

The product is complete only when all required slices are Implemented, every
Partial/Open item has focused evidence or an approved Deferred disposition, and
the following are recorded without sensitive data:

- focused backend/provider contract tests and the developer-only hard tests;
- Playwright desktop/mobile inbox, connection, pairing, recovery, permission,
  campaign, and migration acceptance flows;
- Redis/worker/replay/load/recovery evidence and API smoke evidence;
- Z-API support pairing evidence and the second-run Composio/Meta sandbox report;
- three-store V1 parity and operator acceptance reports;
- `pnpm run validate` and the applicable staging smoke commands;
- cutover owner, drain window, rollback checkpoint, observation window, and
  explicit disposition for OLX chat.

**Current conclusion: Partial overall.** V2 has substantial provider-scoped
backend foundations and focused tests, but it is not a complete product or
cutover-ready CRM until the Open and Blocked/manual gates above are closed.
