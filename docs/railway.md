# Railway

Railway is the primary deploy target for V2.

## Target Project

The preferred target is one Railway project containing:

- `lojaveiculosv2-web`
- `lojaveiculosv2-api`
- `lojaveiculosv2-postgres`
- `lojaveiculosv2-audit-postgres`
- `redis`
- existing `repasses-backend` during transition
- existing `repasses-frontend` until the CRM UI is migrated

## MCP

Local setup:

```bash
railway login
railway mcp install --agent codex
```

Restart Codex after installation.
