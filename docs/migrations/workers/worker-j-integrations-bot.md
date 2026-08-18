# Worker J - Integrations/Bot

## Implementation Note

- Added the V2 external-bot configuration foundation over the existing
  store-scoped `integration_accounts` table. The bot is not a messaging
  provider; channel/provider/broker routing remains in CRM channel connections.
- The current bot configuration routes are for authenticated store actors with
  `crm.bot.manage`.
- Bot secrets are write-only: responses expose `secretConfigured` and
  `secretUpdatedAt`, never the submitted secret or stored digest.
- The CRM Integracoes surface is now a real page for bot URL/secret config
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
