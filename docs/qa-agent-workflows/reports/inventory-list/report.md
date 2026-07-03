# Inventory List Worker Report

## Lane

- Feature: inventory-list
- Worker branch: `agent/qa/inventory-list`
- Worktree: `.worktrees/qa-inventory-list`
- Base branch: `agent/qa-integration`
- Latest commit: branch head before lane edits (`a4d0176`)
- Artifact root: `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/`
- Persona coverage: Seed Owner (`clerk_seed_owner`, `test-store`)
- Viewports: desktop 1366x900, mobile 390x844

## Discovery

- Routes tested: `/sign-in`, `/dashboard#/inventory`, `/inventory`
- Current behavior: owner login succeeds, inventory loads seeded vehicles, list mode is the default, column titles are clickable, price column cycles `neutral -> ascending -> descending -> neutral`, lead badges render green for 1-2 leads and amber for 3-5 leads in the current seed, and the `Colunas` menu opens above the list.
- Console/API errors: no console errors, page errors, or `/api` 4xx/5xx responses during discovery.
- UI issues: Marca/Modelo cells are constrained to about 188px and truncate medium-length names/descriptions on desktop (`Hyundai HB20 Comfort 2021`, `Audi A4 Prestige Plus 2.0 TFSI 2022`, BMW catalog lines). This makes the list feel cramped even with available horizontal space.
- Backend/API gaps: none found for this lane. Lead heat currently uses deterministic frontend list helpers because the seed/API list payload does not expose lead counts.
- Permission/audit concerns: none found; read-only inventory list validation under local auth bypass only.
- V1/repasses/reference context: not needed for these lane-local list controls.
- Redesign reference image: not needed; this is a targeted QA fix, not a redesign.
- Proposed fixes: widen and relax Marca/Modelo table text layout without new colors or visual language; keep the existing column sort and column selector behavior; add focused coverage for all column sort cycles and explicit lead heat thresholds, including 6+ red.

## Findings

| ID       | Severity | Status | Route                   | Owner                 | Evidence                                                                                           | Reviewer |
| -------- | -------- | ------ | ----------------------- | --------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| INVL-001 | Medium   | fixed  | `/dashboard#/inventory` | inventory-list worker | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-after-fix.png`              | pending  |
| INVL-002 | Low      | fixed  | `/dashboard#/inventory` | inventory-list worker | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-sort-price-reset.png`       | pending  |
| INVL-003 | Low      | fixed  | `/dashboard#/inventory` | inventory-list worker | `/tmp/lojaveiculosv2-qa/agent-qa-inventory-list/inventory-list/desktop-columns-open-after-fix.png` | pending  |

## Implementation

- Files changed: `apps/web/src/features/inventory/components/InventoryListingTable.tsx`, `apps/web/src/features/inventory/components/InventoryLeadBadge.test.tsx`, `apps/web/src/features/inventory/model/listCatalogModel.test.ts`, `docs/qa-agent-workflows/reports/inventory-list/report.md`
- Backend/API contracts changed: none
- DB/schema changes: none
- Seed changes: none
- Playwright specs added/updated: none; manual Playwright browser flow captured discovery and post-fix evidence because the default Playwright port was occupied by another worktree
- Subagents used: none

## Validation

- Focused tests: `pnpm --filter @lojaveiculosv2/web test -- InventoryLeadBadge listCatalogModel InventoryListPage` passed, 76 files / 228 tests
- Feature Playwright flow: manual Chromium flow against `http://127.0.0.1:5174` passed for Seed Owner login, `/dashboard#/inventory`, `/inventory`, lead badge inspection, column menu overlay, price sort asc/desc/reset, desktop, and mobile
- `pnpm run validate:commit`: passed
- Other checks: `pnpm exec prettier --check apps/web/src/features/inventory/components/InventoryListingTable.tsx apps/web/src/features/inventory/components/InventoryLeadBadge.test.tsx apps/web/src/features/inventory/model/listCatalogModel.test.ts docs/qa-agent-workflows/reports/inventory-list/report.md` passed; `git diff --check` passed; local schema push and seed completed against standard local dev databases after setting `COMPOSE_PROJECT_NAME=lojaveiculosv2`

## Reviewer Feedback

- Discovery gate: ready for reviewer
- Implementation gate: ready for reviewer
- Required follow-up: reviewer should rerun the inventory list flow from the integration worktree after merge

## Final State

- Ready for orchestrator merge: yes, pending reviewer rerun
- Deferred findings: none
- Notes: Evidence screenshots captured `desktop-initial.png`, `desktop-columns-open.png`, `desktop-sort-price-asc.png`, `desktop-sort-price-desc.png`, `desktop-sort-price-reset.png`, `mobile-initial.png`, `desktop-after-fix.png`, `desktop-columns-open-after-fix.png`, and `mobile-after-fix.png`.
