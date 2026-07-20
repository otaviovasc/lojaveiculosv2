# Railway configuration

This project defines its Railway infrastructure in code.

```txt
.railway/railway.ts
```

Use this file to describe the Railway project you want: services, databases, buckets, custom domains, replicas, groups, and environment variables.

This repository intentionally defines only the minimum persistent topology:
API, web, product Postgres, separate audit Postgres, Redis for CRM realtime,
and one short-lived CRM scheduled-message cron worker. Buckets, PR environments,
permanent queue consumers, and extra cron workers remain deferred until measured
usage requires them. The app services auto-deploy from GitHub: the `staging`
environment tracks the `staging` branch and `production` tracks `main`, so a
push to the environment's branch triggers the deploy after the local release
gates pass.

## Common commands

Create the configuration files:

```bash
railway config init
```

Import an existing Railway project into code:

```bash
railway config pull
```

Preview what Railway would change:

```bash
railway config plan
```

Apply the planned changes:

```bash
railway config apply
```

Before applying or deploying:

1. Review `railway config plan` against the intended environment.
2. Configure the environment-specific Clerk, R2, public URL, and provider
   values documented in `docs/ops/env-vars.md`. The CRM cron worker needs the
   same Clerk, R2, Z-API, product DB, audit DB, and Redis runtime contract as the
   API. In staging, replace the `keepme_*` shared-variable placeholders in the
   Railway dashboard; do not put the real values in this file. The API reads
   shared variables, the worker references the API variables, and the web reads
   only its public `VITE_*` shared variables.
3. Run `pnpm run release:verify` from a clean commit.
4. Promote with `pnpm run release:staging`; pushing `staging` auto-deploys the
   staging environment. Confirm the first scheduled worker execution exits
   successfully.
5. Run the matching `release:smoke:*` command.

## Notes

- `railway config plan` is safe and does not change Railway.
- `railway config apply` previews changes and asks before applying unless you pass `--yes`.
- Destructive changes in non-interactive or agent sessions require `railway config apply --confirm-destructive` after reviewing the plan.
- Services already managed by `railway.json` / `railway.toml` must be migrated before `.railway/railway.ts` can manage them.
- Use `replicas` for scaling; advanced placement can still specify region names.
- Use `group("Name", [resources])` to keep large projects organized on the Railway canvas.
- Secrets imported from Railway are rendered as `preserve()` so existing values are retained without writing secret values to source. Use `railway config pull --omit-preserved-variables` for a smaller import.
