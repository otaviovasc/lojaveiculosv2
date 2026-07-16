# AI Automation Runtime Decision

Status: current preview foundation plus target executor architecture.

Last source verification: 2026-07-11.

This document separates what exists in Loja Veiculos V2 today from the
computer-use executor that may be built later. It is an architecture decision,
not an assertion that autonomous tool or browser execution is live.

## Current State: Preview Only

The current automation control plane is provider-neutral and preview-only. Its
HTTP contract and safety invariants are documented in
[`automation-preview.md`](automation-preview.md).

Current guarantees:

- Runs, steps, decisions, versions, and proposal digests are durable in
  Postgres and scoped by tenant and store.
- Every service entrypoint receives `ServiceContext` and checks the
  `automation` entitlement plus an explicit `automation.*` permission.
- Approve, reject, and cancel transitions use optimistic versions. Approval is
  bound to the digest of the exact proposal that was reviewed.
- Audit events and structured logs carry scoped identifiers, not payloads or
  customer data.
- Database constraints force `execution_enabled = false` for runs and steps.
- The current control plane does not call OpenAI, run an agent loop, dispatch a
  tool, control a browser, or mutate product data.

The approval recorded by this first slice is a reviewed product decision. It is
not an execution grant. Removing the database constraint is not a valid way to
enable execution.

## July 2026 Target Decisions

These choices were checked against the linked primary documentation and package
registries on 2026-07-11. Planned packages must be installed only when the
executor phase is approved.

| Layer         | Decision                                                                                                                                                        | Repository status                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Orchestration | [`@openai/agents` 0.13.2](https://www.npmjs.com/package/@openai/agents/v/0.13.2) is the single model-loop orchestrator.                                         | Planned; not installed.                                   |
| Model         | Start executor evals with [`gpt-5.6-terra`](https://developers.openai.com/api/docs/guides/latest-model), with `gpt-5.6-sol` as the quality baseline.            | Planned; no production default changed.                   |
| Computer use  | Use the OpenAI GA [`computer` tool](https://developers.openai.com/api/docs/guides/tools-computer-use), never the deprecated `computer-use-preview` integration. | Planned; disabled.                                        |
| Browser       | Use [`@playwright/test` 1.61.1](https://www.npmjs.com/package/@playwright/test/v/1.61.1) in a dedicated isolated worker.                                        | The version is present for tests; no executor exists.     |
| Durable state | Postgres is canonical for run, step, approval, lease, effect, and result state.                                                                                 | Preview subset is current; execution records are planned. |
| Scheduling    | Use [`BullMQ` 5.80.2](https://www.npmjs.com/package/bullmq/v/5.80.2) only for wake-up, retry, delay, and deduplication.                                         | Planned; not installed.                                   |

OpenAI's current model guide positions `gpt-5.6-terra` as the balance of
capability and cost and recommends the Responses API for reasoning and tool
workflows. The final model, reasoning effort, and fallback policy must be chosen
from this product's eval data, not from a global default.

Do not add a second agent loop through Vercel AI SDK or a custom recursive
runner. The OpenAI Agents SDK owns the ephemeral model/tool loop inside the
worker; V2 owns durable business state, authorization, approvals, and audit.

## Target Service Boundary

Computer use must run outside the web and API processes in a separately
deployable Railway worker, expected to be a workspace app such as
`apps/automation-executor` when implementation begins.

```text
apps/web
   |
   v
apps/api controllers -> automation domain services -> Postgres
                                                  |
                                      transactional outbox
                                                  |
                                                  v
                                        BullMQ wake-up only
                                                  |
                                                  v
                              isolated automation executor
                                |                 |
                                |                 +-> Playwright browser
                                +-> OpenAI Agents SDK / Responses API
                                                  |
                                                  v
                                  reviewed internal product ports
```

The API remains the policy authority. The executor must not receive broad
product-database credentials and must not call domain repositories directly to
perform business mutations. It claims one versioned step, obtains a short-lived
service credential, and calls a reviewed internal port or API. The API rebuilds
`ServiceContext`, re-checks current actor permissions and store entitlements,
then applies the business service that already owns the mutation.

Queue payloads contain opaque run/step ids, expected versions, and a
deduplication key only. They never contain prompts, screenshots, browser state,
tokens, tool arguments, customer records, or provider responses. Redis loss
must be recoverable by replaying a Postgres outbox or a canonical-state sweeper.
BullMQ's guidance requires jobs to be
[idempotent](https://docs.bullmq.io/patterns/idempotent-jobs); its
[deduplication](https://docs.bullmq.io/guide/jobs/deduplication) feature is an
optimization, not the execution ledger.

## Run And Approval Protocol

The target execution state machine is additive to the current preview states:

```text
preview -> awaiting_approval -> approved -> queued -> claimed -> running
                                                        |          |
                                                        |          +-> completed
                                                        |          +-> failed
                                                        |          +-> awaiting_approval
                                                        +-> expired

Any non-terminal state -> cancelled
```

Each claim uses an expiring lease and compare-and-swap version. A retry may
continue only when the same idempotency key has no completed effect. Terminal
results cannot transition again.

An executable approval must bind all of the following:

- run, step, approval, and proposal versions;
- proposal digest and normalized tool-argument digest;
- tool name, effect class, tenant, store, actor, and target resource ids;
- allowed domains and the browser origin visible at review time;
- screenshot or preview-artifact digest when a visual decision is relevant;
- maximum actions, model/tool budget, and approval expiry;
- the explicit permission keys and entitlement checked at decision time.

The same permission and entitlement are checked again immediately before the
effect. A stale version, changed URL, changed arguments, expired approval,
revoked role, or changed proposal digest fails closed and returns to review.

Authenticated browser sessions, sale close, document signing, fiscal actions,
billing, payment, destructive actions, and anything hard to reverse always
require a human boundary. OpenAI likewise recommends an
[isolated browser or container, allowlisted domains/actions, and human review
for high-impact actions](https://developers.openai.com/api/docs/guides/tools-computer-use).

## Tool Registry Contract

Every executable tool is registered with a strict input schema and metadata:

- effect class: `read`, `draft`, `product_mutation`, `external_mutation`, or
  `prohibited`;
- required permission keys and store entitlement;
- approval policy and whether a new visual preview is required;
- idempotency strategy and stable business-effect key;
- timeout, retry ceiling, and compensation or operator-recovery path;
- log/audit field allowlist and redaction policy.

Function tools use strict Zod schemas and input/output guardrails. Guardrails do
not replace authorization inside domain services. A model can propose a tool
call; it cannot grant its own permission or widen its domain allowlist. Follow
the Agents SDK guidance for
[runs](https://openai.github.io/openai-agents-js/guides/running-agents/),
[human-in-the-loop interruptions](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/),
and [guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/)
when implementing the worker.

## Browser Isolation And Secret Policy

Each computer-use attempt gets a fresh browser context in an ephemeral,
non-root container or VM with:

- no host mounts or product-database network route;
- deny-by-default egress with exact domain and action allowlists;
- per-run time, action, token, download, and upload limits;
- downloads quarantined and scanned before any product service sees them;
- a kill switch that stops active leases and prevents new claims;
- short artifact retention with encryption, access audit, and tenant scope.

The worker executes the GA tool's batched `actions[]` sequentially and validates
the active origin and policy before every action. Page content, downloads, and
screenshots are untrusted input. Playwright's
[container guidance](https://playwright.dev/docs/docker) is the baseline, not a
complete sandbox design.

Never serialize or persist raw Agents SDK `RunState`, chain-of-thought,
provider transcripts, browser storage state, cookies, API keys, or session
tokens. At an approval boundary, normalize the proposed effect into the typed
V2 step record, end the ephemeral agent turn, and later start a new bounded run
from the approved record. Secrets are injected just in time by a credential
broker, kept out of model context, and destroyed with the worker.

Traces must use the same redaction rules as application logs. Persist only
sanitized model, prompt, tool, latency, token, cost, outcome, and policy version
metadata needed to reproduce an eval or audit a decision.

## Validation And Enablement Gates

Computer execution remains disabled until all gates below pass:

1. State-machine, tenant-isolation, authorization, stale-approval, lease, and
   idempotency tests pass with concurrent workers and retries.
2. Tool contract tests prove zero product mutations before a matching approval
   and zero cross-tenant reads or effects.
3. Recorded deterministic scenarios cover success, refusal, timeout, malformed
   tool input, prompt injection, navigation outside the allowlist, approval
   expiry, cancellation, and worker crash recovery.
4. Browser flows pass in a synthetic store using isolated Playwright workers at
   desktop and mobile viewports; no production account is used for CI.
5. Agent evals compare model/reasoning candidates on task success, unsafe-action
   attempts, unnecessary tool calls, latency, and cost. OpenAI recommends
   [trace grading](https://developers.openai.com/api/docs/guides/agent-evals)
   to find workflow-level regressions; SDK
   [tracing](https://openai.github.io/openai-agents-js/guides/tracing/) must be
   configured with V2 redaction before collecting those traces.
6. The eval suite has a zero-tolerance gate for approval bypass, cross-tenant
   access, secret exposure, and execution on a stale digest. Quality/cost
   thresholds must be recorded from a representative baseline before rollout.
7. The operator release gate passes `pnpm run validate:release`, the explicit web production build, API
   smoke contracts, executor tests, and the committed eval regression suite.
8. Staging runs behind an off-by-default feature flag, store entitlement, domain
   allowlist, spend limit, concurrency limit, and operator kill switch before a
   canary store is considered.

Any failed safety gate blocks deployment. A model or SDK upgrade repeats the
representative eval suite and browser safety scenarios before promotion.

## Delivery Sequence

1. Keep the current preview/decision ledger read-only and collect UX feedback.
2. Add execution tables, outbox, leases, effect ids, and recovery tests while
   `execution_enabled` remains constrained off.
3. Build the isolated worker with mocked model and browser adapters.
4. Add the Agents SDK and GA computer tool behind the disabled runtime flag.
5. Establish redacted tracing, golden scenarios, graders, and model baselines.
6. Enable read-only synthetic staging runs, then narrowly scoped draft actions.
7. Consider reversible product mutations only after the prior stages meet all
   gates. High-impact actions retain explicit human approval.

The current implementation is complete when it safely previews and records a
decision. The target executor is complete only when it can recover from retries
and crashes, prove every effect against an exact approval, and pass the safety
and eval gates above.
