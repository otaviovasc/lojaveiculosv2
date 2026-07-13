import {
  BadgeCheck,
  CircleAlert,
  CreditCard,
  Info,
  MoveHorizontal,
  Store,
  WalletCards,
  Wrench,
} from "lucide-react";
import {
  BillingCheckoutPanel,
  type BillingCheckoutState,
} from "../../billing/BillingCheckoutPanel";
import { BillingAllocationTable } from "../../billing/BillingPanels";
import { BillingSummaryCard } from "../../billing/BillingSummaryCard";
import { money } from "../../billing/billingFormat";
import type {
  BillingOverview,
  BillingProviderStatus,
  CreateBillingCheckoutInput,
} from "../../billing/types";
import type { AgencyTenantOverview } from "../apiClient";
import {
  createAgencyBillingCanonicalState,
  type AgencyBillingCanonicalState,
} from "./AgencyBillingPage.model";

export function AgencyBillingSummarySections({
  checkoutState,
  onCheckout,
  overview,
  panelOverview,
  providerStatus,
}: {
  checkoutState: BillingCheckoutState;
  onCheckout: (input: CreateBillingCheckoutInput) => Promise<unknown>;
  overview: AgencyTenantOverview;
  panelOverview: BillingOverview;
  providerStatus: BillingProviderStatus | null;
}) {
  return (
    <>
      <AgencyBillingStatusSummary
        checkoutState={checkoutState}
        overview={overview}
        panelOverview={panelOverview}
        providerStatus={providerStatus}
        onCheckout={onCheckout}
      />
      <AgencyBillingAllocation overview={overview} />
    </>
  );
}

export function AgencyBillingStatusSummary({
  checkoutState,
  onCheckout,
  overview,
  panelOverview,
  providerStatus,
}: Parameters<typeof AgencyBillingSummarySections>[0]) {
  const canonicalState = createAgencyBillingCanonicalState(
    panelOverview,
    providerStatus,
  );
  return (
    <>
      <AgencyBillingStatePanel state={canonicalState} />
      {canonicalState.canCheckout ? (
        <BillingCheckoutPanel
          checkoutState={checkoutState}
          overview={panelOverview}
          providerStatus={providerStatus}
          onCheckout={onCheckout}
        />
      ) : null}
      <AgencyBillingKpis
        overview={overview}
        panelOverview={panelOverview}
        state={canonicalState}
      />
    </>
  );
}

export function AgencyBillingAllocation({
  overview,
}: {
  overview: AgencyTenantOverview;
}) {
  return (
    <div className="agency-billing-allocation">
      <p className="agency-billing-table-hint" id="agency-allocation-hint">
        <MoveHorizontal aria-hidden="true" />
        Deslize para conferir todas as colunas da alocação.
      </p>
      <div aria-describedby="agency-allocation-hint">
        <BillingAllocationTable allocations={overview.allocations} />
      </div>
    </div>
  );
}

function AgencyBillingStatePanel({
  state,
}: {
  state: AgencyBillingCanonicalState;
}) {
  const Icon = stateIcon(state.tone);
  return (
    <section
      aria-labelledby="agency-billing-state-title"
      className={`agency-billing-state agency-billing-state--${state.tone}`}
    >
      <span className="agency-billing-state__icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="agency-billing-state__content">
        <span className="agency-billing-state__label">{state.label}</span>
        <h2 id="agency-billing-state-title">{state.title}</h2>
        <p>{state.description}</p>
        {state.integrationRequirements.length > 0 ? (
          <div className="agency-billing-requirements">
            <strong>Integração requer atenção</strong>
            <ul>
              {state.integrationRequirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AgencyBillingKpis({
  overview,
  panelOverview,
  state,
}: {
  overview: AgencyTenantOverview;
  panelOverview: BillingOverview;
  state: AgencyBillingCanonicalState;
}) {
  return (
    <section aria-label="Resumo da cobrança" className="agency-billing-kpis">
      <BillingSummaryCard
        icon={<BadgeCheck aria-hidden="true" className="size-5" />}
        label="Situação"
        value={state.metricLabel}
      />
      <BillingSummaryCard
        icon={<WalletCards aria-hidden="true" className="size-5" />}
        label="Total mensal"
        value={money(panelOverview.chargePreview.totalCents)}
      />
      <BillingSummaryCard
        icon={<Store aria-hidden="true" className="size-5" />}
        label="Lojas alocadas"
        value={`${overview.allocations.length}`}
      />
      <BillingSummaryCard
        icon={<CircleAlert aria-hidden="true" className="size-5" />}
        label="Faturas em atraso"
        value={`${panelOverview.financialSummary.overdueInvoiceCount}`}
      />
    </section>
  );
}

function stateIcon(tone: AgencyBillingCanonicalState["tone"]) {
  if (tone === "success") return BadgeCheck;
  if (tone === "danger") return CircleAlert;
  if (tone === "warning") return Wrench;
  return Info;
}
