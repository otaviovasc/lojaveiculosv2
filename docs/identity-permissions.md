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

## CRM WhatsApp Contract

WhatsApp is a CRM feature, but it does not inherit lead permissions. Operators
manage these explicit permissions in the CRM group:

- `crm.whatsapp.list`: bootstrap, connection, agent, and session-list reads.
- `crm.whatsapp.read`: message reads and read-state changes.
- `crm.whatsapp.send`: create conversations and send outbound messages.
- `crm.whatsapp.assign`: assign conversations.
- `crm.whatsapp.close`: close conversations.
- `crm.whatsapp.toggle_intervention`: toggle manual intervention.
- `crm.whatsapp.tag.assign`: attach and remove existing tags on sessions.
- `crm.whatsapp.tag.manage`: create, edit, delete, and reorder tags.
- `crm.whatsapp.schedule.read`: list scheduled WhatsApp messages.
- `crm.whatsapp.schedule.create`: schedule a WhatsApp text message.
- `crm.whatsapp.schedule.cancel`: cancel a pending scheduled message.
- `crm.whatsapp.schedule.process`: process due scheduled messages.
- `crm.whatsapp.connection.update_metadata`: edit safe ZAPI connection labels,
  phone fields, external ids, and admin metadata.
- `crm.whatsapp.connection.update_status`: change the V2 configured connection
  status.
- `crm.whatsapp.connection.update_credentials`: change the environment variable
  references used to resolve ZAPI credentials.
- `crm.whatsapp.connection.update_webhooks`: change the connection webhook base
  URL.

V2 asserts these permissions, tenant/store scope, CRM entitlement context, and
audit metadata before every WhatsApp operation. Pre-launch WhatsApp code should
not keep Repasses payload compatibility or dead fallback branches unless a new
explicit business requirement says otherwise.
