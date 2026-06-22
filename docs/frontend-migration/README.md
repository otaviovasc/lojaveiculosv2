# Frontend Migration Control Plane

This folder is the source of truth for migrating the useful frontend surface
from `lojaveiculos` and `repasses-frontend` into `lojaveiculosv2`.

The migration is PR-sliced. Each slice owns one visible workflow or one
foundation rail. V1 and `repasses-frontend` are parity references for UI, UX,
and workflow shape. V2 backend contracts are authoritative for data, auth,
permissions, audit, billing, and side effects.

## Files

- `board.json`: authoritative slice map, dependency graph, QA requirements,
  model policy, PR state, source refs, target refs, and V1 improvement notes.
- `composition-exceptions.json`: temporary exceptions for existing composition
  files that still declare local components or types.
- `worker-prompt.md`: base prompt for a PR-owning implementation agent.
- `reviewer-prompt.md`: base prompt for an independent PR reviewer agent.
- `../../v2-plan.html`: generated planning board. Do not edit it by hand.

## Commands

Run these from the `lojaveiculosv2` repo root:

```bash
npm run migration:validate-board
npm run migration:inventory -- --check
npm run migration:render-plan
npm run migration:check-plan
npm run migration:prompt -- --slice <slice-id> --role worker
npm run migration:prompt -- --slice <slice-id> --role reviewer
npm run qa:visual -- --slice <slice-id>
npm run check:frontend-composition
```

`npm run validate` includes the board, plan freshness, inventory, composition,
line-count, architecture, typecheck, lint, and test gates.

## Slice Lifecycle

1. Main orchestrator picks the highest-priority unblocked slice.
2. The worker creates one worktree at `.worktrees/<slice-id>-<slug>` and one
   branch matching `agent/<slice-id>-<short-slug>`.
3. The worker reads every source, supporting, and target ref for the slice.
4. The worker implements the slice using V2 contracts and shared frontend
   components. Broad backend gaps become stacked foundation slices.
5. The worker updates `board.json`, regenerates `v2-plan.html`, validates, and
   opens a PR.
6. The worker spawns an independent reviewer thread using the reviewer prompt.
7. The reviewer comments findings on the PR until there are no findings.
8. The reviewer posts exactly `Ready for Merge!` only after zero unresolved
   findings, green CI, required visual evidence, and no stale board state.
9. The worker merges the PR unless the PR carries `agent:human-hold`.
10. The main orchestrator notices merged dependencies and starts newly
    unblocked slices.

## Model Policy

- Main orchestrator: `gpt-5.5/xhigh`.
- Control-plane PR owners: `gpt-5.5/xhigh`.
- Later slice PR owners: `gpt-5.5/high`.
- Slice reviewers: `gpt-5.5/high`.
- Spark agents may explore or verify bounded facts only. They do not own PRs.

## Frontend Guardrails

- Route/view composition files must not declare local interfaces, local types,
  or secondary local components. Extract them into feature/shared files.
- Use `packages/design-system`, app styles, and shared components before adding
  feature-local UI.
- Keep files under 240 lines unless generated or explicitly excepted.
- Visual QA is required for migrated screens. The current command uses Obscura
  and records evidence under `reports/visual/<slice-id>/`.
- Any V1 bug discovered while migrating is recorded in the slice. Fix it in a
  separate V1 hotfix thread only when it is critical, live, or a shared
  invariant.
