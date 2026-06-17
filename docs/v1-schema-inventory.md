# Loja V1 Schema Inventory

Source: `../lojaveiculos/prisma/schema.prisma`.

This is migration evidence for V2. Do not copy V1 naming or structure directly.
The V1 schema uses Prisma, Postgres, integer autoincrement ids, mixed
Portuguese/English names, JSON blobs, and several mapped legacy table/column
names.

## High-Level Shape

- 39 Prisma models.
- Store tenancy is centered on `Loja.id` as an integer.
- Most tenant-scoped records use `lojaId Int`.
- Auth identity is Clerk-based through `ownerClerkId`, `clerkUserId`, and
  seller fields.
- Several CRM fields reference `repasses` ids directly.
- Billing is split across current subscription/payment tables and extra audit
  tables.
- Fiscal documents exist in both a newer independent flow and legacy Sale NFe
  fields.
- Many extensibility points are `Json`, which need typed V2 contracts before
  migration.

## Domain Grouping

| V1 Area                    | Models                                                                                                                  | V2 Target Context                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Store and tenancy          | `Loja`, `Settings`, `PartnerStore`, `Testimonial`                                                                       | identity, tenant, store profile, public site   |
| Access and sellers         | `UserProfile`, `LojaAccess`                                                                                             | identity, membership, permissions, commissions |
| Plans and billing          | `Payment`, `CustomPlan`, `PlanUpgrade`, `BillingAudit`, `BillingCompositionVersion`, `AsaasProcessedEvent`, `LojaAddon` | billing, entitlements, audit                   |
| Inventory                  | `Marca`, `Modelo`, `Veiculo`, `FotosVeiculo`, `VehicleChecklist`, `ModeloMigrationAudit`, `ModeloMigrationBackup`       | catalog, inventory, media, vehicle condition   |
| Finance control            | `RecurringEntry`, `Entry`                                                                                               | finance, expenses, revenue, vehicle costs      |
| Leads and light CRM sync   | `Lead`, `LeadColumn`, `LeadTask`, `LeadInteraction`, `LeadInterestedVehicle`                                            | CRM facade, sales pipeline, tasking            |
| Documents and sales        | `Document`, `SaleSource`, `Sale`, `SalePayment`, `TestDrive`                                                            | sales, documents, test drives                  |
| Fiscal docs                | `FiscalDocument`, `ServiceRecipient`                                                                                    | fiscal, Spedy integration                      |
| Portal integrations        | `Integration`, `VehicleIntegrationSync`, `IntegrationLog`                                                               | integrations                                   |
| Analytics and external API | `AnalyticsEvent`, `Placas`, `PlacaApiUsage`, `CompraCarroLead`                                                          | analytics, plate lookup, campaigns             |

## Critical Migration Problems

- V1 ids are `Int @default(autoincrement())`; V2 ids are UUIDs. Migration needs
  deterministic id mapping tables per source model.
- `Loja` mixes tenant, store, billing, customization, external API token,
  referral, and onboarding profile concerns.
- `Veiculo` mixes ad data, technical specs, FIPE data, preparation state, media
  hints, ownership, auction/inspection flags, and creator identity.
- `Lead` mixes public form leads, CRM sync, kanban state, financing status,
  buyer lifecycle, anti-spam metadata, and scheduled visits.
- Billing is fragmented across `Loja`, `Payment`, `CustomPlan`, `PlanUpgrade`,
  `BillingAudit`, `BillingCompositionVersion`, and `LojaAddon`.
- Fiscal documents are duplicated across `FiscalDocument` and legacy `Sale`
  NFe fields.
- Documents have backfill provenance and uniqueness rules that must be preserved
  during migration.
- Provider credentials live in `Integration` encrypted text fields and must never
  be dumped into migration logs.
- Several fields use Portuguese names or mixed naming; all V2 schema names must
  be English `lower_snake_case`.

## Json Fields To Type Before Migration

| Model                       | Field                                                                                            | Current Purpose                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `Loja`                      | `customization`                                                                                  | Theme, logo, hero, about, contact extras, layout |
| `Loja`                      | `user`                                                                                           | Onboarding/customer profile blob                 |
| `Loja`                      | `instagram_presets`                                                                              | Instagram template presets                       |
| `Settings`                  | `autoEntriesConfig`                                                                              | Automatic entries for sales                      |
| `Settings`                  | `leadKanbanConfig`                                                                               | Kanban visibility settings                       |
| `LojaAccess`                | `financingSellerPercentByRank`                                                                   | Seller financing commission by rank              |
| `LojaAccess`                | `transferCommissionTiers`                                                                        | Transfer-document commission tiers               |
| `LojaAddon`                 | `config`                                                                                         | Addon/provider-specific config                   |
| `FiscalDocument`            | `items`, `metadata`                                                                              | Fiscal item data and entity snapshots            |
| `Payment`                   | `raw`                                                                                            | Provider raw payment payload                     |
| `Veiculo`                   | `stockByColor`                                                                                   | 0km color inventory                              |
| `Entry`                     | `metadata`                                                                                       | Insurance/consortium/service metadata            |
| `Document`                  | `pdfData`, `metadata`                                                                            | PDF regeneration data and extension fields       |
| `Lead`                      | `tags_crm`, `intervention_history`, `visita_agendada`, `status_financiamento`, `source_metadata` | CRM sync and buyer pipeline metadata             |
| `Integration`               | `config`                                                                                         | Provider-specific sync settings                  |
| `VehicleIntegrationSync`    | `externalData`                                                                                   | Provider metrics and listing metadata            |
| `IntegrationLog`            | `metadata`                                                                                       | Integration log context                          |
| `Placas`                    | `response_data`, `ai_response_data`, `fipe_response_data`                                        | Plate lookup cache                               |
| `PlanUpgrade`               | `old_value`, `new_value`                                                                         | Plan mutation snapshots                          |
| `BillingAudit`              | `before`, `after`                                                                                | Billing audit snapshots                          |
| `BillingCompositionVersion` | `storeConfigs`                                                                                   | Agency billing composition                       |

## V2 Mapping Direction

| V1 Source                                           | V2 Direction                                                                                                                                                                                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Loja`                                              | Split into `tenants` for legal/billing accounts, `stores` for operating dealerships, `store_profiles`, `store_public_site_settings`, `entitlements`, integrations, and billing customer/subscription tables.                            |
| `UserProfile`, `LojaAccess`                         | Use `users`, `store_memberships`, role templates, per-user permission overrides, and commission policy tables.                                                                                                                          |
| `Marca`, `Modelo`                                   | Split global FIPE catalog from store custom model aliases.                                                                                                                                                                              |
| `Veiculo`                                           | Split into listings and units. Used vehicles usually become one listing plus one unit; 0km records with `stockByColor` become a listing with color stock buckets and optional units; portal sync state becomes integration projections. |
| `FotosVeiculo`                                      | Use vehicle media table with storage provider metadata and ordering.                                                                                                                                                                    |
| `Entry`, `RecurringEntry`                           | Use finance entries and recurrence schedules with links to vehicle, sale, lead, or service.                                                                                                                                             |
| `Lead*`                                             | V2 owns leads, lead identity, source attribution, pipeline references, tasks, interactions, and store lead history. Repasses ids are external references for transitional CRM/WhatsApp workflows through the CRM ACL.                   |
| `Sale`, `SalePayment`, `SaleSource`                 | Use sales aggregate, buyer snapshot, payments, transfer data, seller commissions, and document links.                                                                                                                                   |
| `Document`, `TestDrive`                             | Keep documents as a shared first-class domain linked to stores, leads, listings, units, sales, test drives, and fiscal flows. Migrate `TestDrive` into typed document/test-drive tables rather than legacy PDF blobs only.              |
| `FiscalDocument`, `ServiceRecipient`                | Keep separate fiscal context with Spedy ids, status, entity linkage, and typed fiscal recipient data.                                                                                                                                   |
| `Integration*`                                      | Keep provider credentials/config separate from sync state and logs. Logs should move to audit/observability where appropriate.                                                                                                          |
| `Payment`, `CustomPlan`, `PlanUpgrade`, `LojaAddon` | Redesign billing around Asaas customer/subscription/payment-link primitives, entitlements, discounts, agency tenant billing, per-store allocation metadata, and schema-only future banking/payment-link custody.                        |

## Final Migration Classifications

- V1 `Loja` operational tenancy becomes V2 `stores`; V2 `tenants` are
  billing/legal accounts and agency owners.
- V1 seller/access data migrates to role templates plus per-user overrides, not
  custom roles.
- V1 `Veiculo` must be profiled for listing/unit classification before schema
  lock, especially 0km `stockByColor` records.
- V1 `Lead*` records migrate into V2-owned lead tables. Repasses references are
  copied only as external ids needed for transitional CRM continuity.
- V1 `Document` data migrates once into shared documents plus link tables.
- V1 billing data must support agency tenant billing and per-store entitlement
  allocation.
- Banking is schema-only. Do not migrate executable banking behavior or custody
  state as part of the V1 cutover.
- Audit migration and rehearsals must validate tiered failure behavior for
  critical financial, permission, document, sale, and fiscal events.

## Migration Requirements

- Create `legacy_id_map` tables or migration artifacts for every V1 table moved
  to UUID V2 tables.
- Run data profiling before final schema lock: row counts, null rates, enum
  distributions, duplicate candidates, and orphaned references.
- Preserve paid workflows first: listings and units, hybrid 0km stock, public
  store pages, agency-aware billing, lead capture, CRM external references,
  shared documents, and sales.
- Never log provider tokens, API tokens, buyer personal data, document payloads,
  or raw webhook payloads during migration.
- Build migration rehearsals against a backup before touching production.
- Cut over by tenant wave with parity reports and rollback owners.
