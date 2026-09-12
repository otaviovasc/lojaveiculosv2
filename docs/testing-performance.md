# Test Performance

The default validation commands remain authoritative. These commands reduce
iteration time or collect evidence for a performance change; they do not
replace the full `pnpm run validate` handoff gate.

## Affected packages

Run tests for packages changed since the selected branch and their dependents:

```bash
pnpm run test:affected
pnpm run test:affected:staging
```

The changed-package selector is provided by pnpm. It is intentionally broader
than a test-file selector so a source change in a shared workspace package also
checks packages that consume it.

## Related test files

When the changed source files are known and use static imports, run only tests
related to those files:

```bash
pnpm run test:related:web src/features/inventory/model/inventoryListSortModel.ts
pnpm run test:related:api src/domains/vehicle/services/VehicleService/sellVehicleUnit.ts
```

Vitest cannot infer dynamic imports. Configuration, lockfile, package, and
test-runner changes should use an affected-package or full run instead.

## Profiling

Print Vitest's import-duration breakdown without changing configuration:

```bash
pnpm run test:profile:web
pnpm run test:profile:api
```

Use the slowest imports to choose explicit dependency-optimizer entries. The
optimizer is enabled only when `VITEST_OPTIMIZER_INCLUDE` is set, for example:

```bash
VITEST_OPTIMIZER_INCLUDE=@testing-library/react,@testing-library/user-event,lucide-react \
  pnpm --filter @lojaveiculosv2/web test
```

The repository also exposes these opt-in experiments:

```bash
pnpm run test:experimental:web
pnpm run test:experimental:api
```

They enable filesystem module caching and the threads pool. A failed,
order-dependent, or materially different run is evidence against enabling that
mode as a default.

For a quick local loop when Vitest can identify tests affected by the current
working tree, use:

```bash
pnpm run test:changed:web
pnpm run test:changed:api
```

These are narrower than the package-level affected commands and should be
followed by the affected-package run when shared configuration or package
metadata changed.

## CI sharding

The repository currently keeps quality gates local, so sharding is exposed as
an explicit command rather than added to a GitHub workflow:

```bash
pnpm run test:shard:web --shard=1/4
pnpm run test:shard:api --shard=1/4
```

Run each shard on a separate worker, upload `.vitest-reports/`, and merge the
blob reports with:

```bash
pnpm run test:merge-reports:web
pnpm run test:merge-reports:api
```

Merge reports within the same workspace package that produced them; web and
API reports use separate Vitest projects.

The shard split is by test file, not by test-case duration. Rebalance the
number of shards only after measuring wall time and worker capacity.

## Safety boundaries

- Keep the default `forks` pool for compatibility-sensitive suites until a
  measured threads run passes the relevant focused checks.
- Do not globally disable test isolation. Database, filesystem, provider, and
  timer tests can leak state across files.
- Do not cache tests whose result depends on live network state, timestamps, or
  mutable external services.
- Keep jsdom for tests that rely on APIs not implemented by happy-dom. Migrate
  individual files with the `@vitest-environment happy-dom` control comment.
