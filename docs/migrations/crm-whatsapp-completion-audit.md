# CRM WhatsApp Completion Audit

Last updated: 2026-07-12

## Implementation Verdict

The accepted V2 WhatsApp CRM behavior is implemented. V2 owns connections,
sessions, messages, media, tags, quick messages, schedules, campaigns, visits,
bot integration, provider-event recovery, permissions, audit, and realtime
updates. Repasses remains a behavior reference and historical import source; it
is not a runtime dependency for migrated WhatsApp paths.

This pass closed the remaining code gaps:

- Campaign audiences load all store sessions and leads independently of the
  operator's 40-row inbox view.
- Campaigns can filter V2 leads by search, status, and source, resolve one
  most-recent linked session per lead, and report leads without conversations.
- Campaign replies atomically claim a sent recipient before metrics or
  secondary-message scheduling, preventing duplicate follow-ups under
  concurrent inbound replies.
- Conversas now has explicit mobile list/chat modes, compact responsive actions,
  a disconnected-first state, safe-area composer spacing, day separators, and a
  WhatsApp-style automotive chat wallpaper.
- Schedules, campaigns, visits, and connection setup now open as focused,
  one-panel-at-a-time workflows with semantic steppers, draft preservation,
  review steps, and persistent actions.
- Tags, integrations, and connected-instance administration now start in their
  operational list/dashboard state instead of exposing every control at once.
- Mobile navigation now follows the Repasses WhatsApp CRM pattern: Conversas,
  Agendar, and Visitas stay in a floating bottom bar; Campanhas, Etiquetas,
  Integracoes, and Conexao live in an accessible Mais menu. The bar is hidden
  while an individual chat is open.

## Deliberately Rejected Source Behavior

- Evolution and Meta provider switching.
- Numeric Repasses ids and bridge-auth headers.
- Old CRM-agent and MiniBot models.
- Pipeline semantics stored in tags.
- Legacy payload shims without an owner and removal plan.

## Remaining Production Sign-off

These are operational launch gates, not missing product implementation:

1. Provision and verify the Railway cron that runs
   `pnpm run crm:whatsapp:schedule:process` at the approved cadence.
2. Configure production secrets and references for Z-API webhook auth, R2 media
   storage, Redis realtime fanout, product DB, and audit DB. Never record values
   in evidence.
3. Run an approved staging/live smoke for inbound text/media, outbound
   text/media/structured sends, delivery/read status, disconnect/reconnect,
   webhook retry, scheduling, campaign reply follow-up, and bot takeover/handback.
4. Exercise Redis reconnect/replay, R2 mirror failure, provider throttling, and
   scheduled-worker retry behavior under load across multiple stores.
5. Add launch monitoring and alerts for failed provider events, disconnected
   instances, scheduled-message backlog, campaign failures, Redis health, and
   media-mirror failures.

Historical Repasses data import remains migration-deferred by product decision.
If launch requires old conversations or campaign history, it needs a separate
mapping, rehearsal, parity report, rollback owner, and retention review.

## Verification Layers

- Domain/controller tests cover permission, tenant scope, audit-sensitive
  mutations, webhook idempotency, sends, media, tags, schedules, campaigns,
  bot actions, and provider events.
- Frontend tests cover API contracts, permissions, inbox state, message actions,
  composers, campaigns, schedules, tags, connection, integrations, and visits.
- Playwright covers Conversas desktop/mobile, disconnected recovery, campaigns,
  connection, media, tags, schedules, visits, integrations, role personas, the
  mobile bottom navigation, and workflow/footer viewport geometry.
- Final handoff completed `pnpm run validate`, `pnpm run test:smoke:api`, and
  the focused Conversas/Campaigns Chromium flows on 2026-07-12.

No finite test suite proves every provider or production failure mode. Production
sign-off therefore requires both automated coverage and the operational evidence
above.
