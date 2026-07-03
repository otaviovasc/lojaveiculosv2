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
| shared-ui              | `agent/qa/shared-ui`              | Popper       | Lorentz  | approved | Proactive cramped text/popover/layout pass              |
| customize-page-builder | `agent/qa/customize-page-builder` | Archimedes   | Bacon    | approved | Includes public storefront/custom page verification     |
| inventory-list         | `agent/qa/inventory-list`         | Goodall      | Boole    | approved | Includes column sorting and lead heat colors            |
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

| ID       | Severity | Status   | Lane                   | Owner                         | Route                                              | Evidence                                                                                                          | Decision               |
| -------- | -------- | -------- | ---------------------- | ----------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------- |
| HARN-001 | Medium   | verified | harness                | orchestrator                  | `tests/e2e`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-harness/`                                                                        | Reviewer approved      |
| HARN-002 | Medium   | verified | harness                | orchestrator                  | workflow                                           | `docs/qa-agent-workflows/README.md`                                                                               | Reviewer approved      |
| HARN-003 | Low      | verified | harness                | orchestrator                  | workflow                                           | `templates/reviewer-report.md`                                                                                    | Reviewer approved      |
| INVL-001 | Medium   | verified | inventory-list         | inventory-list worker         | `/dashboard#/inventory`                            | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-after-fix.png`                             | Reviewer approved      |
| INVL-002 | Low      | verified | inventory-list         | inventory-list worker         | `/dashboard#/inventory`                            | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-sort-price-reset.png`                      | Reviewer approved      |
| INVL-003 | Low      | verified | inventory-list         | inventory-list worker         | `/dashboard#/inventory`                            | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-columns-open-after-fix.png`                | Reviewer approved      |
| SHUI-001 | High     | verified | shared-ui              | shared-ui worker              | `/inventory` mobile                                | `/tmp/lojaveiculosv2-qa/agent-qa-shared-ui/shared-ui/inventory-columns-mobile.png`                                | Reviewer approved      |
| SHUI-002 | Medium   | verified | shared-ui              | shared-ui worker              | `/page-builder`                                    | `/tmp/lojaveiculosv2-qa/agent-qa-shared-ui/shared-ui/page-builder-empty-state.png`                                | Reviewer approved      |
| SHUI-003 | Medium   | assigned | documents              | documents worker              | `/documents` mobile                                | `/tmp/lojaveiculosv2-qa/agent-qa-shared-ui/shared-ui/documents-mobile.png`                                        | Feature-lane follow-up |
| SHUI-004 | Low      | assigned | sales                  | sales worker                  | `/sales` mobile                                    | `/tmp/lojaveiculosv2-qa/agent-qa-shared-ui/shared-ui/sales-mobile.png`                                            | Feature-lane follow-up |
| CPB-001  | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/personalizar`                         | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/15-personalizar-mobile-fixed.png`  | Reviewer approved      |
| CPB-002  | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/custom-pages`                         | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/16-custom-page-dialog-fixed.png`   | Reviewer approved      |
| CPB-003  | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/custom-pages`, `/test-store/p/<slug>` | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/11-public-custom-page-desktop.png` | Reviewer approved      |

## Validation Ledger

| Step                       | Command                                                                                                                                                                                         | Result  | Notes                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------- |
| Harness focused smoke      | `QA_BRANCH_SLUG=agent-qa-harness pnpm exec playwright test tests/e2e/local-permissions.spec.ts tests/e2e/inventory-error-display.spec.ts tests/e2e/qa-harness-smoke.spec.ts --project=chromium` | passed  | 5 tests passed                     |
| Harness artifact check     | `find /tmp/lojaveiculosv2-qa/agent-qa-harness -type f`                                                                                                                                          | passed  | Canonical screenshots written      |
| Harness formatting         | `pnpm exec prettier --check package.json docs/qa-agent-workflows tests/e2e && git diff --check`                                                                                                 | passed  | Formatting and whitespace clean    |
| Harness `validate:commit`  | `pnpm run validate:commit`                                                                                                                                                                      | passed  | Guardrails plus design test passed |
| Inventory focused tests    | `pnpm --filter @lojaveiculosv2/web test -- InventoryLeadBadge listCatalogModel InventoryListPage`                                                                                               | passed  | 76 files / 228 tests passed        |
| Inventory reviewer smoke   | Headless browser spot check on `http://127.0.0.1:5174`                                                                                                                                          | passed  | Sort reset, columns overlay, text  |
| Shared UI focused tests    | `pnpm --filter @lojaveiculosv2/web test -- src/components/ui/FeaturePopover.test.tsx src/components/ui/CustomSelect.test.tsx`                                                                   | passed  | 76 files / 228 tests passed        |
| Shared UI reviewer checks  | `git diff --check`, merge-tree, `pnpm run check:lines`, focused web tests                                                                                                                       | passed  | Reviewer approved                  |
| Customize focused tests    | `pnpm --filter @lojaveiculosv2/web test -- publicSite`                                                                                                                                          | passed  | 77 files / 230 tests passed        |
| Customize reviewer checks  | `git diff --check`, Prettier check on touched files, merge-tree                                                                                                                                 | passed  | Reviewer approved                  |
| Final integration validate | pending                                                                                                                                                                                         | pending | Run after all lanes                |
| Final Playwright campaign  | pending                                                                                                                                                                                         | pending | Clean local seed                   |

## Deferred Follow-up

- `SHUI-003`: documents mobile bottom action labels run together; assigned to
  documents lane.
- `SHUI-004`: sales mobile readonly long values truncate in context fields;
  assigned to sales lane.
