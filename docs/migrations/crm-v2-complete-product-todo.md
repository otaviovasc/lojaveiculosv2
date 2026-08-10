# CRM V2 complete product TODO

Reference behavior:

- `repasses-lojaveiculos-backend`
- `repasses-frontend`

Target channels/providers:

- ZAPI WhatsApp
- Composio WhatsApp/Meta official
- Composio Instagram official

Product frame:

- **Target:** dealerships with one or more sellers and an external AI bot.
- **Outcome:** one dependable sales inbox across WhatsApp and Instagram.
- **Leading metrics:** zero lost/duplicated messages, waiting-human time, first-response time, provider failure rate, and lead-to-visit/sale conversion.
- **Billing:** CRM entitlement plus server-catalog provider/add-on limits; never client-defined pricing or quotas.
- **Owners:** CRM Product for workflow, Platform/Integrations for providers and reliability, Support for connection recovery.
- **Degraded state:** keep the inbox readable, disable unsafe sends, show the failing provider/worker, and provide a recoverable retry path without fake success.

## Locked behavior

- [ ] **AI messages never start human attendance.** Persist every outbound origin as `HUMAN`, `EXTERNAL_BOT`, `SYSTEM`, or `UNKNOWN`; only `HUMAN` can move a session to `IN_HUMAN_SERVICE`.
- [ ] **AI requests human help explicitly.** Only `set_intervention(enabled: true)` creates `WAITING_HUMAN`; ordinary bot messages do not change attendance.
- [ ] **Provider is mandatory.** Every connection, session DTO, message action, SSE event, and counter query must have a known provider; reject inconsistent data instead of defaulting to ZAPI.
- [ ] **Unknown outbound origin is fail-safe.** Do not assume an uncorrelated provider echo is human; preserve it as unknown and reconcile it before changing attendance.
- [ ] **Capabilities come from the backend.** Return a server-owned capability contract per connection/channel so the frontend never guesses which actions are supported.

## P0 — realtime and consistency

- [ ] **Make Redis realtime fail visibly.** Add health, logs, metrics, alerts, and a degraded UI state; never silently fall back to process-local delivery in a multi-instance deployment.
- [ ] **Add a global session revision.** Increment one monotonic revision for messages, attendance, assignment, tags, read state, status, and contact changes; ignore older HTTP/SSE snapshots.
- [ ] **Persist a replayable realtime stream.** Use a durable event/outbox sequence so reconnecting clients can resume from `Last-Event-ID` without missing events.
- [ ] **Keep one stable SSE subscription.** Filter changes must update query state without recreating the connection or resetting the event cursor.
- [ ] **Cancel stale list/count requests.** Use abort controllers or request generations so an older response cannot overwrite the active filter.
- [ ] **Return the updated session from mutations.** Send, intervention, assignment, tags, close, read, and contact endpoints should return canonical session state instead of waiting for SSE.
- [ ] **Make compound mutations atomic.** Close, reopen, ad handback, assignment, and attendance clearing must update status/metadata/revision in one transaction and CAS operation.
- [ ] **Fix exact counters.** Counts must honor connection, channel, search, tag, status, queue, attendance, unread, and the exact selected assignee.
- [ ] **Use server totals in the UI.** Never show the loaded page size, such as 40, as the conversation total.

## P0 — sender origin and human attendance

- [ ] **Correlate provider echoes with outbound intents.** Match ZAPI/Meta message IDs to V2 sends and retain their original `HUMAN`, `EXTERNAL_BOT`, or `SYSTEM` origin.
- [ ] **Protect external AI sends.** Bot Action API sends must persist `EXTERNAL_BOT`; their ZAPI/Meta echoes and delivery updates must never trigger human attendance.
- [ ] **Recognize real native-agent replies safely.** Treat a direct WhatsApp/Instagram agent reply as human only when provider evidence or a configured native-agent policy proves it; otherwise keep `UNKNOWN`.
- [ ] **Support Meta/Instagram outbound echoes.** Parse `is_echo` and equivalent provider events, correlate known V2 sends, and identify genuine Business Suite/Page agent replies.
- [ ] **Keep reactions non-human.** Reactions may update a message but never attendance, assignment, queue, or first-response metrics.
- [ ] **Create a durable intervention ledger.** Store every intervention generation and idempotency key, not only the latest tombstone, so arbitrarily delayed events cannot reopen old interventions.
- [ ] **Validate the bot contract.** Require UUID intervention IDs, bounded reason/source strings, known actions, scoped connection/session IDs, and stable 4xx errors.
- [ ] **Define acceptance versus delivery.** Human attendance begins when the provider accepts an agent send; later delivery failure stays visible but does not silently rewrite history.

## P0 — provider connection lifecycle

- [ ] **Make provider/channel immutable and non-null.** Add DB constraints and consistency checks linking `zapi`, `composio_whatsapp`, and `composio_instagram` to the correct channel.
- [ ] **Finish ZAPI self-service.** Cover credentials, QR/phone-code connection, webhook registration, status, reconnect, token rotation, disconnect, and abandoned-setup cleanup.
- [ ] **Make Composio setup durable.** Persist intents for authorization links, connected accounts, selected WABA/phone/page, and webhook subscriptions; reconcile after local failures.
- [ ] **Support account selection.** Let stores choose the correct WABA phone number or Instagram account when Meta returns more than one asset.
- [ ] **Support reauthorization and revocation.** Show expired/disconnected states and provide safe reconnect/remove flows without exposing credentials.
- [ ] **Add provider event health.** Show last webhook, failures, retry state, subscription status, and a safe manual retry for each connection.
- [ ] **Handle multiple store connections.** Scope inboxes, campaigns, agents, and settings across one or many provider connections without mixing tenants or stores.

## P1 — unified WhatsApp and Instagram inbox

- [ ] **Use provider-neutral domain names.** Move shared behavior from WhatsApp-only naming to CRM messaging while keeping provider-specific adapters isolated.
- [ ] **Model channel identities explicitly.** Store WhatsApp phone/LID and Instagram scoped user ID as separate identities linked to one V2 lead.
- [ ] **Prevent unsafe contact merges.** Merge identities only with provider evidence or an audited operator decision; add duplicate review and undo support.
- [ ] **Build a unified lead conversation view.** Show all WhatsApp and Instagram threads for a lead, with clear channel/provider badges and a safe channel switcher.
- [ ] **Preserve independent threads.** Do not combine message ordering, unread state, windows, or external IDs across different connections/channels.
- [ ] **Complete inbox filters.** Support search, channel, provider, connection, tags, assignee, queue, status, unread, attendance, source, and saved views.
- [ ] **Complete queue operations.** Implement assign, transfer, claim, unassign, read/unread, close/reopen, block/unblock, and guarded bulk actions with audit.
- [ ] **Add close dispositions.** Record sold, lost, no-response, duplicate, spam, and custom outcomes and synchronize the linked lead/pipeline intentionally.
- [ ] **Complete contact context.** Edit name and allowed buyer data, show notes, interested vehicles, visits, financing context, source/ad attribution, and lead activity.

## P1 — messaging parity

- [ ] **Publish one capability matrix.** Cover text, image, video, audio, document, location, contact, reply, forward, reaction, delete, templates, catalog/product, vehicle, scheduling, and read receipts per provider/channel.
- [ ] **Enforce capabilities in backend and frontend.** Hide unsupported actions, reject forged calls, and explain the supported alternative.
- [ ] **Complete inbound media ingestion.** Fetch provider media safely, scan/validate it, store it with TTL/retention rules, and render download failures explicitly.
- [ ] **Complete delivery state handling.** Apply sent, delivered, read, failed, deleted, and retry states monotonically even when provider events arrive out of order.
- [ ] **Implement official WhatsApp windows/templates.** Show the active service window, block invalid free-form sends, list approved templates, validate variables, and start conversations with templates.
- [ ] **Complete Instagram DM behavior.** Support the Composio-confirmed text/image features, attachments and contextual story/post references where available, without exposing fake controls.
- [ ] **Add safe send recovery.** Every provider effect needs a durable intent, stable idempotency key, reconciliation state, and an operator-visible retry path that cannot duplicate sends.
- [ ] **Improve send UX.** Show upload/send progress, pending/indeterminate/failed states, retry controls, quoted context, previews, and provider-specific error guidance.
- [ ] **Finish quick messages.** Support shortcuts, text/media variants, search, permissions, and capability-aware sending across channels.
- [ ] **Finish catalog and vehicle sharing.** Keep ZAPI catalog/product behavior and provide capability-safe vehicle cards or links for official WhatsApp/Instagram.

## P1 — external bot and automation

- [ ] **Add a durable bot webhook outbox.** Commit message/intervention events with CRM state, retry with backoff, expose delivery status, and allow safe manual replay.
- [ ] **Keep webhook delivery ordered.** Preserve intervention end/start and message order per session with stable idempotency keys.
- [ ] **Expose provider-neutral bot actions.** Resolve capabilities and messaging windows before sending through ZAPI, official WhatsApp, or Instagram.
- [ ] **Complete explicit handoff.** Support AI request, seller acknowledgement, close/reopen/ad handback, summary, timestamps, and current intervention history.
- [ ] **Add bot observability.** Show recent deliveries, attempts, sanitized errors, last success, disabled state, and secret rotation in Integrations.
- [ ] **Port useful MiniBot behavior as V2-native automation.** If retained, rebuild flow triggers/messages/tags/buttons/catalog over V2 UUIDs, permissions, audit, and provider capabilities; do not copy the legacy tables/controllers.
- [ ] **Add automation conflict rules.** Define precedence between external AI, MiniBot, campaigns, scheduled messages, and human attendance so only one automation owns a session at a time.

## P1 — campaigns, schedules, and customer follow-up

- [ ] **Make schedules provider-aware.** Respect official messaging windows/templates, Instagram limitations, connection health, rate limits, and opt-out state.
- [ ] **Provision and monitor workers.** Run schedules, campaigns, retries, auto-archive, and cleanup as durable Railway jobs with leases, metrics, and dead-letter recovery.
- [ ] **Complete campaign safety.** Validate recipients, deduplicate identities, preview variables, enforce consent/opt-out, rate limits, quiet hours, and connection capacity.
- [ ] **Complete campaign operations.** Support draft, schedule, start, pause, resume, cancel, recipient inspection, failure retry, reply tracking, secondary messages, and tag transitions.
- [ ] **Support official WhatsApp campaigns correctly.** Use approved templates outside the service window and never represent rejected/indeterminate sends as successful.
- [ ] **Define Instagram campaign scope.** Enable only Meta-approved conversation follow-ups; do not imitate unsupported bulk messaging.
- [ ] **Evaluate group broadcast parity.** Port Repasses group broadcasting only for providers that support it and only with explicit entitlement, consent, throttling, and audit.
- [ ] **Finish follow-up workflows.** Support one-off schedules, auto-archive/reopen, special-date messages, and purchase-anniversary follow-ups without duplicate sends.

## P1 — team, permissions, and notifications

- [ ] **Complete the Team screen.** Manage members, roles, active state, presence, max concurrent chats, queue visibility, push preferences, and read-receipt preferences using V2 identity.
- [ ] **Implement assignment rotation.** Port useful Repasses round-robin behavior with timeout, max rounds, availability, workload, manual override, and audit.
- [ ] **Enforce permissions per operation.** Separate read, send, assign, transfer, close, block, delete, tags, campaigns, schedules, connections, integrations, analytics, and settings.
- [ ] **Complete notifications.** Add push/desktop/in-app alerts, assignment and new-message sounds, quiet states, deduplication, and channel/session deep links.
- [ ] **Respect read-receipt preferences.** Apply them per agent and provider capability without falsely marking a message as read locally.

## P2 — management and analytics

- [ ] **Complete CRM settings.** Add rotation, auto-archive, AI enablement, special dates, defaults, quiet hours, and provider-specific policies with permissions and audit.
- [ ] **Complete operational analytics.** Show sessions, queues, first response, human/AI/system messages, channel/provider/source breakdowns, agent workload, funnel, visits, sales dispositions, campaigns, and daily trends.
- [ ] **Separate product analytics from audit.** Emit small allowlisted outcome events; never use message bodies or security logs as analytics data.
- [ ] **Add SLA/health views.** Surface waiting-human age, oldest unassigned lead, failed sends, disconnected providers, webhook backlog, and worker backlog.
- [ ] **Finish responsive PWA states.** Verify desktop/mobile list-chat navigation, safe areas, offline/reconnect, loading/empty/error states, accessibility, and no hidden actions.

## P0 — security, privacy, and operations

- [ ] **Verify every webhook.** Validate ZAPI secrets and Meta signatures, reject replay, rate-limit endpoints, and isolate failures inside provider batches.
- [ ] **Minimize raw provider payload retention.** Store normalized retry envelopes; encrypt and expire quarantined raw payloads if they are operationally required.
- [ ] **Add durable provider audit delivery.** Provider setup, sends, webhook processing, retries, and reconciliation need an outbox-backed sanitized audit trail.
- [ ] **Enforce tenant/store integrity in the DB.** Use scoped foreign keys/checks for connections, sessions, messages, identities, campaigns, schedules, webhook events, and outboxes.
- [ ] **Protect credentials.** Keep tokens write-only in the vault, support rotation/revocation, and prevent secrets or message bodies from logs, audit, SSE, and errors.
- [ ] **Add retention and deletion workflows.** Define message/media/event retention, customer-data export/delete, soft deletion, and legal/audit exceptions.
- [ ] **Create operator runbooks.** Cover disconnected providers, stuck outboxes, webhook backlog, indeterminate sends, Redis outage, failed workers, and provider reauthorization.

## Complete-product verification matrix

- [ ] **Test every provider/channel.** Run the same contract suite for ZAPI WhatsApp, Composio WhatsApp, and Composio Instagram.
- [ ] **Test every sender origin.** Cover customer, authenticated seller, external bot, system/campaign, native provider agent, and unknown outbound events.
- [ ] **Test ordering and recovery.** Reorder/duplicate webhooks and SSE, restart workers, lose Redis, fail DB after provider success, and reconnect clients from an old cursor.
- [ ] **Test permissions and tenancy.** Prove cross-store/cross-tenant access is rejected for every read, mutation, webhook, bot action, and realtime subscription.
- [ ] **Test real provider sandboxes.** Capture staging evidence for connection, inbound/outbound messages, media, status updates, templates/windows, Instagram DMs, reconnect, and revocation.
- [ ] **Rehearse V1 migration.** Import three representative Repasses stores, compare inbox/agents/tags/campaigns/schedules/visits/settings, and obtain operator acceptance before cutover.
- [ ] **Run the final gates.** Require focused provider tests, Playwright desktop/mobile flows, load/recovery tests, `pnpm run validate`, API smoke tests, and staging smoke evidence.

## Definition of done

- [ ] A store can connect ZAPI WhatsApp, official WhatsApp, and Instagram without support intervention.
- [ ] Sellers can work from one reliable inbox without losing, duplicating, or misclassifying messages.
- [ ] External AI can converse freely without triggering human attendance unless it explicitly requests intervention.
- [ ] Provider outages and indeterminate operations are visible and recoverable without fake success.
- [ ] Every provider/channel follows its real capability and policy limits.
- [ ] The CRM is tenant-safe, audited, observable, mobile-ready, and accepted by representative Repasses stores.
