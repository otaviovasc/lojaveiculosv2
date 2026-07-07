# CRM V2 Migration Map

Last updated: 2026-07-07

This map coordinates vertical slices for the Loja Veiculos V2 CRM migration.
It reconciles current V2 code, `docs/migration.md`, `v2-plan.html`,
`v2-backend-doc.html`, and the Repasses source repos.

## Control Inputs

- V2 target: `apps/web/src/features/crm`,
  `apps/api/src/domains/crm`, `apps/api/src/features/crm`,
  `apps/api/src/infrastructure/db/crm`, `packages/db/src/schema`.
- Source UI reference: `../repasses-frontend/src/pages/crm`,
  `../repasses-frontend/src/components/crm`, `../repasses-frontend/src/lib`.
- Source backend reference: `../repasses-lojaveiculos-backend/src/controllers`,
  `../repasses-lojaveiculos-backend/src/routes`,
  `../repasses-lojaveiculos-backend/src/services`,
  `../repasses-lojaveiculos-backend/src/jobs`,
  `../repasses-lojaveiculos-backend/src/integrations`,
  `../repasses-lojaveiculos-backend/src/database`.
- Historical dashboards: `v2-backend-doc.html`, `v2-plan.html`.

## Current V2 Baseline

Already V2-owned:

- ZAPI connection/session/message runtime.
- ZAPI received, delivery, status, connected, disconnected, and chat-presence
  webhooks.
- Durable `provider_events` capture and retry surface.
- Ticketed SSE live updates.
- Inbound and outbound media through shared storage.
- Text, media, location, catalog/product, vehicle sends.
- Quick messages.
- Session assignment, close, read/unread, human intervention.
- Normalized WhatsApp tags with `crm_tags` and
  `crm_whatsapp_session_tags`.
- One-off scheduled messages.
- Scheduled-message backend routes, services, persistence, store-wide operations
  page, and campaign linkage are present.
- DB-backed CRM pipelines and stages with audited lead stage movement.
- Lead detail Chat tab resolves WhatsApp sessions by V2 `leadId` and can start
  a V2-native WhatsApp conversation by `leadId`.
- V2 visits operations over `lead_visits` with backend services/controllers,
  audited status changes, lead activities, and a Repasses-style Visitas timeline.
- Bot integration config page, action API, and write-only secret state.
- Outbound bot webhook forwarding with Repasses-style message and intervention
  events, handback summaries, dispatch audit, and system-origin scheduled sends.
- Persistent WhatsApp campaigns with recipient rows, scheduled-message linkage,
  send/reply metrics, and reply-triggered secondary messages.

Still incomplete:

- Filtered lead campaign source and full mobile evidence.
- Remaining UI parity is concentrated in Conversas and full mobile evidence.
- Full Playwright/mobile evidence for the migrated CRM OS.

## Slice Map

| Slice                          | Status    | Target owned files                                                                                                                                   | Source reference                                            | Notes                                                                           |
| ------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Phase 0 control plane          | Active    | `docs/migrations/**`, optional CRM notes in `docs/migration.md`                                                                                      | `v2-backend-doc.html`, `v2-plan.html`                       | Keep docs current before worker edits.                                          |
| Phase 1 permissions/foundation | Completed | `apps/api/src/domains/identity/domain/*permission*`, `apps/web/src/features/crm/crmWhatsappPermissions.ts`, focused CRM service permission constants | Existing CRM permission tests                               | Normalized names without weakening current access.                              |
| Shell/nav                      | Completed | `CrmWhatsappScopedNav.tsx`, `CrmWhatsappInbox.tsx`, `CrmWhatsappConversationWorkspace.tsx`, CRM WhatsApp CSS                                         | `CrmNavbar.tsx`, `CrmWhatsApp.tsx`                          | Removed tab subtitles; renamed `Conexao ZAPI` to `Conexao`.                     |
| Connection page                | Completed | `CrmWhatsappConnectionAdmin.tsx`, `CrmWhatsappConnectionAdminParts.tsx`, `useCrmWhatsappConnections.ts`, CSS                                         | `CrmIntegracoes.tsx`, backend connection controllers        | Simple operations page: status, two write-only ZAPI values, webhooks.           |
| Tags page                      | Completed | `CrmWhatsappTagManager.tsx`, `CrmWhatsappTagManagerParts.tsx`, `useCrmWhatsappTags.ts`, tag API tests                                                | `CrmEtiquetas.tsx`, `SortableTagItem.tsx`                   | Repasses-style preview/swatches/emoji/list rows; no column/pipeline semantics.  |
| Pipeline persistence           | Completed | new CRM pipeline schema/service/controller/API client; replace `crmPipelineStorage.ts`                                                               | V2 lead/pipeline UI                                         | Landed before campaign/visit deep linking.                                      |
| Lead/WhatsApp identity         | Completed | `startWhatsappConversation*`, `whatsappLeadLinking.ts`, lead detail components, route state                                                          | Existing start-by-lead tests                                | Lead is source of truth.                                                        |
| Visits                         | Completed | lead visit domain service, repository, controller, `CrmWhatsappVisitsPage.tsx`, visit CSS/tests                                                      | `CrmVisitas.tsx`, `VisitSchedulerModal.tsx`                 | Repasses-style date filters, counts, and timeline rows over `lead_visits`.      |
| Schedules page                 | Completed | `CrmWhatsappSchedulesPage.tsx`, `CrmWhatsappScheduleMessageList.tsx`, scheduled routes/tests                                                         | `CrmAgendamentos.tsx`, scheduled job                        | Repasses-style status tabs, stable counts, and schedule cards.                  |
| Integrations/bot               | Completed | bot integration schema/services/controllers, action API, dispatcher port, `CrmWhatsappIntegrationsPage.tsx`                                          | `BotEventNotificationService.ts`, `BotActionsController.ts` | Repasses-style config/docs UI; forwards message/intervention events with audit. |
| Campaign backend               | Completed | campaign schema, domain services under `CrmWhatsapp`, controllers, scheduled linkage                                                                 | `CrmCampaigns.tsx`, campaign migrations/reply handler       | V2 campaigns persist metrics and reply tracking.                                |
| Campaign UI                    | Active    | `CrmWhatsappCampaignsPage.tsx`, campaign overview/detail/tests/CSS                                                                                   | `CrmCampaigns.tsx`                                          | Recipient review and detail filters landed; lead-source/mobile polish remains.  |
| Conversas parity polish        | Pending   | existing WhatsApp workspace, message actions, details panel, mobile CSS/tests                                                                        | `CrmWhatsApp.tsx`, `CrmChatSession.tsx`                     | Keep chat focused; no placeholders.                                             |
| QA/evidence                    | Pending   | Playwright specs, evidence docs/screenshots                                                                                                          | current QA reports                                          | Must run throughout, not only at the end.                                       |

## Worker Ownership Rules

- Workers own vertical slices, not frontend/backend layers.
- Do not edit another worker's owned slice unless the orchestrator changes the
  contract first.
- Shared files that require orchestrator review before parallel edits:
  `crmWhatsappTypes.ts`, `crmWhatsappApiTypes.ts`, `crmWhatsappApiRoutes.ts`,
  `crmWhatsappApi.ts`, `runtimeApi.ts`,
  `apps/api/src/features/crm/controllers/crmWhatsappServiceBindings*`,
  `packages/db/src/schema/crm*.ts`, permission catalog files, and
  `docs/migrations/crm-v2-integration-contracts.md`.
- If a worker needs a shared contract change, document it in
  `docs/migrations/workers/<worker>.md` and stop for review.

## Source Behavior To Reuse

- Operational page concepts from Repasses CRM pages.
- ZAPI webhook and scheduled-message behavior where it maps cleanly to V2 UUIDs.
- Campaign scheduling rules, recipient preview concepts, variable substitution,
  rate controls, and metrics ideas.
- Bot action categories, but not old auth/agent identifiers.

## Source Behavior To Reject

- Evolution provider code and polling jobs.
- Meta Cloud API provider switching.
- Old `crm_agents` semantics.
- MiniBot tables/controllers as the V2 bot implementation.
- `isColumn` tag behavior.
- Pipeline semantics stored in tags.
- Bridge auth contracts such as `x-crm-agent-id`.
- uaZapi compatibility payloads.
- Numeric Repasses route ids as V2 contracts.
- Compatibility shims for old Repasses payloads without explicit owner and
  removal plan.
- Rendering or logging secret values.

## Verification Commands

Focused commands used by CRM workers:

```bash
pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp
pnpm --filter @lojaveiculosv2/api typecheck
pnpm --filter @lojaveiculosv2/web test -- crmWhatsapp
pnpm --filter @lojaveiculosv2/web test -- crmPipeline
pnpm --filter @lojaveiculosv2/web typecheck
pnpm exec playwright test tests/e2e/crm-whatsapp-extras.spec.ts --project=chromium
pnpm exec playwright test tests/e2e/crm-whatsapp-personas.spec.ts --project=chromium
pnpm run validate
```

Run narrower tests first. Full `pnpm run validate` remains the final handoff
gate unless unrelated failures are documented.
