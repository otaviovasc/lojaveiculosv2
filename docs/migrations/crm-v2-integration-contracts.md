# CRM V2 Integration Contracts

Last updated: 2026-08-10

This is the active worker-facing contract for the CRM migration. The older
control dashboards remain useful context:

- `v2-backend-doc.html`
- `v2-plan.html`
- `docs/migration.md`

When they conflict, this file wins for CRM migration work. Known stale HTML
detail: `v2-backend-doc.html` still mentions a CRM tag column flag in one
schema note. V2 tags are WhatsApp labels only; there is no `isColumn` pipeline
meaning in the active contract.

## Runtime Ownership

- V2 owns the migrated messaging runtime: sessions, messages, sends, ZAPI and
  signed Meta webhooks, ticketed SSE, tags, quick messages, catalog sends,
  vehicle sends, assignment, read/unread state, intervention state, scheduled
  one-off messages, and failed provider-event retry.
- Repasses repos are behavior references and future import sources only. Do not
  call Repasses at runtime for migrated WhatsApp paths.
- Repasses public CRM APIs are numeric-id heavy; V2 slices expose V2 UUIDs.
- V2 separates messaging channel, transport provider, and credential broker.
  The supported mappings are `whatsapp/zapi/direct`,
  `whatsapp/meta_cloud/composio`, `instagram/meta_cloud/composio`, and
  `olx_chat/olx/direct`.
- Provider selection belongs to the persisted connection. There is no automatic
  fallback between official Meta providers and ZAPI; a provider failure must
  remain visible rather than risk a duplicate send.
- The canonical contact is the person identity anchor. An opportunity is a
  commercial cycle, a thread belongs to exactly one provider connection, and
  legacy `leads.id` remains only a migration/backfill reference.
- Old CRM agents do not exist in V2. Use V2 users/store members and permission
  keys.

## Messaging Provider Contract

| Provider             | Outbound path                                                               | Inbound path                                                       | Current limits                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zapi`               | Existing ZAPI HTTP adapter                                                  | Connection-specific ZAPI callbacks                                 | Existing broad WhatsApp behavior remains the regression baseline.                                                                                                               |
| `composio_whatsapp`  | Composio REST proxy to the official Meta Graph messages endpoint            | Direct signed Meta webhook at `/api/v1/crm/whatsapp/webhooks/meta` | Free-form conversation start is blocked. New conversations use an approved template name and language; templates with variables can supply explicit components through the API. |
| `composio_instagram` | Composio REST proxy to the Instagram professional-account messages endpoint | Direct signed Meta webhook at `/api/v1/crm/whatsapp/webhooks/meta` | Customer-initiated sessions only. Text and supported image sends are available; delivery/read receipt ingestion remains unsupported pending contract proof.                     |

Official provider outbound execution uses
`POST /api/v3.1/tools/execute/proxy` on the configured Composio base URL. V2
uses the REST contract directly and does not install the Composio TypeScript
SDK because doing so would remove the repository's supported Node 20 runtime
path. Each connection stores only the Composio connected-account id and the
name of the environment variable holding its API key; raw provider secrets are
never persisted in connection metadata.

The official adapters retry only explicit HTTP 429 responses with a bounded
`Retry-After` delay. They do not automatically retry timeouts or 5xx responses
whose delivery result may be ambiguous. Unsupported capabilities fail closed
with a provider error and must never return synthetic success.

## API Routes

All routes are under `/api/v1/crm`.

### OLX lead delivery

- `POST /crm/whatsapp/webhooks/olx/:connectionId/leads`

This connection-scoped endpoint implements OLX's individual lead-delivery JSON
contract. It authenticates the configured OLX webhook secret from the request
header or `token` query parameter, requires both the existing `marketplace` and
`crm` store entitlements plus `crm.whatsapp.ingest`, and returns HTTP 200 with a
stable, non-secret `responseId` after durable persistence. No new entitlement
or add-on is introduced.

Delivery creates or reuses one V2 lead with source `olx`, including phone-less
leads. Provider `externalId` is the preferred idempotency input; a deterministic
fallback covers deliveries without it. Only bounded contact, OLX source, ad
reference/link, and selected ad-summary fields are retained. The message is an
idempotent inbound lead activity; raw payloads and `buyerHistory` are not
stored. Lead delivery never opens a WhatsApp success state, sends a reply, or
calls an outbound provider.

Product contract: target segment is V1 dealerships using OLX; the customer
outcome is capturing every OLX inquiry in CRM. Leading metrics are delivery
acceptance rate and time-to-first-response. Customer Success owns onboarding
and first-line support, with Engineering owning webhook/security incidents. In
degraded state, invalid, unauthorized, disabled, or unentitled delivery fails
closed with no synthetic success; durable accepted leads remain available for
manual CRM follow-up even if later automation is unavailable.

### Connections

- `GET /crm/whatsapp/connections`
- `PATCH /crm/whatsapp/connections/:connectionId`

ZAPI connection responses include six generated webhook endpoints:

- `received`
- `delivery`
- `status`
- `connected`
- `disconnected`
- `chat-presence`

Credential values are write-only. Conexao may submit Repasses-style
`instanceCredentials.instanceId` and `instanceCredentials.instanceToken`, but
responses only expose credential reference names plus
`credentials.storedInstanceConfigured`; stored tokens are never returned.
Env-reference credentials remain supported for Railway/env-managed deployments.

Official connections may submit `composioCredentials` with
`connectedAccountId`, `apiKeyEnv`, and an optional connection-specific
`graphVersion`. Responses expose only configuration status and reference names;
they never expose the Composio API key or connected-account id. The connection
`externalConnectionId` is the native Meta phone-number id for
`composio_whatsapp` or professional-account id for `composio_instagram`.

### Conversations

- `GET /crm/whatsapp/sessions`
- `GET /crm/whatsapp/session-counts`
- `GET /crm/whatsapp/messages/:sessionId`
- `POST /crm/whatsapp/conversations/start`
- `POST /crm/whatsapp/send/text`
- `POST /crm/whatsapp/send/media`
- `POST /crm/whatsapp/send/location`
- `POST /crm/whatsapp/send/catalog`
- `POST /crm/whatsapp/send/catalog/product`
- `POST /crm/whatsapp/send/vehicle`
- `POST /crm/whatsapp/messages/:messageId/reaction`
- `DELETE /crm/whatsapp/messages/:messageId/reaction`
- `DELETE /crm/whatsapp/messages/:messageId`
- `POST /crm/whatsapp/sessions/:sessionId/assign`
- `POST /crm/whatsapp/sessions/:sessionId/close`
- `POST /crm/whatsapp/sessions/:sessionId/intervention`
- `POST /crm/whatsapp/sessions/:sessionId/read`
- `POST /crm/whatsapp/sessions/:sessionId/unread`

`GET /crm/whatsapp/sessions` supports store-scoped filters for
`connectionId`, `sessionId`, `leadId`, status, assignment buckets, tags,
search, unread-only, human attendance state, limit, and offset. Lead detail
screens must resolve existing WhatsApp sessions through `leadId` before
creating a new conversation.

### Human attendance contract

The WhatsApp session is the canonical attendance record and is directly linked
to the V2 `leads.id`. Session responses and `session` realtime events expose
these fields (with V2 naming and IDs):

| Field                         | Values / format                                | Meaning                                                                        |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `humanAttendanceState`        | `WAITING_HUMAN`, `IN_HUMAN_SERVICE`, or `null` | Current human-attendance state.                                                |
| `humanAttendanceChangedAt`    | RFC 3339 timestamp or `null`                   | Server time of the last attendance-state change.                               |
| `humanHandlingStartedAt`      | RFC 3339 timestamp or `null`                   | Server time at which human service began.                                      |
| `humanAttendanceStateVersion` | Positive integer or `null`                     | Session-monotonic version; `null` only before the first attendance transition. |
| `interventionId`              | V2 intervention ID or `null`                   | Identifier for the current intervention, when one exists.                      |

State transitions are server-owned:

- An AI pause/request for human help sets `WAITING_HUMAN` and emits the
  intervention-start event. The CRM displays **Aguardando Humano**.
- A seller/agent's first provider-confirmed outbound message sets
  `IN_HUMAN_SERVICE` and emits the session update. Text, media, location,
  catalog, vehicle, document, audio, video, and other supported outbound
  message actions count; reactions do not. The CRM displays **Em atendimento
  Humano**.
- An explicit manual takeover also sets `IN_HUMAN_SERVICE`. Ending the
  intervention, closing or reopening the session, or resuming automation sets
  the state, handling-start timestamp, and active intervention ID to `null`.
  The server advances `humanAttendanceChangedAt` and
  `humanAttendanceStateVersion` as a tombstone so delayed events cannot restore
  a finished intervention.
- A provider rejection, timeout, or otherwise unsuccessful outbound attempt
  does not change attendance state. The transition occurs only after the
  provider confirms acceptance.

`GET /crm/whatsapp/sessions` accepts `humanAttendanceState` as a composable
filter. `GET /crm/whatsapp/session-counts` returns counts for both attendance
states; counts apply the same tenant/store scope and all other active filters
(connection, lead, status, assignment, tags, search, and unread state). The
attendance filters are mutually exclusive in the UI, but are not allowed to
drop the other filters.

Attendance changes publish the existing ticketed SSE stream at
`GET /crm/whatsapp/events` as a named `session` event. The event contains the
complete V2 session projection, including the five fields above, plus the
stream event ID. Consumers must deduplicate event IDs, apply only a greater
`humanAttendanceStateVersion` for a session, and use the server timestamps for
ordering; a reconnect must replay from the last event ID and then reconcile
with `GET /crm/whatsapp/sessions` and
`GET /crm/whatsapp/session-counts`.

The bot integration forwards the same attendance fields in its
`intervention_started`, `intervention_ended`, and session/message payloads;
the action and event semantics are defined in the Bot Contract section below.
All transitions are tenant/store scoped, require the existing CRM permission
for the initiating action (`crm.whatsapp.toggle_intervention` or
`crm.whatsapp.send`), and emit a sanitized audit event. Bot actions use the
configured bot secret and the bot-scoped `ServiceContext`; no provider secret
or message body belongs in an event, audit record, or error details.

If realtime delivery is unavailable, the persisted session state remains the
source of truth and the UI must show a reconnect/reconciliation state rather
than a synthetic update. Provider failures return the standard API error
envelope and leave the previous attendance state unchanged. A successful
provider result with a temporarily unavailable realtime broker remains
persisted and is delivered by replay/reconciliation.

`POST /crm/whatsapp/conversations/start` accepts exactly one of `text` or
`template`. ZAPI starts with free-form text. Official WhatsApp starts with an
approved template name, language, and optional Meta components; free-form start
is rejected with HTTP 409. Official WhatsApp may continue with free-form text
only within 24 hours of the latest inbound customer message. The same check is
applied at dispatch time to media, quick messages, bot actions, and scheduled
messages. The official-provider UI does not offer free-form scheduling until a
template-capable scheduler exists. Instagram rejects conversation start because
a professional-account customer must send the first message and allows only
text or captionless image sends in the current verified adapter.

Template components use a bounded, strict Meta parameter contract for text,
currency, date/time, HTTPS media references, and supported buttons. This
prevents arbitrary nested provider payloads, but a store-owned approved-template
catalog remains a launch-readiness requirement.

ZAPI automatic webhook configuration derives its callback origin only from the
server-owned `API_BASE_URL`; request `Host` and forwarded-host values cannot
redirect the shared webhook token. Non-local environments require a valid
public HTTPS API base URL.

### Tags

- `GET /crm/whatsapp/tags`
- `POST /crm/whatsapp/tags`
- `PATCH /crm/whatsapp/tags/reorder`
- `PATCH /crm/whatsapp/tags/:tagId`
- `DELETE /crm/whatsapp/tags/:tagId`
- `POST /crm/whatsapp/sessions/:sessionId/tags`
- `DELETE /crm/whatsapp/sessions/:sessionId/tags/:tagId`

Tags are plain WhatsApp labels. They are not pipeline columns.

### Pipeline

- `GET /crm/pipelines`
- `POST /crm/pipelines`
- `PATCH /crm/pipelines/:pipelineId`
- `DELETE /crm/pipelines/:pipelineId`
- `PATCH /crm/leads/:leadId/pipeline-stage`

Pipeline definitions are store-scoped and DB-backed. The `leads` row is the
source of truth for a lead's active `pipelineId` and `pipelineStageId`. The
coarse `leads.status` enum remains for filtering, reporting, and compatibility
with existing lead lists; moving a lead to a stage updates both the stage fields
and the mapped lead status through the backend.

Stages store:

- `name`
- `color`
- `slaDays`
- `status`: `open`, `won`, or `lost`
- `leadStatus`: existing V2 lead status mapped for filters and reporting
- `isSystem`
- `sortOrder`

Do not persist operational pipeline position in lead metadata or browser
storage. Metadata may remain as a read fallback for pre-migration leads only.

### Scheduled Messages

- `GET /crm/whatsapp/scheduled-messages`
- `POST /crm/whatsapp/scheduled-messages`
- `POST /crm/whatsapp/scheduled-messages/process-due`
- `DELETE /crm/whatsapp/scheduled-messages/:scheduledMessageId`

One-off schedules already exist. Campaign-generated schedules must link to the
future campaign schema instead of overloading the current `metadata` contract.

### Visits

See `docs/migrations/crm-v2-visits-contract.md`. Visits use `lead_visits` and
V2 `leads.id`; they do not carry financing, test-drive, vehicle-required, or
old Repasses session JSON fields.

### ZAPI Webhooks

- `POST /crm/whatsapp/webhooks/zapi/:connectionId/received`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/delivery`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/status`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/connected`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/disconnected`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/chat-presence`

Outside local/test, callbacks require `CRM_ZAPI_WEBHOOK_TOKEN` via
`x-crm-webhook-token` or `?token=...`.

### Official Meta Webhook

- `GET /crm/whatsapp/webhooks/meta`
- `POST /crm/whatsapp/webhooks/meta`

The mounted public path is `/api/v1/crm/whatsapp/webhooks/meta`. The GET route
performs Meta challenge verification with `CRM_META_WEBHOOK_VERIFY_TOKEN`. The
POST route verifies `X-Hub-Signature-256` against the raw request body with
`CRM_META_APP_SECRET` before parsing any event.

WhatsApp messages and delivery statuses are normalized into the existing
store-scoped CRM session/message model. Instagram messages use channel
`INSTAGRAM`; Instagram receipts are intentionally ignored until a verified
provider contract and monotonic status mapping are implemented. Provider event
keys remain durable and idempotent across webhook retries.
The provider-events panel lists failed ZAPI and official Meta events with their
provider identity. Automated operator replay remains limited to the established
ZAPI event types; official failures stay visible but non-retryable until a
separately tested normalized-event replay contract exists.

Official inbound media is persisted as an opaque provider reference with no
mirrored remote URL. V2 does not fetch provider media URLs from the webhook, so
`media_url` remains empty until a separately authenticated media-resolution
contract is implemented.

### Ad-Initiated Conversations

V2 must preserve the Repasses click-to-WhatsApp behavior without copying raw
provider ad objects into session/message metadata or creating synthetic buyer
messages:

- `externalAdReply` and CTWA referral/context fields are normalized into
  allowlisted session attribution metadata.
- Meta/ZAPI notification callbacks may create or enrich a session with ad
  attribution, but the auto-generated notification is not persisted as a buyer
  message and does not create a false lead activity.
- A buyer message that carries ad context, including the documented LID ad
  fallback, ends an active human takeover before regular bot message delivery.
  Bot integrations receive `intervention_ended` before the buyer `message`
  event so AI continuity includes the handback context. Both events expose the
  same allowlisted `session.adAttribution`; notification-first conversations
  therefore retain the ad identity even when the buyer's next message does not
  repeat provider attribution fields.
- A real phone may replace a LID placeholder only when the same `chatLid`
  proves identity. An unrelated real-phone message must never steal a legacy
  LID session or linked lead.
- The attribution write and intervention transition are tenant/store scoped,
  audited through `crm.whatsapp.ingest`, and idempotent under webhook retries.

This parity slice targets independent used-vehicle stores running paid Meta
acquisition. The customer outcome is that an ad lead retains campaign context
and reaches the automated response flow instead of remaining silently paused.
Leading measures are attributed-ad-session coverage, ad-lead first-response
time, and failed bot-dispatch rate. It remains part of the existing `crm`
entitlement and message allowance; it is not a separate SKU. Provider and
reliability support own failures. In degraded state V2 keeps the truthful stored
session/message state and surfaces dispatch failure through logs/audit; it must
not claim that the bot responded.

## Permission Contract

Use these canonical permissions for new CRM work:

- `crm.messaging.connection.setup`
- `crm.messaging.connection.pair`
- `crm.whatsapp.tags.manage`
- `crm.whatsapp.tags.assign`
- `crm.whatsapp.schedules.read`
- `crm.whatsapp.schedules.create`
- `crm.whatsapp.schedules.cancel`
- `crm.whatsapp.campaigns.read`
- `crm.whatsapp.campaigns.manage`
- `crm.whatsapp.integrations.manage`
- `crm.pipeline.read`
- `crm.pipeline.move`
- `crm.pipeline.manage`
- `crm.visits.read`
- `crm.visits.manage`

Phase 1 normalized the permission catalog, bootstrap capability reader, test
contexts, scheduled-message worker, and current tag/schedule/connection service
checks to these names. Feature workers must not invent alternate spellings.

Existing conversation permissions remain:

- `crm.whatsapp.list`
- `crm.whatsapp.read`
- `crm.whatsapp.send`
- `crm.whatsapp.assign`
- `crm.whatsapp.close`
- `crm.whatsapp.toggle_intervention`
- `crm.whatsapp.ingest`

## Audit And Error Contract

- Every backend service entrypoint accepts `ServiceContext`.
- Mutations call `assertPermission` in the domain service, not only in the
  controller.
- Mutations emit audit through `context.audit.record` or the CRM helper
  `recordWhatsappServiceMutation`.
- Controllers map failures through `handleWhatsapp` and the shared API error
  envelope. Do not return ad hoc `{ message }`.
- Logs and audit metadata must not contain secrets, message bodies, raw ZAPI
  payloads, tokens, or raw database rows.

## Database Contract

Current active tables:

- `crm_connections`
- `crm_tags`
- `crm_sync_events` (schema-only for future import/reconciliation)
- `crm_whatsapp_sessions`
- `crm_whatsapp_messages`
- `crm_whatsapp_session_tags`
- `crm_whatsapp_quick_messages`
- `crm_whatsapp_scheduled_messages`
- `crm_pipelines`
- `crm_pipeline_stages`
- `lead_visits`
- `leads`
- `lead_activities`

Missing/pending tables or fields:

- Campaigns, campaign recipients, campaign metrics, campaign links on scheduled
  messages.

## Frontend Surface Contract

Top CRM surfaces:

- WhatsApp
- Clientes

WhatsApp scoped nav:

- Conversas
- Conexao
- Visitas
- Campanhas
- Integracoes
- Tags

The scoped nav must be compact, without tab subtitles. Badges are only for
useful counts. Connection state is a small indicator, not descriptive tab copy.

Large operational surfaces are pages/sections, not modal dialogs. Modals are
allowed for punctual actions only: new conversation, media picker, vehicle
picker, catalog picker, delete/cancel confirmation.

## Bot Contract

The V2 bot config, action API, and outbound forwarding are active:

- `GET/PATCH /crm/whatsapp/integrations/bot`
- `POST /crm/whatsapp/integrations/bot/actions`

Authentication uses `X-Webhook-Secret`; the secret is write-only and never
returned by API responses. The bot action route creates a bot-scoped
`ServiceContext`, uses V2 UUIDs, checks permissions in services, audits
mutations, and returns stable CRM WhatsApp bot error codes.

Supported external bot events:

- `message`
- `intervention_started`
- `intervention_ended`
- `connection_status_changed`

During `HUMAN_TAKEOVER`, regular `message` forwarding pauses and bot send
actions are rejected with `CRM_WHATSAPP_BOT_ACTION_BLOCKED`. The bot can end
takeover through `set_intervention` with `payload.enabled: false`.

External bot media actions have a single canonical Repasses-style URL contract:

- `send_image`: `payload.imageUrl`
- `send_audio`: `payload.audioUrl`
- `send_document`: `payload.documentUrl`

Do not accept or document base64 media for the external bot API. Base64 belongs
only to the operator/CRM media upload endpoint. Do not migrate MiniBot or
uaZapi legacy payload compatibility as the V2 bot contract.
