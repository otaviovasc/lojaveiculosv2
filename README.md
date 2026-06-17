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
│   └── railway.md
└── tools/
    └── quality/   # Local checks agents must keep green
```

## Current Package Targets

Checked against npm on 2026-06-16:

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
