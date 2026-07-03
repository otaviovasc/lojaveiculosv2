# Sales Worker Report

## Lane

- Feature: sales
- Worker branch: `agent/qa/sales`
- Worktree: `.worktrees/qa-sales`
- Base branch: `agent/qa-integration`
- Latest commit: `a4d0176` before worker changes
- Artifact root: `/tmp/lojaveiculosv2-qa/agent-qa-sales/sales/`
- Persona coverage: local seed owner (`clerk_seed_owner`)
- Viewports: desktop 1440x900, mobile 390x844

## Discovery

- Routes tested: `/sign-in`, `/dashboard#/sales`,
  `/dashboard?qa=<ts>#/sales?<sale-start-context>`
- Current behavior: owner can open sales, list the seeded closed sale, filter by
  status, search to an empty state, create a context-linked draft, autosave,
  add a payment, review documents, reserve the vehicle, close the sale, and use
  the mobile menu.
- Console/API errors: none in the completed discovery run. Sales API responses
  for list, create draft, update, reserve, and close returned 2xx.
- UI issues: seeded closed sale incorrectly rendered `Total em Pagamentos` as
  `R$ 0,00` and a full remaining balance; fixed. Post-review coverage now
  asserts the closed Hilux detail renders `Total em Pagamentos` and
  `Total Lançado` as `R$ 146.500,00`, with no remaining balance. Some sales
  fields still show raw linked lead/unit UUIDs when context-started from another
  module.
- Backend/API gaps: no API route failure found. The local seed payment rows
  missed `principal_cents`, so the API returned paid payments with zero
  principal.
- Permission/audit concerns: owner seed has `sale.read`, `sale.draft`,
  `sale.reserve`, `sale.close`, and `sale.cancel`; service routes enforce
  permissions. Audit persistence was not separately inspected in this UI lane.
- V1/repasses/reference context: not needed; V2 sales flow is already present.
- Redesign reference image: not applicable.
- Proposed fixes: repair local seed sale payments, improve visible Portuguese
  copy, and add Playwright coverage for the sales owner flow.

## Findings

| ID        | Severity | Status   | Route               | Owner | Evidence                                      | Reviewer |
| --------- | -------- | -------- | ------------------- | ----- | --------------------------------------------- | -------- |
| SALES-001 | High     | fixed    | `/dashboard#/sales` | sales | `05-closed-sale-review.png`, `sales-list.png` | Epicurus |
| SALES-002 | Medium   | deferred | `/dashboard#/sales` | sales | `12-mobile-sales.png`, `13-mobile-menu.png`   | Epicurus |
| SHUI-004  | Low      | deferred | `/dashboard#/sales` | sales | `12-mobile-sales.png`, `13-mobile-menu.png`   | Epicurus |

SALES-001: Closed Hilux sale showed paid payments as `R$ 0,00`, leaving the
review and summary panels in a contradictory state. Fixed by adding
`principal_cents` to the seeded sale payments and making the seed idempotently
repair existing local rows. Epicurus's review correctly found that the first
spec only asserted the list KPI/revenue surface, not the broken detail labels.
The follow-up spec opens the closed Hilux detail, asserts `Total em Pagamentos`
and `Total Lançado` both render `R$ 146.500,00`, asserts no remaining balance is
shown, and refreshes `05-closed-sale-review.png` with post-fix evidence.

SALES-002: Sales can consume linked lead/unit context and lifecycle actions
work, but the sales workspace still lacks rich in-place pickers/deep links for
lead, vehicle, generated documents, commissions, and finance records. Deferred
because this crosses sales, inventory, CRM, documents, and finance surfaces.

SHUI-004 disposition: accepted as a low sales follow-up and tracked under
SALES-002, not reassigned. The current sales UI still exposes readonly linked
lead/unit UUID fragments in narrow/mobile contexts; resolving this cleanly
belongs with the richer linked-entity display/picker work rather than a local
one-off truncation patch.

## Implementation

- Files changed:
  - `docker/postgres/seed/product-test-user.sql`
  - `apps/web/src/features/sales/SalesModule.tsx`
  - `apps/web/src/features/sales/SaleWorkspace.tsx`
  - `apps/web/src/features/sales/salesModel.ts`
  - `tests/e2e/sales-flow.spec.ts`
- Backend/API contracts changed: none.
- DB/schema changes: none; local seed data only.
- Seed changes: sale payments now seed `principal_cents` and update existing
  rows on conflict.
- Playwright specs added/updated: added `tests/e2e/sales-flow.spec.ts`; updated
  after Epicurus review to assert the fixed closed-sale payment totals in the
  detail review and summary panels.
- Subagents used: none.

## Validation

- Focused tests:
  - `pnpm --filter @lojaveiculosv2/web test -- sales` passed.
  - `pnpm --filter @lojaveiculosv2/api test -- sales` passed.
  - `pnpm run check:lines` passed.
- Feature Playwright flow:
  - `QA_BASE_URL=http://127.0.0.1:5184 QA_BRANCH_SLUG=agent-qa-sales QA_FEATURE_SLUG=sales pnpm exec playwright test tests/e2e/sales-flow.spec.ts --project=chromium --workers=1` passed.
  - Post-review rerun refreshed `05-closed-sale-review.png`; it now shows the
    closed Hilux detail with `Total em Pagamentos` and `Total Lançado` at
    `R$ 146.500,00` and no `Saldo devedor`.
- `pnpm run validate:commit`: passed.
- Other checks:
  - `pnpm exec prettier --check` passed for touched TS/TSX/report files.
  - `git diff --check` passed.

## Reviewer Feedback

- Discovery gate: completed by Epicurus.
- Implementation gate: changes requested by Epicurus on the first worker commit;
  follow-up now addresses the missing SALES-001 regression assertion and names
  SHUI-004 as a sales-owned low deferred follow-up under SALES-002.
- Required follow-up: decide owner and scope for richer sales links/pickers
  across CRM, inventory, documents, commissions, and finance.

## Final State

- Ready for orchestrator merge: no, pending reviewer.
- Deferred findings: SALES-002.
- Notes: Browser plugin is not available for this campaign; Playwright was used.
