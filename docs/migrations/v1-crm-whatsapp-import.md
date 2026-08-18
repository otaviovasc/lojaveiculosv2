# V1 Repasses CRM WhatsApp Import (historical source mapping)

Last updated: 2026-07-27

## Scope And Outcome

- Target segment: V1 stores already operating WhatsApp CRM through the
  Repasses backend.
- Customer outcome: assignments, conversations, messages, and historical media
  remain available after V2 cutover and every conversation connects to a
  V2-native lead.
- Leading metric: exact parity for selected connections, imported V2 sessions,
  messages, and messages with media URLs; report lead and assignment link rates.
- Billing/entitlement: the importer does not change billing. Runtime access
  continues to use the server-owned `crm` entitlement.
- Support owner: migration operator running the V1-to-V2 rehearsal/cutover.
- Degraded state: unmapped agents leave a session unassigned; missing Z-API
  credentials produce a disconnected V2 connection. Conflicting V1 sync
  identifiers are never guessed: the importer creates a source-traceable
  WhatsApp lead instead. The importer never reports provider success in those
  states.

This is an anti-corruption import into the existing V2 model. The source names
in this document are historical vocabulary only; they are not current V2 table,
permission, provider, or route names. It does not add
legacy columns, numeric-id contracts, Repasses agent semantics, or runtime
compatibility branches to V2.

## Source To Target Map

| Repasses source             | V2 target                                              | Import rule                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connections`               | `crm_channel_connections`                              | Import store-scoped WhatsApp channel connections with provider `zapi` and broker `direct`. The legacy UUID becomes the external reference. Stored instance credentials are translated to the V2 credential-reference shape; credential values are never logged or copied into migration metadata. Connections remain paused unless the operator explicitly selects cutover activation. |
| `crm_agents`                | existing `users`                                       | No legacy agent row is created. Resolve through Clerk user id first, then a unique normalized email from the already-migrated V1 store access.                                                                                                                                                                                                                                         |
| `chat_sessions`             | `crm_conversation_threads` + `crm_conversation_cycles` | Use deterministic V2 UUIDs. Normalize Brazilian phone variants; use the WhatsApp LID as a stable fallback when the phone is empty. Preserve only supported assignment, queue/read timestamps, profile URL, preview, and source/status metadata.                                                                                                                                        |
| V1 `Lead` + `chat_sessions` | canonical thread/cycle lead link                       | Prefer V1 `Lead.crm_session_id`, the identity bridge written by the old lead-sync job. Then use a valid Repasses `source_lead_id`, followed by one unambiguous normalized phone alias. Never guess when identifiers conflict.                                                                                                                                                          |
| unmatched `chat_sessions`   | `leads` + canonical contact/thread                     | Create one deterministic V2-native lead/contact for each unmatched normalized source group, then link the canonical conversation records. This covers LID-only contacts without fabricating a phone number.                                                                                                                                                                            |
| `messages`                  | `crm_messages`                                         | Preserve supported direction, sender kind, type, status, timestamps, content, deletion state, provider ids, and sanitized legacy references.                                                                                                                                                                                                                                           |
| `messages.media_url`        | canonical message media reference                      | Keep the existing URL as historical metadata. Historical objects are not downloaded or re-uploaded; new V2 media uses the V2 R2 storage path.                                                                                                                                                                                                                                          |

Legacy `WAITING_RESPONSE` maps to V2 `ACTIVE`. A soft-deleted legacy session
maps to `EXPIRED` with its legacy deletion provenance retained in metadata.
Unsupported providers stop the import instead of reshaping V2.

## MB Auto Store Rehearsal Baseline

The supplied Repasses dump and Loja V1 archive contain one CRM connection for
V1 store `200`:
legacy connection `30`, Z-API, with 3 agents, 788 sessions, 26,261 messages,
and 13,171 media URLs. The provided MB account email resolves to a Clerk-linked
agent on that connection. All 28 sessions with an empty phone have distinct
WhatsApp LIDs, so they can be represented without inventing shared contacts.
Store `200` has 917 V1 leads; 760 carry a unique `crm_session_id` from the old
lead-sync job, and 758 of those sessions belong to this Repasses connection.
The rollback-only full-sample target rehearsal imported all 788 sessions,
26,261 messages, and 13,171 media URLs through the real V2 constraints. It
linked 758 sessions to their exact migrated V1 lead and created 30 deterministic
V2 WhatsApp leads for the unmatched sessions, producing 788/788 lead coverage.
With the three legacy agents mapped to V2 users, 785/788 assignments resolved.

These counts are a rehearsal baseline, not a production success statement.
The script checks target parity inside the same transaction and rolls the whole
run back by default.

## Operator Flow (historical importer; reset-only target)

Run:

```bash
pnpm run migration:v1-store
```

The first prompt selects one or several modules (or `all`). Selecting the
historical `whatsapp` source module then asks for both the Loja Veiculos V1 archive and the Repasses CRM
archive before the remaining store/tenant values. A first import must include
`leads`; a source-only rerun is accepted when the deterministic V1 leads
already exist in V2.

The script restores only the four required Repasses tables into an ephemeral
local Postgres container. This avoids importing the unrelated Repasses schema
or requiring its pgvector extension.

The replacement prompt defaults to `yes`. Inside the same migration transaction
it removes the target store's canonical conversation, message, tag-link,
links, scheduled messages, campaigns/recipients, and previously generated
source-only leads before recreating source history. It does not delete V2
quick-message templates, tag definitions, or connection integrations. The
source connection reuses an existing V2 connection when its external id,
instance id, display name, or the unambiguous single-Z-API fallback matches;
otherwise the importer creates its deterministic connection id.

For cutover:

1. Run a dry rehearsal and review parity plus lead/assignment link rates.
2. Ensure `CRM_ZAPI_CLIENT_TOKEN` is available to the migration process and
   configured in the V2 API environment. Applied imports refuse cutover
   activation when this value is absent.
3. Freeze or drain Repasses ingress briefly, take the final dump, and apply the
   importer.
4. Switch the Z-API webhook to V2 before reopening message handling; do not let
   both backends own ingress.
5. Smoke inbound/outbound text and media. Historical URLs remain on their V1
   origins; new uploads must resolve through the configured V2 R2 public base.
6. If verification fails, keep Repasses as source of truth and rerun from the
   rehearsed backups after correcting the mapping or configuration.

For the planned MB Auto Store staging rerun, keep the default replacement
answer. The deletion, import, and parity checks commit together only when
`Apply writes?` is confirmed; dry runs exercise the same replacement and roll
it all back. Deterministic ids and upserts make a repeated import safe for the
same source records, but the operator still owns the write-freeze boundary and
acceptance.
