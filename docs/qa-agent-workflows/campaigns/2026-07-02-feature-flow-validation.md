# 2026-07-02 Feature Flow Validation

## Campaign

- Baseline branch: `agent/qa-flow-baseline-20260702`
- Harness branch: `agent/qa-harness`
- Integration branch: `agent/qa-integration`
- Final target: pushed integration branch ready for later main merge
- Local stack: web `http://127.0.0.1:5174`, API `http://127.0.0.1:8797`
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
| SHUI-004    | Low      | verified | sales                  | sales worker                  | `/sales` mobile                                    | `/tmp/lojaveiculosv2-qa/agent-qa-integration/sales-flow/sales-mobile-menu.png`                                    | Follow-up closed  |
| CPB-001     | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/personalizar`                         | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/15-personalizar-mobile-fixed.png`  | Reviewer approved |
| CPB-002     | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/custom-pages`                         | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/16-custom-page-dialog-fixed.png`   | Reviewer approved |
| CPB-003     | Medium   | verified | customize-page-builder | customize-page-builder worker | `/dashboard#/custom-pages`, `/test-store/p/<slug>` | `/tmp/lojaveiculosv2-qa/agent-qa-customize-page-builder/customize-page-builder/11-public-custom-page-desktop.png` | Reviewer approved |
| EXP-001     | Medium   | verified | expenses               | expenses worker               | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-filtered-audi.png`                                    | Reviewer approved |
| EXP-002     | Medium   | verified | expenses               | expenses worker               | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-expenses/expenses/expenses-desktop-default.png`                                  | Reviewer approved |
| EXP-003     | Medium   | verified | expenses               | backend/storage               | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-integration/expenses-flow/expenses-receipt-attached.png`                         | Follow-up closed  |
| EXP-004     | Low      | verified | expenses               | shared-ui                     | `/expenses`                                        | `/tmp/lojaveiculosv2-qa/agent-qa-integration/expenses-flow/expenses-mobile.png`                                   | Follow-up closed  |
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
| SALES-002   | Medium   | verified | sales                  | sales worker                  | `/dashboard#/sales`                                | `/tmp/lojaveiculosv2-qa/agent-qa-integration/sales-flow/sales-ready-review.png`                                   | Follow-up closed  |
| CLIENTS-001 | High     | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-list-empty-filter.png`                                   | Reviewer approved |
| CLIENTS-002 | High     | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-list-mobile.png`                                         | Reviewer approved |
| CLIENTS-003 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-detail-tabs.png`                                         | Reviewer approved |
| CLIENTS-004 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients/clients/clients-list-api-error.png`                                      | Reviewer approved |
| CLIENTS-005 | Low      | verified | clients                | integration                   | client detail documents/sales links                | `/tmp/lojaveiculosv2-qa/agent-qa-integration/clients-linked-records/clients-linked-documents.png`                 | Follow-up closed  |
| CLIENTS-006 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients-review/clients/clients-list-mobile.png`                                  | Reviewer approved |
| CLIENTS-007 | Medium   | verified | clients                | clients worker                | `/dashboard#/crm?surface=leads`                    | `/tmp/lojaveiculosv2-qa/agent-qa-clients-review/clients/clients-list-mobile.png`                                  | Reviewer approved |
| VDET-001    | High     | verified | vehicle-details        | vehicle-details worker        | `/inventory` vehicle detail                        | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/admin-detail-anuncio-desktop.png`                | Reviewer approved |
| VDET-002    | Medium   | verified | vehicle-details        | vehicle-details worker        | `/inventory` vehicle detail tabs                   | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/admin-detail-geral-desktop.png`                  | Reviewer approved |
| VDET-003    | Medium   | verified | vehicle-details        | vehicle-details worker        | `/test-store` public listing detail                | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/public-vehicle-detail-desktop.png`               | Reviewer approved |
| VDET-004    | Low      | verified | vehicle-details        | vehicle-details worker        | Admin detail copy                                  | `/tmp/lojaveiculosv2-qa/agent-qa-vehicle-details/vehicle-details/admin-detail-financeiro-desktop.png`             | Reviewer approved |
| VDET-005    | High     | verified | vehicle-details        | vehicle-details worker        | `/inventory` vehicle detail Financeiro             | `tests/e2e/vehicle-details.spec.ts`                                                                               | Reviewer approved |

## Validation Ledger

| Step                       | Command                                                                                                                                                                                                                                                                        | Result | Notes                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------- |
| Harness focused smoke      | `QA_BRANCH_SLUG=agent-qa-harness pnpm exec playwright test tests/e2e/local-permissions.spec.ts tests/e2e/inventory-error-display.spec.ts tests/e2e/qa-harness-smoke.spec.ts --project=chromium`                                                                                | passed | 5 tests passed                         |
| Harness artifact check     | `find /tmp/lojaveiculosv2-qa/agent-qa-harness -type f`                                                                                                                                                                                                                         | passed | Canonical screenshots written          |
| Harness formatting         | `pnpm exec prettier --check package.json docs/qa-agent-workflows tests/e2e && git diff --check`                                                                                                                                                                                | passed | Formatting and whitespace clean        |
| Harness `validate:commit`  | `pnpm run validate:commit`                                                                                                                                                                                                                                                     | passed | Guardrails plus design test passed     |
| Inventory focused tests    | `pnpm --filter @lojaveiculosv2/web test -- InventoryLeadBadge listCatalogModel InventoryListPage`                                                                                                                                                                              | passed | 76 files / 228 tests passed            |
| Inventory reviewer smoke   | Headless browser spot check on `http://127.0.0.1:5174`                                                                                                                                                                                                                         | passed | Sort reset, columns overlay, text      |
| Shared UI focused tests    | `pnpm --filter @lojaveiculosv2/web test -- src/components/ui/FeaturePopover.test.tsx src/components/ui/CustomSelect.test.tsx`                                                                                                                                                  | passed | 76 files / 228 tests passed            |
| Shared UI reviewer checks  | `git diff --check`, merge-tree, `pnpm run check:lines`, focused web tests                                                                                                                                                                                                      | passed | Reviewer approved                      |
| Customize focused tests    | `pnpm --filter @lojaveiculosv2/web test -- publicSite`                                                                                                                                                                                                                         | passed | 77 files / 230 tests passed            |
| Customize reviewer checks  | `git diff --check`, Prettier check on touched files, merge-tree                                                                                                                                                                                                                | passed | Reviewer approved                      |
| Expenses focused tests     | `pnpm --filter @lojaveiculosv2/web test -- financeBillsModel`                                                                                                                                                                                                                  | passed | 75 files / 229 tests passed            |
| Expenses reviewer checks   | `git diff --check`, merge-tree, focused web tests                                                                                                                                                                                                                              | passed | Reviewer approved                      |
| Documents API tests        | `pnpm --filter @lojaveiculosv2/api test -- documentOperations downloadDocument drizzleDocumentTemplates`                                                                                                                                                                       | passed | 114 files / 427 tests passed           |
| Documents web tests        | `pnpm --filter @lojaveiculosv2/web test -- DocumentUploadDialog documentsWorkspaceModel documentDisplayModel documentTemplatePreview`                                                                                                                                          | passed | 77 files / 235 tests passed            |
| Sales web tests            | `pnpm --filter @lojaveiculosv2/web test -- sales`                                                                                                                                                                                                                              | passed | 77 files / 235 tests passed            |
| Sales API tests            | `pnpm --filter @lojaveiculosv2/api test -- sales`                                                                                                                                                                                                                              | passed | 114 files / 427 tests passed           |
| Clients focused tests      | `pnpm --filter @lojaveiculosv2/web test -- crmPipelineModels`                                                                                                                                                                                                                  | passed | 77 files / 236 tests passed            |
| Clients reviewer checks    | `git diff --check`, Prettier check on touched files, focused web tests                                                                                                                                                                                                         | passed | Reviewer approved                      |
| Vehicle details typecheck  | `pnpm --filter @lojaveiculosv2/web typecheck`                                                                                                                                                                                                                                  | passed | Post-merge tree                        |
| Vehicle details catalog    | `pnpm --filter @lojaveiculosv2/web test -- listCatalogModel.test.ts`                                                                                                                                                                                                           | passed | 77 files / 236 tests passed            |
| Vehicle details E2E list   | `pnpm exec playwright test tests/e2e/vehicle-details.spec.ts --list`                                                                                                                                                                                                           | passed | 3 tests registered                     |
| Vehicle details guardrails | `pnpm run validate:commit`                                                                                                                                                                                                                                                     | passed | Post-merge tree                        |
| Runtime storage regression | `pnpm --filter @lojaveiculosv2/api test -- runtimeObjectStorage`                                                                                                                                                                                                               | passed | 115 files / 429 tests passed           |
| Sales focused E2E          | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 QA_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_SKIP_WEB_SERVER=true QA_BRANCH_SLUG=agent-qa-integration-final QA_FEATURE_SLUG=sales-rerun pnpm exec playwright test tests/e2e/sales-flow.spec.ts --project=chromium --workers=1`      | passed | 1 test passed                          |
| Final Playwright campaign  | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 QA_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_SKIP_WEB_SERVER=true QA_BRANCH_SLUG=agent-qa-integration-final QA_FEATURE_SLUG=full-campaign pnpm exec playwright test tests/e2e/*.spec.ts --project=chromium --workers=1`             | passed | 19 tests passed from clean seed        |
| Tracked follow-up E2E      | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 QA_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_SKIP_WEB_SERVER=true pnpm exec playwright test tests/e2e/sales-flow.spec.ts tests/e2e/expenses-flow.spec.ts tests/e2e/clients-linked-records.spec.ts tests/e2e/documents-flow.spec.ts` | passed | 6 tests passed on isolated local stack |
| Final integration validate | `pnpm run validate`                                                                                                                                                                                                                                                            | passed | Full pre-push gate passed              |

## Closed Follow-up

- `SHUI-004`/`SALES-002`: sales now loads lead, unit, and seller pickers with
  readable linked-entity details and mobile-safe labels.
- `EXP-003`: receipt upload is now exercised end to end with local upload
  descriptors, attachment, and visible receipt metadata.
- `EXP-004`: expenses now renders dedicated mobile entry cards with accessible
  actions instead of relying on the desktop table.
- `CLIENTS-005`: client detail now shows linked sales and documents from lead,
  sale, and sale-unit document relationships.
- `SHUI-003`: documents mobile action labels and the tablet optional columns
  were rechecked in the documents Playwright flow.
