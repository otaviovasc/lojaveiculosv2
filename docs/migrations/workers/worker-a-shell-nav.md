# Worker A - WhatsApp Shell Navigation

## Implementation Note

- Keep this slice frontend-only and restricted to WhatsApp shell navigation.
- Update `CrmWhatsappScopedNav` to the contracted labels: Conversas, Conexao,
  Visitas, Campanhas, Integracoes, Tags.
- Remove tab subtitles/descriptive copy and preserve only useful badges for
  unread conversations and tag count.
- Render connection state as a compact status indicator in the nav header
  instead of descriptive tab copy.
- Adjust only directly related shell CSS so labels and badges fit on desktop and
  mobile without overlap.
