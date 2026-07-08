# CRM V2 Bot Contract

Last updated: 2026-07-08

The V2 bot contract is implemented through:

- `GET /crm/whatsapp/integrations/bot`
- `PATCH /crm/whatsapp/integrations/bot`
- `POST /crm/whatsapp/integrations/bot/actions`

Outbound webhook forwarding is active for configured integrations.

- Bot action API authenticates with `X-Webhook-Secret`.
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
and a compact summary for handback context.

Do not migrate MiniBot or uaZapi legacy payload compatibility as the V2 bot
contract. They remain behavior evidence only unless a later product decision
adds an explicit compatibility owner and removal plan.
