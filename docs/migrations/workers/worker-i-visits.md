# Worker I - Visits

## Implementation Note

- V2 now owns visit operations through `lead_visits`, linked by V2 `leadId`.
- Backend services list, create, update, cancel, and complete visits with
  `crm.visits.read` / `crm.visits.manage`, `ServiceContext`, scoped structured
  logs, audit events, stable controller errors, and lead activity entries.
- `sessionId` is accepted only as a resolver for the linked V2 lead and activity
  metadata. It is not persisted on `lead_visits`.
- The WhatsApp visits page is a real operations page, not a dialog. It supports
  today, upcoming, overdue, and completed views, creation from the active linked
  session, status actions, permission states, loading, empty, and error states.
- Focused verification passed:
  - `pnpm --filter @lojaveiculosv2/api test -- crm.visits`
  - `pnpm --filter @lojaveiculosv2/web test -- CrmWhatsappVisitsPage crmVisitsApi crmWhatsappPermissions`
  - `pnpm --filter @lojaveiculosv2/api typecheck`
  - `pnpm --filter @lojaveiculosv2/web typecheck`
  - `pnpm run check:frontend`
  - `pnpm run check:services`
  - `pnpm run check:db`
  - `pnpm run check:lines`
