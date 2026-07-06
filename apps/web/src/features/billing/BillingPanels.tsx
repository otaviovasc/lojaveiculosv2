import {
  BadgeCheck,
  Ban,
  Clock3,
  Coins,
  Store,
  WalletCards,
} from "lucide-react";
import type {
  BillingEntitlementMatrixRow,
  BillingEntitlementStatus,
  BillingOverview,
  BillingStoreAllocation,
  EntitlementKey,
} from "./types";
import { BillingSummaryCard as SummaryCard } from "./BillingSummaryCard";
import { featureLabels, isEnabled, money } from "./billingFormat";

export function BillingKpiGrid({ overview }: { overview: BillingOverview }) {
  const activeFeatures = overview.entitlementMatrix.filter((row) =>
    isEnabled(row.status),
  ).length;

  return (
    <section className="billing-summary-grid">
      <SummaryCard
        icon={<BadgeCheck aria-hidden="true" className="size-5" />}
        label="Plano atual"
        value={overview.subscription?.plan?.name ?? "Sem plano"}
      />
      <SummaryCard
        icon={<WalletCards aria-hidden="true" className="size-5" />}
        label="MRR alocado"
        value={money(overview.financialSummary.monthlyRecurringCents)}
      />
      <SummaryCard
        icon={<Coins aria-hidden="true" className="size-5" />}
        label="Pago no periodo"
        value={money(overview.financialSummary.paidThisPeriodCents)}
      />
      <SummaryCard
        icon={<Clock3 aria-hidden="true" className="size-5" />}
        label="Faturas abertas"
        value={`${overview.financialSummary.openInvoiceCount}`}
      />
      <SummaryCard
        icon={<Ban aria-hidden="true" className="size-5" />}
        label="Atrasadas"
        value={`${overview.financialSummary.overdueInvoiceCount}`}
      />
      <SummaryCard
        icon={<Store aria-hidden="true" className="size-5" />}
        label="Features ativas"
        value={`${activeFeatures}/${overview.entitlementMatrix.length}`}
      />
    </section>
  );
}

export function BillingAllocationTable({
  allocations,
}: {
  allocations: readonly BillingStoreAllocation[];
}) {
  return (
    <section className="billing-panel">
      <header className="billing-panel-header">
        <div>
          <h3>Alocacao por loja</h3>
          <p>Plano, add-ons e custo mensal por loja.</p>
        </div>
      </header>
      <div className="billing-table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              <th>Loja</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Add-ons</th>
              <th>Features</th>
              <th>Mensal</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.storeId}>
                <td>{allocation.storeName}</td>
                <td>{allocation.planName ?? "Sem plano"}</td>
                <td>{allocation.subscriptionStatus ?? "sem assinatura"}</td>
                <td>{allocation.addonCount}</td>
                <td>{allocation.activeEntitlementCount}</td>
                <td>{money(allocation.monthlyAmountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BillingEntitlementMatrix({
  matrix,
  onReasonChange,
  onUpdate,
  reasons,
  savingFeatureKey,
}: {
  matrix: readonly BillingEntitlementMatrixRow[];
  onReasonChange: (featureKey: EntitlementKey, reason: string) => void;
  onUpdate: (
    featureKey: EntitlementKey,
    status: BillingEntitlementStatus,
  ) => Promise<void>;
  reasons: Record<string, string>;
  savingFeatureKey: EntitlementKey | null;
}) {
  return (
    <section className="billing-panel">
      <header className="billing-panel-header">
        <div>
          <h3>Matriz de entitlements</h3>
          <p>Billing libera a feature; permissoes definem quem opera.</p>
        </div>
      </header>
      <div className="billing-entitlement-list">
        {matrix.map((row) => (
          <article className="billing-entitlement" key={row.featureKey}>
            <div>
              <span
                className={isEnabled(row.status) ? "is-enabled" : "is-disabled"}
              >
                {isEnabled(row.status) ? (
                  <BadgeCheck aria-hidden="true" className="size-4" />
                ) : (
                  <Ban aria-hidden="true" className="size-4" />
                )}
                {row.status}
              </span>
              <h3>{featureLabels[row.featureKey]}</h3>
              <p>
                {row.includedInPlan ? "Incluido no plano" : "Add-on"} ·{" "}
                {row.limitValue === null
                  ? "sem limite"
                  : `limite ${row.limitValue}`}
              </p>
            </div>
            <div className="billing-update-box">
              <input
                aria-label={`Motivo para ${featureLabels[row.featureKey]}`}
                onChange={(event) =>
                  onReasonChange(row.featureKey, event.target.value)
                }
                placeholder="Motivo da alteracao"
                value={reasons[row.featureKey] ?? ""}
              />
              <div className="billing-actions">
                <button
                  disabled={
                    savingFeatureKey === row.featureKey ||
                    row.status === "active"
                  }
                  onClick={() => void onUpdate(row.featureKey, "active")}
                  type="button"
                >
                  Ativar
                </button>
                <button
                  disabled={
                    savingFeatureKey === row.featureKey ||
                    row.status === "suspended"
                  }
                  onClick={() => void onUpdate(row.featureKey, "suspended")}
                  type="button"
                >
                  Suspender
                </button>
                <button
                  disabled={
                    savingFeatureKey === row.featureKey ||
                    row.status === "inactive"
                  }
                  onClick={() => void onUpdate(row.featureKey, "inactive")}
                  type="button"
                >
                  Inativar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BillingEventList({
  events,
}: {
  events: BillingOverview["entitlementEvents"];
}) {
  return (
    <section className="billing-panel">
      <header className="billing-panel-header">
        <div>
          <h3>Historico de entitlements</h3>
          <p>Mudancas recentes feitas pelo console de billing.</p>
        </div>
      </header>
      <div className="billing-event-list">
        {events.length ? (
          events.map((event) => (
            <article className="billing-event" key={event.id}>
              <strong>{featureLabels[event.featureKey]}</strong>
              <span>
                {event.previousStatus ?? "novo"} {"->"} {event.nextStatus}
              </span>
              <p>{event.reason ?? event.source}</p>
            </article>
          ))
        ) : (
          <p className="billing-muted">Nenhuma alteracao registrada.</p>
        )}
      </div>
    </section>
  );
}
