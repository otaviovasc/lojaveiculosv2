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
