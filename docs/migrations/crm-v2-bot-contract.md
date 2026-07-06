# CRM V2 Bot Contract

Last updated: 2026-07-06

The V2 bot config foundation exists at
`GET/PATCH /crm/whatsapp/integrations/bot`. The action API and outbound
forwarding are not implemented yet. When implemented:

- Bot action API authenticates with `X-Webhook-Secret`.
- Secret values are write-only.
- Bot actor creates a scoped `ServiceContext`.
- Human takeover pauses regular bot forwarding.
- Bot sends are blocked during takeover with a stable error unless ending
  intervention.
- V2 UUIDs are used for sessions, leads, tags, visits, and campaigns.

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

Do not migrate MiniBot as the V2 bot contract. MiniBot remains behavior
evidence unless a later slice explicitly revives it.
