# CRM V2 Integration Contracts

Last updated: 2026-07-06

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

- V2 owns the migrated WhatsApp runtime: sessions, messages, sends, ZAPI
  webhooks, ticketed SSE, tags, quick messages, catalog sends, vehicle sends,
  assignment, read/unread state, intervention state, scheduled one-off
  messages, and failed provider-event retry.
- Repasses repos are behavior references and future import sources only. Do not
  call Repasses at runtime for migrated WhatsApp paths.
- Repasses public CRM APIs are numeric-id heavy; V2 slices expose V2 UUIDs.
- ZAPI is the only WhatsApp provider in V2. Do not add Evolution, Meta Cloud
  API, or generic provider switching.
- V2 `leads.id` is the CRM identity anchor for pipeline, visits, activities,
  WhatsApp linking, campaign recipients, and lead detail navigation.
- Old CRM agents do not exist in V2. Use V2 users/store members and permission
  keys.

## API Routes

All routes are under `/api/v1/crm`.

### Connections

- `GET /crm/whatsapp/connections`
- `PATCH /crm/whatsapp/connections/:connectionId`

Connection responses include six generated ZAPI webhook endpoints:

- `received`
- `delivery`
- `status`
- `connected`
- `disconnected`
- `chat-presence`

Credential values are write-only. The UI may display env var reference names
and saved metadata, but never render tokens or secrets.

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
search, unread-only, limit, and offset. Lead detail screens must resolve
existing WhatsApp sessions through `leadId` before creating a new conversation.

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

### ZAPI Webhooks

- `POST /crm/whatsapp/webhooks/zapi/:connectionId/received`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/delivery`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/status`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/connected`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/disconnected`
- `POST /crm/whatsapp/webhooks/zapi/:connectionId/chat-presence`

Outside local/test, callbacks require `CRM_ZAPI_WEBHOOK_TOKEN` via
`x-crm-webhook-token` or `?token=...`.

## Permission Contract

Use these canonical permissions for new CRM work:

- `crm.whatsapp.connection.manage`
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
- `lead_visits` (schema-only until the visits slice lands)
- `leads`
- `lead_activities`

Missing/pending tables or fields:

- Campaigns, campaign recipients, campaign metrics, campaign links on scheduled
  messages.
- Bot integration config with write-only webhook secret.
- Explicit visit service/repository surface over `lead_visits`.

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

The active V2 bot contract is not implemented yet. Worker J must read
`docs/migrations/crm-v2-bot-contract.md` before starting. Do not migrate
MiniBot as the V2 bot contract; MiniBot remains behavior evidence unless a later
slice explicitly revives it.
