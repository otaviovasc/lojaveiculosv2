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
  `supervisor`, or `salesman`.
- Permission override: allow or deny one permission for one store membership.
- Entitlement: whether the store has access to a feature such as `crm`, `nfe`,
  `automation`, `external_api`, `custom_domain`, `plate_lookup`, or `subdomain`.
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

## CRM WhatsApp Contract

WhatsApp is a CRM feature, but it does not inherit lead permissions. Operators
manage these explicit permissions in the CRM group:

- `crm.whatsapp.list`: bootstrap, connection, agent, and session-list reads.
- `crm.whatsapp.read`: message reads and read-state changes.
- `crm.whatsapp.send`: create conversations and send outbound messages.
- `crm.whatsapp.assign`: assign conversations.
- `crm.whatsapp.close`: close conversations.
- `crm.whatsapp.toggle_intervention`: toggle manual intervention.
- `crm.whatsapp.tags.assign`: attach and remove existing tags on sessions.
- `crm.whatsapp.tags.manage`: create, edit, delete, and reorder tags.
- `crm.whatsapp.schedules.read`: list scheduled WhatsApp messages.
- `crm.whatsapp.schedules.create`: schedule a WhatsApp text message.
- `crm.whatsapp.schedules.cancel`: cancel a pending scheduled message.
- `crm.whatsapp.schedules.process`: process due scheduled messages.
- `crm.whatsapp.connection.manage`: edit ZAPI metadata, configured status,
  env-var credential references, and webhook base URL.
- `crm.whatsapp.campaigns.read`: view WhatsApp campaigns and metrics.
- `crm.whatsapp.campaigns.manage`: create, pause, resume, and cancel WhatsApp
  campaigns.
- `crm.whatsapp.integrations.manage`: configure external bot integrations and
  write-only webhook secrets.
- `crm.pipeline.read`: view CRM pipeline stages and settings.
- `crm.pipeline.move`: move leads through persisted CRM pipeline stages.
- `crm.pipeline.manage`: configure CRM pipeline stages and rules.
- `crm.visits.read`: view lead visits.
- `crm.visits.manage`: create, update, complete, and cancel lead visits.

V2 asserts these permissions, tenant/store scope, CRM entitlement context, and
audit metadata before every WhatsApp operation. Pre-launch WhatsApp code should
not keep Repasses payload compatibility or dead fallback branches unless a new
explicit business requirement says otherwise.
