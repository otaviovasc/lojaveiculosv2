# CRM V2 Migration Status

Last reviewed: 2026-08-18

This file records the current cutover state. Historical worker completion logs
and superseded TODOs are not a runtime contract.

## Current state

The canonical CRM model is implemented in the current checkout: a store-scoped
external authorization can project to independent marketplace and CRM channel
connections. CRM routes resolve `channel`, `provider`, and `broker` separately;
the supported triples are `whatsapp/meta_cloud/composio`,
`instagram/meta_cloud/composio`, `whatsapp/zapi/direct`, and
`olx_chat/olx/direct`.

The operational projection uses contacts, conversation threads, conversation
cycles, attendances, messages, channel connections, tags, schedules, campaigns,
and external-bot command/effect tables. The active permission catalog is
channel-neutral (`crm.conversations.*`, `crm.messages.*`, `crm.tags.*`,
`crm.scheduled_messages.*`, `crm.campaigns.*`, `crm.bot.*`,
`crm.attendances.manage`, and `crm.messaging.connection.*`).

The external bot is store-scoped and singular: one configured external bot per
store. Its policies and actions are independent of provider selection and are
authorized by the server before any provider effect.

## Cutover gate

Migration `0059_canonical_crm_multichannel_names.sql` is reset-only. Before it
runs, the operator must reset the approved non-production/staging target at the
cutover checkpoint. The migration fails closed if any superseded operational
table still contains rows; it does not rename populated legacy data or perform
an implicit backfill. Historical source mappings remain documented separately
in `v1-crm-whatsapp-import.md` and are not current target schema.

## Current routes

The implemented API still exposes some WhatsApp-qualified HTTP paths for the
current web surface, including conversation, message, webhook, schedule, tag,
and bot endpoints. These path literals do not change the canonical model:
authorization and routing use the selected channel connection, and persistence
uses the channel-neutral tables above. The generic connection routes are:

- `GET /api/v1/crm/channel-connections`
- `POST /api/v1/crm/channel-connections`
- `PATCH /api/v1/crm/channel-connections/:connectionId`
- `POST /api/v1/crm/channel-connections/:connectionId/composio/authorize`
- `POST /api/v1/crm/channel-connections/:connectionId/composio/complete`

Provider callbacks are channel-specific: ZAPI uses connection-scoped callback
paths, Meta uses the signed shared `/api/v1/crm/webhooks/meta` callback, and
OLX lead delivery uses `/api/v1/crm/webhooks/olx/:connectionId/leads`.

## Operational truth

- A route is selectable only when its connection is ready and has the required
  capability.
- Missing, disconnected, pending, or capability-incomplete routes fail closed;
  provider failures never fall back to another provider and never report
  synthetic success.
- The realtime broker is delivery infrastructure, not conversation state. When
  it is unavailable, the persisted projection remains authoritative and the UI
  must reconcile rather than fabricate an update.
- Human attendance blocks automatic bot effects immediately before dispatch.
- Provider credentials and bot secrets are write-only or referenced by server
  configuration; they are not documented or returned as values.

## Remaining evidence

Code-level contracts and focused tests exist for canonical schema names,
provider triples, route readiness, permission normalization, external-bot
authorization, and reset-only migration behavior. Production sign-off still
requires the documented staging rehearsal, scheduled-worker verification,
provider webhook evidence, Redis replay/recovery evidence, and design-partner
acceptance. This document does not claim those gates are complete.

See:

- `docs/migrations/crm-v2-integration-contracts.md`
- `docs/migrations/crm-v2-smoke-checklist.md`
- `docs/adr/0060-canonical-conversation-model.md`
- `docs/adr/0061-external-authorization-and-channel-connections.md`
