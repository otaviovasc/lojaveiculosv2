# Worker C - WhatsApp Tags

## Implementation note

- Scope is limited to the WhatsApp tags management surface and chat tag assignment parity.
- Existing V2 backend routes already cover list, create, update, delete, reorder, assign, and unassign for CRM WhatsApp tags.
- UI work will keep tags as WhatsApp labels only, remove pipeline/column wording, add a punctual delete confirmation, and improve saving/reorder state clarity without changing shared API contracts.
