# CRM V2 smoke checklist

Use this checklist for the canonical multi-channel CRM cutover. It validates
truthful routing and store scope; it does not authorize production enablement.

## Preflight and cutover

- Read ADR 0060, ADR 0061, and the integration contract.
- Confirm the target environment is the approved reset checkpoint.
- Confirm migration `0059_canonical_crm_multichannel_names.sql` fails closed
  when any superseded operational table has rows.
- Confirm no production reset or migration is run without the explicit operator
  approval required by the release procedure.

## Connection and routing

- List connections through `GET /crm/channel-connections` and verify every DTO
  has `channel`, `provider`, `state`, `readiness`, `capabilities`, and
  `isDefault`.
- Verify only these triples are accepted: `whatsapp/meta_cloud/composio`,
  `instagram/meta_cloud/composio`, `whatsapp/zapi/direct`, and
  `olx_chat/olx/direct`.
- Verify defaults are store-scoped and channel-scoped.
- Verify a pending, disconnected, paused, or capability-incomplete connection
  is visible as unavailable and cannot be selected.
- Verify a provider failure does not retry through another provider or report
  success.
- Verify ZAPI, Meta, and OLX callbacks reject invalid authentication and retain
  only bounded, sanitized data.

## Conversations and messages

- Verify conversation threads remain bound to the receiving channel connection.
- Verify reads, assignment, close/reopen, attendance, tags, messages, and media
  mutations are tenant/store scoped and audited.
- Verify human attendance blocks automatic bot effects immediately before send.
- Verify the persisted conversation projection remains authoritative when the
  realtime broker is unavailable; the UI shows reconnect/reconciliation state.
- Verify inbound and outbound failures use the shared error envelope and never
  show synthetic provider success.

## Permission contract

- Verify current checks use `crm.conversations.*`, `crm.messages.*`,
  `crm.tags.*`, `crm.scheduled_messages.*`, `crm.campaigns.*`, `crm.bot.*`,
  `crm.attendances.manage`, `crm.messaging.connection.*`, and the pipeline/
  visit keys documented in the integration contract.
- Verify the retired provider-specific permission keys are not in the active
  catalog or new docs.
- Verify entitlement checks remain separate from actor permissions.

## External bot

- Configure one external bot per store and verify the secret is write-only.
- Verify bot actions use a bot-scoped `ServiceContext`, UUIDs, store scope,
  permissions, audit, idempotency, and the configured channel route.
- Verify policies support `auto`, `proposal`, and `disabled` and that human
  takeover blocks automatic provider effects.
- Verify no provider secret, bot secret, message body, or raw payload appears in
  logs, audit metadata, errors, or API responses.

## Workers and recovery

- Run the scheduled-message worker with a bounded store scope and verify it uses
  the same channel route/readiness/capability checks as an authenticated call.
- Verify external-bot effects are durable, idempotent, retryable only under the
  documented policy, and observable without exposing customer content.
- Verify retention and cleanup jobs use canonical table names and preserve legal
  holds.

## Final gate

- Run the repository document/link/format checks and the stale-term scan.
- Record environment, route/provider triple, result, request id, and failure
  evidence without recording secrets, personal data, message bodies, or raw rows.
- Do not mark the CRM commercially ready until staging rehearsal, provider
  evidence, broker recovery, support ownership, and design-partner acceptance
  are complete.
