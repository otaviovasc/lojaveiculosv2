# CRM V2 Smoke Checklist

Last updated: 2026-07-06

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
- Verify WhatsApp scoped nav labels:
  Conversas, Conexao, Visitas, Campanhas, Integracoes, Tags.
- Verify no scoped tab subtitle copy is visible.
- Verify unread/tag badges appear only when useful.
- Capture desktop and mobile screenshots.

## Connection

- Load seeded/test ZAPI connection.
- Verify status indicator and live provider status render.
- Save env reference names and metadata.
- Verify no secret value is rendered.
- Verify six webhook URLs:
  received, delivery, status, connected, disconnected, chat-presence.
- Verify permission-denied state disables mutation controls.
- Capture desktop and mobile screenshots.

## Tags

- List tags.
- Create tag.
- Edit name/color/emoji.
- Reorder tag.
- Assign tag to a session.
- Remove tag from a session.
- Delete tag through confirmation modal.
- Verify no pipeline/column wording appears.
- Capture desktop and mobile screenshots.

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
- Verify visit appears on visit page and lead detail.
- Update status to confirmed/completed/no_show/cancelled.
- Verify activity and audit evidence.
- Verify no financing/test-drive-specific fields are required.

## Scheduled Messages

- Schedule one-off message from a chat.
- Open store-wide schedules page.
- Filter by status, connection, and session/lead.
- Cancel a pending schedule.
- Process due messages in local/admin/dev mode.
- Verify rows show status, time, lead/session, preview, and errors.

## Integrations And Bot

- Configure bot webhook URL.
- Save a write-only webhook secret.
- Trigger test webhook.
- Call action API with `X-Webhook-Secret`.
- Verify UUID inputs for lead/session/tag/visit.
- Start human takeover and verify regular forwarding pauses.
- End intervention through bot action.
- Verify bot send action is blocked during takeover.

## Campaigns

- Create campaign from filtered leads.
- Create campaign from filtered WhatsApp sessions.
- Create campaign from CSV/contact paste.
- Validate recipients and fix bad rows.
- Configure variables, rate, send window, initial tag, reply tag, and optional
  delayed secondary message.
- Create scheduled campaign sends.
- Pause, resume, and cancel campaign.
- Verify metrics: total, scheduled, sent, failed, replied, secondary sent,
  reply rate.

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
