# QA Agent Workflows

This workflow turns feature validation into isolated, reviewed lanes. It is
intended to be reusable for future campaigns, not only the July 2026 feature
flow validation pass.

## Baseline

- Baseline branch: `agent/qa-flow-baseline-20260702`.
- Harness branch: `agent/qa-harness`.
- Integration branch: `agent/qa-integration`.
- Worktrees: `.worktrees/qa-<feature-slug>`.
- Artifacts: `/tmp/lojaveiculosv2-qa/<branch>/<feature>/`.
  `saveQaScreenshot` writes there by default, using the current git branch and
  spec filename unless `QA_BRANCH_SLUG` or `QA_FEATURE_SLUG` is set. Playwright
  may still write failure traces under its configured `test-results` directory,
  but lane evidence screenshots belong under `/tmp`.
- Browser plugin status for this campaign: not available; use Playwright.
- Active testing is local-only. Do not mutate staging, production, Railway,
  provider settings, billing, or live customer data.
- Automated validation must not call real external providers. Use local demo
  adapters, seeded data, local storage, or mocked provider responses.

## Lane Model

The orchestrator owns top-level lanes, integration, and the checked-in campaign
ledger. Reviewers are read-only by default: they inspect diffs, rerun checks,
and request fixes, but they do not edit worker branches. Fixes return to the
worker, or the orchestrator creates a dedicated fix lane. Workers may spawn
bounded subagents inside a lane, but those subagents must be registered in the
lane report.

Default lanes for this campaign:

- `shared-ui`
- `customize-page-builder`
- `inventory-list`
- `vehicle-details`
- `documents`
- `clients`
- `sales`
- `expenses`

Each feature lane has a paired reviewer. Shared primitives, global CSS, shell,
table controls, popovers, and reusable layout fixes belong to `shared-ui`.

## Gates

Each lane has two gates:

1. Discovery gate: worker records routes, personas, screenshots, API/console
   errors, UI issues, backend gaps, and proposed fixes. Reviewer checks that
   the plan covers the real UI flow before implementation starts.
2. Implementation gate: worker fixes scoped issues, runs focused checks, and
   updates the lane report. Reviewer reviews the diff, reruns the feature flow,
   and marks findings verified or failed without editing the worker branch.

Feature branches must pass:

- Relevant unit/integration tests for touched code.
- The feature Playwright flow against local seeded data.
- `pnpm run validate:commit`.
- Reviewer rerun of the feature flow.

The integration branch must pass after final merge:

- `pnpm run validate`.
- Full scoped Playwright campaign from a clean local seed.

## Readiness Rules

- `Blocker` and `High` findings cannot remain open at lane merge.
- `Medium` findings can merge only with reviewer-approved deferral, owner, and
  reason.
- `Low` findings can be logged as follow-up.
- Permission, entitlement, audit, and security-sensitive changes need explicit
  reviewer coverage. Shared or cross-feature access changes need an additional
  security/backend review lane.
- Schema changes are allowed only when required for a scoped real workflow and
  must pass local DB validation plus `check:db`.

## UI Quality Bar

Workers validate desktop and mobile for core flows. Basic accessibility is in
scope: keyboard reachability, visible focus, labels for icon buttons, usable
popovers/modals, non-overlapping text, and readable loading/empty/error states.

Visible Portuguese copy is part of readiness. Fix obvious issues such as
truncated labels, repeated-label placeholders, missing required markers,
internal-key text, bad accents, unclear states, and missing accessible labels.

For redesign-level work:

1. Test current V2 UI first.
2. Inspect V1 `lojaveiculos`, `repasses-frontend`, or other approved reference
   repos when relevant.
3. Generate a reference image before implementation.
4. Implement with V2 tokens, primitives, permissions, audit, and responsive
   behavior.
5. Reviewer compares rendered Playwright screenshots to the reference.

## Reference Projects

V1 `lojaveiculos` and `repasses-frontend` are product/UI references and
migration evidence. They are not authoritative V2 architecture. Copy only good
UX behavior and reimplement it through V2 contracts, permissions, audit,
design tokens, and services.

## Finding Lifecycle

Every finding gets an ID, severity, owner, route, evidence path, branch/commit,
status, and reviewer decision.

Statuses:

- `open`
- `assigned`
- `fixed`
- `review-failed`
- `verified`
- `deferred`

Severity:

- `Blocker`: scoped flow cannot complete, data is wrong/lost, backend/API
  breaks, security/audit fails, or core responsive UI is unusable.
- `High`: flow completes with serious UX/API defect, broken secondary action,
  unclear state, or risky workaround.
- `Medium`: visible quality issue, copy/layout/accessibility problem, missing
  edge state, or weak feedback.
- `Low`: polish, consistency, or nice-to-have.

## Commands

- Local stack: `pnpm run dev:local`.
- Clean local seed: `pnpm run db:clean:local`.
- E2E without reset: `pnpm run qa:flows`.
- E2E with clean local seed: `pnpm run qa:flows:local`.
- Fast lane gate: `pnpm run validate:commit`.
- Full integration gate: `pnpm run validate`.
