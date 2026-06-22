# Railway

Railway is the primary deploy target for V2.

## Target Project

The preferred target is one Railway project named `loja-v2` containing isolated
`production` and `staging` environments.

Each persistent environment should contain:

- `lojaveiculosv2-web`
- `lojaveiculosv2-api`
- product Postgres
- audit Postgres
- `redis`
- existing `repasses-backend` during transition
- existing `repasses-frontend` until the CRM UI is migrated

## Deployment Rules

- Production deploy branch: `main`.
- Staging deploy branch: `staging`.
- Enable Railway Wait for CI before enabling autodeploy.
- Enable PR environments after the base services are healthy.
- Healthcheck path: `/health`.
- Keep production Railway operations read-only from agent sessions unless the
  operator explicitly asks for a specific mutation.

## Reference Docs

- Full loop: `docs/maximum-agentic-loop-railway-terraform.md`
- Deploy runbook: `docs/runbooks/deploy.md`
- Incident runbook: `docs/runbooks/incidents.md`
- Rollback runbook: `docs/runbooks/rollback.md`
- Variables: `docs/ops/env-vars.md`

## MCP

Local setup:

```bash
railway login
railway mcp install --agent codex
```

Restart Codex after installation.
