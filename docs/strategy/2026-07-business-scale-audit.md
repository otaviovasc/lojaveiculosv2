# Business And Scale Audit — July 2026

Status: decision input for the three partners. This audit does not replace
customer interviews, legal advice, provider homologation, or production smoke
evidence.

## Executive Verdict

Loja Veículos has stronger evidence than a normal pre-seed SaaS: V1 reached more
than 20 paying or implemented customers and still has 10 active stores. V1 also
contains real Brazilian dealership workflow depth. The business is therefore
not searching for a problem.

The current constraint is turning that depth into a repeatable, retained,
measurable, and profitable delivery system.

The V2 roadmap is presently inverted. It has a very broad technical surface,
but the active V1 base still lacks a production migration factory, SaaS
activation telemetry, a trustworthy billing lifecycle, and a defensible
commercial wedge. This creates a risk of operating two large products while
remaining unable to explain churn or prove customer ROI.

The recommended opening position is:

> The margin and compliance operating system for professional independent
> used-vehicle retailers. Every vehicle has one real cost, one owner, one stage,
> one document trail, and one next action from acquisition to cash.

Do not lead with “all in one,” a website builder, generic CRM, or an AI operator.
Those categories are already crowded and cheap. Land with stock turn, realized
margin, controlled closing, and regulatory execution; expand into CRM,
automation, and partner commerce after the core data is trustworthy.

## Evidence Baseline And Limits

- User-provided commercial baseline: more than 20 clients over V1's lifetime,
  with 10 currently active.
- Ten active divided by more than 20 ever acquired means lifetime logo survival
  is at most roughly 50%. This is not a monthly churn rate or cohort retention
  calculation. Business closure, bad fit, involuntary churn, and product churn
  must be separated before drawing a causal conclusion.
- V1's strongest proven asset is the connected close-sale workflow, not its
  marketing site. One operation links the lead and sale, records payments and
  trade-in, updates stock, moves the lead to post-sale, and creates revenue,
  commissions, finance entries, and documents:
  `../lojaveiculos/src/app/api/[slug]/admin/sales/route.ts:299-448`,
  `510-738`, and `1030-1319`.
- V1 also encodes financing ranks, lien-dependent transfer rules,
  consignment, insurance, consortium, and commission behavior:
  `../lojaveiculos/src/lib/sale-auto-entries-config.ts:80-156`.
- V2's modular-monolith direction is sound. It does not need a microservice
  rewrite to reach 1,000 stores. Its scaling risks are commercial sequencing,
  data boundaries, background execution, and operational truth.

## Major Flaws

| Priority | Flaw                                                                        | Why it matters                                                                                                                                                                                  | Required response                                                                                                                                           |
| -------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | No customer-retention truth system                                          | The partners cannot connect usage, support effort, value delivery, expansion, or churn. More acquisition would pour customers into an unmeasured system.                                        | Interview the complete V1 cohort and instrument V2 acquisition, activation, adoption, health, expansion, and cancellation.                                  |
| P0       | Active-client migration is deferred                                         | The ten best design partners cannot become the first V2 cohort safely, and the partners must support V1 and V2 indefinitely.                                                                    | Freeze speculative breadth and migrate three representative stores with rerunnable importers, parity, acceptance, and rollback.                             |
| P0       | Generic positioning in a consolidated category                              | Stock, site, CRM, portal sync, finance, and NF-e are already sold cheaply by scaled incumbents whose owners control marketplace demand.                                                         | Own margin plus compliant process execution for a narrow ICP; measure outcomes rather than feature count.                                                   |
| P0       | Billing truth and entitlement enforcement leak revenue                      | Trial entitlements do not expire, limits are decorative, CRM is both included and charged as an add-on, and prices are hardcoded into onboarding.                                               | Version the price book, project access from paid contract state, reconcile expiry/dunning, enforce quotas, and capture churn reasons.                       |
| P0       | Immediate RENAVE and fiscal deadline is not represented in the roadmap      | A fake RENAVE success state and untyped fiscal metadata can create false confidence while 2026 rules are changing quickly.                                                                      | Integrate an authorized independent RENAVE provider, reconcile NF-e and stock state, and validate IBS/CBS provider fields before claims or launch.          |
| P0       | WhatsApp growth depends on a WhatsApp Web provider without an official path | Z-API states it uses a WhatsApp Web session. Campaigns lack a first-class opt-in/opt-out model. Disconnection or account restriction can break the main sales channel and create support load.  | Keep a provider-neutral port, add Meta Cloud API/BSP support, per-store consent and suppression, per-connection secrets, and a migration path.              |
| P0       | Sensitive credentials and documents are not production-safe                 | CRM instance tokens are stored in JSONB and private documents share a storage boundary with public media. A leak would be existential.                                                          | Encrypt or vault connection secrets and split public media from private, authorized document delivery.                                                      |
| P1       | Acquisition and onboarding are founder-dependent                            | V1 can lose prospects before persistence and then requires founder WhatsApp activation. V2 self-serve onboarding creates a store but does not install the process or import operating data.     | Persist every prospect before redirect, offer a real scheduler, charge for implementation, import data, train roles, and measure time-to-value.             |
| P1       | “Production-ready” describes code, not a customer outcome                   | Static compliance, unavailable providers, fake/local UI state, and missing migration can still receive ready-like labels. This produces internal priority errors and external expectation risk. | Maintain technical readiness separately from commercial readiness and require design-partner evidence, support ownership, billing, telemetry, and rollback. |
| P1       | Dealer ROI dashboard is not credible                                        | The dashboard has no real time window and gross margin is hardcoded to zero, while the business needs to prove stock turn and profit.                                                           | Make true landed cost, realized gross contribution, stock age, response SLA, conversion, and cash reconciliation canonical.                                 |
| P1       | Tenant and side-effect safety rely on application perfection                | Independent tenant/store foreign keys allow inconsistent scope; external effects and separate audit persistence are not atomically reconcilable.                                                | Add scoped database constraints/RLS where appropriate and durable command, effect, audit-outbox, idempotency, and reconciliation records.                   |
| P1       | Synchronous provider work and instance-local controls cap scale             | Marketplace jobs run inside HTTP, public lead rate limiting is process-local, and several CRM query paths are N+1 or offset-based.                                                              | Move provider effects to durable workers, distribute rate limits, batch queries, use cursors, and measure queue/provider health.                            |

## Repo Evidence Behind The P0 Findings

### SaaS telemetry is absent

The analytics domain reports a dealer's listings, leads, sales, and finance. It
does not model the SaaS relationship:
`apps/api/src/domains/analytics/ports/analyticsRepository.ts:19-45`.

There is no first-class schema for product usage, account health, onboarding
milestones, cancellation reasons, cohort retention, or expansion. Owner
onboarding collects store identity and redirects immediately:
`apps/web/src/features/account/OwnerOnboardingPage.tsx:30-40` and `64-91`.

Audit events must not be treated as a substitute. Audit is optimized for legal
and security evidence, has different minimization/retention rules, and its
retention is still undefined: `packages/audit-db/src/index.ts:7-11`.

### V1 migration is planned but not executable

The target schema contains migration-run and legacy-id bookkeeping:
`packages/db/src/schema/migration.ts:13-53`. The available core tooling is a dump
profiler rather than store/users/stock/leads/sales/finance importers. The
migration plan correctly requires deterministic maps, rehearsals, parity, wave
acceptance, and rollback, but the execution layer is missing.

The consequence is commercial, not merely technical: every month without a
pilot migration spends partner attention on two products and delays learning
from the ten retained stores.

### Billing state is internally contradictory

The commercial rules currently state a R$299 Growth plan plus a R$249.99 CRM
WhatsApp add-on: `docs/billing-business-rules.md:17-28`.

Onboarding, however:

- hardcodes and upserts the global Growth catalog price and features;
- includes `crm` in Growth;
- created a 30-day trial subscription instead of the current 14-day contract;
- inserts trial entitlements without `endsAt`.

Evidence:
`apps/api/src/infrastructure/db/identity/drizzleAccountProvisioningBilling.ts:14-30`,
`53-73`, and `150-173`; and
`apps/api/src/infrastructure/db/identity/drizzleAccountProvisioningWrites.ts:201-214`.

Authorization accepts any entitlement with status `active` or `trialing` and
does not check entitlement dates or subscription state:
`apps/api/src/infrastructure/db/identity/drizzleStoreAccessRepository.ts:116-130`.

Plan limits such as eight sellers, 300 vehicles, and 300 plate lookups are
catalog data but have no enforcement path in business services. That makes cost
and pricing limits descriptive rather than economic controls.

### RENAVE currently has a misleading surface

Before this audit, the inventory detail rendered a hardcoded RENAVE code and
“Entrada Concluída” using component-local state, despite having no provider
connection. The component was changed during this audit to an explicit
unavailable state that says no official operation occurred.

This is only a safety correction. It is not a RENAVE implementation.

CONTRAN Resolution 1.026, published on 30 June 2026:

- establishes RENAVE as the official electronic stock ledger;
- covers purchase, sale, dealer transfer, and consignment records;
- requires establishments and integrators to adapt within 90 days;
- requires stock movements and NF-e records to correspond;
- explicitly prohibits providers of dealer/store management software from
  acting as RENAVE integrators.

V2 must therefore contract and integrate an independent authorized integrator;
it must not attempt to become that integrator.

Primary source:
[CONTRAN Resolution 1.026/2026](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resoluo1026.pdf).

Separately, regular-regime electronic invoices must carry the new IBS/CBS fields
from 3 August 2026 or be rejected. The current fiscal contract accepts a generic
`metadata` object rather than typed, validated tax fields:
`apps/api/src/domains/fiscal/ports/fiscalRepository.ts:45-63` and
`apps/api/src/domains/fiscal/services/FiscalService/issueFiscalDocument.ts:12-40`.

Primary source:
[CGIBS August 2026 deadline](https://www.cgibs.gov.br/novo-marco-da-reforma-tributaria-inicia-em-03-de-agosto-com-preenchimento-obrigatorio-dos-campos-relativos-ao-ibs-e-a-cbs).

### COAF controls are an underused product wedge

COAF Resolution 25 applies to movable goods worth at least R$10,000, which
captures practically every dealer vehicle operation. It requires customer and
transaction records, five-year retention, cash-operation controls, and
suspicious-operation reporting.

V2's compliance runtime is currently a static score-zero snapshot with no
operational repository:
`apps/api/src/infrastructure/compliance/runtimeComplianceServices.ts:6-42`.

This should not be presented as compliance software yet. It can become a
valuable control-tower capability after legal review and real workflows.

Primary source:
[COAF Resolution 25](https://www.gov.br/coaf/pt-br/acesso-a-informacao/Institucional/a-atividade-de-supervisao/regulacao/supervisao/normas-1/resolucao-no-25-de-16-de-janeiro-de-2013-1).

### WhatsApp provider concentration is a business continuity risk

Z-API's own documentation says it operates through a WhatsApp Web session and
contrasts its fixed-price model with the official API. V2's provider type is
currently Z-API-only, and campaign code has no first-class customer consent or
suppression ledger. CRM connection tokens are written into
`credentials_ref.stored` and persisted as JSONB:

- `apps/api/src/domains/crm/ports/crmConnectionRepository.ts:1-3`;
- `apps/api/src/domains/crm/services/CrmWhatsapp/listWhatsappConnections.ts:209-233`;
- `apps/api/src/infrastructure/db/crm/drizzleCrmConnectionRepository.ts:39-68`.

Sources:
[Z-API documentation](https://developer.z-api.io/) and
[Meta's official WhatsApp Business Platform collection](https://www.postman.com/meta/whatsapp-business-platform/overview).

## Market And Competitive Reality

FENAUTO represents approximately 48,000 independent used-vehicle retailers
through 30 regional associations. Brazil recorded 18.51 million used-vehicle
transfers in 2025. These figures show a large, active market; they are not a
claim that all 48,000 stores form the serviceable SaaS market.

Sources:
[FENAUTO institutional](https://fenauto.org.br/institucional) and
[2025 used-vehicle record](https://www.fenauto.org.br/news/mercado-de-veiculos-usados-bate-recorde-historico-de-vendas).

The generic software category is already mature:

- RevendaMais claims more than 5,000 stores and publicly prices core management
  around the existing SMB budget range.
- AutoGestor publicly lists roughly R$299–599 monthly stock-tier plans.
- Gestor Revenda claims more than 500 active stores and advertises full
  onboarding in 24 hours.
- Webmotors acquired RevendaMais in 2025, joining marketplace demand,
  Santander adjacency, and dealer-management software.

Sources:
[RevendaMais pricing](https://revendamais.com.br/planos/),
[AutoGestor pricing](https://www.autogestor.net/planos-e-precos/),
[Gestor Revenda](https://www.gestorrevenda.com.br/), and
[Webmotors institutional](https://www.webmotors.com.br/solutions/quemsomos/?lkid=1542).

Therefore, “stock + site + CRM + finance + portal sync” is table stakes, not a
moat. Marketplace owners can bundle those capabilities and monetize elsewhere.
Loja Veículos must own a process outcome and remain channel-neutral.

## Recommended ICP

Start with one falsifiable segment:

- independent used-vehicle retailers;
- roughly 15–80 active vehicles;
- one to three locations;
- roughly three to 15 operational users;
- enough preparation, lead, and closing volume that leakage costs more than
  R$1,000 per month;
- an owner or operating manager willing to adopt a standard process.

Initially avoid:

- very small owner-only lots, where support load and price sensitivity dominate;
- franchised dealer groups with incumbent DMS/OEM procurement complexity;
- motorcycles, heavy vehicles, rental/fleet disposal, and consignment-only
  operations in one undifferentiated workflow;
- custom development sold as product roadmap.

The ICP remains a hypothesis until the retained and churned V1 cohorts are
segmented. If the active ten cluster elsewhere, the evidence wins.

## Product Wedge

The core promise is a controlled acquisition-to-cash loop:

1. Evaluate and acquire with expected margin and risk.
2. Prepare with work orders, approvals, real cost, and SLA.
3. Publish once and reconcile channels.
4. Capture, assign, and respond to leads within a measured SLA.
5. Reserve or sell with approval, payment, commission, and document rules.
6. Reconcile NF-e, IBS/CBS, RENAVE, signature, and delivery state.
7. Manage warranty and post-sale exceptions.
8. Give the owner a daily next-action list and a weekly profit/process report.

This matches V1's strongest behavior while giving V2 a clearer commercial
reason to exist.

## Monetization Hypothesis

Exact prices require willingness-to-pay interviews and new-sale tests. Do not
reprice retained customers blindly.

A testable structure is:

| Offer               | Hypothesis                                    | Purpose                                                                                            |
| ------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Paid implementation | R$2,000–5,000 per store                       | Funds migration, process mapping, provider setup, training, and go-live acceptance.                |
| Core                | Around R$899/store/month                      | One location, core acquisition-to-cash workflow, controlled inventory/user allowance.              |
| Scale               | Around R$1,490/store/month                    | Higher volume, advanced controls, benchmarks, automation allowance, and priority support.          |
| Group               | From roughly R$3,500/month                    | Multi-store control plane, central governance, API, rollout, and support agreement.                |
| Provider usage      | Transparent pass-through or metered allowance | RENAVE integrator, official WhatsApp, fiscal documents, vehicle history, and other variable costs. |

Current seed economics illustrate the problem. At R$299 base plus a R$249.99
CRM add-on, ten fully loaded stores would represent at most R$5,489.90 MRR
before taxes, infrastructure, provider cost, support, and partner compensation.
At 1,000 fully loaded stores the same price is about R$549,000 MRR. The ambition
therefore needs both higher demonstrated value and expansion/partner revenue.

Simple scale scenarios at R$1,000 blended monthly revenue:

| Active stores |         MRR |           ARR |
| ------------: | ----------: | ------------: |
|           100 |   R$100,000 | R$1.2 million |
|           500 |   R$500,000 |   R$6 million |
|         1,000 | R$1 million |  R$12 million |

Later revenue can come from licensed partners in financing, floorplan,
inspection, warranty, insurance, and documentation. V2 should route and record
these services; it must not hold customer money, represent itself as a lender,
or create regulated exposure without a separately approved plan.

## 90-Day Recovery And Leverage Plan

### Days 0–14: establish truth and stop leakage

1. Interview every active and inactive V1 customer with one scorecard.
2. Reconstruct MRR by contract, gross margin after provider cost, support hours,
   acquisition source, activation time, and cancellation cause.
3. Choose three migration pilots: smallest representative store, multi-user
   store, and one agency/multi-store case if it exists.
4. Stop presenting fake RENAVE/compliance success and stop unverified public
   performance claims.
5. Resolve the billing contract: price-book version, CRM packaging, trial
   expiry, entitlement projection, dunning, and cancellation reason.
6. Start authorized RENAVE-integrator and SPEDY fiscal contract validation
   immediately due to the 2026 deadlines.
7. Assign one partner as DRI for customer/revenue, one for product/data, and one
   for reliability/integrations. The exact titles matter less than single
   ownership.

### Days 15–45: build the migration and activation factory

1. Build rerunnable importers for store/users, inventory, leads, sales,
   documents, finance, and billing in that order.
2. Produce machine-readable parity plus a customer acceptance report.
3. Add the product-event ledger and internal store-health view described in
   `product-operating-model.md`.
4. Deliver concierge onboarding with a paid implementation statement of work.
5. Make the first-value path visible: import stock, publish inventory, connect a
   lead channel, invite the operating team, handle one real lead.
6. Split private documents from public media and move CRM secrets behind an
   encrypted credential boundary.
7. Move long provider work behind durable command/outbox/worker execution.

### Days 46–90: prove retained value and a repeatable sale

1. Migrate and accept the three pilot stores, with V1 rollback available.
2. Measure time-to-value, weekly core-loop adoption, stock freshness, lead
   response, close completion, support minutes, and defects.
3. Ship one owner-facing outcome report and one deterministic daily action
   queue. Do not start with autonomous browser control.
4. Sell the paid implementation and new packaging to five new qualified
   prospects or churned-customer win-back candidates.
5. Publish only verified case evidence, with explicit baseline and time window.
6. Decide whether to expand only after the pilot gates below pass.

## Scale Gates

### Gate to 30 stores

- Three V1 stores migrated without manual production SQL.
- Median time to first value no more than seven days after data receipt.
- At least 80% of new stores reach the activation definition.
- Trial/contract expiry and entitlements reconcile automatically.
- Private storage, CRM secrets, production migrations, backups, and readiness
  are production-safe.
- Every cancellation has a primary and secondary reason.

### Gate to 100 stores

- Three-month logo retention and gross revenue retention are visible by cohort.
- Provider effects run on durable workers with idempotency, retry, DLQ, and
  reconciliation.
- Tenant scope is enforced at database boundaries for high-risk tables.
- Customer health drives a weekly success queue.
- Pricing covers provider and measured support cost with a target contribution
  margin.
- At least one repeatable partner or outbound channel supplies qualified
  opportunities.

### Gate to 1,000 stores

- Net revenue retention is measured and the expansion motion is repeatable.
- Usage rating, quotas, and per-store/provider cost attribution are enforced.
- High-volume messages/events have evidence-based partition and retention.
- Query SLOs, queue lag, provider health, restore drills, RPO/RTO, and on-call
  ownership are operational.
- Worker pools scale independently; the modular monolith remains unless real
  load or team boundaries justify extraction.
- Partner revenue is diversified; no single marketplace, WhatsApp provider,
  fiscal provider, or RENAVE integrator can silently stop the business.

## What To Stop For Now

- Net-new placeholder modules.
- Generic computer-use automation before deterministic recommendations produce
  measured value.
- Marketing the product as an undifferentiated “complete platform.”
- Free custom work without an explicit contract and product-learning thesis.
- Counting screens, routes, adapters, or tests as customer progress.
- Treating audit logs as product analytics.
- Treating provider configuration as commercial readiness.
- Building microservices to solve prioritization or workflow problems.

## High-Leverage Later Bets

After hundreds of permissioned, clean outcomes—not after ten stores—the data
moat can combine per-vehicle acquisition price, preparation cost/delay, carrying
time, lead response, sale price, realized contribution, finance outcome,
warranty cost, and compliance exceptions.

That enables:

- explainable acquisition and repricing recommendations;
- aged-stock action plans;
- missed-lead and follow-up coaching;
- partner-ready financing/floorplan risk signals;
- regional/store-maturity benchmarks;
- warranty-risk prevention;
- dealer process certification;
- a white-label operating layer for associations, agencies, and regulated
  partners.

Marketplaces know demand and listing behavior. Banks know credit. Loja Veículos
can own the longitudinal truth of what the dealer earned, how long it took, and
which process caused the leakage. That is the defensible asset.

## Open Evidence Required From The Partners

The following inputs can materially change the recommendation:

- customer-by-customer churn reasons and whether the store itself survived;
- actual MRR, discounts, taxes, Z-API/provider cost, and support time;
- active-store distribution by stock size, users, locations, and vehicle type;
- most-used V1 workflows and last-30-day usage;
- acquisition source for every customer;
- willingness to pay for implementation, compliance, and margin control;
- exact partner strengths, time allocation, and desired ownership areas.

Until these exist, all exact ICP boundaries and price points are hypotheses,
while the migration, telemetry, billing, security, and regulatory gaps are
observed facts.
