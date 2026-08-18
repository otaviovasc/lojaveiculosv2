# Worker D — source scan (historical)

This worker note records rejected Repasses source behavior. It is not a
description of the current V2 CRM architecture and must not be used to choose
providers, tables, permissions, routes, or bot semantics.

## Rejected source behavior

- Evolution polling and provider switching.
- Meta Cloud provider identity replacing the canonical
  `meta_cloud` provider plus `composio` broker separation.
- Old agent/bridge authentication, numeric route IDs, and compatibility
  payloads.
- MiniBot implementation tables/controllers/UI.
- Pipeline meaning encoded in tags (`isColumn`).

## Current V2 translation rule

Only behavior that has been translated into V2 UUIDs, store/tenant scope,
canonical channel connections, channel-neutral permissions, explicit
`ServiceContext`, audit, idempotency, and fail-fast provider handling may be
used. The active target is defined by the integration contract and ADRs 0060
and 0061. Historical source filenames and paths remain unchanged for
traceability.
