# CRM V2 Bot Contract

Last updated: 2026-09-11

The V2 bot contract is implemented through:

- `GET /crm/whatsapp/integrations/bot`
- `PATCH /crm/whatsapp/integrations/bot`
- `POST /crm/whatsapp/integrations/bot/actions`

Outbound webhook forwarding is active for configured integrations.

- Bot action API authenticates with `Authorization: Bearer <apiToken>`.
- `webhookSecret` signs outbound event deliveries with the `x-crm-bot-*`
  headers; it is not accepted as the action API credential.
- Secret values are write-only.
- Bot actor creates a scoped `ServiceContext`.
- Human takeover pauses regular `message` event forwarding.
- Bot sends are blocked during takeover with a stable error unless ending
  intervention.
- V2 UUIDs are used for sessions, leads, tags, visits, and campaigns.
- Media bot actions use one public contract:
  - `send_image` requires `payload.imageUrl`.
  - `send_audio` requires `payload.audioUrl`.
  - `send_document` requires `payload.documentUrl`.
  - base64 media is only for the operator/CRM media upload endpoint, not the
    external bot API.
- `send_text` supports an existing `sessionId` or `connectionId` plus
  `payload.phone`, matching Repasses outbound bot behavior while storing the
  V2 message with `senderType: AI`.
- ZAPI connection lifecycle changes dispatch `connection_status_changed` without
  fake `chat` or `session` fields.

Required actions:

- `send_text`
- `send_image`
- `send_audio`
- `send_document`
- `add_note`
- `schedule_message`
- `create_tag`
- `assign_tag`
- `remove_tag`
- `set_intervention`
- `update_session`
- `close_session`
- `get_session`
- `list_tags`
- `set_visita`
- `remove_visita`
- `check_connection`

Forwarded events:

- `message`
- `intervention_started`
- `intervention_ended`
- `connection_status_changed`

During `HUMAN_TAKEOVER`, V2 does not forward regular `message` events to the
bot. When intervention ends, the payload may include duration, message count,
and a compact summary for handback context. Ad-originated sessions also include
an allowlisted `session.adAttribution` object on intervention and message events
so the bot can resume with the originating ad context; raw ZAPI ad objects are
not part of the bot contract.

Do not migrate MiniBot or uaZapi legacy payload compatibility as the V2 bot
contract. They remain behavior evidence only unless a later product decision
adds an explicit compatibility owner and removal plan.

## External bot reply grant (message.send_text)

An inbound `message` event grants the bot a bounded, single-use
`message.send_text` capability so it can reply within the originating
conversation. Outbound `message` events and intervention-end events retain the
existing `conversation.summarize` grant.

To reconstruct the action request, the delivered event payload now carries the
non-PII fields the bot needs alongside the scope already present on the event:

- `action` — the granted action name (`message.send_text`).
- `expectedRevision` — the conversation-cycle revision the grant is bound to.
- `expectedAttendanceRevision` — the attendance revision the grant is bound to.
- `idempotencyKey` — the idempotency key the bot must echo back.

These are validated before delivery and never contain message text or personal
data.

### Digest normalization

The action request digest binds scope, revisions, attendance, action, and
idempotency. For `message.send_text` only, the dynamic reply `text` is excluded
from the digest because the bot composes it after receiving the event; every
other command keeps its exact payload so internal-action digests are unchanged.
The text is still subject to command PII and operational-safety validation at
execution time, and the grant remains single-use with a 90-second expiry.

### Provider effect execution

`message.send_text` effects are queued into
`crm_external_bot_provider_effects` and processed by the
`crm:bot:effects:process` worker, which calls the provider through the
server-owned messaging gateway and records the canonical provider operation.
The worker reports `provider_succeeded` only after the provider returns an
official operation id; a failed or indeterminate provider result is recorded as
retryable, dead-letter, or indeterminate, never as synthetic success.
