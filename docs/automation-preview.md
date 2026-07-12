# Automation Preview Foundation

The first V2 automation runtime is intentionally provider-neutral and
preview-only. It creates one deterministic, read-only proposal and records an
explicit human decision. It does not call OpenAI, use computer control, dispatch
tools, or mutate product data.

## HTTP Contract

- `GET /api/v1/automation/runs`: paginated store workspace.
- `POST /api/v1/automation/runs`: create a preview-first run.
- `GET /api/v1/automation/runs/{runId}`: read the full preview.
- `POST /api/v1/automation/runs/{runId}/cancel`: cancel a pending run.
- `POST /api/v1/automation/runs/{runId}/steps/{stepId}/approve`: approve the
  reviewed proposal.
- `POST /api/v1/automation/runs/{runId}/steps/{stepId}/reject`: reject it.

Successful single-run responses use `{ "data": AutomationRun }`. List responses
use `{ "data": AutomationRunSummary[], "meta": { "limit", "offset", "total" } }`.
Errors use the shared `{ message, code, requestId, details? }` envelope.

Approval and rejection bodies carry expected run, step, and approval versions
plus `expectedProposalDigest`. A mismatch fails with
`AUTOMATION_STALE_APPROVAL`; cancellation uses the expected run version and
fails with `AUTOMATION_STALE_VERSION` when stale.

## Safety Invariants

- Every query and mutation includes tenant and store scope.
- Services require explicit permission, the `automation` entitlement,
  `ServiceContext`, structured logs, and audit records.
- Database constraints force `execution_enabled = false` for runs and steps.
- Only `awaiting_approval` may transition to `approved`, `rejected`, or
  `cancelled`; terminal states cannot transition again.
- Approval is bound to the SHA-256 digest of the exact deterministic proposal.
- Multi-row decisions use one database transaction and compare-and-swap row
  versions, so concurrent or stale review tabs fail closed.

The API package has no disposable PostgreSQL integration-test harness. Its
adapter regression suite therefore executes the real Drizzle repository against
a transaction-aware in-memory adapter that evaluates the generated SQL equality
predicates and rolls back failed multi-row decisions. This covers tenant/store,
version, and proposal-digest predicates without a live database; applying the
migration and PostgreSQL-specific DDL remains a deployment smoke responsibility.

Adding a provider, computer-use session, or tool executor requires a separate
architecture decision, additional permissions by effect, idempotent execution
records, environment documentation, failure recovery, and end-to-end tests.
