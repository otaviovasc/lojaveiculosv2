# Worker H - Lead/WhatsApp Identity Link

## Implementation Note

- Add `leadId` as a V2-native filter on the current conversation-list route,
  carried
  through controller schemas, domain service input, and CRM query adapters.
- Keep filtering tenant/store scoped in both memory and Drizzle repositories.
- Replace the lead detail Chat placeholder with an operational panel that
  resolves conversations by `lead.id`, opens existing conversations through
  the current route identifier contract, and starts a WhatsApp conversation through the
  existing V2 start-conversation API when no linked conversation exists.
- Preserve the existing conversation-to-lead links and avoid rendering message
  bodies, secrets, or provider payloads in the lead detail panel.
