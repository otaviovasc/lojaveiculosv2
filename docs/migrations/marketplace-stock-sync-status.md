# Marketplace Stock Sync Status

Status owner: orchestrator
Last updated: 2026-07-08

## Decisions

- FIPE catalog data is canonical.
- Sync mirrors public V2 stock.
- Sync is manual/operator-triggered.
- Existing `integration_jobs` are reused and grouped with
  `metadata.batchId`.
- OLX is strict config-driven and fails closed when contract config is absent.
- Lead sync is out of scope.

## Waves

- Wave 0: contracts frozen in
  `docs/migrations/marketplace-stock-sync-contracts.md`.
- Wave 1: core planner/schema and provider gateways.
- Wave 2: API orchestration and UI.
- Wave 3: QA, smoke documentation, and final validation.

## Worker Reports

Workers must report:

- commit hash
- files changed
- commands run
- focused tests result
- typecheck result
- screenshots/evidence for UI
- known blockers

## Current State

- Contracts: frozen and implemented.
- Core: implemented with planner, typed errors, FIPE mapping, and DB schema.
- Providers: implemented with Mercado Livre and fail-closed OLX gateways.
- API: implemented for preview, run, retry, strict metadata, and audit.
- UI: implemented for provider cards, checklist, preview, jobs, and retry.
- QA: focused marketplace tests/typechecks passing; full validate pending.
