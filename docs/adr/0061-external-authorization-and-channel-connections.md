# ADR 0061: External authorization, marketplace accounts, and CRM routes

## Status

Accepted for the CRM routing cutover.

## Decision

External account authorization is the credential and scope boundary. A
marketplace account and a CRM channel connection are independent projections of
that authorization. OLX stock/leads readiness therefore does not grant OLX
Chat readiness, and a Meta authorization is not itself a selectable CRM route.

The CRM connection DTO is server-owned and includes `id`, `channel`,
`provider`, `displayName`, `state`, `readiness`, `capabilities`, and
`isDefault`. The frontend never derives these facts from provider aliases,
connection order, or transport status.

## Consequences

- Channel defaults are stored per store and channel (`whatsapp`, `instagram`,
  `olx_chat`).
- Only ready CRM channel connections can be selected.
- OLX Chat can be visible as pending with a remediation message while remaining
  unavailable for routing.
- Provider setup/reconnect code stays in infrastructure adapters; route
  selection and capability checks stay in the CRM domain.
