# Marketplace Stock Sync Smoke Checklist

Run after Core, Providers, API, and UI are merged.

## API Smoke

- Provider account state renders in `GET /api/v1/marketplaces/overview`.
- Missing Mercado Livre gateway config returns a stable marketplace error.
- Missing OLX config returns `MARKETPLACE_PROVIDER_NOT_CONFIGURED`.
- Missing OLX contract config returns `MARKETPLACE_PROVIDER_CONTRACT_MISSING`.
- Preview returns publish/update/unpublish/no-op/blocked counts.
- Blocked listing reasons include user-action text.
- Run creates queued jobs with a shared `metadata.batchId`.
- Single-job run sanitizes provider result metadata.
- Retry creates a new queued job linked by `retryOfJobId`.
- Known failures do not return `MARKETPLACE_REQUEST_ERROR`.
- No lead-sync route or UI is added in this slice.

## UI Smoke

- Provider cards show account status and requirement checklist.
- Stock preview shows publish, update, unpublish, no-op, and blocked counts.
- Blocked listing list explains what to fix in Portuguese.
- Batch run shows queued/running/succeeded/failed state.
- Partial failures remain visible.
- Retry action works for failed jobs.
- Error rendering includes provider, vehicle label when available, fix action,
  and request id.

## Safety Smoke

- No provider tokens or secrets appear in API responses.
- No raw provider request or response payloads appear in API responses.
- No raw provider request or response payloads are stored in job metadata.
- Automated tests use fakes/mocks only; no live provider calls.
- Marketplace brand/model/year seed tables were not added.
- No background worker was added.
