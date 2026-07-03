# Sales Worker Report

## Lane

- Feature: sales
- Worker branch: `agent/qa/sales`
- Worktree: `.worktrees/qa-sales`
- Base branch: `agent/qa-integration`
- Latest commit: `e0ebf96`
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
  `Total Lançado` as `R$ 146.500,00`, with no remaining balance. The tracked
  follow-up for raw linked lead/unit values is now closed with readable lead,
  unit, and seller pickers plus mobile-safe linked details.
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

| ID        | Severity | Status   | Route               | Owner | Evidence                                          | Reviewer |
| --------- | -------- | -------- | ------------------- | ----- | ------------------------------------------------- | -------- |
| SALES-001 | High     | verified | `/dashboard#/sales` | sales | `05-closed-sale-review.png`, `sales-list.png`     | approved |
| SALES-002 | Medium   | verified | `/dashboard#/sales` | sales | `sales-ready-review.png`, `sales-mobile-menu.png` | closed   |
| SHUI-004  | Low      | verified | `/dashboard#/sales` | sales | `sales-mobile-menu.png`                           | closed   |

SALES-001: Closed Hilux sale showed paid payments as `R$ 0,00`, leaving the
review and summary panels in a contradictory state. Fixed by adding
`principal_cents` to the seeded sale payments and making the seed idempotently
repair existing local rows. Epicurus's review correctly found that the first
spec only asserted the list KPI/revenue surface, not the broken detail labels.
The follow-up spec opens the closed Hilux detail, asserts `Total em Pagamentos`
and `Total Lançado` both render `R$ 146.500,00`, asserts no remaining balance is
shown, and refreshes `05-closed-sale-review.png` with post-fix evidence.

SALES-002: Sales can consume linked lead/unit context and lifecycle actions
work. The follow-up now adds in-place lead, vehicle-unit, and seller pickers,
fallback labels for existing IDs, buyer/listing snapshot hydration, and quick
links back to clients and inventory.

SHUI-004 disposition: closed with SALES-002. Narrow/mobile sales contexts now
show readable linked labels and details instead of UUID-like truncation.

## Implementation

- Files changed:
  - `docker/postgres/seed/product-test-user.sql`
  - `apps/web/src/features/sales/SalesModule.tsx`
  - `apps/web/src/features/sales/SaleWorkspace.tsx`
  - `apps/web/src/features/sales/SaleContextSection.tsx`
  - `apps/web/src/features/sales/saleContextOptions.ts`
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
  - Follow-up rerun:
    `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 QA_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_SKIP_WEB_SERVER=true pnpm exec playwright test tests/e2e/sales-flow.spec.ts --project=chromium`
    passed on the isolated local stack.
- `pnpm run validate:commit`: passed.
- Other checks:
  - `pnpm exec prettier --check` passed for touched TS/TSX/report files.
  - `git diff --check` passed.

## Reviewer Feedback

- Discovery gate: approved by Epicurus.
- Implementation gate: approved after the SALES-001 regression assertion;
  SHUI-004/SALES-002 is now closed by the tracked follow-up pass.
- Required follow-up: none.

## Final State

- Ready for orchestrator merge: yes, merged to `agent/qa-integration`.
- Deferred findings: none.
- Notes: Browser plugin is not available for this campaign; Playwright was used.
