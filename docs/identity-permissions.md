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
- Entitlement: whether the store has access to a canonical feature such as
  `storefront`, `inventory`, `lead_capture`, `sales`, `financing`, `documents`,
  `finance`, `commissions`, `checklists`, `ai`, `crm`, `fiscal`, `analytics`,
  `compliance`, `marketplace`, `external_api`, `automation`, `custom_domain`,
  or `plate_lookup`.
- Permission: whether the actor may perform an action inside an entitled
  feature.

Billing controls entitlements. Membership controls permissions.

Platform/developer administration is a separate authority boundary. A store
`owner` or `agency` actor does not receive platform-admin access merely from
that role, and the store `admin` template is not a substitute for a platform
administrator. Platform observability, support, migration, and other internal
admin surfaces require the explicit platform-admin context and should not be
made reachable through ordinary customer navigation. If the operational
`admin` template is retained for internal development fixtures, it remains
distinct from customer-facing owner and agency roles.

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

- `owner` and `agency` receive every store-manageable permission by default,
  but never platform-admin permissions.
- `admin` is reserved for internal/developer administration and is not a
  customer-facing shortcut to platform access. Any store-scoped operational
  role that exists for fixtures must still be checked against explicit
  permissions and never imply platform administration.
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

User quotas are admission control, not lifecycle enforcement. The invite
operation counts the effective active users and pending invitations before
admitting another invitation. A downgrade can leave a store temporarily above
the new quota; it must not deactivate or delete existing users, and it must
continue blocking new invitations until the count is within the effective
plan's limit.

## Commercial Feature Contract

Permissions and plan entitlements are both mandatory for feature operations:

- CRM messaging: `crm` plus the relevant `crm.conversations.*`,
  `crm.messages.*`, `crm.attendances.*`, or `crm.bot.*` permission.
- NF-e: `fiscal` plus the relevant `fiscal.*` permission.
- Marketplaces: `marketplace` plus the relevant `marketplace.*` permission.
- Public API management and key authentication: `external_api` plus
  `external_api.manage` or the key's explicit scopes.
- Commissions: `commissions` plus `commissions.read`,
  `commissions.rules.manage`, or `commissions.settle`. Supervisors can read and
  manage rules; only owners/admins settle by default.
- AI Studio and resale analysis: `ai` plus the corresponding explicit
  inventory AI permission.

Free permanently grants `storefront`, `inventory`, `lead_capture`, and the
server-owned Free quotas. Paid capabilities activate only after verified
payment and contract projection. Billing and settings remain reachable to
actors with `billing.manage` while the effective plan is Free.

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
