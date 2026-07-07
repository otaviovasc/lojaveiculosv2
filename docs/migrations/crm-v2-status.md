# CRM V2 Migration Status

Last updated: 2026-07-07

Branch: `feat/crm-v2-migration-control-plane`

## Current Phase

Phase 11-12: persistent campaigns landed; recipient review/mobile polish remain.

## Completed This Pass

- Read repo rules, HTML control docs, migration docs, current V2 CRM runtime,
  and source repos under `../repasses-*`.
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
- Completed bot integration config foundation in `eac31a8`:
  - `GET/PATCH /crm/whatsapp/integrations/bot` stores bot URL and write-only
    secret state behind `crm.whatsapp.integrations.manage`.
  - WhatsApp Integracoes is now a real page for bot config and ZAPI event health.
- Added bot action API and docs after `eac31a8`:
  - `POST /crm/whatsapp/integrations/bot/actions` authenticates
    `X-Webhook-Secret`, creates a bot-scoped `ServiceContext`, executes V2 UUID
    actions, and blocks bot sends during human takeover.
  - Integracoes now shows V2 Action API docs.
- Completed persistent Campaigns backend/UI:
  - campaigns, recipients, scheduled-message linkage, send/reply metrics,
    pause/resume/cancel routes, reply-triggered secondary messages, and
    initial/reply tag transitions are V2-backed and audited.
  - `GET /crm/whatsapp/campaigns/:campaignId` exposes campaign detail plus
    durable recipient statuses for the operations UI.
  - Campaigns now render an overview-first UI with live aggregate cards,
    campaign list, detail metrics, message/automation preview, and recipient
    status rows before the creation builder.
- Refined the WhatsApp shell and operations tabs with screenshot-driven UI:
  - Scoped navbar is compact with the connection status as a small indicator.
  - Conexao now exposes only ZAPI status, write-only instance ID/token update,
    and generated webhook URLs.
  - Bot Integracoes includes the V2 Action API docs.
- Added write-only ZAPI instance credential support:
  - `PATCH /crm/whatsapp/connections/:connectionId` accepts
    `instanceCredentials.instanceId` and `instanceCredentials.instanceToken`.
  - Responses expose only configured state; tokens are not returned or audited.
- Ran a live local ZAPI smoke send to the approved phone number. API returned
  `201` with outbound message status `SENT`.
- Completed the final handoff validation for this slice:
  `pnpm run validate` passed with 320 web tests and 501 API tests passing.
- Fixed full-gate lint/typecheck cleanup in CRM tests:
  async JSX handlers are launched explicitly, test transactions are typed, and
  response bodies avoid unsafe `any` assertions.
- Completed outbound bot forwarding:
  - write-only bot secret is available to server-only dispatch config,
  - V2 dispatches Repasses-style `message`, `intervention_started`, and
    `intervention_ended` events with UUID session/message ids,
  - regular message events pause during `HUMAN_TAKEOVER`,
  - bot sends resume as `senderOrigin: bot_api` after intervention ends.

## Key Findings

- V2 schema already has ZAPI-only `crm_connections`, normalized `crm_tags`,
  normalized session tags, WhatsApp sessions/messages, quick messages,
  scheduled messages, and `lead_visits`.
- Scheduled-message backend support, campaign linkage, campaign recipients, and
  the store-wide operations page exist.
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
- Bot config, action API, webhook forwarding, and intervention events are now
  implemented behind V2 UUID contracts.
- Campaign backend/metrics/detail now persist through V2 campaign and recipient
  rows.
- `CrmWhatsappScopedNav.tsx` is now compact, without tab subtitles, and uses
  `Conexao`.
- `CrmWhatsappScopedSections.tsx` now routes Campaigns to persistent campaigns.
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
- Worker J: integrations/bot foundation. Completed in `eac31a8`; action API
  and outbound forwarding completed after it.

Wave 4:

- Worker K: campaign backend. Completed by orchestrator in current slice.
- Worker L: persistent campaign UI. Completed by orchestrator in current slice.
- Worker Q: Playwright/evidence/mobile polish.

## Command Log

Commands run:

```bash
CI=true pnpm --filter @lojaveiculosv2/api typecheck
CI=true pnpm --filter @lojaveiculosv2/web typecheck
CI=true pnpm --filter @lojaveiculosv2/api lint
CI=true pnpm --filter @lojaveiculosv2/web lint
CI=true pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.campaigns.test
CI=true pnpm --filter @lojaveiculosv2/web test -- CrmWhatsappCampaignsPage.test crmWhatsappPermissions.test
CI=true pnpm run check:lines
CI=true pnpm run validate:core-guardrails
CI=true pnpm run validate
PLAYWRIGHT_SKIP_WEB_SERVER=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176 QA_BASE_URL=http://127.0.0.1:5176 QA_FEATURE_SLUG=crm-whatsapp-campaigns pnpm exec playwright test tests/e2e/crm-whatsapp-campaigns.spec.ts --project=chromium
```

Phase 1 permission validation passed. Earlier `.pnpm-store` cache-only line
scan issues were fixed by removing the local generated store cache.

## Evidence

- Screenshot roots:
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-a/`,
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-c/`,
  `/tmp/lojaveiculosv2-qa/crm-v2/worker-g/`, and
  `/tmp/lojaveiculosv2-qa/crm-v2/orchestrator/`.
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
- Bot config evidence:
  `apps/api/src/features/crm/controllers/crm.whatsapp.integrations.test.ts`,
  `apps/web/src/features/crm/CrmWhatsappIntegrationsPage.test.tsx`.
- Bot action/Campaign UI evidence:
  `apps/api/src/features/crm/controllers/crm.whatsapp.integrations.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.botForwarding.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.campaigns.test.ts`,
  `apps/web/src/features/crm/CrmWhatsappCampaignsPage.test.tsx`,
  `apps/web/src/features/crm/CrmWhatsappConnectionAdmin.test.tsx`,
  `tests/e2e/crm-whatsapp-campaigns.spec.ts`.
- Current campaign screenshot:
  `/tmp/lojaveiculosv2-qa/feat-crm-v2-migration-control-plane/crm-whatsapp-campaigns/crm-whatsapp-campaigns.png`.
- Screenshot-driven evidence from the current pass is under
  `/tmp/lojaveiculosv2-qa/crm-v2/orchestrator/` with the
  `crm-whatsapp-*-desktop-v2/v3.png` and mobile v2 captures.
- Live smoke: local `GET /crm/whatsapp/connections` reported the test ZAPI
  connection as connected; local `POST /crm/whatsapp/conversations/start`
  returned `201` and `SENT` for the approved phone number.
- Final gate: `CI=true pnpm run validate` passed on 2026-07-07.

## Next Orchestrator Actions

1. Polish Campaigns with richer recipient review, filtered lead source, and
   mobile QA.
2. Run full validation when the next stable CRM slice is merged, or record any
   unrelated failures explicitly here.
