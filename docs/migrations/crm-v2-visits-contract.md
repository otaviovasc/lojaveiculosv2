# CRM V2 Visits Contract

Last updated: 2026-07-06

This contract owns the visits slice referenced by
`docs/migrations/crm-v2-integration-contracts.md`.

## Routes

- `GET /crm/visits`
- `POST /crm/visits`
- `PATCH /crm/visits/:visitId`
- `POST /crm/visits/:visitId/cancel`
- `POST /crm/visits/:visitId/complete`

## Persistence

Visits use the existing `lead_visits` table and are linked to V2 `leads.id`.
They do not carry financing, test-drive, vehicle-required, or old Repasses
session JSON fields.

A WhatsApp-created visit may include `sessionId` in API input and activity
metadata, but the persisted source of truth remains the linked lead visit row.

Supported statuses:

- `scheduled`
- `confirmed`
- `completed`
- `no_show`
- `cancelled`

## List Filters

- `leadId`
- `sessionId` resolved to the session's linked `leadId`
- `status`
- `from` / `to`
- `limit` / `offset`

## Create Input

- `leadId`
- `sessionId` optional, only when it resolves to the same lead
- `scheduledAt`
- `assignedUserId`
- `notes`

## Update Input

- `scheduledAt`
- `assignedUserId`
- `notes`
- `status`: `scheduled`, `confirmed`, or `no_show`

Dedicated cancel and complete endpoints set `cancelled` and `completed`.

## Service Rules

- Reads check `crm.visits.read`.
- Mutations check `crm.visits.manage`.
- Every service accepts `ServiceContext`.
- Mutations emit audit.
- Mutations append lead activities for create, update, cancel, and complete.
- The visits slice should add a visit-specific lead activity type if needed so
  the timeline can render visits without treating them as generic notes.
