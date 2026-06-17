# Migration Plan

This is the final master plan for moving Loja V1 data and behavior into V2.
The plan is intentionally tenant-wave based: V1 remains the source of truth
until a store or agency wave has passed rehearsal, parity checks, cutover, and
rollback review.

## Principles

- No production migration without a rehearsal against a recent backup.
- No table rename without a source-to-target mapping.
- No feature is considered migrated until behavior, data, permissions, audit,
  and rollback are documented.
- V1 data remains the source of truth until a cutover decision is made.
- Migration tooling must run on local dumps or sanitized backups. Do not connect
  migration scripts directly to production.
- Banking is schema-only in this migration. Do not move money, custody flows, or
  payment-link execution into V2 during the V1 cutover.

## Final Master Decisions

| Area                     | Decision                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy language         | V1 `tenant` language maps to V2 `stores` for operating dealerships. Use `tenants` only for the billing/legal account or agency owner that can contain one or more stores.                                                         |
| Identity and permissions | V2 uses role templates plus per-user overrides. Templates cover onboarding defaults; overrides allow or deny exact permissions per store membership.                                                                              |
| Inventory model          | Split vehicle data into listing and unit concepts. A listing is the advertised commercial object; a unit is the physical or stock-counted vehicle/inventory item.                                                                 |
| 0km stock                | Use a hybrid 0km stock model: one listing can represent a model/color/trim offer while one or more units or color stock buckets represent available inventory.                                                                    |
| Leads and CRM ownership  | V2 owns leads. The repasses backend remains a transitional CRM/WhatsApp backend, but V2 becomes the source of truth for lead capture, lead identity, pipeline references, and store-level lead history.                           |
| Agency billing           | Agency tenant billing is first-class. A tenant can pay centrally for multiple stores, with per-store entitlements, discounts, add-ons, and allocation metadata.                                                                   |
| Documents                | Documents are shared domain objects linked to stores, leads, listings, units, sales, test drives, and fiscal flows. Do not duplicate document storage per bounded context.                                                        |
| Migration rollout        | Cutover happens by tenant wave, not all-at-once. Each wave contains selected stores or agency tenants with a rehearsed mapping, parity report, fallback owner, and acceptance sign-off.                                           |
| Audit failure behavior   | Audit uses tiered failure handling. Critical financial, permission, and document actions must fail closed if audit cannot be recorded; lower-risk product analytics and diagnostics can fail open with retry/dead-letter capture. |
| Banking                  | Banking tables and service boundaries may be created as schema-only placeholders. No production banking operations are migrated or enabled during this plan.                                                                      |

## Target Domain Mapping

### Tenant And Store Model

- `tenants`: legal/billing account, including agencies that manage multiple
  stores.
- `stores`: operating dealership context. Most V1 `Loja` operational records
  become store-scoped records.
- `store_memberships`: user access to one store with role template and
  overrides.
- `entitlements`: feature access derived from tenant billing and store add-ons.

V1 `Loja` must be split before migration. Do not migrate it as a single V2
table. Store profile, public site, integrations, billing, and onboarding state
are separate targets.

### Role Templates And Overrides

Migration creates memberships with one role template per user/store
relationship, then applies override rows only where V1 behavior requires a
permission difference. The target shape is:

- role templates: `owner`, `agency`, `admin`, `supervisor`, `salesman`;
- per-user permission overrides: one allow or deny grant per membership;
- entitlements: store feature access controlled by billing/add-ons;
- audit metadata: every permission resolution includes actor, tenant, store,
  membership, template, and override provenance.

### Listing And Unit Split

V1 `Veiculo` must be classified during profiling:

- used vehicle: usually one listing and one physical unit;
- 0km vehicle with `stockByColor`: one listing with color stock buckets and,
  where individual VIN/unit data exists, unit rows;
- sold vehicle: listing remains historical, unit carries sale/disposition state;
- integration projection: portal-specific listing state remains separate from
  listing and unit source data.

This split prevents advertised content, physical stock, sale state, and portal
sync state from collapsing into one table again.

### V2-Owned Leads

V2 owns lead capture and lead identity from cutover onward. Transitional CRM
calls to `repasses-lojaveiculos-backend` must go through an ACL and store only
external references needed for WhatsApp/team workflow continuity. Migration must
copy V1 lead records into V2 lead tables, preserving CRM references as external
ids rather than making repasses the lead source of truth.

### Shared Documents

Documents are migrated once into a shared documents domain. Links attach each
document to its business context:

- store document;
- lead document;
- listing or unit document;
- sale document;
- test-drive document;
- fiscal document reference.

Backfill provenance, PDF regeneration metadata, uniqueness rules, and document
status must be preserved without copying raw document payloads into logs.

### Billing, Agency Tenants, And Banking

Billing migration must support agencies paying centrally for multiple stores.
Required targets include tenant billing customer, subscription, invoice/payment
state, discounts, add-ons, entitlement grants, and per-store allocation metadata.

Banking is intentionally limited to schema and boundary preparation. The V2
schema may reserve tables for bank accounts, payment links, custody ledger
references, and provider events, but no customer banking balance, transfer, or
custody workflow is enabled during this migration.

### Audit Failure Tiers

| Tier                 | Examples                                                                                            | Migration/Cutover Behavior                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Critical fail-closed | Billing mutation, permission mutation, document generation/signing, sale close, fiscal issue/cancel | Abort the action if the audit sink cannot persist the event.               |
| Important retryable  | Vehicle update, lead assignment, integration sync state change                                      | Complete only if the event is accepted by the sink or durable retry queue. |
| Diagnostic fail-open | UI diagnostics, non-billing analytics, profiling telemetry                                          | Continue, record local warning, and retry where available.                 |

Wave rehearsals must test audit sink unavailable scenarios for every critical
flow before cutover.

## Phases

1. Inventory current V1 schema, queries, table sizes, indexes, slow paths, and
   local dump profile.
2. Classify V1 `Loja` records into tenant, store, agency billing, profile,
   public site, and integration targets.
3. Define V2 schema in English `lower_snake_case`, including listing/unit split,
   V2-owned leads, shared documents, agency billing, audit tiers, and
   schema-only banking placeholders.
4. Write source-to-target mappings for each bounded context.
5. Build idempotent migration scripts with deterministic legacy id maps.
6. Rehearse migration on a sanitized backup or local dump restore.
7. Run parity checks for counts, totals, listing/unit states, 0km stock, billing
   state, entitlements, permissions, leads, documents, and CRM external
   references.
8. Cut over a pilot tenant wave.
9. Expand wave-by-wave across stores and agency tenants.

## Tenant-Wave Runbook

Each migration wave must have:

- wave id, tenant ids, store ids, and agency billing owner if applicable;
- source dump timestamp and schema commit;
- mapping manifest for every migrated V1 table;
- expected downtime or read-only window;
- data parity report;
- permission and entitlement parity report;
- audit-tier failure test result;
- rollback owner and fallback decision deadline;
- business acceptance sign-off.

Wave order should start with the smallest representative store, then one
multi-user store, then one agency tenant with multiple stores, then broader
groups by operational similarity.

## Local Dump Profiling

Use a local plain SQL dump only. The profiler does not connect to a database and
does not require production credentials:

```bash
node tools/migration/profile-local-dump.mjs /path/to/local-v1.dump.sql
```

Optional explicit output path:

```bash
node tools/migration/profile-local-dump.mjs /path/to/local-v1.dump.sql /tmp/v1-profile.json
```

The report includes table row counts, null counts, safe status/type
distributions, and duplicate counts for identifier-like columns without printing
personal identifiers. Treat the output as local migration evidence; do not commit
customer data profiles unless they have been reviewed and sanitized.

The source dump should be produced outside this repo by an approved operator.
This repository must not contain production dumps, credentials, `.pgpass` files,
or customer payload exports.

## Parity Checks

- Tenant/store counts and store profile completeness.
- User memberships, role templates, overrides, and entitlements.
- Listings, units, used stock, sold stock, and hybrid 0km color stock totals.
- Lead counts, lead source attribution, pipeline status, tasks, interactions,
  and external CRM references.
- Shared document counts, link counts, statuses, backfill provenance, and PDF
  regeneration metadata presence.
- Sales, payments, commissions, transfer data, and fiscal references.
- Billing customers, subscriptions, add-ons, discounts, agency allocation, and
  entitlement grants.
- Integration credentials presence by provider without logging secret values.
- Audit event counts by critical flow and failure-tier behavior.

## Open Questions

- Which historic records are immutable and should be append-only?
- What is the acceptable downtime window for final cutover?
- Which stores belong in the first three tenant waves?
- Which banking placeholders are needed in the initial schema without enabling
  runtime banking behavior?
