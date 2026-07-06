# CRM V2 Orchestrator Notes

Last updated: 2026-07-06

## Role

The orchestrator owns contracts, worker sequencing, diff review, merge order,
conflict resolution, validation, and evidence. The orchestrator should not
implement broad features directly unless a worker is blocked by a small shared
contract fix.

## Active Contract Files

- `docs/migrations/crm-v2-migration-map.md`
- `docs/migrations/crm-v2-status.md`
- `docs/migrations/crm-v2-integration-contracts.md`
- `docs/migrations/crm-v2-smoke-checklist.md`

## Current Branch

`feat/crm-v2-migration-control-plane`

## Worker Prompt Template

```text
You are Worker [X] for the Loja Veiculos V2 CRM migration.

Your scope:
[exact vertical slice]

Owned files:
[files/folders]

Avoid editing:
[shared files unless orchestrator approves]

Before editing:
1. Read docs/migrations/crm-v2-migration-map.md.
2. Read docs/migrations/crm-v2-integration-contracts.md.
3. Inspect source and target with rg.
4. Write a short implementation note in docs/migrations/workers/[worker].md.

Rules:
- Work only on your slice.
- Do not redesign contracts owned by other workers.
- If you need a shared contract change, document it and stop.
- Every backend mutation needs permission, ServiceContext, audit, and stable
  errors.
- Secrets are write-only.
- ZAPI only.
- No old Repasses agents.
- No placeholder UI.

Verification:
- Run focused typecheck/tests for affected workspace.
- Run browser/Playwright verification for UI.
- Save evidence paths.

Final output:
- commit hash
- files changed
- commands run
- evidence paths
- blockers
```

## Merge Order

1. Control-plane docs.
2. Shell/nav cleanup.
3. Connection page.
4. Tags page.
5. Permission normalization.
6. Pipeline persistence.
7. Lead/WhatsApp identity.
8. Visits.
9. Scheduled messages page.
10. Integrations/bot.
11. Campaign backend.
12. Campaign UI.
13. QA/mobile/evidence.

## Review Checklist

- No Repasses runtime dependency added for migrated paths.
- No Evolution/Cloud API provider code copied into V2.
- No `isColumn` or pipeline semantics in tags.
- Permission names match the active contract or a documented normalization
  bridge.
- Backend service entrypoints accept `ServiceContext`.
- Mutations assert permissions in the service.
- Mutations audit success/failure.
- Controllers use stable error mapping.
- Secrets are not logged, rendered, snapshotted, or returned.
- UI has empty/loading/error/permission states.
- UI avoids large operational modals.
- Focused tests and screenshots/evidence are attached.
