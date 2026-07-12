# Worker J - Integrations/Bot

## Implementation Note

- Added the V2 bot integration configuration foundation over the existing
  store-scoped `integration_accounts` table with provider `crm_whatsapp_bot`.
- Backend exposes `GET /crm/whatsapp/integrations/bot` and
  `PATCH /crm/whatsapp/integrations/bot` for authenticated store actors with
  `crm.whatsapp.integrations.manage`.
- Bot secrets are write-only: responses expose `secretConfigured` and
  `secretUpdatedAt`, never the submitted secret or stored digest.
- The WhatsApp Integracoes surface is now a real page for bot URL/secret config
  and existing ZAPI provider-event health. It no longer renders placeholder
  action cards.
- Deferred to the next bot slice: outbound event forwarding, `X-Webhook-Secret`
  action authentication, action execution, and human-takeover send guards.
- Focused verification passed:
  - `pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp.integrations`
  - `pnpm --filter @lojaveiculosv2/web test -- CrmWhatsappIntegrationsPage crmWhatsappApiExtras crmWhatsappApiRoutes crmWhatsappPermissions`
  - `pnpm --filter @lojaveiculosv2/api typecheck`
  - `pnpm --filter @lojaveiculosv2/web typecheck`
  - `pnpm run validate:core-guardrails`
  - `pnpm run test:quality-tools`
