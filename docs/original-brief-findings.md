# Original Brief Findings

This document turns the first V2 brief into implementation branches.

## Already Decided

- V2 lives in `./lojaveiculosv2`.
- Primary deploy target is Railway.
- `repasses-lojaveiculos-backend` remains the CRM backend during transition.
- CRM iframe/bridge auth must be removed from V2.
- Drizzle owns the V2 schema.
- Audit uses a separate Railway Postgres database.
- Current Loja V1 Prisma schema is migration evidence, not a design source.

## Design Findings From Current Loja

Source files inspected:

- `lojaveiculos/src/app/[slug]/admin/components/views/DashboardView.tsx`
- `lojaveiculos/src/app/[slug]/admin/components/views/CrmWhatsappView.tsx`
- `lojaveiculos/src/app/[slug]/admin/components/views/SpedyNfeView.tsx`
- `lojaveiculos/src/app/[slug]/admin/components/AdminSidebar.tsx`

Useful patterns to carry forward:

- Icon-led operational navigation.
- Vibrant flat stat cards with close-range gradients.
- Dense dashboard panels for repeated operational use.
- Add-on locked states that explain value and show a direct billing action.
- Mobile-first spacing for admin views and add-on flows.
- Sidebar grouping by daily operation, management, marketing, services, settings.

Patterns to avoid:

- Heavy shadows as default styling.
- Runtime-generated Tailwind color classes.
- Iframe CRM embedding.
- Bridge-token auth.
- Mixed Portuguese/English schema and service naming.
- Business logic in UI views and route handlers.

## Implementation Branches

| Branch                  | Dependency                               | First V2 Work                                                          |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| Identity and tenancy    | Required by every private feature        | Clerk user mapping, tenant/store tables, membership, permission checks |
| Product shell           | Required by all frontend work            | Sidebar, dashboard, locked states, responsive layout                   |
| Inventory               | Depends on tenancy and permissions       | Vehicles, media, specs, status, aging inventory metrics                |
| CRM frontend migration  | Depends on shared Clerk and CRM ACL      | Replace iframe with native V2 routes calling repasses backend          |
| Billing                 | Depends on tenancy, permissions, audit   | Asaas customer/subscription/payment links/agency billing               |
| Audit and observability | Required by every service                | Audit sink, scoped logs, internal diagnostics dashboard                |
| External API            | Depends on permissions and service layer | AI-friendly dealer actions and docs                                    |
| Migration               | Depends on V1 profiling and V2 schema    | Legacy id maps, rehearsals, parity checks                              |
