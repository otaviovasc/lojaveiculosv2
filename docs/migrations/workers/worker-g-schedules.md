# Worker G - Scheduled Messages

## Implementation Note

- The V2 backend already exposes store-scoped scheduled-message operations:
  list, create, cancel, and process due.
- Listing supports store-wide results with optional `status`, `connectionId`,
  and `sessionId` filters. Creating still requires a scoped WhatsApp
  `sessionId`, so the operations page must work without a chat for list/cancel
  and require a selected session only for new one-off schedules.
- The old campaigns tab embedded a schedule dialog and placeholder campaign
  cards. This slice replaces that surface with a real store-wide scheduled
  messages page while leaving future campaign data models untouched.
