# CRM V2 Migration Status

Last updated: 2026-07-06

Branch: `feat/crm-v2-migration-control-plane`

## Current Phase

Phase 9: integrations/bot contract after visits backend/UI.

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
  `docs/migrations/crm-v2-bot-contract.md`,
  `docs/migrations/crm-v2-visits-contract.md`,
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
- Defined the Wave 2 pipeline persistence contract: DB-backed
  `crm_pipelines`/`crm_pipeline_stages`, lead-owned `pipelineId` and
  `pipelineStageId`, and an audited lead stage move endpoint.
- Merged Worker G scheduled messages operations page:
  - `d8dde89` merged Worker G schedules page (`a448939`).
- Merged Worker F DB-backed pipeline persistence:
  - `489d249` merged Worker F pipeline (`cc8e16a`, `4f5f568`).
- Re-ran focused post-merge pipeline and schedules validation for API, web,
  typecheck, and guardrails.
- Clarified the `GET /crm/whatsapp/sessions?leadId=<uuid>` contract in
  `d1609ab`.
- Defined the visits API/service contract in
  `docs/migrations/crm-v2-visits-contract.md`.
- Completed the lead/WhatsApp identity slice in `62ac658`:
  - WhatsApp sessions can be filtered by linked V2 `leadId`.
  - Lead detail Chat tab resolves existing linked sessions.
  - Lead detail Chat tab can start a conversation through the existing
    V2-native `leadId` start-conversation API.
  - WhatsApp deep links now use `#/crm?surface=whatsapp&sessionId=<id>`.
- Completed visits backend/UI in `5d47b6f`:
  - V2 visit services/controllers/adapters operate on `lead_visits`.
  - Visits require `crm.visits.read` / `crm.visits.manage`, scoped logs, audit,
    stable errors, and lead activities.
  - WhatsApp Visitas is now a real operations page with today/upcoming/overdue/
    completed views and active-session creation.

## Key Findings

- V2 schema already has ZAPI-only `crm_connections`, normalized `crm_tags`,
  normalized session tags, WhatsApp sessions/messages, quick messages,
  scheduled messages, and `lead_visits`.
- Scheduled-message backend support exists; the missing work is the store-wide
  operations page and future campaign linkage.
- V2 permission catalog and current tag/schedule/connection services now use
  the active V2 permission contract names.
- Pipeline config is now DB-backed through `crm_pipelines` and
  `crm_pipeline_stages`; lead pipeline movement is an audited backend mutation
  through `PATCH /crm/leads/:leadId/pipeline-stage`.
- Generic lead create/update no longer writes pipeline fields directly. Lead
  stage changes must use the pipeline move service so scope, active-stage, and
  audit rules stay centralized.
- Lead/WhatsApp identity now has a concrete frontend and backend path:
  sessions expose `leadId`, lead detail resolves by `leadId`, and existing
  session panels keep the reverse lead detail link.
- Visits are now V2-backed over `lead_visits`; `sessionId` resolves the linked
  V2 lead but is not persisted on visits.
- `crm_sync_events` exists in schema but is not used by migrated runtime CRM
  code.
- Campaigns and external bot integration are not implemented in V2.
- `CrmWhatsappScopedNav.tsx` is now compact, without tab subtitles, and uses
  `Conexao`.
- `CrmWhatsappScopedSections.tsx` still contains placeholder cards for
  integrations and campaign depth. These must not be treated as done.
- Repasses backend still contains Evolution, old agents, MiniBot, and campaign
  logic. Only behavior should be ported; runtime semantics must be V2-native.
- Repasses public CRM contracts still route mostly by numeric ids. V2 slices
  must expose V2 UUIDs.

## Active Risks

- Parallel workers can easily invent conflicting permission or API names.
- Campaign work depends on stable tag, schedule, visit, and recipient contracts.
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
- Worker F: pipeline persistence. Completed in `cc8e16a` and `4f5f568`;
  merged by `489d249`.
- Worker G: scheduled messages page. Completed in `a448939`; merged by
  `d8dde89`.

Wave 3:

- Worker H: lead/WhatsApp identity link. Completed in `62ac658`.
- Worker I: visits backend/UI. Completed in `5d47b6f`.
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
pnpm --filter @lojaveiculosv2/web test -- CrmWhatsappSchedulesPage.test crmWhatsappApiExtras.test
pnpm --filter @lojaveiculosv2/web typecheck
pnpm run check:lines
pnpm --filter @lojaveiculosv2/api test -- crm.pipeline
pnpm --filter @lojaveiculosv2/web test -- productCrmApi crmPipelineModels crmLeadCreation CrmWhatsappSchedulesPage.test crmWhatsappApiExtras.test
pnpm --filter @lojaveiculosv2/api typecheck
pnpm --filter @lojaveiculosv2/web typecheck
pnpm run check:db
pnpm run check:services
pnpm run check:frontend
pnpm run check:lines
pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.sessions crm.whatsapp.startConversationLead
pnpm --filter @lojaveiculosv2/web test -- CrmLeadWhatsappPanel crmWhatsappApi CrmModule
pnpm --filter @lojaveiculosv2/api typecheck
pnpm --filter @lojaveiculosv2/web typecheck
pnpm run check:frontend
pnpm run check:services
pnpm run check:lines
pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.sessions crm.whatsapp.sessions.leadFilter crm.whatsapp.startConversationLead
pnpm --filter @lojaveiculosv2/web test -- CrmLeadWhatsappPanel crmWhatsappApi CrmModule
pnpm --filter @lojaveiculosv2/api typecheck
pnpm --filter @lojaveiculosv2/web typecheck
pnpm --filter @lojaveiculosv2/api test -- crm.visits
pnpm --filter @lojaveiculosv2/web test -- CrmWhatsappVisitsPage crmVisitsApi crmWhatsappPermissions
pnpm --filter @lojaveiculosv2/api typecheck
pnpm --filter @lojaveiculosv2/web typecheck
pnpm run validate:core-guardrails
pnpm run test:frontend-design
```

Phase 1 permission validation passed. `pnpm run check:lines` initially failed
because it scanned generated `.pnpm-store` package copies; removing the local
store cache fixed the unrelated scan input and the guard passed. The same
cache-only issue recurred after the pipeline merge; removing `.pnpm-store`
again made `check:lines` pass.

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
- Worker G screenshots:
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-g/schedules-desktop.png`,
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-g/schedules-mobile.png`.
- Pipeline persistence evidence:
  `packages/db/drizzle/0002_crm_pipeline_persistence.sql`,
  `apps/api/src/features/crm/controllers/crm.pipeline.test.ts`,
  `apps/api/src/features/crm/controllers/crm.pipeline.integrity.test.ts`,
  `apps/web/src/features/crm/crmLeadCreation.test.ts`.
- Lead/WhatsApp identity evidence:
  `apps/api/src/features/crm/controllers/crm.whatsapp.sessions.leadFilter.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.startConversationLead.test.ts`,
  `apps/web/src/features/crm/CrmLeadWhatsappPanel.test.tsx`.
- Visits evidence:
  `apps/api/src/features/crm/controllers/crm.visits.test.ts`,
  `apps/web/src/features/crm/CrmWhatsappVisitsPage.test.tsx`,
  `apps/web/src/features/crm/crmVisitsApi.test.ts`.

## Next Orchestrator Actions

1. Start Worker J integrations/bot contract from
   `docs/migrations/crm-v2-bot-contract.md`.
2. Keep campaign backend/UI blocked behind bot, schedules, visits, and recipient
   contracts.
3. Run full validation when the next stable CRM slice is merged, or record any
   unrelated failures explicitly here.
