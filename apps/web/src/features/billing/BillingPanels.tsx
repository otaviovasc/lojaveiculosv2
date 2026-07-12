import {
  BadgeCheck,
  Ban,
  Clock3,
  Coins,
  Settings2,
  Store,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import type {
  BillingChargePreview,
  BillingEntitlementMatrixRow,
  BillingEntitlementStatus,
  BillingOverview,
  BillingStoreAllocation,
  EntitlementKey,
} from "./types";
import { BillingFeatureDialog } from "./BillingFeatureDialog";
import { BillingSummaryCard as SummaryCard } from "./BillingSummaryCard";
import { featureLabels, isEnabled, money, statusLabels } from "./billingFormat";

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
        label="Custo mensal atual"
        value={money(overview.financialSummary.monthlyRecurringCents)}
      />
      <SummaryCard
        icon={<Coins aria-hidden="true" className="size-5" />}
        label="Pago no período"
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
        label="Recursos ativos"
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
          <h3>Alocação por loja</h3>
          <p>Plano, add-ons e custo mensal por loja.</p>
        </div>
      </header>
      <div
        aria-label="Tabela de alocação por loja"
        className="billing-table-wrap"
        tabIndex={0}
      >
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
  chargePreview,
  matrix,
  onReasonChange,
  onUpdate,
  reasons,
  savingFeatureKey,
}: {
  chargePreview?: BillingChargePreview;
  matrix: readonly BillingEntitlementMatrixRow[];
  onReasonChange: (featureKey: EntitlementKey, reason: string) => void;
  onUpdate: (
    featureKey: EntitlementKey,
    status: BillingEntitlementStatus,
  ) => Promise<void>;
  reasons: Record<string, string>;
  savingFeatureKey: EntitlementKey | null;
}) {
  const [selectedFeatureKey, setSelectedFeatureKey] =
    useState<EntitlementKey | null>(null);
  const selectedRow =
    matrix.find((row) => row.featureKey === selectedFeatureKey) ?? null;

  return (
    <section className="billing-panel">
      <header className="billing-panel-header">
        <div>
          <h3>Seus Recursos e Add-ons</h3>
          <p>Veja o que está ativo e gerencie cada recurso com contexto.</p>
        </div>
      </header>
      <div className="billing-feature-grid">
        {matrix.map((row) => (
          <article className="billing-feature-card" key={row.featureKey}>
            <div>
              <span className={featureStatusClass(row.status)}>
                {isEnabled(row.status) ? (
                  <BadgeCheck aria-hidden="true" className="size-4" />
                ) : (
                  <Ban aria-hidden="true" className="size-4" />
                )}
                {statusLabels[row.status]}
              </span>
              <h3>{featureLabels[row.featureKey]}</h3>
              <p>
                {row.includedInPlan ? "Incluído no plano" : "Add-on"} ·{" "}
                {row.limitValue === null
                  ? "sem limite"
                  : `limite ${row.limitValue}`}
              </p>
            </div>
            <button
              className="billing-feature-manage"
              onClick={() => setSelectedFeatureKey(row.featureKey)}
              type="button"
            >
              <Settings2 aria-hidden="true" className="size-4" />
              Gerenciar
            </button>
          </article>
        ))}
      </div>
      <BillingFeatureDialog
        isSaving={Boolean(
          selectedRow && savingFeatureKey === selectedRow.featureKey,
        )}
        priceLabel={
          selectedRow ? featurePriceLabel(selectedRow, chargePreview) : ""
        }
        reason={selectedRow ? (reasons[selectedRow.featureKey] ?? "") : ""}
        row={selectedRow}
        onClose={() => setSelectedFeatureKey(null)}
        onReasonChange={onReasonChange}
        onUpdate={onUpdate}
      />
    </section>
  );
}

function featureStatusClass(status: BillingEntitlementStatus) {
  return isEnabled(status)
    ? "billing-status-badge is-enabled"
    : "billing-status-badge is-disabled";
}

function featurePriceLabel(
  row: BillingEntitlementMatrixRow,
  chargePreview: BillingChargePreview | undefined,
) {
  if (row.includedInPlan) return "Incluído no plano atual";
  const label = featureLabels[row.featureKey].toLowerCase();
  const line = chargePreview?.lineItems.find((item) =>
    item.label.toLowerCase().includes(label),
  );
  return line
    ? `${money(line.unitAmountCents)}/mes`
    : "Add-on sem cobrança neste ciclo";
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
          <h3>Histórico de recursos</h3>
          <p>Mudanças recentes feitas no faturamento.</p>
        </div>
      </header>
      <div className="billing-event-list">
        {events.length ? (
          events.map((event) => (
            <article className="billing-event" key={event.id}>
              <strong>{featureLabels[event.featureKey]}</strong>
              <span>
                {event.previousStatus
                  ? statusLabels[event.previousStatus]
                  : "Novo"}{" "}
                {"->"} {statusLabels[event.nextStatus]}
              </span>
              <p>{event.reason ?? event.source}</p>
            </article>
          ))
        ) : (
          <p className="billing-muted">Nenhuma alteração registrada.</p>
        )}
      </div>
    </section>
  );
}
