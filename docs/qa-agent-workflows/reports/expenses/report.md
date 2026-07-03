# Expenses Worker Report

## Lane

- Feature: expenses / gastos
- Worker branch: `agent/qa/expenses`
- Worktree: `.worktrees/qa-expenses`
- Base branch: `agent/qa-integration`
- Latest commit: `a19152e`
- Artifact root: `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/`
- Persona coverage: Seed Owner, Seed Agency, Seed Supervisor, Seed Salesman,
  restricted owner permissions
- Viewports: desktop 1440x900, mobile 390x844

## Discovery

- Routes tested: `/sign-in`, `/dashboard`, `/expenses`, `/settings`,
  `/agency/admin`
- Current behavior: owner can load gastos, switch the date window to all
  entries, search seeded expenses, create a manual expense, attach a receipt,
  edit it, mark it paid, cancel it, and use dedicated mobile cards. Restricted
  users see an intentional unavailable state instead of a broken page.
- Console/API errors: none in the final expenses Playwright flow.
- UI issues: raw backend categories and accentless Portuguese copy were visible
  on the expenses surface and sidebar. Reviewer follow-up found the same leak
  for vehicle-cost categories such as `vehicle_preparation`.
- Backend/API gaps: none found in the follow-up. Browser receipt upload now uses
  local `upload.local` descriptors and attaches the document metadata to the
  finance entry.
- Permission/audit concerns: no permission contract changes. The restricted
  state was covered with a scoped mocked bootstrap.
- V1/repasses/reference context: not needed for this scoped validation pass.
- Redesign reference image: not needed; fixes preserved existing V2 primitives.
- Proposed fixes: localize finance categories, tighten Portuguese copy, update
  shared persona smoke expectations, and add an expenses Playwright flow.

## Findings

| ID      | Severity | Status   | Route       | Owner           | Evidence                                                                                  | Reviewer |
| ------- | -------- | -------- | ----------- | --------------- | ----------------------------------------------------------------------------------------- | -------- |
| EXP-001 | Medium   | verified | `/expenses` | expenses worker | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-filtered-audi.png`            | approved |
| EXP-002 | Medium   | verified | `/expenses` | expenses worker | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-desktop-default.png`          | approved |
| EXP-003 | Medium   | verified | `/expenses` | backend/storage | `/tmp/lojaveiculosv2-qa/agent-qa-integration/expenses-flow/expenses-receipt-attached.png` | closed   |
| EXP-004 | Low      | verified | `/expenses` | shared-ui       | `/tmp/lojaveiculosv2-qa/agent-qa-integration/expenses-flow/expenses-mobile.png`           | closed   |
| EXP-005 | Medium   | verified | `tests/e2e` | expenses worker | `tests/e2e/local-permissions.spec.ts`, `tests/e2e/qa-harness-smoke.spec.ts`               | approved |
| EXP-006 | Medium   | verified | `/expenses` | expenses worker | `apps/web/src/features/finance/financeBillsModel.test.ts`                                 | approved |

## Implementation

- Files changed: `apps/web/src/features/finance/**`,
  `apps/web/src/app/modules.ts`, `apps/web/src/app/moduleDefinitions.ts`,
  `tests/e2e/expenses-flow.spec.ts`,
  `tests/e2e/local-permissions.spec.ts`,
  `tests/e2e/qa-harness-smoke.spec.ts`
- Reviewer follow-up changed: `financeBillsFormat.ts`,
  `financeBillsModel.test.ts`, and this report
- Tracked follow-up changed: `FinanceEntryTable.tsx`,
  `FinanceEntryModal.tsx`, `financeDocumentUpload.ts`,
  `financeBillsActions.ts`, `apiClient.ts`, and
  `tests/e2e/expenses-flow.spec.ts`
- Backend/API contracts changed: none
- DB/schema changes: none
- Seed changes: none
- Playwright specs added/updated: added `expenses-flow.spec.ts`; updated shared
  persona smoke specs to honor `QA_BASE_URL` and accented module labels
- Subagents used: none

## Validation

- Focused tests: `pnpm --filter @lojaveiculosv2/web test -- financeBillsModel FinanceEntryModalSteps FinanceBillsSummary` passed, 75 files and 227 tests
- Reviewer focused tests:
  `pnpm --filter @lojaveiculosv2/web test -- financeBillsModel` passed, 75
  files and 229 tests
- Feature Playwright flow:
  `QA_BASE_URL=http://127.0.0.1:5185 QA_BRANCH_SLUG=agent-qa-expenses QA_FEATURE_SLUG=expenses pnpm exec playwright test tests/e2e/local-permissions.spec.ts tests/e2e/qa-harness-smoke.spec.ts tests/e2e/expenses-flow.spec.ts --project=chromium`
  passed, 5 tests
- Follow-up Playwright flow:
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 QA_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_SKIP_WEB_SERVER=true pnpm exec playwright test tests/e2e/expenses-flow.spec.ts --project=chromium`
  passed. It now asserts receipt upload, document attach, visible
  `Comprovante` metadata, and mobile entry cards.
- `pnpm run validate:commit`: passed
- Other checks: artifacts captured under the lane `/tmp` path

## Reviewer Feedback

- Discovery gate: approved
- Implementation gate: Locke requested changes for EXP-006; worker fix approved
- Required follow-up: none.

## Final State

- Ready for orchestrator merge: yes, merged to `agent/qa-integration`
- Deferred findings: none.
- Notes: final Playwright evidence uses the local seeded owner persona and local
  API only. A transient stale seed bootstrap redirected to `/onboarding` during
  one rerun, then direct bootstrap and final Playwright runs confirmed the seed
  owner and agency memberships were restored.
