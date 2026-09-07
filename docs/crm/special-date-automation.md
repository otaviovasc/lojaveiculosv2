# CRM special-date automation

CRM special-date automation lets a dealership configure one annual message for
each supported occasion: birthday, purchase anniversary, Easter, Christmas,
Mother's Day, Father's Day, and Black Friday. Configuration is scoped to an
active WhatsApp channel connection and is evaluated in Brazil time (BRT).

## Product contract

- **Target store segment:** stores operating an active WhatsApp CRM connection
  selected as the store's scheduled-message route with scheduling and outbound
  capabilities, and that want permissioned, recurring relationship follow-up
  with CRM leads and customers.
- **Customer outcome:** a store can send a timely, personalized occasion
  message without importing contacts into a separate campaign. Each contact
  and occasion year is deduplicated before scheduling.
- **Leading metric:** enabled special-date configurations that produce an
  accepted scheduled message, measured with the scheduler's persisted outcome
  states. Message contents and audit retention are not product analytics.
- **Entitlement and billing:** the `crm` entitlement gates the capability.
  Configuration requires `crm.messaging.connection.setup`; evaluation and
  scheduling require `crm.scheduled_messages.process`. Packaging remains in
  the server-owned catalog.
- **Support owner:** CRM operations owns configuration, provider readiness, and
  scheduler reconciliation support.

## API and degraded states

`GET /api/v1/crm/channel-connections/:connectionId/special-dates` returns all
seven configuration rows, including disabled defaults. Enabling a row requires
the connection to be the store's configured scheduled-message route and to
advertise the required scheduling and outbound capabilities. `PUT
/api/v1/crm/channel-connections/:connectionId/special-dates/:dateType` accepts
`enabled`, `leadDays` from 0 through 30, a `sendTime` in `HH:mm`, and a
`messageTemplate`.

The default send time is 09:00 BRT and all seven automations start disabled.
Midnight is valid, leap days are checked against the actual calendar, and the
annual holiday window is evaluated in BRT. Archived, deleted, disconnected,
unsupported-provider, missing-contact, and invalid-phone records are skipped
without creating a provider success result. The persisted schedule and audit
outcome identify what was evaluated; provider delivery remains pending or
failed until the existing scheduler records its official result. Disabling a
configuration cancels its pending annual executions. Editing an enabled
configuration advances its revision; stale pending work is blocked atomically
before dispatch, and the next evaluation can create replacement work with the
new template and time. A cancelled execution keeps its annual uniqueness key,
so re-enabling the same occasion does not resurrect or duplicate that
already-cancelled year's work.
