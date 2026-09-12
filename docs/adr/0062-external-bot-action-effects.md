# ADR 0062 — External bot action effects

## Decision

External bot actions use one typed registry. Provider delivery actions are
recorded separately from CRM-owned internal effects. `task.create` and
`appointment.create` persist tenant/store/thread/cycle-scoped records in
`crm_tasks` and `crm_appointments`; `crm_external_bot_internal_effects` is the
idempotent receipt for those internal operations.

All action execution is guarded by the canonical route, connection readiness,
capability, attendance, revision, permission, and rate-limit checks. Proposal
mode queues an action and does not execute it until explicitly approved.

Template actions use the server-owned Brazilian Portuguese locale `pt_BR`.

## Consequences

- Provider effects cannot be mistaken for CRM work completion.
- Duplicate commands converge through scoped command/idempotency uniqueness.
- The migration fails if legacy CRM operational data would be discarded.
