# Loja Veiculos V2

V2 is the new product workspace for rebuilding `lojaveiculos` and migrating the
CRM frontend from `repasses-frontend` while keeping `repasses-lojaveiculos-backend`
as the CRM backend during the transition.

## Runtime Direction

- Primary deploy target: Railway.
- Target topology: one Railway project for V2 app/API/database adjacency and the
  existing repasses backend/frontend during migration.
- CRM backend: keep `repasses-lojaveiculos-backend` as an external service for
  now, accessed through an anti-corruption layer.
- Loja V1: read as source of truth for current behavior and production data
  migration, but do not continue its architecture.

## Workspace

```text
lojaveiculosv2/
├── apps/
│   ├── api/       # Loja V2 backend and external API
│   └── web/       # Vite + React product UI, including migrated CRM
├── packages/
│   ├── audit/     # Audit contracts, event taxonomy, actor metadata
│   ├── config/    # Typed environment config
│   ├── db/        # New database schema and migration planning
│   ├── design-system/
│   └── shared/    # Shared DTOs, ids, result types, validation helpers
├── docs/
│   ├── architecture.md
│   ├── feature-inventory.md
│   ├── migration.md
│   ├── runbooks/v1-to-v2-basic-migration.md
│   └── railway.md
└── tools/
    └── quality/   # Local checks agents must keep green
```

## Local Development

Run the full local stack from the repo root:

```bash
corepack enable
pnpm install
pnpm run db:up
pnpm run db:push:local
pnpm run db:seed:local
pnpm run dev:all:local
```

Then open the web app at `http://localhost:5173`. The API listens on
`http://localhost:8787`, and Vite proxies `/api` to that API.

For real Clerk QA, keep the local bypass variables empty and sign in through
`/sign-in` or `/sign-up`. The root `.env` should contain Clerk's V2
publishable key, backend secret, authorized local origins, and redirects back to
`http://localhost:5173/auth/session`.

Authless seeded preview is still available for narrow local demos by setting:

```text
LOCAL_AUTH_BYPASS=true
DEV_CLERK_USER_ID=clerk_seed_owner
DEV_STORE_SLUG=test-store
VITE_LOCAL_AUTH_BYPASS=true
VITE_DEV_STORE_SLUG=test-store
```

`pnpm run dev:all:local` sets these local-only values for the child API/web
processes and clears Clerk secrets so the trusted-header flow cannot be mixed
with a real Clerk token verifier by accident. In the browser, `/sign-in` becomes
a local QA account switcher for seeded agency, owner, supervisor, and salesman
personas. After the stack is running, execute:

```bash
pnpm run qa:permissions:local
```

The product seed creates realistic local data for inventory, CRM/leads,
finance, commissions, documents, public storefront, billing, marketplace,
external API, fiscal, provider events, users, roles, and entitlements.

For local database cleanup:

```bash
pnpm run db:clean:local
pnpm run db:reset:local
```

`db:clean:local` keeps the Docker volumes, truncates local product and audit
tables with `CASCADE`, and re-runs the local seed. `db:reset:local` recreates
the local Docker volumes, pushes the schema, and re-runs the same seed. Both
commands refuse to run when database URLs do not match the known local database
names, users, and ports, or when production/Railway runtime markers are present.

Useful checks:

```bash
pnpm run validate
pnpm --filter @lojaveiculosv2/web test
pnpm --filter @lojaveiculosv2/api test
```

## Current Package Targets

Checked against the package registry on 2026-06-23:

- Vite `8.0.16`
- React `19.2.7`
- Tailwind CSS `4.3.1`
- TypeScript `6.0.3`
- Zod `4.4.3`
- Zustand `5.0.14`
- React Hook Form `7.79.0`
- Drizzle ORM `0.45.2`
- Drizzle Kit `0.31.10`
- Mikro ORM Core `7.1.4`
- Hono `4.12.22`
- React Router DOM `7.18.0`
- TanStack Query `5.101.1`
- Sentry `10.60.0`
- Pino `10.3.0`
- `@hono/node-server` `2.0.5`
- `@vitejs/plugin-react` `6.0.2`
- `@tailwindcss/vite` `4.3.1`
- Vitest `4.1.9`
- TSX `4.22.4`
- ESLint `10.5.0`
- `@types/react` `19.2.17`
- `@types/react-dom` `19.2.3`

## Non-Negotiables

- English-only database names using `lower_snake_case`.
- Feature-scoped controllers.
- Domain-scoped services under `domains/<domain>/services/<ServiceName>/`.
- Every service must receive permission, audit, and logger context explicitly.
- No secrets in code, docs, screenshots, or commits.
- No iframe CRM in V2.
- No hardcoded visual colors outside design-system tokens and global CSS.
- No production feature migration without an inventory row and degradation notes.
