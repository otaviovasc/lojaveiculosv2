# Worker B - Connection Page

## Implementation Note

- Keep the Conexao surface on existing V2 `GET /crm/whatsapp/connections` and `PATCH /crm/whatsapp/connections/:connectionId` contracts.
- Render env reference names only for ZAPI credentials; secret values remain write-only and are never displayed.
- Show the seeded/test connection, live status refresh, editable metadata, credential env references, and the six generated webhook URLs from the backend response.
- Convert the embedded connection admin from modal-style chrome into a page section with empty, optional loading/error props, and permission-disabled state support.
- Shell/nav contract change needed outside Worker B ownership: `CrmWhatsappScopedNav.tsx` still labels the primary tab `Conexao ZAPI`; Worker A or the orchestrator should rename it to `Conexao`. Passing connection loading/error state from the shell would also let the page render those optional states.
