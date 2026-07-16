# Rollback Runbook

## Fast Rollback Options

1. Redeploy the previous healthy Railway deployment.
2. Revert the merge commit, run `pnpm run release:verify`, and deploy the
   validated rollback commit through Railway.
3. Disable the feature flag or entitlement if the change is flag-controlled.
4. Restore the previous variable value if the issue is configuration-only.

## Before Rolling Back

- Confirm the rollback target is known healthy.
- Check whether a database migration is involved.
- Check whether user data written by the new version needs compatibility.
- Communicate expected user impact.

## Migration Risk

Prefer expand/contract migrations:

```text
expand -> deploy compatible app -> backfill -> switch reads -> contract later
```

Do not automatically run destructive production rollback migrations. They need
explicit operator approval and a data impact note.

## PR Rollback Note Template

```md
## Rollback

- Detection signal:
- Fast rollback:
- Data rollback required:
- Feature flag:
- Migration risk:
- Owner:
```
