# Loja Veículos V2 — CRM language

This glossary is the canonical vocabulary for the multi-channel CRM. A
provider account can support more than one product projection, so provider
authentication and marketplace readiness must never be treated as CRM Chat
readiness.

| Term                   | Meaning                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| channel                | A customer communication surface: `whatsapp`, `instagram`, or `olx_chat`.                                                                               |
| provider               | The transport behind a channel: `meta_cloud`, `zapi`, or `olx`.                                                                                         |
| external authorization | Provider account authorization, credentials, scopes, and capabilities.                                                                                  |
| marketplace account    | The inventory/listing projection of an external authorization. It is separate from CRM communication.                                                   |
| CRM channel connection | A store-scoped, channel-specific communication route derived from an external authorization. It is selectable only when its CRM readiness is confirmed. |
| conversation thread    | The durable customer conversation, bound to the receiving CRM channel connection.                                                                       |
| conversation cycle     | A bounded interaction period within a conversation thread.                                                                                              |
| attendance             | The human/bot handling state of a conversation cycle. Human takeover blocks automatic provider effects.                                                 |
| message                | An inbound or outbound communication in the canonical thread/cycle model.                                                                               |
| route                  | The selected connection for an operation after channel, readiness, and capability validation.                                                           |
| capability             | A provider feature that is currently operational for a connection. Readiness is not inferred from provider names.                                       |
| external bot action    | A typed action requested by the external bot and authorized by the server.                                                                              |
| proposal               | An explicitly queued internal review action. Proposal mode does not execute the provider effect.                                                        |
| internal effect        | A durable CRM-owned result of an external bot action, separate from provider delivery effects.                                                          |
| task / appointment     | Canonical CRM work records created by `task.create` and `appointment.create`, scoped to the same tenant, store, thread, and cycle.                      |

Canonical relationship:

```text
external_account_authorization
        ├── marketplace_account
        └── crm_channel_connection
```

Avoid generic `crm_connections`, `session`, and `buyer` names in new
multi-channel code. `whatsapp` remains valid only when the behavior is truly
WhatsApp-specific; channel-neutral persistence and services use `channel`.

Canonical persistence is limited to `crm_channel_connections`, the
`crm_conversation_*` thread/cycle/attendance/message tables, routing policies,
and the `crm_external_bot_*` action, proposal, attempt, provider-effect, and
internal-effect tables. Bot-created work uses `crm_tasks` and
`crm_appointments`; provider effects and internal CRM effects are never
interchangeable.
