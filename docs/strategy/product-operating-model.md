# Product Operating Model

Status: current strategic guardrail. Exact prices and ICP cutoffs remain
experiments until the V1 cohort evidence is complete.

## Purpose

This document prevents feature output from replacing customer and business
progress. It applies to product, engineering, sales, onboarding, customer
success, integrations, and partner decisions.

The dated evidence behind these rules is in
[`2026-07-business-scale-audit.md`](2026-07-business-scale-audit.md).

## Product Doctrine

Loja Veículos is a store-operated process-delivery product for Brazilian
vehicle retailers. It is not primarily:

- a buyer marketplace;
- a generic website builder;
- a collection of unrelated dealership tools;
- an agency services menu;
- an AI demo surface;
- a system that claims regulatory completion without provider evidence.

The opening product promise is:

> Protect dealer margin and make the daily acquisition-to-cash process
> executable, visible, and auditable.

Every core capability should reduce at least one of:

- days in stock;
- time from acquisition to publication;
- missed or slow lead response;
- undocumented preparation cost;
- discount and commission leakage;
- closing/document/fiscal/RENAVE inconsistency;
- receivable or warranty leakage;
- manager hours spent chasing status.

## Initial ICP Hypothesis

Prioritize independent used-vehicle retailers with:

- 15–80 active vehicles;
- one to three locations;
- three to 15 operational users;
- an owner or operating manager who will adopt a standard process;
- meaningful preparation, lead, sale, finance, and document volume;
- pain large enough that a R$1,000-class monthly product is economically small.

The active and inactive V1 cohort must validate or replace this hypothesis.

Do not combine small owner-only lots, franchised groups, motorcycles, heavy
vehicles, fleet disposal, and consignment-only brokers into one initial ICP.
Each material variation needs an evidence-backed playbook, price, support model,
and integration set.

## Canonical Operating Loop

The canonical workflow is:

```text
evaluate/acquire
  -> prepare and accumulate true cost
  -> publish and reconcile channels
  -> capture/assign/respond to lead
  -> proposal/visit/reservation
  -> sell and collect
  -> documents + fiscal + RENAVE reconciliation
  -> delivery + warranty/post-sale
  -> realized margin and process learning
```

The V1 close-sale semantics are product evidence. V2 should preserve their
business meaning while using typed services, transactions, idempotent external
effects, and append-only financial/document history.

## Portfolio Sequence

Work should move through these horizons in order.

### Horizon 1 — retain and migrate

- Complete churn/retention truth for the full V1 cohort.
- Migrate three representative active stores.
- Enforce billing/entitlement lifecycle.
- Deliver safe storage, secrets, tenant scope, migrations, backup, and support.
- Instrument activation and customer health.
- Prove the core owner ROI dashboard.

### Horizon 2 — repeat the process

- Productize paid implementation and data import.
- Make provider setup supportable without founder database work.
- Turn marketplace, billing, fiscal, and messaging effects into durable jobs.
- Establish one repeatable sales or partner channel.
- Publish verified outcome cases.

### Horizon 3 — expand revenue

- Multi-store/agency control plane.
- Metered provider and automation allowances.
- Official WhatsApp provider options.
- Authorized RENAVE integration and compliance controls.
- Partner services for inspection, warranty, financing, insurance, and
  documentation.

### Horizon 4 — compound the data moat

- Permissioned peer benchmarks.
- Explainable acquisition and repricing recommendations.
- Daily owner/seller action plans.
- Warranty and preparation risk prediction.
- Partner-ready process/risk scoring.
- Dealer process certification.

No autonomous computer-use executor is needed to complete Horizons 1 or 2.
Start with deterministic rules and reviewed drafts inside existing product
services.

## Commercial Readiness Gate

A feature cannot be called customer-ready solely because UI, routes, schemas,
adapters, tests, or provider configuration exist.

Before commercial enablement, record:

1. Target ICP and job-to-be-done.
2. Primary customer outcome and leading product metric.
3. Design-partner owner and accepted real-data workflow.
4. Billing SKU, entitlement, quota, variable cost, and gross-margin treatment.
5. Onboarding, migration, support, cancellation, and failure ownership.
6. Tenant, permission, audit, secrets, privacy, idempotency, and recovery model.
7. Required provider contract and current regulatory verification.
8. Monitoring, runbook, rollback, and customer-visible degraded state.
9. Evidence that the feature belongs in primary navigation.

Unavailable or simulated regulatory/provider capabilities must say explicitly
that no official operation occurred. They must never show a synthetic success
state.

## Roadmap Decision Test

Each proposed initiative gets a one-page decision record with:

- observed customer evidence;
- segment and number of affected active stores;
- expected effect on retention, revenue, or customer outcome;
- smallest vertical slice;
- support and provider cost;
- deletion or stop condition;
- named DRI and measurement date.

Use this weighted score from 0–5 per criterion:

| Criterion                                | Weight |
| ---------------------------------------- | -----: |
| Retention or activation effect           |    25% |
| Dealer margin/process outcome            |    20% |
| Regulatory or existential risk reduction |    20% |
| Revenue/expansion potential              |    15% |
| Migration of active V1 value             |    10% |
| Evidence strength and time-to-value      |    10% |

Then subtract an explicit complexity penalty for provider concentration,
support hours, irreversible regulation, or a new runtime. A high score does not
override an unresolved P0 safety issue.

Portfolio WIP limit until 30 migrated/activated stores:

- one customer-value bet;
- one migration stream;
- one reliability/commercial-readiness stream.

Urgent incidents and statutory deadlines can preempt WIP. Visual polish,
placeholder breadth, and speculative automation cannot.

## SaaS Scorecard

The three partners review this scorecard weekly. Report cohorts and medians;
avoid averages that hide failed stores.

### Acquisition

- Qualified opportunities created.
- Source and campaign/partner attribution completeness.
- Opportunity-to-discovery conversion.
- Discovery-to-paid-implementation conversion.
- CAC in cash and founder hours.
- Sales-cycle median and p90.

### Activation

Initial activation hypothesis: within 14 days after the store supplies its
source data, the store must:

1. import or create at least ten real vehicles or 80% of active stock,
   whichever is lower;
2. publish at least one real listing;
3. invite and activate at least one additional operating user when the store has
   a team;
4. connect at least one lead channel and handle one real lead.

Track:

- data-received-to-import-complete;
- import-complete-to-first-publish;
- first lead received-to-first response;
- percentage activated by day 7 and day 14;
- onboarding/support minutes per store;
- failed milestone and reason.

Do not require a sale for initial activation because inventory cycles vary.
First controlled close is a deeper adoption milestone.

### Adoption And Customer Value

A weekly core-active store has at least one active store user and performs real
work in at least two core workflow classes during seven days:

- inventory/preparation/publication;
- lead/visit/reservation;
- sale/document/fiscal/finance/post-sale.

Track:

- weekly core-active stores and users;
- active roles per store;
- first controlled sale and time to it;
- stock freshness and stale-listing count;
- lead first-response median and SLA attainment;
- percentage of sales with complete cost, payment, document, and commission
  state;
- provider failure rate visible to the customer;
- owner weekly report opened and actions completed.

### Retention And Revenue

Definitions:

- Logo churn: paying store/account contract ends during the period. Inactivity
  alone is not churn.
- Voluntary churn: customer chooses to leave.
- Involuntary churn: payment failure or administrative loss.
- Business-exit churn: dealership closes or leaves the target activity.
- GRR: opening recurring revenue minus churn and contraction, divided by
  opening recurring revenue. Expansion is excluded.
- NRR: opening recurring revenue minus churn/contraction plus expansion,
  divided by opening recurring revenue.

Track:

- monthly logo churn by cohort and reason;
- 30/90/180-day logo retention;
- GRR and NRR;
- MRR, new MRR, expansion, contraction, voluntary churn, involuntary churn;
- annual-prepay share;
- plan/add-on/provider gross margin;
- implementation revenue and delivery margin;
- support minutes and provider cost per active store.

Every cancellation records one primary reason, optional secondary reasons,
customer statement, internal assessment, avoidability, competitor, affected
workflow, and win-back date. Never store unnecessary personal message content
in the analytics record.

### Dealer Outcome Metrics

Canonical definitions must be owned by one domain and reconciled:

- true landed vehicle cost;
- expected and realized gross contribution;
- days from acquisition to ready;
- days from ready to first publication;
- total days in stock and stock turn;
- aged inventory capital;
- lead response time and SLA;
- visit, proposal, reservation, and sale conversion by source and seller;
- discount from initial asking price;
- receivable aging;
- warranty claim frequency and cost;
- closing exceptions for payment, documents, fiscal, and RENAVE.

No dashboard may label lifetime totals as a period or show a calculated metric
with a hardcoded zero.

## Product Event Contract

Product analytics is separate from security audit. Use an append-only event
ledger plus daily rollups. Events contain no message bodies, raw documents,
secrets, tokens, provider payloads, or unnecessary buyer data.

Minimum event envelope:

```text
event_id
event_name + schema_version
occurred_at + received_at
tenant_id + store_id
actor_kind + actor_id (pseudonymous where possible)
session/request correlation id
source surface
entity type + non-sensitive entity id
plan/entitlement snapshot identifiers
small allowlisted properties
```

Initial event families:

- `acquisition.prospect_created`, `discovery_booked`, `implementation_paid`;
- `onboarding.data_received`, `import_started`, `import_completed`,
  `milestone_completed`, `activated`;
- `membership.invited`, `membership.activated`;
- `inventory.vehicle_created`, `inventory.import_completed`,
  `listing.published`, `listing.became_stale`;
- `integration.connection_succeeded`, `connection_failed`,
  `reconciliation_failed`;
- `lead.received`, `lead.assigned`, `lead.first_response`, `lead.won`,
  `lead.lost`;
- `reservation.completed`, `sale.closed`, `sale.reopened`;
- `document.bundle_completed`, `fiscal.issued`, `renave.reconciled`,
  `closing.exception_created`;
- `billing.checkout_started`, `subscription_activated`, `payment_overdue`,
  `entitlement_suspended`, `subscription_cancelled`;
- `support.case_created`, `support.case_resolved`.

Server-side domain outcomes are canonical. Browser events can explain navigation
and friction but must not claim that a business operation succeeded.

## Customer Health

Health is an intervention tool, not a vanity score. Keep the components visible
so a partner or customer-success owner knows what to do.

Starting weights:

| Component         | Weight | Examples                                                              |
| ----------------- | -----: | --------------------------------------------------------------------- |
| Value realization |    35% | Activated, controlled close, current owner metrics, action completion |
| Core adoption     |    25% | Weekly workflows, active roles, inventory/lead/sale coverage          |
| Reliability       |    15% | Provider failures, stale sync, error/support recurrence               |
| Commercial health |    15% | Paid state, contraction, low allowance, renewal risk                  |
| Relationship      |    10% | Open case, missed success review, explicit sentiment                  |

Health classifications trigger an owned queue:

- healthy: expansion or advocacy candidate;
- watch: one leading indicator deteriorated;
- at risk: activation missed, core loop absent, repeated provider failure, or
  payment/relationship issue;
- critical: store cannot perform a core workflow or has declared cancellation
  intent.

Never infer sentiment from private customer messages without an approved legal
and product policy.

## Pricing And Packaging Guardrails

- Price is owned by a versioned server-side catalog, never by signup code or
  client input.
- Existing contracts reference a price-book version; new onboarding cannot
  rewrite it.
- Entitlements are a projection of contract/subscription items plus explicit,
  audited exceptions with an expiry.
- Every trial has `starts_at`, `ends_at`, and an automatic state transition.
- Every paid provider cost has an allowance, pass-through, or explicit margin
  policy.
- Enforce user, store, stock, lookup, message, fiscal, integration, storage, and
  automation limits where sold.
- Paid implementation is separate from recurring software.
- Annual prepay is offered only with a defined discount and refund/cancellation
  policy.
- Agencies need a written wholesale/revenue-share/minimum-commitment model;
  “free agency account” is not a channel strategy.
- Never price a regulated partner service before confirming who contracts,
  bills, supports, and carries liability.

## Go-To-Market Model

Until retention is proven, prefer paid, founder-led implementation over an
unbounded free trial.

Sales motion:

1. Qualify ICP, current system, stock, team, locations, lead volume, close
   process, provider stack, and urgent business outcome.
2. Baseline stock age, response SLA, realized margin completeness, closing time,
   and support/compliance exceptions.
3. Sell migration plus a 30-day process implementation with named acceptance
   criteria.
4. Review outcomes and convert to the recurring contract.
5. Ask for a case, referral, or partner introduction only after evidence.

Channel hypotheses:

- regional FENAUTO associations;
- automotive accountants and fiscal advisors;
- despachantes and authorized RENAVE integrators;
- inspection and warranty networks;
- agencies already operating multiple retailer accounts;
- licensed finance/insurance partners.

Each channel must be measured by qualified pipeline, activation, retention,
support cost, revenue share, and concentration—not signup count.

## Partner Operating Cadence

The three partners need single ownership even when all can execute broadly.

Maintain three DRIs:

- customer and revenue truth;
- product, workflow, and data truth;
- reliability, security, providers, and delivery truth.

Weekly 60-minute operating review:

1. Scorecard exceptions, not slide updates.
2. Active/onboarding/at-risk/cancelled customer changes.
3. One customer recording or direct quote with context.
4. P0 reliability/regulatory/commercial blockers.
5. Roadmap WIP and stop decisions.
6. Cash, MRR movement, provider cost, and support hours.
7. Named actions, DRI, and due date.

Monthly:

- cohort retention and unit economics;
- roadmap score refresh;
- pricing and win/loss evidence;
- partner/channel concentration;
- one stop/kill decision;
- incident and restore/reconciliation learning.

## Customer Cohort Interview Record

For every active and inactive V1 customer, record:

- store archetype, stock, locations, roles, and vehicle type;
- acquisition source and salesperson/partner;
- signed price, discounts, modules, provider cost, and payment history;
- implementation start, data received, go-live, and first-value dates;
- workflows actually used in the final 30 active days;
- support cases and founder hours;
- measurable value and missing value;
- stated churn reason and the partners' evidence-backed root cause;
- whether the dealership closed, changed ownership, or left the ICP;
- competitor or substitute selected;
- avoidability and win-back condition.

Customer names and personal data stay in the authorized operational system,
not in this repository.

## Decision Rules

- Customer evidence beats founder enthusiasm.
- Retention work beats top-of-funnel spend until a cohort is healthy.
- Migration of proven value beats speculative breadth.
- A current statutory deadline beats visual polish.
- Deterministic automation with measurable ROI beats a general autonomous agent.
- A modular monolith with durable jobs beats premature microservices.
- A reversible pilot beats a platform-wide launch.
- A truthful unavailable state beats a synthetic demo success.
- Features without an owner, metric, price, and support model do not ship.
