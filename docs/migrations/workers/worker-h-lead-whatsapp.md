# Worker H - Lead/WhatsApp Identity Link

## Implementation Note

- Add `leadId` as a V2-native filter on `GET /crm/whatsapp/sessions`, carried
  through controller schemas, domain service input, and CRM WhatsApp query
  adapters.
- Keep filtering tenant/store scoped in both memory and Drizzle repositories.
- Replace the lead detail Chat placeholder with an operational panel that
  resolves sessions by `lead.id`, opens existing sessions with the current
  `sessionId` hash contract, and starts a WhatsApp conversation through the
  existing V2 start-conversation API when no linked session exists.
- Preserve the existing session-to-lead links and avoid rendering message
  bodies, secrets, or provider payloads in the lead detail panel.
