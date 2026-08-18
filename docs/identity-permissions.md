# Identity, Permissions, And Entitlements

V2 starts with role templates plus per-user permission overrides.

## Why

The current requirement is not custom role authoring. It is precise operational
control: one seller may edit vehicle descriptions but not vehicle prices, while
another user may manage prices, billing, or fiscal integrations.

Role templates keep onboarding simple. Per-user overrides give the precision
needed for real stores without building a full role-builder product too early.

## Concepts

- Role template: default permission set for `owner`, `agency`, `admin`,
  `supervisor`, `salesman`, or read-only `investor`.
- Permission override: allow or deny one permission for one store membership.
- Entitlement: whether the store has access to a feature such as `analytics`,
  `automation`, `compliance`, `crm`, `nfe`, `marketplace`, `simulations`,
  `external_api`, `custom_domain`, `plate_lookup`, or `subdomain`.
- Permission: whether the actor may perform an action inside an entitled
  feature.

Billing controls entitlements. Membership controls permissions.

`tenants` are billing/legal accounts. `stores` are the operating dealership
contexts where memberships, role templates, overrides, and most day-to-day
permissions are resolved. Agency users may receive a role template on multiple
stores under one tenant, with store-specific overrides where needed.

Migration should assign the closest role template first, then create override
rows only for differences proven by V1 behavior or business rules. Do not create
custom role definitions during the V1 migration.

## Enforcement

- `resolveStoreContext` resolves actor, tenant, store, role permissions,
  per-user overrides, entitlements, and audit metadata.
- Services call `assertPermission` for every protected action.
- Feature-gated flows call `assertEntitlement`.
- Authorization failures log structured metadata before throwing.

Permission and entitlement mutations are critical audit events. If the audit sink
cannot persist those events, the mutation must fail closed.

Soft-deleted users, stores, and tenants must never resolve an authenticated
store context. Long-lived credentials and background/provider flows must
revalidate the current entitlement instead of trusting the entitlement that was
active when a key, webhook secret, connection, or scheduled action was created.

## Default Role Contract

- `owner` and `agency` receive every store-manageable permission by default.
- `admin` manages the store operation but does not inherit owner billing or
  tenant authority.
- `supervisor` manages the daily commercial operation without billing, tenant,
  user, fiscal, compliance, or public API administration by default.
- `salesman` receives operational inventory, lead, CRM, document, finance-entry,
  and seller sale permissions, but cannot change prices, manage billing, or
  administer integrations by default.
- `investor` is read-only for the financial, inventory, document, lead,
  marketplace, and CRM views explicitly assigned to that role.

An agency-managed store strips `billing.manage` from store memberships even
when the user is the store owner. The agency actor remains the billing authority.
The generated SQL role projection is regression-tested against this runtime
contract so seeds cannot silently drift from authorization behavior.

## Commercial Feature Contract

Permissions and entitlements are both mandatory for paid add-on operations:

- CRM messaging: `crm` plus the relevant `crm.conversations.*`,
  `crm.messages.*`, `crm.attendances.*`, or `crm.bot.*` permission.
- NF-e: `nfe` plus the relevant `fiscal.*` permission.
- Marketplaces: `marketplace` plus the relevant `marketplace.*` permission.
- Public API management and key authentication: `external_api` plus
  `external_api.manage` or the key's explicit scopes.
- Simulations: `simulations` plus
  `inventory.resale_analysis_generate`.

Vehicle checklists are a core operational permission surface, not the
`compliance` entitlement. The 14-day trial grants only `subdomain`,
`automation`, `analytics`, and `compliance`; custom domain and cost-bearing or
critical add-ons remain locked until paid activation.

## Core CRM Contract

Customers, leads, pipelines, activities, and visits are part of the core store
operation. They require tenant/store scope and the relevant `lead.*`,
`crm.pipeline.*`, or `crm.visits.*` permission, but do not require the paid
WhatsApp entitlement.

## Automation Contract

The `automation` entitlement gates the preview workspace. Permissions remain
separate so stores can let operators prepare and cancel previews without letting
them approve a proposal:

- `automation.read`: list and inspect store-scoped runs.
- `automation.run`: create a deterministic read-only preview.
- `automation.cancel`: cancel a preview that still awaits a decision.
- `automation.approve`: approve or reject the exact preview digest.

The initial automation slice cannot execute tools. Approval and rejection are
terminal review decisions, and optimistic run, step, and approval versions plus
the proposal digest must match before a decision is persisted.

## CRM Messaging Contract

External messaging channels are CRM features, but they do not inherit lead
permissions. Operators manage these explicit channel-neutral permissions in the
CRM group:

- `crm.conversations.read`: bootstrap, connection, agent, thread, cycle, and
  message reads, including read-state changes.
- `crm.conversations.assign`: assign conversation attendance.
- `crm.conversations.manage`: close or otherwise manage conversation cycles.
- `crm.messages.send`: create conversations and send outbound messages.
- `crm.messages.ingest`: persist authenticated provider inbound messages.
- `crm.attendances.manage`: transition bot and human handling state.
- `crm.tags.assign`: attach and remove existing tags on conversation threads.
- `crm.tags.manage`: create, edit, delete, and reorder tags.
- `crm.scheduled_messages.read`: list scheduled channel messages.
- `crm.scheduled_messages.create`: schedule a supported channel message.
- `crm.scheduled_messages.cancel`: cancel a pending scheduled message.
- `crm.scheduled_messages.process`: process due scheduled messages.
- `crm.messaging.connection.setup`: configure a new channel and submit its
  initial write-only credentials.
- `crm.messaging.connection.pair`: request pairing by QR Code or phone code and
  refresh channel connection state.
- `crm.campaigns.read`: view messaging campaigns and metrics.
- `crm.campaigns.manage`: create, pause, resume, and cancel messaging
  campaigns.
- `crm.bot.read`: inspect external bot configuration, policies, and diagnostics.
- `crm.bot.manage`: configure the external bot and write-only webhook secret.
- `crm.bot.proposals.decide`: explicitly approve or reject queued proposals.

V2 asserts these permissions, tenant/store scope, CRM entitlement context, and
audit metadata before every messaging operation. Pre-launch CRM code should not
keep Repasses payload compatibility or dead fallback branches unless a new
explicit business requirement says otherwise.
