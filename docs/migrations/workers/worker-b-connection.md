# Worker B - Connection Page

## Implementation Note

- Keep the Conexao surface on canonical V2 `GET /crm/channel-connections` and `PATCH /crm/channel-connections/:connectionId` contracts.
- Render only safe ZAPI configuration/status metadata; initial credentials are
  write-only and secret values are never displayed.
- Show the seeded/test connection, live status refresh, editable metadata, and
  customer QR/phone-code pairing state. Webhook configuration is automatic and
  its URLs/controls are backend/support-only, not customer-facing.
- Convert the embedded connection admin from modal-style chrome into a page section with empty, optional loading/error props, and permission-disabled state support.
- Shell/nav contract change needed outside Worker B ownership: `CrmWhatsappScopedNav.tsx` still labels the primary tab `Conexao ZAPI`; Worker A or the orchestrator should rename it to `Conexao`. Passing connection loading/error state from the shell would also let the page render those optional states.
