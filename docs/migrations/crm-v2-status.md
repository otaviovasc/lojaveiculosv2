# CRM V2 Migration Status

Last updated: 2026-07-06

Branch: `feat/crm-v2-migration-control-plane`

## Current Phase

Phase 0: Recon and control plane.

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

## Key Findings

- V2 schema already has ZAPI-only `crm_connections`, normalized `crm_tags`,
  normalized session tags, WhatsApp sessions/messages, quick messages,
  scheduled messages, and `lead_visits`.
- Scheduled-message backend support exists; the missing work is the store-wide
  operations page and future campaign linkage.
- V2 currently has old singular permission keys for tags/schedules and split
  connection update permissions. The requested plural/manage permission names
  are not yet normalized.
- Pipeline config remains browser-local through
  `apps/web/src/features/crm/crmPipelineStorage.ts`.
- Visits are schema-only today: `lead_visits` exists, but no
  service/controller/repository references it in `apps/api/src`.
- `crm_sync_events` exists in schema but is not used by migrated runtime CRM
  code.
- Campaigns and external bot integration are not implemented in V2.
- `CrmWhatsappScopedNav.tsx` is still card-like with subtitles and the label
  `Conexao ZAPI`.
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

- Worker A: shell/nav cleanup.
- Worker B: connection page.
- Worker C: tags page.
- Worker D: dead provider/source scan and docs updates.

Wave 2:

- Worker E: permission normalization and service helper compatibility.
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
```

No validation command has been run yet because Phase 0 is documentation only and
the active docs are still being drafted.

## Next Orchestrator Actions

1. Review non-Spark mapping-agent reports and fold concrete findings into this
   status file.
2. Commit the control-plane docs after a docs diff review.
3. Assign Wave 1 workers with owned and avoided files.
4. Merge Wave 1 in this order: shell/nav, connection page, tags page, dead-code
   scan docs.
