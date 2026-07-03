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

| Lane                   | Branch                            | Worker       | Reviewer  | Status   | Notes                                                   |
| ---------------------- | --------------------------------- | ------------ | --------- | -------- | ------------------------------------------------------- |
| harness                | `agent/qa-harness`                | orchestrator | Hegel     | approved | Reusable docs, templates, helpers                       |
| shared-ui              | `agent/qa/shared-ui`              | Popper       | Lorentz   | approved | Proactive cramped text/popover/layout pass              |
| customize-page-builder | `agent/qa/customize-page-builder` | Archimedes   | Bacon     | approved | Includes public storefront/custom page verification     |
| inventory-list         | `agent/qa/inventory-list`         | Goodall      | Boole     | approved | Includes column sorting and lead heat colors            |
| vehicle-details        | `agent/qa/vehicle-details`        | Poincare     | Halley    | approved | All detail tabs plus public vehicle detail verification |
| documents              | `agent/qa/documents`              | Socrates     | Aristotle | approved | Documents center workflows                              |
| clients                | `agent/qa/clients`                | Nash         | Boyle     | approved | Clients list and client detail surfaces                 |
| sales                  | `agent/qa/sales`                  | Jason        | Epicurus  | approved | Sales workflows                                         |
| expenses               | `agent/qa/expenses`               | Mill         | Locke     | approved | Gastos workflows                                        |

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

| ID          | Severity | Status   | Lane                   | Owner                         | Route                                              | Evidence                                                                                                          | Decision          |
| ----------- | -------- | -------- | ---------------------- | ----------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------- |
| HARN-001    | Medium   | verified | harness                | orchestrator                  | `tests/e2e`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-harness/`                                                                        | Reviewer approved |
| HARN-002    | Medium   | verified | harness                | orchestrator                  | workflow                                           | `docs/qa-agent-workflows/README.md`                                                                               | Reviewer approved |
| HARN-003    | Low      | verified | harness                | orchestrator                  | workflow                                           | `templates/reviewer-report.md`                                                                                    | Reviewer approved |
| INVL-001    | Medium   | verified | inventory-list         | inventory-list worker         | `/dashboard#/inventory`                            | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-after-fix.png`                             | Reviewer approved |
| INVL-002    | Low      | verified | inventory-list         | inventory-list worker         | `/dashboard#/inventory`                            | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-sort-price-reset.png`                      | Reviewer approved |
| INVL-003    | Low      | verified | inventory-list         | inventory-list worker         | `/dashboard#/inventory`                            | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-columns-open-after-fix.png`                | Reviewer approved |
| SHUI-001    | High     | verified | shared-ui              | shared-ui worker              | `/inventory` mobile                                | `/tmp/lojaveiculosv2-qa/agent-qa-shared-ui/shared-ui/inventory-columns-mobile.png`                                | Reviewer approved |
| SHUI-002    | Medium   | verified | shared-ui              | shared-ui worker              | `/page-builder`                                    | `/tmp/lojaveiculosv2-qa/agent-qa-shared-ui/shared-ui/page-builder-empty-state.png`                                | Reviewer approved |
| SHUI-003    | Medium   | verified | documents              | documents worker              | `/documents` mobile                                | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/documents-mobile-after.png`                                  | Reviewer approved |
| SHUI-004    | Low      | deferred | sales                  | sales worker                  | `/sales` mobile                                    | `/tmp/lojaveiculosv2-qa/agent-qa-sales/sales/12-mobile-sales.png`                                                 | Reviewer accepted |
| CPB-001     | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/personalizar`                         | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/15-personalizar-mobile-fixed.png`  | Reviewer approved |
| CPB-002     | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/custom-pages`                         | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/16-custom-page-dialog-fixed.png`   | Reviewer approved |
| CPB-003     | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/custom-pages`, `/test-store/p/<slug>` | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/11-public-custom-page-desktop.png` | Reviewer approved |
| EXP-001     | Medium   | verified | expenses               | expenses worker               | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-filtered-audi.png`                                    | Reviewer approved |
| EXP-002     | Medium   | verified | expenses               | expenses worker               | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-desktop-default.png`                                  | Reviewer approved |
| EXP-003     | Medium   | deferred | expenses               | backend/storage               | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-receipt-modal.png`                                    | Reviewer accepted |
| EXP-004     | Low      | deferred | expenses               | shared-ui                     | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-mobile.png`                                           | Reviewer accepted |
| EXP-005     | Medium   | verified | expenses               | expenses worker               | `tests/e2e`                                        | `tests/e2e/local-permissions.spec.ts`, `tests/e2e/qa-harness-smoke.spec.ts`                                       | Reviewer approved |
| EXP-006     | Medium   | verified | expenses               | expenses worker               | `/expenses`                                        | `apps/web/src/features/finance/financeBillsModel.test.ts`                                                         | Reviewer approved |
| DOC-001     | High     | verified | documents              | documents worker              | `/documents`                                       | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/upload-dialog-after.png`                                     | Reviewer approved |
| DOC-002     | High     | verified | documents              | documents worker              | `/download`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/document-detail-after.png`                                   | Reviewer approved |
| DOC-003     | Medium   | verified | documents              | documents worker              | `/templates`                                       | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/document-templates-after.png`                                | Reviewer approved |
| DOC-004     | Medium   | verified | documents              | documents worker              | mobile folders                                     | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/documents-mobile-after.png`                                  | Reviewer approved |
| DOC-005     | Medium   | verified | documents              | documents worker              | `/documents`                                       | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/documents-list-after.png`                                    | Reviewer approved |
| DOC-006     | Low      | verified | documents              | documents worker              | `/documents`                                       | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/documents-restricted-after.png`                              | Reviewer approved |
| DOC-007     | Medium   | verified | documents              | documents worker              | `/documents`                                       | `/tmp/lojaveiculosv2-qa/agent-qa-documents/documents/documents-table-tablet-after.png`                            | Reviewer approved |
| SALES-001   | High     | verified | sales                  | sales worker                  | `/dashboard#/sales`                                | `/tmp/lojaveiculosv2-qa/agent-qa-sales/sales/05-closed-sale-review.png`                                           | Reviewer approved |
| SALES-002   | Medium   | deferred | sales                  | sales worker                  | `/dashboard#/sales`                                | `/tmp/lojaveiculosv2-qa/agent-qa-sales/sales/12-mobile-sales.png`                                                 | Reviewer accepted |
| CLIENTS-001 | High     | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-list-empty-filter.png`                                   | Reviewer approved |
| CLIENTS-002 | High     | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-list-mobile.png`                                         | Reviewer approved |
| CLIENTS-003 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-detail-tabs.png`                                         | Reviewer approved |
| CLIENTS-004 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-list-api-error.png`                                      | Reviewer approved |
| CLIENTS-005 | Low      | deferred | clients                | integration                   | client detail documents/sales links                | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-detail-tabs.png`                                         | Reviewer accepted |
| CLIENTS-006 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients-review/clients/clients-list-mobile.png`                                  | Reviewer approved |
| CLIENTS-007 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients-review/clients/clients-list-mobile.png`                                  | Reviewer approved |
| VDET-001    | High     | verified | vehicle-details        | vehicle-details worker        | `/inventory` vehicle detail                        | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/admin-detail-anuncio-desktop.png`                | Reviewer approved |
| VDET-002    | Medium   | verified | vehicle-details        | vehicle-details worker        | `/inventory` vehicle detail tabs                   | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/admin-detail-geral-desktop.png`                  | Reviewer approved |
| VDET-003    | Medium   | verified | vehicle-details        | vehicle-details worker        | `/test-store` public listing detail                | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/public-vehicle-detail-desktop.png`               | Reviewer approved |
| VDET-004    | Low      | verified | vehicle-details        | vehicle-details worker        | Admin detail copy                                  | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/admin-detail-financeiro-desktop.png`             | Reviewer approved |
| VDET-005    | High     | verified | vehicle-details        | vehicle-details worker        | `/inventory` vehicle detail Financeiro             | `tests/e2e/vehicle-details.spec.ts`                                                                               | Reviewer approved |

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
| Expenses focused tests     | `pnpm --filter @lojaveiculosv2/web test -- financeBillsModel`                                                                                                                                   | passed  | 75 files / 229 tests passed        |
| Expenses reviewer checks   | `git diff --check`, merge-tree, focused web tests                                                                                                                                               | passed  | Reviewer approved                  |
| Documents API tests        | `pnpm --filter @lojaveiculosv2/api test -- documentOperations downloadDocument drizzleDocumentTemplates`                                                                                        | passed  | 114 files / 427 tests passed       |
| Documents web tests        | `pnpm --filter @lojaveiculosv2/web test -- DocumentUploadDialog documentsWorkspaceModel documentDisplayModel documentTemplatePreview`                                                           | passed  | 77 files / 235 tests passed        |
| Sales web tests            | `pnpm --filter @lojaveiculosv2/web test -- sales`                                                                                                                                               | passed  | 77 files / 235 tests passed        |
| Sales API tests            | `pnpm --filter @lojaveiculosv2/api test -- sales`                                                                                                                                               | passed  | 114 files / 427 tests passed       |
| Clients focused tests      | `pnpm --filter @lojaveiculosv2/web test -- crmPipelineModels`                                                                                                                                   | passed  | 77 files / 236 tests passed        |
| Clients reviewer checks    | `git diff --check`, Prettier check on touched files, focused web tests                                                                                                                          | passed  | Reviewer approved                  |
| Vehicle details typecheck  | `pnpm --filter @lojaveiculosv2/web typecheck`                                                                                                                                                   | passed  | Post-merge tree                    |
| Vehicle details catalog    | `pnpm --filter @lojaveiculosv2/web test -- listCatalogModel.test.ts`                                                                                                                            | passed  | 77 files / 236 tests passed        |
| Vehicle details E2E list   | `pnpm exec playwright test tests/e2e/vehicle-details.spec.ts --list`                                                                                                                            | passed  | 3 tests registered                 |
| Vehicle details guardrails | `pnpm run validate:commit`                                                                                                                                                                      | passed  | Post-merge tree                    |
| Final integration validate | pending                                                                                                                                                                                         | pending | Run after all lanes                |
| Final Playwright campaign  | pending                                                                                                                                                                                         | pending | Clean local seed                   |

## Deferred Follow-up

- `SHUI-004`/`SALES-002`: richer linked sales entity displays/pickers remain a
  sales-owned cross-feature follow-up.
- `EXP-003`: full receipt file upload needs local object-storage support.
- `EXP-004`: expenses mobile table actions still rely on horizontal table
  behavior.
- `CLIENTS-005`: linked sales/documents on client detail remain honest empty
  states until those cross-feature APIs are wired.
