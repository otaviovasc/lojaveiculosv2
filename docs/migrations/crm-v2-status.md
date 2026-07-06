# CRM V2 Migration Status

Last updated: 2026-07-06

Branch: `feat/crm-v2-migration-control-plane`

## Current Phase

Phase 1: Foundation guardrails and Wave 1 worker integration.

## Completed This Pass

- Read repo rules, repo organization, architecture, and migration docs.
- Confirmed existing HTML control docs:
  `v2-backend-doc.html`, `v2-plan.html`,
  `v2-vehicle-detail-primitives-plan.html`.
- Confirmed current V2 CRM code already owns substantial WhatsApp runtime.
- Confirmed source repos are present:
  `../repasses-frontend`,
  `../repasses-lojaveiculos-backend`.
- Created active Markdown control plane:
  `docs/migrations/crm-v2-migration-map.md`,
  `docs/migrations/crm-v2-status.md`,
  `docs/migrations/crm-v2-integration-contracts.md`,
  `docs/migrations/crm-v2-smoke-checklist.md`.
- Committed Phase 0 control-plane docs in `7b579eb`.
- Spawned non-Spark Wave 1 workers on `gpt-5.5` high in in-repo worktrees.
- Normalized CRM operation permission names for connection, tags, schedules,
  campaigns, integrations, pipeline, and visits.
- Merged Wave 1 worker branches:
  - `8a83402` merged Worker A shell/nav (`f34bad1`).
  - `30b9b78` merged Worker B connection page (`cdbca27`).
  - `ad560d9` merged Worker C tags page (`4acd701`).
  - `5ffd509` merged Worker D source scan (`a8e924e`).
- Fixed the integrated Tags surface so embedded mode renders as a page section,
  not dialog chrome; delete confirmation remains the punctual modal.

## Key Findings

- V2 schema already has ZAPI-only `crm_connections`, normalized `crm_tags`,
  normalized session tags, WhatsApp sessions/messages, quick messages,
  scheduled messages, and `lead_visits`.
- Scheduled-message backend support exists; the missing work is the store-wide
  operations page and future campaign linkage.
- V2 permission catalog and current tag/schedule/connection services now use
  the active V2 permission contract names.
- Pipeline config remains browser-local through
  `apps/web/src/features/crm/crmPipelineStorage.ts`.
- Visits are schema-only today: `lead_visits` exists, but no
  service/controller/repository references it in `apps/api/src`.
- `crm_sync_events` exists in schema but is not used by migrated runtime CRM
  code.
- Campaigns and external bot integration are not implemented in V2.
- `CrmWhatsappScopedNav.tsx` is now compact, without tab subtitles, and uses
  `Conexao`.
- `CrmWhatsappScopedSections.tsx` still contains placeholder cards for visits,
  integrations, and campaign depth. These must not be treated as done.
- Repasses backend still contains Evolution, old agents, MiniBot, and campaign
  logic. Only behavior should be ported; runtime semantics must be V2-native.
- Repasses public CRM contracts still route mostly by numeric ids. V2 slices
  must expose V2 UUIDs.

## Active Risks

- Parallel workers can easily invent conflicting permission or API names.
- Campaign work depends on stable pipeline, tag, lead identity, and schedule
  contracts.
- Visit work depends on lead/WhatsApp identity resolution.
- The HTML dashboards include some historical/stale CRM details. Use
  `docs/migrations/crm-v2-integration-contracts.md` as the active contract.
- Known stale HTML details: a CRM tag column flag mention and one older note
  still describing scheduled messages as pending.

## Proposed Worker Waves

Wave 1:

- Worker A: shell/nav cleanup. Completed in `f34bad1`; merged by `8a83402`.
- Worker B: connection page. Completed in `cdbca27`; merged by `30b9b78`.
- Worker C: tags page. Completed in `4acd701`; merged by `ad560d9`.
- Worker D: dead provider/source scan and docs updates. Completed in
  `a8e924e`; merged by `5ffd509`.

Wave 2:

- Worker E: permission normalization and service helper compatibility.
  Implemented by orchestrator because it unblocks all later shared contracts.
- Worker F: pipeline persistence.
- Worker G: scheduled messages page.

Wave 3:

- Worker H: lead/WhatsApp identity link.
- Worker I: visits backend/UI.
- Worker J: integrations/bot contract.

Wave 4:

- Worker K: campaign backend.
- Worker L: campaign UI.
- Worker Q: Playwright/evidence/mobile polish.

## Command Log

Commands run:

```bash
git status --short
git branch --show-current
git switch -c feat/crm-v2-migration-control-plane
rg --files apps/web/src apps/api/src packages docs | rg 'crm|whatsapp|lead|visit|campaign|permission|audit|zapi|schedule|tag'
find ../repasses-frontend -maxdepth 4 -type f
find ../repasses-lojaveiculos-backend -maxdepth 5 -type f
rg -n 'CRM|WhatsApp|ZAPI|Repasses' v2-plan.html v2-backend-doc.html
rg -n 'crm\.whatsapp\.(tag\.(manage|assign)|schedule\.(read|create|cancel|process)|connection\.update_(credentials|metadata|status|webhooks))' packages/shared/src apps/api/src apps/web/src docs
pnpm --filter @lojaveiculosv2/web test -- crmWhatsappPermissions.test.ts
pnpm --filter @lojaveiculosv2/api test -- accessPolicy crm.whatsapp.connections.test crm.whatsapp.tags.test crm.whatsapp.scheduled
pnpm --filter @lojaveiculosv2/api typecheck
pnpm --filter @lojaveiculosv2/web typecheck
pnpm run check:lines
pnpm exec prettier --check packages/shared/src/index.ts apps/api/src/domains/crm/services/CrmWhatsapp/listWhatsappConnections.ts apps/api/src/domains/crm/services/CrmWhatsapp/whatsappScheduledMessageProcessor.ts apps/api/src/domains/crm/services/CrmWhatsapp/whatsappScheduledMessages.ts apps/api/src/domains/crm/services/CrmWhatsapp/whatsappSessionTags.ts apps/api/src/domains/crm/services/CrmWhatsapp/whatsappTagManagement.ts apps/api/src/domains/identity/domain/crmWhatsappAccessPermissions.ts apps/api/src/domains/identity/domain/crmWhatsappPermissionCatalog.ts apps/api/src/features/crm/controllers/crm.whatsapp.controller.support.ts apps/api/src/features/crm/controllers/crm.whatsapp.controller.testSupport.ts apps/api/src/features/crm/controllers/crm.whatsapp.readOnlyMutations.test.ts apps/api/src/jobs/processCrmWhatsappScheduledMessages.ts apps/web/src/features/crm/crmWhatsappPermissions.ts apps/web/src/features/crm/crmWhatsappPermissions.test.ts docs/identity-permissions.md docs/migrations/crm-v2-integration-contracts.md docs/migrations/crm-v2-smoke-checklist.md docs/migrations/crm-v2-status.md docs/migrations/workers/orchestrator.md
pnpm --filter @lojaveiculosv2/web test -- CrmModule.test.tsx crmWhatsappConnectionStatus.test.ts CrmWhatsappQueueToolbar.test.tsx crmWhatsappApiExtras.test.ts CrmWhatsappTagManager.test.tsx crmWhatsappPermissions.test.ts CrmWhatsappSessionDetailsPanel.test.tsx
pnpm --filter @lojaveiculosv2/web typecheck
pnpm run validate:core-guardrails
pnpm run test:frontend-design
```

Phase 1 permission validation passed. `pnpm run check:lines` initially failed
because it scanned generated `.pnpm-store` package copies; removing the local
store cache fixed the unrelated scan input and the guard passed.

## Evidence

- Worker A screenshots:
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-a/crm-whatsapp-shell-nav-desktop.png`,
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-a/crm-whatsapp-shell-nav-mobile.png`.
- Worker C screenshots:
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-c/tags-desktop.png`,
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-c/tags-mobile.png`.
- Orchestrator integrated screenshots:
  `/tmp/lojaveiculosv2-qa/crm-v2/orchestrator/connection-desktop.png`,
  `/tmp/lojaveiculosv2-qa/crm-v2/orchestrator/connection-mobile.png`,
  `/tmp/lojaveiculosv2-qa/crm-v2/orchestrator/tags-desktop.png`,
  `/tmp/lojaveiculosv2-qa/crm-v2/orchestrator/tags-mobile.png`.
- Worker B diagnostic-only screenshots remain under
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-b/`.

## Next Orchestrator Actions

1. Commit the embedded-tags integration fix and status update.
2. Close Wave 1 worker agents.
3. Start Wave 2 with DB-backed pipeline persistence and scheduled messages page.
4. Keep visits and campaign work blocked behind pipeline and lead identity
   contracts.
