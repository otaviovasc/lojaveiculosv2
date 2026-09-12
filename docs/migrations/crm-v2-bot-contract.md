# CRM V2 External Bot Contract

Last updated: 2026-09-12

## Configuration

External bots are configured as store-scoped profiles:

- `GET /api/v1/crm/bot/profiles`
- `POST /api/v1/crm/bot/profiles`
- `PATCH /api/v1/crm/bot/profiles/:profileId`
- `GET /api/v1/crm/bot/profile-assignments`
- `PATCH /api/v1/crm/bot/profile-assignments/:connectionId`

Each profile owns a webhook URL, an API/action bearer token, and an HMAC
signing secret. A profile can be assigned to multiple channel connections. A
connection without an explicit assignment uses the enabled default profile.

The previous single integration configuration is migration input only. It is
not part of the V2 runtime API or frontend setup flow.

## Authentication and signing

- Bot actions use `Authorization: Bearer <apiToken>` at
  `POST /api/v1/crm/bot/actions`.
- The API token authenticates the external bot when it calls V2.
- The HMAC secret authenticates events sent by V2 to the bot. It is not an API
  token and is never accepted as an action credential.
- Secret values are write-only. The same HMAC value must be configured in V2
  and in the external bot verifier.
- Outbound events include `x-crm-bot-body-sha256`, `x-crm-bot-nonce`,
  `x-crm-bot-signature=v1=<hex>`, and `x-crm-bot-timestamp`.

## Events and reply flow

V2 forwards `message_received`, `human_attendance_changed`,
`connection_state_changed`, and `thread_state_changed` events. An inbound
message event contains the scoped connection/thread identifiers, bounded
`messageText` when available, message reference, revision fields, and a
single-use grant.

An inbound message grant authorizes `message.send_text` for that originating
conversation. The bot must echo the event scope, grant metadata, revisions,
idempotency key, and authorized request digest when calling `/bot/actions`.
The reply text is dynamic and is excluded from the grant digest only for
`message.send_text`; it remains subject to PII and command safety validation.

Grants are single-use and expire after 90 seconds. Human takeover, changed
conversation revisions, disabled profiles, and policy/kill switches cancel or
reject the operation.

## Supported V2 actions

Implemented actions are:

- `message.send_text` — `{ text }`
- `message.send_media` — `{ mediaType, mediaUrl, caption? }`
- `message.send_template` — `{ templateName, language: "pt_BR", variables }`
- `fact.record` — `{ classification, summary }`
- `vehicle_interest.record` — `{ vehicleRef, interestLevel }`
- `appointment.create` — `{ startsAt, summary? }`
- `opportunity.open` — `{ summary }`
- `task.create` — `{ title, dueAt? }`
- `handoff.request` — `{ reason }`
- `conversation.summarize` — `{ summary }`

These V1 actions are not currently V2 actions: notes, scheduling, tag
management, session reads/updates/close, visits, financing, and connection
health checks. They must not be advertised as available until V2 has matching
authorization, persistence, and audited effect paths.

`POST /api/v1/crm/bot/test` is a dry run. It never performs an official
provider operation and must report `officialOperationOccurred: false`.

## Provider effects

Provider sends are queued in `crm_external_bot_provider_effects` and processed
by the `crm:bot:effects:process` worker through the server-owned messaging
gateway. V2 reports provider success only after the provider returns an
official operation id; failed and indeterminate results remain explicit.
