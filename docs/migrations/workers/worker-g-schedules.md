# Worker G - Scheduled Messages

## Implementation Note

- The V2 backend already exposes store-scoped scheduled-message operations:
  list, create, cancel, and process due.
- Listing supports store-wide results with optional `status`, `connectionId`,
  and conversation filters. Creating still requires a scoped conversation
  target, so the operations page must work without an open conversation for
  list/cancel and require a selected target only for new one-off schedules.
- The old campaigns tab embedded a schedule dialog and placeholder campaign
  cards. This slice replaces that surface with a real store-wide scheduled
  messages page while leaving future campaign data models untouched.
