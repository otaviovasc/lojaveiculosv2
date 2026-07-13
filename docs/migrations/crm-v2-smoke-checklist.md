# CRM V2 Smoke Checklist

Last updated: 2026-07-08

Use this checklist for focused slice evidence and final CRM handoff. Store
screenshots under `/tmp/lojaveiculosv2-qa/crm-v2/` unless a worker-specific
evidence folder is documented.

## Preflight

- `git status --short`
- `pnpm --filter @lojaveiculosv2/api typecheck`
- `pnpm --filter @lojaveiculosv2/web typecheck`
- `pnpm --filter @lojaveiculosv2/api test -- crm.whatsapp`
- `pnpm --filter @lojaveiculosv2/web test -- crmWhatsapp`

## Shell And Navigation

- Open `/dashboard#/crm?surface=whatsapp`.
- Verify top CRM exposes WhatsApp and Clientes.
- Verify desktop WhatsApp scoped nav labels: Conversas, Agendar mensagem,
  Visitas, Campanhas, Etiquetas, Integracoes, Conexao.
- On mobile, verify Conversas, Agendar, and Visitas remain in the bottom bar;
  Campanhas, Etiquetas, Integracoes, and Conexao appear in Mais.
- Verify the mobile bar hides inside a chat and returns in the conversation list.
- Verify no scoped tab subtitle copy is visible.
- Verify unread/tag badges appear only when useful.
- Capture desktop and mobile screenshots.
- Verify every workflow footer remains fully above the mobile navigation.

## Connection

- Load seeded/test ZAPI connection.
- Verify status indicator and live provider status render.
- Save ZAPI instance ID and token through the write-only instance form.
- Verify the token is not rendered after save and responses only expose
  configured state.
- Verify six webhook URLs:
  received, delivery, status, connected, disconnected, chat-presence.
- Verify permission-denied state disables mutation controls.
- Desktop screenshot evidence:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-connection-ui/crm-whatsapp-connection.png`.
- Capture mobile screenshot.

## Tags

- List tags.
- Create tag.
- Edit name/color/emoji.
- Reorder tag.
- Assign tag to a session.
- Remove tag from a session.
- Delete tag through confirmation modal.
- Verify no pipeline/column wording appears.
- Desktop screenshot evidence:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-tags-ui/crm-whatsapp-tags.png`.
- Capture mobile screenshot.

## Permission Contract

- Verify no old singular permission keys remain:
  `crm.whatsapp.tag.*`, `crm.whatsapp.schedule.*`,
  `crm.whatsapp.connection.update_*`.
- Verify canonical keys are present in shared types, identity catalog,
  role defaults, frontend capability reader, service checks, and test contexts.
- Verify connection admin requires `crm.whatsapp.connection.manage`.
- Verify tag management uses `crm.whatsapp.tags.manage`.
- Verify tag assignment uses `crm.whatsapp.tags.assign`.
- Verify scheduled messages use `crm.whatsapp.schedules.*`.

## Pipeline

- Create/edit/reorder pipeline stage.
- Reload page and verify stages persist.
- Move lead stage through backend.
- Verify lead detail and WhatsApp-linked lead stay consistent.
- Verify audit events exist for stage movement.

## Lead And WhatsApp Link

- Open a lead detail page.
- Start or open linked WhatsApp session from the lead.
- From WhatsApp session detail, navigate back to lead detail.
- Verify URL sync for active session.
- Verify lead activity timeline includes WhatsApp-relevant events.

## Visits

- From a WhatsApp session linked to a lead, create a visit.
- Open store-wide Visitas and verify today/tomorrow/upcoming/overdue/completed
  views with visible counts.
- Verify visit appears on visit page and lead detail.
- Update status to confirmed/completed/no_show/cancelled.
- Verify activity and audit evidence.
- Verify no financing/test-drive-specific fields are required.
- Desktop screenshot evidence:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-visits-ui/crm-whatsapp-visits.png`.

## Scheduled Messages

- Schedule one-off message from a chat.
- Open store-wide schedules page.
- Filter by status, connection, and session/lead.
- Cancel a pending schedule.
- Process due messages in local/admin/dev mode.
- Verify rows show status, time, lead/session, preview, and errors.
- Desktop screenshot evidence:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-schedules-ui/crm-whatsapp-schedules.png`.

## Integrations And Bot

- Configure bot webhook URL.
- Save a write-only webhook secret.
- Trigger test webhook.
- Call action API with `X-Webhook-Secret`.
- Verify UUID inputs for lead/session/tag/visit.
- Verify `send_image`, `send_audio`, and `send_document` use
  `imageUrl`/`audioUrl`/`documentUrl`; base64 should be rejected on the
  external bot API.
- Verify `send_text` can start a conversation with `connectionId` plus
  `payload.phone` and stores the message as bot-authored.
- Start human takeover and verify regular forwarding pauses.
- End intervention through bot action.
- Verify `intervention_ended` includes started/ended timestamps, duration,
  message count, and a compact handback summary.
- Verify bot send action is blocked during takeover.
- Process a scheduled/campaign message and verify it forwards as
  `senderOrigin: system` without emitting `intervention_started`.
- Trigger connected/disconnected callback and verify
  `connection_status_changed` is forwarded without chat/session fields.
- Verify bot webhook dispatch audit records contain no secret values.
- Desktop screenshot evidence:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-integrations-ui/crm-whatsapp-integrations.png`.

## Campaigns

- Current V2 UI creates from filtered leads, filtered WhatsApp sessions, and
  CSV/paste matched to sessions. Lead sourcing pages through the full result
  set and reports matched leads that do not yet have a WhatsApp session.
- Create campaign from filtered leads.
- Create campaign from filtered WhatsApp sessions.
- Create campaign from CSV/contact paste.
- Validate recipients and fix bad rows.
- Configure variables, rate, send window, initial tag, reply tag, and optional
  delayed secondary message.
- Create scheduled campaign sends.
- Pause, resume, and cancel campaign.
- Open campaign detail and verify durable recipient statuses.
- Verify metrics: total, scheduled, sent, failed, replied, secondary sent,
  reply rate.
- Desktop screenshot evidence:
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-campaigns-ui/crm-whatsapp-campaigns.png`,
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-campaigns-ui/crm-whatsapp-campaigns-review.png`,
  `/tmp/lojaveiculosv2-qa/main/crm-whatsapp-campaigns-ui/crm-whatsapp-campaigns-review-rows.png`.

## Conversas Parity

- Search sessions.
- Filter by status/tag/assignment.
- Send text/media/location/catalog/product/vehicle.
- Reply/react/delete message.
- Use quick messages.
- Toggle human takeover.
- Verify realtime updates.
- Verify mobile layout.
- Verify empty/loading/error states.

## Final Gate

- `pnpm run validate`
- `pnpm run test:smoke:api`
- Playwright evidence for the major CRM pages.

If full validation fails for unrelated work, record the failing command,
failure summary, and why it is unrelated in `crm-v2-status.md`.
