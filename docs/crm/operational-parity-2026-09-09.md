# CRM operational parity work

Branch: `feat/crm-operational-workflows`.

## Implemented contracts

- Lead list and board accept `responseState=responded|no_response`, `inactiveDays=1..3650`, `humanAttendanceState=waiting_human|in_human_service`, and `sortBy=created_at|next_task`.
- Response reflects outbound call/email/message activities or sent/delivered/read CRM messages. Pending/failed messages and stage changes are not responses.
- Last interaction is derived from communication activities/messages. Unknown dates remain null and do not match an inactivity age. Stage changes no longer write an interaction date.
- Human triage uses live, non-deleted/non-archived conversation attendance, scoped by tenant/store. If several linked cycles differ, active human attendance takes precedence over waiting.
- Leads expose optional `responseState`, `humanAttendanceState`, and `nextTask: {id,title,dueAt}|null`. Next task excludes completed/cancelled tasks and malformed dates. Historical local task timestamps use America/Sao_Paulo.
- Task ordering places undated leads last; cursor carries the ordering timestamp and stable updatedAt/id tie breakers. The controller rejects mismatched cursor ordering.
- `POST /api/v1/crm/leads/import` requires `lead.create`, accepts up to 500 rows, an existing scoped pipeline stage and an idempotency key. It returns created/skipped counts and row-indexed errors. Validated contacts are deduplicated by normalized phone/email and a durable source identity; existing leads are not overwritten or moved.
- `GET /api/v1/crm/scheduled-messages?leadId=...` filters linked cycles before limiting results, retaining existing schedule permissions and conversation visibility checks. Cancellation remains the existing guarded pending-only operation.
- Migration `0086_crm_lead_operational_lookup.sql` adds scoped conversation link indexes. It has not been deployed.

## Frontend delivery

UI implementation uses AGY CLI with `gemini-3.8-flash-medium`, effort `medium`, as requested. The earlier Muse Spark Free session was replaced after its rate limit prevented completion.

- Cards show the next task and overdue/today/tomorrow/date labels using calendar dates in America/Sao_Paulo.
- The toolbar exposes task/creation ordering and human attendance filters, propagated through API queries and cache keys. Response and inactivity use communication data.
- CSV import selects a stage from the current pipeline, validates up to 500 rows/2 MB, previews invalid lines, submits valid contacts only, and presents confirmed created/skipped/error counts. Retries retain the same idempotency key. Server errors refer to original CSV lines.
- Lead details show scheduled messages alongside tasks, with separate labels, Portuguese statuses, scheduled times, honest loading/error/empty states, and pending-only cancellation under existing permissions. Header actions wrap within desktop/mobile widths.

## Verification

- Real local PostgreSQL transaction test exercises response/inactivity, pending tasks, human triage and task cursor pagination; fixture data is rolled back.
- Controller tests cover filter validation, authorization, import normalization/duplicates/retry/invalid rows and stage scoping, and lead-linked schedules.
- Frontend tests cover CSV quotes/BOM/multiline rows/bounds and existing board/module behavior with the additive query contract.
- Browser test verifies response/inactivity query propagation and keeps a responded lead in status new visible, then captures desktop/mobile. Additional browser coverage exercises task ordering, human triage, CSV import/retry/line mapping and scheduled message cancellation.
- Six Chromium flows passed: responsive board/light/dark, task ordering/human triage, valid-only CSV import, retry/idempotency/original line errors, linked schedule cancellation, and permission gating. Tested at 1440×900 and 390×844 with Axe serious/critical and root-overflow checks. APIs are deterministic local fixtures; backend contracts and SQL have separate tests.
- AGY Gemini 3.8 Flash Medium reviewed six final desktop/mobile screenshots and reported no visual blockers. Captures are in `/tmp/lojaveiculosv2-qa/feat-crm-operational-workflows/crm-operational-parity/`.
- No commit, push, or deployment has been performed.

Validation result: `pnpm run validate` passed (3,144 API tests and 2,016 web tests, plus workspace/quality suites). The local PostgreSQL test and the Chromium operational filter test also passed.
