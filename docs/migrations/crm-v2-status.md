# CRM V2 Migration Status

Last updated: 2026-07-13

Branch: `main`

## Current Phase

Implementation parity is complete. The CRM is in production sign-off: deployed
cron, live provider/storage/realtime evidence, and load/recovery checks remain.

## Completed This Pass

- Closed Repasses ad-originated conversation parity across the ZAPI ingress,
  session/lead identity, external bot handback, and operator details UI:
  - `externalAdReply`, CTWA, notification-first, and documented LID fallback
    paths normalize allowlisted attribution without synthetic buyer messages.
  - Ad buyer turns resume automation and dispatch `intervention_ended` before
    `message`; both events expose the same sanitized `session.adAttribution`.
  - A real phone backfills the session and linked lead only when the same
    `chatLid` proves identity; unrelated legacy LID sessions remain isolated.
  - Conversas details show available ad source, title, body, thumbnail, and a
    safe external link.
- Closed filtered-lead campaign sourcing without coupling campaign recipients
  to the inbox's active filter or 40-row page.
- Added atomic campaign reply claiming and concurrent-reply regression coverage.
- Completed Conversas desktop/mobile polish with explicit list/chat panes,
  disconnected-first routing, compact action rails, safe-area composer spacing,
  day separators, and an automotive messaging wallpaper.
- Added desktop/mobile Playwright coverage for Conversas, disconnected recovery,
  filtered campaign leads, and campaign recipient review.
- Rebuilt the secondary WhatsApp operations UI around queue/dashboard-first
  screens and focused steppers for schedules, campaigns, visits, and connection
  setup; Tags uses a dedicated editor drawer and Integracoes separates config,
  event health, and reference content.
- Copied the Repasses mobile navigation model into V2: Conversas, Agendar, and
  Visitas are fixed at the bottom, while the permission-visible secondary areas
  are exposed through Mais. Browser checks cover safe-area placement, target
  size, chat hiding, menu placement, viewport overflow, and workflow actions.
- Captured mobile screenshots for Connection, Tags, Visits, Schedules,
  Campaigns, Integrations, and the Mais menu.
- Published `crm-whatsapp-completion-audit.md` with the remaining operational
  production gates.
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
  - Bot Integracoes uses Repasses-style config/docs cards, V2 Action API examples, webhook payload docs, and intervention notes.
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
- Hardened outbound bot event parity: intervention payloads now include reason,
  timestamps, duration, message count, tag color/emoji, and handback summary;
  scheduled/campaign sends forward as `senderOrigin: system` without takeover
  noise; dispatch attempts/success/failure are audited without secrets.
- Imported Repasses-style campaign recipient safety review into V2:
  selected sessions and pasted CSV rows now produce an editable review table,
  invalid/unmatched/LID/duplicate rows are visible and blocked until excluded,
  valid rows feed campaign creation with V2 session UUIDs, and campaign detail
  recipients now have status/search filters.
- Imported Repasses-style Agendamentos UI: scoped nav entry/chat action,
  status tabs with stable counts, and compact schedule cards.
- Imported Repasses-style label management details into Tags: live preview,
  quick color swatches, emoji presets, pill-style rows, and a desktop editor/list
  layout while keeping V2 tags as WhatsApp labels only.
- Simplified Conexao into a two-column operations page: live ZAPI status,
  exactly two write-only instance fields, compact summary, and generated webhook
  URLs with copy controls.
- Imported the Repasses-style Visitas timeline into V2: Hoje/Amanha/Proximas/
  Atrasadas/Concluidas filters now have counts, tomorrow is excluded from
  upcoming, and visit rows render as compact timeline cards.
- Tightened external bot parity into a single public media contract:
  `send_image` uses `imageUrl`, `send_audio` uses `audioUrl`, and
  `send_document` uses `documentUrl`; base64 remains limited to the internal CRM
  media upload endpoint.
- Added Repasses-style bot outbound behavior for phone-based sends:
  `connectionId` plus `payload.phone` starts or reuses a V2 WhatsApp session and
  persists the message as `senderType: AI`.
- Added bot dispatch for ZAPI `connection_status_changed` events without fake
  `chat` or `session` fields.
- Expanded Integracoes bot documentation with individual action examples,
  important webhook fields, intervention guidance, and the connection-status
  event example.

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
  implemented behind V2 UUID contracts, including handback summaries and
  system-origin scheduled outbound events.
- External bot media actions have one canonical remote-URL shape; do not add
  alternate base64 aliases to the bot API.
- Campaign backend/metrics/detail now persist through V2 campaign and recipient
  rows.
- `CrmWhatsappScopedNav.tsx` is now compact, without tab subtitles, and uses
  `Conexao`.
- `CrmWhatsappMobileNav.tsx` adapts the Repasses 3+Mais bottom navigation to V2
  scope state, permissions, badges, accessibility, and explicit chat panes.
- `CrmWhatsappScopedSections.tsx` now routes Campaigns to persistent campaigns.
- Repasses backend still contains Evolution, old agents, MiniBot, and campaign
  logic. Only behavior should be ported; runtime semantics must be V2-native.
- Repasses public CRM contracts still route mostly by numeric ids. V2 slices
  must expose V2 UUIDs.

## Active Risks

- Parallel workers can easily invent conflicting permission or API names.
- Campaign work depends on stable tag, schedule, visit, and recipient contracts.
- Production still needs scheduled-worker cron verification and live
  Z-API/R2/Redis load and recovery evidence.
- The HTML dashboards include some historical/stale CRM details. Use
  `docs/migrations/crm-v2-integration-contracts.md` as the active contract.
- Known stale HTML details: a CRM tag column flag mention and one older note
  still describing scheduled messages as pending.

## Command Log

Commands run:

```bash
CI=true pnpm --filter @lojaveiculosv2/api typecheck
CI=true pnpm --filter @lojaveiculosv2/web typecheck
CI=true pnpm --filter @lojaveiculosv2/api lint
CI=true pnpm --filter @lojaveiculosv2/web lint
CI=true pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.campaigns.test
CI=true pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.botForwarding.test
CI=true pnpm --filter @lojaveiculosv2/web test -- CrmWhatsappCampaignsPage.test crmWhatsappPermissions.test
CI=true pnpm --filter @lojaveiculosv2/web test -- CrmWhatsappVisitsPage.test
CI=true pnpm run check:lines
CI=true pnpm run validate:core-guardrails
CI=true pnpm run validate
CI=true pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.integrations.test crm.whatsapp.botForwarding.test crm.whatsapp.botMediaParity.test crm.whatsapp.botOutboundParity.test
CI=true pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.botOutboundParity.test crm.whatsapp.botMediaParity.test crm.whatsapp.botForwarding.test
CI=true pnpm --filter @lojaveiculosv2/web test -- src/features/crm/CrmWhatsappIntegrationsPage.test.tsx
CI=true pnpm --filter @lojaveiculosv2/api typecheck
CI=true pnpm --filter @lojaveiculosv2/web typecheck
CI=true PLAYWRIGHT_SKIP_WEB_SERVER=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176 QA_FEATURE_SLUG=crm-whatsapp-integrations-ui pnpm exec playwright test tests/e2e/crm-whatsapp-integrations.spec.ts --project=chromium
PLAYWRIGHT_SKIP_WEB_SERVER=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176 QA_BASE_URL=http://127.0.0.1:5176 QA_FEATURE_SLUG=crm-whatsapp-campaigns pnpm exec playwright test tests/e2e/crm-whatsapp-campaigns.spec.ts --project=chromium
CI=true PLAYWRIGHT_SKIP_WEB_SERVER=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 QA_FEATURE_SLUG=crm-whatsapp-campaigns-ui pnpm exec playwright test tests/e2e/crm-whatsapp-campaigns.spec.ts --project=chromium
CI=true PLAYWRIGHT_SKIP_WEB_SERVER=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176 QA_FEATURE_SLUG=crm-whatsapp-visits-ui pnpm exec playwright test tests/e2e/crm-whatsapp-visits.spec.ts --project=chromium
CI=true PLAYWRIGHT_SKIP_WEB_SERVER=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176 QA_FEATURE_SLUG=crm-whatsapp-schedules-ui pnpm exec playwright test tests/e2e/crm-whatsapp-schedules.spec.ts --project=chromium
CI=true pnpm --filter @lojaveiculosv2/api exec vitest run src/domains/crm/whatsapp/zapiAdAttribution.test.ts src/domains/crm/whatsapp/whatsappContactIdentity.test.ts src/domains/crm/whatsapp/parseZapiInboundMessage.test.ts src/domains/crm/whatsapp/parseZapiInboundMessage.boundaries.test.ts src/features/crm/controllers/crm.whatsapp.adInitiated.test.ts src/features/crm/controllers/crm.whatsapp.lidIdentity.test.ts src/features/crm/controllers/crm.whatsapp.botForwarding.test.ts
CI=true pnpm --filter @lojaveiculosv2/web exec vitest run src/features/crm/CrmWhatsappSessionDetailsPanel.test.tsx
CI=true pnpm --filter @lojaveiculosv2/api typecheck
CI=true pnpm --filter @lojaveiculosv2/web typecheck
CI=true pnpm run check:lines
CI=true pnpm run validate
```

Phase 1 permission validation passed. Earlier `.pnpm-store` cache-only line
scan issues were fixed by removing the local generated store cache.
Sandbox note: first Visits typecheck/lint attempts triggered pnpm dependency
self-heal and failed with `EEXIST`/registry `ENOTFOUND`; frozen install
repaired `node_modules`, then focused checks passed.
The ad-parity check batch also triggered pnpm self-heal under sandboxed DNS;
`CI=true pnpm install --frozen-lockfile` restored the workspace before all
focused and full checks passed.

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
  `apps/web/src/features/crm/crmVisitsApi.test.ts`,
  `tests/e2e/crm-whatsapp-visits.spec.ts`.
- Bot config evidence:
  `apps/api/src/features/crm/controllers/crm.whatsapp.integrations.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.botMediaParity.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.botOutboundParity.test.ts`,
  `apps/web/src/features/crm/CrmWhatsappIntegrationsPage.test.tsx`.
- Bot action/Campaign UI evidence:
  `apps/api/src/features/crm/controllers/crm.whatsapp.integrations.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.botForwarding.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.campaigns.test.ts`,
  `apps/web/src/features/crm/CrmWhatsappCampaignsPage.test.tsx`,
  `apps/web/src/features/crm/CrmWhatsappConnectionAdmin.test.tsx`,
  `tests/e2e/crm-whatsapp-campaigns.spec.ts`.
- Ad-originated conversation evidence:
  `apps/api/src/domains/crm/whatsapp/zapiAdAttribution.test.ts`,
  `apps/api/src/domains/crm/whatsapp/whatsappContactIdentity.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.adInitiated.test.ts`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.lidIdentity.test.ts`, and
  `apps/web/src/features/crm/CrmWhatsappSessionDetailsPanel.test.tsx`.
- Current campaign screenshots:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-campaigns-ui/crm-whatsapp-campaigns.png`,
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-campaigns-ui/crm-whatsapp-campaigns-review.png`,
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-campaigns-ui/crm-whatsapp-campaigns-review-rows.png`.
- Current tags screenshot:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-tags-ui/crm-whatsapp-tags.png`.
- Current connection screenshot:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-connection-ui/crm-whatsapp-connection.png`.
- Current visits screenshot:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-visits-ui/crm-whatsapp-visits.png`.
- Current schedules screenshot:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-schedules-ui/crm-whatsapp-schedules.png`.
- Current integrations screenshot:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-integrations-ui/crm-whatsapp-integrations.png`.
- Current Conversas desktop/mobile screenshots:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-masterful/crm-whatsapp-conversations.png`,
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-masterful/crm-whatsapp-conversation-mobile.png`.
- Current filtered-lead Campaigns screenshot:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-masterful/crm-whatsapp-campaigns.png`.
- Live smoke: local `GET /crm/whatsapp/connections` reported the test ZAPI
  connection as connected; local `POST /crm/whatsapp/conversations/start`
  returned `201` and `SENT` for the approved phone number.
- Final gate: `CI=true pnpm run validate` passed on 2026-07-13 with 649 web
  tests, 839 API tests, 192 quality-tool tests, and 12 document-PDF tests
  passing; the four skipped API tests are the opt-in live FIPE contracts. The
  earlier `CI=true pnpm run test:smoke:api` and final Conversas/Campaigns
  Chromium flows remain green.

## Next Orchestrator Actions

1. Provision and verify the Railway scheduled-message cron.
2. Run the approved staging/live provider, media, realtime, and retry smoke.
3. Capture secondary-page mobile evidence and complete launch monitoring.
