# /documents page UI/UX redesign

Owner: front-end
Module: `apps/web/src/features/documents/`
Inspired by: `apps/web/src/features/inventory/components/{WorkspaceTopBar,WorkspaceKPIStrip,InventoryListHeader,InventoryListToolbar}.tsx`
Gate before handoff: `pnpm run validate` from `lojaveiculosv2/`

## Decisions (locked with user)

1. **Default landing** — auto-select `general` and sort by `createdAt desc`. No more empty `Selecione uma pasta` state on first load.
2. **Folder list** — flat list with two group headers: `Geral` (1 row) and `Unidades` (1 row per vehicle, with plate chip + stock number subtitle). Searchable.
3. **Toolbar** — single row under the heading. `InventoryListToolbar` pattern: search input + status select + sort + view-mode toggle (lista/cards). Filter chip "Mais filtros" expands a panel for date range / kind / origin / vehicle.
4. **Summary cards** — 4 clickable KPI cards (Total / Automaticos / Manuais / Unidades). Each card filters the table by that origin. "Total" clears the filter. Drop the `Geral` card; signature workflow is **out of scope**.
5. **Mobile (< md)** — two tabs: `Documentos` (table) and `Pastas` (navigator). Bottom action bar: `Atualizar / Modelos / Enviar documento`. Folder breadcrumb above the table when a unit is selected.
6. **Permissions** — module-level gate stays. UI keeps the existing `disabled` patterns for `Enviar documento` (no upload target) and `Regenerar` (not automatic / voided). No new permission wiring in this pass.

## Design tokens (do not invent colors)

- Surfaces: `bg-app`, `bg-app-elevated`, `bg-panel`, `bg-line/25`, `border-line`, `border-line/60`.
- Text: `text-app-text`, `text-muted`, `text-inverse`.
- Accent: `bg-accent`, `bg-accent-strong`, `bg-accent-soft`, `text-accent-strong`, `text-inverse`.
- Status: `text-emerald-500`, `text-blue-500`, `text-violet-500`, `text-danger`, `text-warning`.
- KPI gradients: `kpi-gradient-green`, `kpi-gradient-blue`, `kpi-gradient-violet`, `kpi-gradient-pink` (already used in `InventoryListHeader`).
- Panel: `panel`, `glass-panel-branded`, `bg-panel/30`, `border-line/60`, `rounded-2xl`.
- Layout helpers: `eyebrow`, `border-line/20`, `ring-2 ring-white/70 ring-offset-2 ring-offset-app` for active KPI state.
- Icons: `lucide-react`. No emoji.

## Architecture guardrails (from `AGENTS.md`)

- `apps/web/src/features/<feature>/` is the right home for new module files.
- Component files must stay under 250 lines (split when needed).
- Domain logic stays in `apps/web/src/features/documents/documentDisplayModel.ts`; UI is presentation only.
- No `as any`, no `@ts-ignore`, no `console.log`. No hardcoded hex.
- Web is Vite + React 19 + Tailwind 4 — not Next.js. Pages are mounted from `apps/web/src/app/App.tsx`.
- Permissions enforced at module boundary (per decision #6 above). Backend `ServiceContext` and audit are unchanged.

---

## File-level plan

### 1. New components

| File                           | Purpose                                                                                      | LOC budget | Pattern lifted from                             |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------- |
| `DocumentsWorkspaceTopBar.tsx` | Title "Documentos" + active folder breadcrumb + action strip (Atualizar / Modelos / Enviar)  | ≤ 200      | `inventory/components/WorkspaceTopBar.tsx`      |
| `DocumentsKpiSummary.tsx`      | 4 clickable KPI cards (Total / Automaticos / Manuais / Unidades)                             | ≤ 180      | `inventory/components/InventoryListHeader.tsx`  |
| `DocumentsListToolbar.tsx`     | Search + status + sort + view-mode toggle + "Mais filtros" expander                          | ≤ 230      | `inventory/components/InventoryListToolbar.tsx` |
| `DocumentsFiltersSheet.tsx`    | Date range / kind / origin / vehicle, opens as a popover or bottom sheet                     | ≤ 150      | New; uses `InventoryInput` / `InventorySelect`  |
| `DocumentsMobileShell.tsx`     | Tab bar (Documentos / Pastas) + bottom action bar for `< md`                                 | ≤ 180      | New                                             |
| `DocumentsFolderSidebar.tsx`   | Flat grouped list with `Geral` + `Unidades` sections, search inside the sidebar, active ring | ≤ 220      | Refactor of `DocumentsFolderNavigator.tsx`      |
| `DocumentsEmptyState.tsx`      | Contextual empty state ("Pasta vazia" / "Sem resultados" / "Erro ao carregar")               | ≤ 100      | New (replaces inline `EmptyCatalog` calls)      |

### 2. Edits

| File                                                                                                                                   | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DocumentsModule.tsx`                                                                                                                  | Slim shell. Drop the duplicated `selectedFolderKey` / `filters` / `view` state that lives in `useDocumentsModuleState` (dead code). Add `useState<DocumentsFolderKey>("general")` as the single source of truth. Wrap new components. (Target ≤ 220 lines)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `documentDisplayModel.ts`                                                                                                              | Add `filterByOrigin(documents, origin)` and `sortByCreatedDesc(documents)` helpers. Keep existing `filterDocumentsForFolder` and `filterDocumentsForWorkspace`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `useDocumentsModuleState.ts`                                                                                                           | Remove `selectedFolderKey`, `filters`, `view`, `loadMore`, `hasMore`, `isLoadingMore`, `setOffset`, `replaceFilters`, `updateFilter`, `setView`, `setSelectedFolderKey` — all unused by the module. Keep `documents`, `templates`, `selectedDocument`, `documentPreview`, `documentVersions`, `documentToDelete`, `isUploadDialogOpen`, `isDocumentActionBusy`, `isSavingTemplate`, `status`, `refresh`, `resetAndReload`, plus the action hooks (`previewDocument`, `downloadDocument`, `applyDocumentAction`, `updateDocument`, `deleteDocument`, `saveTemplate`, `setDocumentPreview`, `setDocumentToDelete`, `setDocumentVersions`, `setDocuments`, `setSelectedDocument`, `setIsUploadDialogOpen`, `setStatus`). |
| `useDocumentsModuleActions.ts`                                                                                                         | Audit any callers and update accordingly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DocumentWorkspaceTable.tsx`                                                                                                           | Add `aria-rowcount`, `aria-selected`, `tabIndex` on the row button. Add "Selecionado" indicator that matches the active KPI filter chip pattern. Add an inline plate chip on every row that is a vehicle-linked document (already partial). (Target ≤ 220 lines)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `DocumentsModuleParts.tsx`                                                                                                             | Delete `DocumentsListHeading` and the inlined `DocumentsTableSkeleton`; replace with the new shell components.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `DocumentsSummaryCards.tsx`                                                                                                            | Delete in favor of `DocumentsKpiSummary.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `DocumentsFolderNavigator.tsx`                                                                                                         | Delete; replaced by `DocumentsFolderSidebar.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `DocumentsFiltersPanel.tsx`                                                                                                            | Delete; replaced by `DocumentsFiltersSheet.tsx` (and the `Mais filtros` expander inside the toolbar).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `DocumentsEmptyState` (currently in `DocumentsModuleParts.tsx`)                                                                        | Delete after extraction to its own file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `documents.css`, `documents-command.css`, `documents-command-navigation.css`, `documents-command-table.css`, `documents-workspace.css` | Remove dead class definitions. Add new utility classes for `documents-kpi-card`, `documents-toolbar`, `documents-folder-sidebar`, `documents-mobile-shell`. Add `documents-empty-state--{folder-empty,no-results,error}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `apps/web/src/app/App.tsx`                                                                                                             | No change (module is mounted already).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 3. Tests

| File                              | Reason                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `DocumentsKpiSummary.test.tsx`    | New. Renders 4 cards, clicking a non-Total card emits `onOriginSelect`, clicking Total emits `null`, disabled state when loading.          |
| `DocumentsListToolbar.test.tsx`   | New. Search input emits `onSearchChange`, view toggle emits `onViewModeChange`, sort emits `onSortChange`, "Mais filtros" opens the sheet. |
| `DocumentsFolderSidebar.test.tsx` | New. Renders the two groups in order, highlights the active folder, search filters unit list, click emits `onSelect`.                      |
| `DocumentsEmptyState.test.tsx`    | New. Renders the right copy for each variant.                                                                                              |
| `documentDisplayModel.test.ts`    | Extend. Add cases for `filterByOrigin` and `sortByCreatedDesc`.                                                                            |
| `DocumentsModule.test.tsx`        | New. Renders with `general` pre-selected, clicking a KPI card filters, picking a unit folder switches the title and table.                 |

---

## Layout target

### Desktop (≥ md)

```
┌─────────────────────────────────────────────────────────────────────┐
│ DocumentsWorkspaceTopBar                                             │
│ "Documentos" · Geral                [Atualizar] [Modelos] [Enviar]  │
├─────────────────────────────────────────────────────────────────────┤
│ DocumentsKpiSummary                                                   │
│ [Total] [Automaticos] [Manuais] [Unidades]   ← clickable filters    │
├──────────────────┬──────────────────────────────────────────────────┤
│ DocumentsFolderSidebar │ DocumentsListToolbar                        │
│ ▼ Geral · 12         │ [🔍 search] [status ▾] [sort ▾] [☰/▦] [+f] │
│ ▼ Unidades (7)       ├────────────────────────────────────────────────┤
│   • Civic · ABC-1234 │ DocumentsTable                                │
│   • Onix · DEF-5678  │ (rows: title / plate chip / status / actions) │
│   ...                │                                                │
└──────────────────┴──────────────────────────────────────────────────┘
```

### Mobile (< md)

```
┌────────────────────────────┐
│ DocumentsMobileShell       │
│  Documentos | Pastas       │
│  [breadcrumb: Geral]       │
├────────────────────────────┤
│ 4 KPI cards scroll         │
│ horizontally               │
├────────────────────────────┤
│ Toolbar (search + Filtros) │
├────────────────────────────┤
│ Table (cards view default) │
├────────────────────────────┤
│ Bottom action bar          │
│ [Atualizar] [Modelos]      │
│ [Enviar documento]         │
└────────────────────────────┘
```

Tap `Pastas` tab → `DocumentsFolderSidebar` slides in full-screen.

---

## Phasing (PR-sized)

### PR 1 — `docs/documents-shell-foundation`

- Add `useDocumentsModuleState` cleanup (remove dead state).
- Add `DocumentsWorkspaceTopBar.tsx` and wire it into `DocumentsModule.tsx` next to the existing `DocumentsSummaryCards` (no visual change yet, just plumbing).
- `pnpm run validate` green.
- ~150 lines, low risk.

### PR 2 — `docs/documents-kpi-and-filters`

- Add `DocumentsKpiSummary.tsx` (4 cards, clickable, kpi-gradient).
- Replace `DocumentsSummaryCards` with it.
- Add `DocumentsListToolbar.tsx` and `DocumentsFiltersSheet.tsx`.
- Wire `filterByOrigin` and `sortByCreatedDesc` into the module.
- `pnpm run validate` green.
- ~300 lines, no data-layer change.

### PR 3 — `docs/documents-folder-sidebar`

- Add `DocumentsFolderSidebar.tsx` (groups + search + active ring).
- Replace `DocumentsFolderNavigator` mount point.
- Keep mobile modal as a fallback for now.
- `pnpm run validate` green.
- ~250 lines.

### PR 4 — `docs/documents-auto-select-general`

- Change default `selectedFolderKey` from `null` to `"general"`.
- Drop the "Selecione uma pasta" empty state path from `DocumentsModule.tsx`.
- Add the contextual `DocumentsEmptyState` for "Pasta vazia" / "Sem resultados".
- `pnpm run validate` green.
- ~80 lines.

### PR 5 — `docs/documents-mobile-shell`

- Add `DocumentsMobileShell.tsx` with the tab bar + bottom action bar.
- Hide the desktop folder sidebar below `md`.
- `pnpm run validate` green.
- ~200 lines.

### PR 6 — `docs/documents-css-cleanup`

- Delete dead CSS rules from the 4 documents stylesheets.
- Add new utility classes.
- Run `pnpm run validate:push` to make sure the visual regression is contained.

---

## Risk register

| Risk                                                                           | Mitigation                                                                                                                                                              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KPI cards acting as filters could surprise users who expect click → drill-down | Use the same `aria-pressed` + `ring-2 ring-white/70` pattern from `InventoryListHeader`; surface the active filter as a chip in the toolbar                             |
| Auto-selecting `general` shows nothing for new stores                          | The new contextual `DocumentsEmptyState` (PR 4) covers this with "Nenhum documento na pasta Geral" + "Enviar documento" CTA                                             |
| Removing dead state from `useDocumentsModuleState` could break hidden callers  | Grep `useDocumentsModuleState` callers before deleting; refactor `useDocumentsModuleActions` to not depend on the deleted fields                                        |
| Mobile tab bar overlaps the bottom action bar                                  | Match `dashboardSidebar` pattern; safe-area inset on iOS; tested via Playwright in `apps/web/e2e/`                                                                      |
| Splitting `DocumentsFiltersPanel` into toolbar + sheet changes the data flow   | Keep `DocumentsWorkspaceFilters` type in `documentDisplayModel.ts`; only the UI changes                                                                                 |
| `kpi-gradient-*` styles may not be defined for documents stylesheet            | Either import from `inventory` CSS via `@import` in `documents.css`, or copy the rules into `documents.css` (preferred — keeps the documents stylesheet self-contained) |

---

## Out of scope (deferred)

- Signature / signing workflow inside documents (user said "we will not handle signature in documents at all").
- Per-permission gating (decision #6).
- Per-store multi-tenant folder permissions.
- Drag-and-drop reorder of folders.
- Document versioning UI (already exists, but the redesign does not change it).
- Replacing the upload pipeline (the `DocumentUploadDialog` stays).
- Audit log viewer (separate `audit` module).

---

## Definition of done

- [ ] All 5 PRs merged.
- [ ] `pnpm run validate` green from `lojaveiculosv2/`.
- [ ] `pnpm run test:smoke:api` green.
- [ ] Manual Playwright check on desktop (1280×800) and mobile (390×844) covering: load, click a KPI, switch folder, search, open filtros, upload, delete.
- [ ] No new console warnings, no `as any`, no hardcoded colors.
- [ ] `useDocumentsModuleState` ≤ 100 lines after dead-code removal.
- [ ] `DocumentsModule.tsx` ≤ 220 lines.
- [ ] Empty state variants verified: "Pasta vazia", "Sem resultados", "Erro ao carregar".
- [ ] CHANGELOG / release notes updated.
