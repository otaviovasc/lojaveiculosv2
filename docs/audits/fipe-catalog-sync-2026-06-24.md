# FIPE Catalog Sync Audit - 2026-06-24

## Verdict

Not ready to snapshot for production seed use.

The all-type local sync was attempted against reference `334` (`junho/2026`) with
`FIPE_CATALOG_SYNC_VEHICLE_TYPES=cars,motorcycles,trucks` and no brand filter.
The provider returned HTTP `429` before the run could complete. The `cars` run
finished with `isComplete=false`; `motorcycles` failed at the first brand-list
request, and `trucks` did not run.

The mapped naming parser is not the blocker. After the parser-only normalization
rerun, the DB audit found zero active versions with empty `provider_name`, zero
mapped versions where the stored version name still starts with its model-family
name, zero parser drift from the saved FIPE provider name, and zero version names
with leading separators.

## Current Local Coverage

| Type | Raw brands | Mapped brands | Raw model brand payloads | Raw models | Model families | Versions | Years |
| ---- | ---------- | ------------- | ------------------------ | ---------- | -------------- | -------- | ----- |
| cars | 107        | 107           | 37                       | 2,976      | 557            | 2,334    | 7,660 |

No motorcycle or truck catalog rows were completed in this run.

## Sync Result

Latest `cars` sync:

- `status`: `succeeded`
- `isComplete`: `false`
- `brandsSeen`: `107`
- `versionsSeen`: `2,334`
- `yearsSeen`: `3,838`
- `freshYearLookupsSkipped`: `992`
- `skippedModelLookups`: `70`
- `skippedYearLookups`: `429`

Latest `motorcycles` sync:

- `status`: `failed`
- Failure: HTTP `429` for `/motorcycles/brands?reference=334`

## Parser Validation

Command:

```bash
DATABASE_URL=postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2 \
RUN_RAW_FIPE_CATALOG_DB_TESTS=true \
pnpm --filter @lojaveiculosv2/api test -- fipeCatalogNameNormalization.rawDb
```

Result:

- Passed against the raw FIPE model payloads currently stored in
  `vehicle_catalog_raw_responses`.
- Parser dry-run is idempotent after normalization:
  `familiesCreated=0`, `versionsChanged=0`, `versionsSeen=2,334`.
- Targeted checks verified the corrected mappings for examples including
  Fiat `500 Cabrio`, Audi `A3 Sedan`/`Sportback`, BMW `X3 XDRIVE`, BMW `i3 Bev`,
  Fiat `Tempra SW`, Ford `Escort SW`, Ford `Ka+`, BYD `Song Pro GS`, and Audi
  `Avant RS2`.

## Snapshot Decision

Do not export `docker/postgres/seed/vehicle-catalog.sql` from this partial DB.
The exporter has been updated to include raw FIPE response tables once a complete
catalog is available, but this run is incomplete and should not be promoted.

## Resume Requirement

Resume after the FIPE quota resets or with a premium/unlimited token. To finish
all brand/model/version coverage within a limited token, avoid year backfill
until the brand/model/version catalog is complete.

Recommended first resume command:

```bash
DATABASE_URL=postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2 \
AUDIT_DATABASE_URL=postgresql://lojaveiculosv2_audit:lojaveiculosv2_audit_dev@localhost:54322/lojaveiculosv2_audit \
FIPE_CATALOG_SYNC_VEHICLE_TYPES=cars,motorcycles,trucks \
FIPE_CATALOG_SYNC_CONCURRENCY=1 \
FIPE_CATALOG_SYNC_REFERENCE_CODE=334 \
FIPE_CATALOG_SYNC_INCLUDE_YEARS=false \
pnpm --filter @lojaveiculosv2/api catalog:sync
```

After model coverage is complete, run year backfill in smaller chunks with
`FIPE_CATALOG_SYNC_INCLUDE_YEARS=true`.
