# Kanban filters across all leads

Target: stores with multiple sellers and more than one page of leads per stage. Sellers and managers can find their assigned contacts without manually loading every column. The leading acceptance metric is exact agreement between filtered stage totals and all cursor pages, with no missing or repeated IDs. This remains part of the existing CRM entitlement and `lead.read` permission; no billing changes. CRM support owns filter, membership-list and pagination incidents.

## Contract

Both `GET /api/v1/crm/leads` and `GET /api/v1/crm/leads/board` accept:

- `assignee`: `assigned`, `unassigned`, `me`, or an internal user UUID. Omission includes every assignee. `me` resolves from the authenticated service actor, never from a browser-supplied external identity. Integration actors cannot use `me`.
- `sources`: a comma-separated list of supported lead origins. Values within the list use OR; different filters combine with AND. The existing single `source` selector also intersects with this list.
- `listingId`: a vehicle listing UUID. Matches every scoped lead vehicle interest, including secondary interests, using EXISTS to avoid duplicate leads/counts.

All conditions run before counting, per-stage ranking, and paging. Store/tenant scope remains mandatory. Source and assignee query values are validated before database access. Empty or malformed source lists are rejected rather than broadening the result.

The UI consolidates the duplicate Origem/Fonte controls. Seller choices come from the existing store-member endpoint with honest loading/error states, not from the first page of cards. Filter changes reset page cursors and use separate cache keys; clearing restores the complete board. Server results remain authoritative for secondary vehicle matches.

## Cursor precision

PostgreSQL timestamps can include microseconds, while JavaScript Date/JSON cursors retain milliseconds. Ordering and cursor comparisons now truncate the sort timestamps to milliseconds and use the existing updated-at/id tie breakers. This prevents skipping the remainder of a same-timestamp group between pages.

## Verification

Controller tests exercise 49 leads, 23 matches across the 20-card boundary, seller identity, unassigned contacts, source intersections, validation, permission denial and cross-store exclusion. Local PostgreSQL transaction tests exercise the actual SQL, secondary/repeated vehicle interests and cursor precision. Fixtures roll back at the end.

Frontend and Chromium checks cover seller selection, server query propagation, pagination, clear/reset, source/vehicle combinations and responsive controls. Membership lookup errors offer recovery without claiming there are no sellers. Board request errors retain the existing explicit retry state.
