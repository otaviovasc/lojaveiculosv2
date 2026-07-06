# Worker D Source Scan

Date: 2026-07-06

Scope:

- V2 target worktree:
  `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/lojaveiculosv2/.worktrees/crm-source-scan-gpt55`
- Source frontend:
  `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend`
- Source backend:
  `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend`

## Verdict Summary

| Category                  | Verdict                                                                                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| reject                    | Evolution provider code, Meta Cloud API provider switching, uaZapi compatibility payloads, bridge auth, `x-crm-agent-id`, old `crm_agents`, MiniBot implementation tables/controllers/UI/routes, `isColumn` tag pipeline behavior, and numeric Repasses route IDs.   |
| behavior-reference-only   | Bot action names, campaign scheduling concepts, recipient preview/rate controls, and visit/schedule page workflows may inform V2 UX or service behavior only after translation to V2 UUIDs, V2 users/store members, V2 permissions, V2 audit, and ZAPI-only runtime. |
| safe V2-owned             | Current V2 WhatsApp runtime is ZAPI-only in the active CRM code, uses `/crm/whatsapp/webhooks/zapi/:connectionId/...`, stores provider as `"zapi"`, uses `CRM_ZAPI_WEBHOOK_TOKEN`, and has a regression test that tag responses do not expose `isColumn`.            |
| needs orchestrator review | V2 still exposes `MINIBOT_ACTIVE` as a queue/session status name in schema, API filters, and UI labels. This is V2-owned state, not copied MiniBot implementation, but the naming collides with the active contract's "do not migrate MiniBot" language.             |

## Evidence

### Reject

- Evolution and Cloud API provider switching:
  - Source backend provider interface lists Evolution and Meta Cloud API:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/channels/whatsapp/providers/IWhatsappProvider.ts:8`
    and `:10`.
  - Source backend factory selects `CONNECTION_PROVIDER_ENUM.EVOLUTION` and
    contains a Cloud API branch:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/channels/whatsapp/providers/WhatsappProviderFactory.ts:56`
    and `:65`.
  - Source backend migrations allow `EVOLUTION`, `ZAPI`, and `CLOUD_API`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/migrations/20241208000000-create-connections.js:8`
    and `:29`.
  - Source backend boots Evolution polling jobs:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/server.ts:19`
    and `:69`.

- uaZapi compatibility payloads:
  - Source frontend `CrmIntegracoes` has `uazapiLegacyPayload` and examples with
    uaZapi fields:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/pages/crm/CrmIntegracoes.tsx:24`,
    `:30`, `:54`, `:72`, `:475`, `:578`, and `:1114`.
  - V2 should not carry this compatibility toggle or payload shape.

- Bridge auth and old agent headers:
  - Source frontend sends `x-crm-agent-id`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/lib/api.ts:45`.
  - Source frontend documents CRM agent bridge auth:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/App.tsx:143`
    and `:164`.
  - Source backend accepts `x-crm-sync-secret` bridge auth:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/crmRoutes.ts:16`
    through `:27`.
  - Source backend has `/api/v1/auth/bridge` routes:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/auth/authRoutes.ts:88`
    and `:93`.

- Old `crm_agents` semantics:
  - Source backend creates and evolves `crm_agents`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/migrations/20260309000001-add-crm-mode-and-agents.js:35`
    and `:36`.
  - Source backend model table name is `crm_agents`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/models/CrmAgent.ts:183`.
  - Source backend exposes agent CRUD and agent login routes:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/crmRoutes.ts:40`,
    `:124`, `:140`, `:147`, and `:154`.

- MiniBot implementation:
  - Source frontend mounts `/crm/minibot`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/App.tsx:43`,
    `:205`, and `:251`.
  - Source frontend page and API client implement MiniBot flows:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/pages/crm/CrmMiniBot.tsx:152`
    and
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/lib/crmChatApi.ts:155`.
  - Source backend MiniBot route/controller/model/migration are direct
    implementation, not V2 bot contract:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/minibotRoutes.ts:11`,
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers/crm/MinibotFlowController.ts:18`,
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/models/MinibotFlow.ts:79`,
    and
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/migrations/20260526000002-create-minibot-tables.js:7`.

- `isColumn` tag pipeline behavior:
  - Source frontend tag UI and chat filtering use `tag.isColumn`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/components/crm/SortableTagItem.tsx:90`,
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/pages/crm/CrmEtiquetas.tsx:33`,
    and
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/pages/crm/CrmWhatsApp.tsx:1343`.
  - Source backend stores `CrmTag.isColumn`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/models/CrmTag.ts:29`
    and `:78`.
  - Source backend external tag sync explicitly matches `isColumn: true`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers/crm/CrmController.ts:9027`.

- Numeric Repasses route IDs:
  - Source backend CRM routes use numeric-shaped route params such as
    `/scheduled-messages/:id`, `/agents/:agentId`,
    `/connection/:connectionId`, `/sessions/:sessionId`,
    `/chat/messages/:messageId`, `/campaigns/:id`, `/quick-messages/:id`, and
    `/tags/:tagId`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/crmRoutes.ts:95`,
    `:147`, `:174`, `:279`, `:457`, `:697`, `:838`, and `:862`.
  - Source backend controller converts those params with `Number` or
    `parseInt`:
    `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers/crm/CrmController.ts:464`,
    `:1348`, `:1597`, `:5801`, `:6171`, and `:7798`.
  - V2 contracts must expose V2 UUIDs, not numeric Repasses route IDs.

### Behavior Reference Only

- Source backend external bot action route uses the future-compatible concept
  of a single action endpoint authenticated by `X-Webhook-Secret`:
  `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/bot/botRoutes.ts:9`
  through `:16`.
- Source backend `BotActionsController` action categories can inform the V2 bot
  slice, but its old IDs, `isColumn`, `MINIBOT_ACTIVE`, and agent assumptions
  must be rejected:
  `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers/bot/BotActionsController.ts:750`,
  `:767`, `:1406`, and `:1409`.
- Source backend campaign routes are useful for campaign workflow concepts, but
  their numeric `:id` route contract is rejected:
  `/Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/crmRoutes.ts:690`
  through `:785`.
- Source frontend operational pages are behavior references only:
  `src/pages/crm/CrmAgendamentos.tsx`, `src/pages/crm/CrmCampaigns.tsx`,
  `src/pages/crm/CrmVisitas.tsx`, and `src/pages/crm/CrmIntegracoes.tsx`.

### Safe V2-Owned

- V2 active CRM provider type is only `"zapi"`:
  `apps/api/src/domains/crm/ports/crmConnectionRepository.ts:3` and
  `packages/db/src/schema/crm.ts:25`.
- V2 ZAPI webhook routes are under the contracted `/crm/whatsapp` shape:
  `apps/api/src/features/crm/controllers/crm.whatsapp.webhookRoutes.ts:21`,
  `:38`, `:54`, `:70`, `:86`, and `:102`.
- V2 webhook auth uses `CRM_ZAPI_WEBHOOK_TOKEN` and
  `x-crm-webhook-token`, not Repasses bridge auth:
  `apps/api/src/features/crm/controllers/crm.whatsapp.webhookRoutes.ts:151`
  and `:154`.
- V2 CRM source scan found no active `x-crm-agent-id`, `x-crm-sync-secret`,
  `bridge`, `crm_agents`, `uaZapi`, `Evolution`, `Cloud API`, `CLOUD_API`, or
  `EVOLUTION` hits under the active CRM target paths
  `apps/api/src/domains/crm`, `apps/api/src/features/crm`,
  `apps/api/src/infrastructure/db/crm`, `apps/web/src/features/crm`, and
  `packages/db/src/schema`.
- V2 has a regression test that CRM tag responses do not include `isColumn`:
  `apps/api/src/features/crm/controllers/crm.whatsapp.tags.test.ts:93`.

### Needs Orchestrator Review

- V2 currently names a queue/session state `MINIBOT_ACTIVE` in schema, domain
  ports, controller query filters, services, UI model, and UI label:
  `packages/db/src/schema/crmWhatsapp.ts:30`,
  `apps/api/src/domains/crm/ports/crmWhatsappRepositoryTypes.ts:3`,
  `apps/api/src/features/crm/controllers/crm.whatsapp.querySchemas.ts:12`,
  `apps/api/src/domains/crm/services/CrmWhatsapp/countWhatsappSessions.ts:32`,
  `apps/api/src/domains/crm/services/CrmWhatsapp/updateWhatsappSession.ts:205`,
  `apps/web/src/features/crm/crmWhatsappTypes.ts:6`,
  `apps/web/src/features/crm/crmWhatsappQueueState.ts:15`, and
  `apps/web/src/features/crm/CrmWhatsappSessionDetailsPanel.tsx:138`.
- This appears to be a V2-owned queue state for automated handling and human
  takeover, not the rejected Repasses MiniBot tables/controllers. The name
  should still be reviewed before more CRM slices depend on it.

## Commands Run

```bash
pwd
git status --short --branch
sed -n '1,240p' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/lojaveiculosv2/.codex/skills/lojaveiculosv2-repo/SKILL.md
sed -n '1,260p' AGENTS.md
sed -n '1,260p' docs/agents/lojaveiculosv2-repo-skill.md
sed -n '1,220p' docs/repo-organization.md
sed -n '1,220p' docs/architecture.md
sed -n '1,260p' docs/migrations/crm-v2-migration-map.md
sed -n '1,300p' docs/migrations/crm-v2-integration-contracts.md
sed -n '1,220p' docs/migrations/workers/worker-d-source-scan.md
find /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project -maxdepth 4 -type d \( -name 'repasses-frontend' -o -name 'repasses-lojaveiculos-backend' -o -name 'lojaveiculosv2' \)
find /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos -maxdepth 2 -type d -name .git -prune -o -maxdepth 2 -type d -print
git -C /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend status --short --branch
git -C /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend status --short --branch
find docs/migrations -maxdepth 2 -type f | sort
rg -n --hidden -S -i -g '!node_modules/**' -g '!dist/**' -g '!playwright-report/**' -g '!test-results/**' -g '!.git/**' 'Evolution|Cloud API|CloudAPI|uaZapi|x-crm-agent-id|crm_agents|MiniBot|isColumn|MINIBOT_ACTIVE' apps packages docs tests v2-backend-doc.html v2-plan.html
rg -n --hidden -S -i -g '!node_modules/**' -g '!dist/**' -g '!.git/**' 'Evolution|Cloud API|CloudAPI|uaZapi|x-crm-agent-id|crm_agents|MiniBot|isColumn|MINIBOT_ACTIVE' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/docs /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/public
rg -n --hidden -S -i -g '!node_modules/**' -g '!dist/**' -g '!.git/**' 'Evolution|Cloud API|CloudAPI|uaZapi|x-crm-agent-id|crm_agents|MiniBot|isColumn|MINIBOT_ACTIVE' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/docs /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/tests
find /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes -maxdepth 2 -type f | sort
rg -n -S "crm|chat|connection|tag|minibot|campaign|visit|agent|bot" /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers
rg -n -S "Number\(|parseInt\(|z\.coerce\.number|NumberSchema|params\.[A-Za-z0-9_]*id|req\.params\.[A-Za-z0-9_]*id|req\.params\.id|request\.params" /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes
rg -n -S "path:|router\.|routes\.|get\(|post\(|put\(|patch\(|delete\(" /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers | rg -n "/crm|/:[A-Za-z]*[iI]d|/[{][$][{][A-Za-z]*[iI]d"
rg -n --hidden -S -i -g '!node_modules/**' -g '!dist/**' -g '!playwright-report/**' -g '!test-results/**' -g '!.git/**' 'Evolution|Cloud API|CloudAPI|uaZapi|x-crm-agent-id|crm_agents|MiniBot|isColumn' apps packages tests
rg -n --hidden -S 'MINIBOT_ACTIVE' apps packages tests docs/migrations v2-backend-doc.html v2-plan.html
rg -n -S -i 'Evolution|Cloud API|CloudAPI' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/channels /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/integrations /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/migrations /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/config/env.ts /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/server.ts
rg -n -S -i 'uaZapi|uazapi|x-crm-agent-id|x-crm-sync-secret|bridge|crm_agents|MiniBot|Minibot|isColumn' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/pages/crm /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/components/crm /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/components/whatsapp /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/lib /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-frontend/src/App.tsx
rg -n -S -i 'uaZapi|uazapi|x-crm-agent-id|x-crm-sync-secret|bridge|crm_agents|MiniBot|Minibot|isColumn' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers/bot /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/controllers/crm /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/models /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/database/migrations /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/middleware
sed -n '1,220p' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/crmRoutes.ts
sed -n '220,460p' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/crmRoutes.ts
sed -n '1,220p' /Users/otaviovasconceloss/code/otaviovasc/lojaveiculos-project/v2lojaveiculos/repasses-lojaveiculos-backend/src/routes/crm/minibotRoutes.ts
rg -n -S 'ZAPI|zapi|CRM_ZAPI_WEBHOOK_TOKEN|x-crm-webhook-token' apps/api/src/domains/crm apps/api/src/features/crm apps/api/src/infrastructure/db/crm apps/web/src/features/crm packages/db/src/schema
rg -n -S 'x-crm-agent-id|x-crm-sync-secret|bridge|crm_agents|isColumn|uaZapi|uazapi|Evolution|Cloud API|CLOUD_API|EVOLUTION' apps/api/src/domains/crm apps/api/src/features/crm apps/api/src/infrastructure/db/crm apps/web/src/features/crm packages/db/src/schema
find apps/api/src/domains/crm apps/api/src/features/crm apps/api/src/infrastructure/db/crm apps/web/src/features/crm -maxdepth 4 -type f | sort
```
