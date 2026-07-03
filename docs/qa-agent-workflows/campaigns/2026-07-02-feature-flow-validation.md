# 2026-07-02 Feature Flow Validation

## Campaign

- Baseline branch: `agent/qa-flow-baseline-20260702`
- Harness branch: `agent/qa-harness`
- Integration branch: `agent/qa-integration`
- Final target: pushed integration branch ready for later main merge
- Local stack: web `http://127.0.0.1:5173`, API `http://127.0.0.1:8787`
- Browser path: Playwright fallback, because Browser plugin is not available
- External providers: no real provider calls in automated validation
- Production/staging: read-only metadata only if explicitly needed

## Scope

| Lane                   | Branch                            | Worker       | Reviewer | Status   | Notes                                                   |
| ---------------------- | --------------------------------- | ------------ | -------- | -------- | ------------------------------------------------------- |
| harness                | `agent/qa-harness`                | orchestrator | Hegel    | approved | Reusable docs, templates, helpers                       |
| shared-ui              | `agent/qa/shared-ui`              | pending      | pending  | pending  | Proactive cramped text/popover/layout pass              |
| customize-page-builder | `agent/qa/customize-page-builder` | pending      | pending  | pending  | Includes public storefront/custom page verification     |
| inventory-list         | `agent/qa/inventory-list`         | pending      | pending  | pending  | Includes column sorting and lead heat colors            |
| vehicle-details        | `agent/qa/vehicle-details`        | pending      | pending  | pending  | All detail tabs plus public vehicle detail verification |
| documents              | `agent/qa/documents`              | pending      | pending  | pending  | Documents center workflows                              |
| clients                | `agent/qa/clients`                | pending      | pending  | pending  | Clients list and client detail surfaces                 |
| sales                  | `agent/qa/sales`                  | pending      | pending  | pending  | Sales workflows                                         |
| expenses               | `agent/qa/expenses`               | pending      | pending  | pending  | Gastos workflows                                        |

## Integration Order

1. Harness
2. Shared UI
3. Customize + Page builder
4. Inventory list
5. Vehicle details
6. Documents
7. Clients
8. Sales
9. Expenses

The orchestrator may reorder feature lanes when dependency or conflict risk
requires it. Shared UI conflicts are resolved before feature branch merge.

## Findings

| ID       | Severity | Status   | Lane    | Owner        | Route       | Evidence                                   | Decision          |
| -------- | -------- | -------- | ------- | ------------ | ----------- | ------------------------------------------ | ----------------- |
| HARN-001 | Medium   | verified | harness | orchestrator | `tests/e2e` | `/tmp/lojaveiculosv2-qa/agent-qa-harness/` | Reviewer approved |
| HARN-002 | Medium   | verified | harness | orchestrator | workflow    | `docs/qa-agent-workflows/README.md`        | Reviewer approved |
| HARN-003 | Low      | verified | harness | orchestrator | workflow    | `templates/reviewer-report.md`             | Reviewer approved |

## Validation Ledger

| Step                       | Command                                                                                                                                                                                         | Result  | Notes                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------- |
| Harness focused smoke      | `QA_BRANCH_SLUG=agent-qa-harness pnpm exec playwright test tests/e2e/local-permissions.spec.ts tests/e2e/inventory-error-display.spec.ts tests/e2e/qa-harness-smoke.spec.ts --project=chromium` | passed  | 5 tests passed                     |
| Harness artifact check     | `find /tmp/lojaveiculosv2-qa/agent-qa-harness -type f`                                                                                                                                          | passed  | Canonical screenshots written      |
| Harness formatting         | `pnpm exec prettier --check package.json docs/qa-agent-workflows tests/e2e && git diff --check`                                                                                                 | passed  | Formatting and whitespace clean    |
| Harness `validate:commit`  | `pnpm run validate:commit`                                                                                                                                                                      | passed  | Guardrails plus design test passed |
| Final integration validate | pending                                                                                                                                                                                         | pending | Run after all lanes                |
| Final Playwright campaign  | pending                                                                                                                                                                                         | pending | Clean local seed                   |

## Deferred Follow-up

None yet.
