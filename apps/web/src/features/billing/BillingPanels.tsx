import {
  BadgeCheck,
  CalendarClock,
  PackageCheck,
  WalletCards,
} from "lucide-react";
import type { BillingOverview, BillingStoreAllocation } from "./types";
import { BillingSummaryCard as SummaryCard } from "./BillingSummaryCard";
import { featureLabels, isEnabled, money, statusLabels } from "./billingFormat";

export { BillingPlanComposition } from "./BillingPlanComposition";

export function BillingKpiGrid({ overview }: { overview: BillingOverview }) {
  const activePackages = overview.entitlementMatrix.filter(
    (row) => !row.includedInPlan && isEnabled(row.status),
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
        label="Investimento mensal"
        value={money(overview.financialSummary.monthlyRecurringCents)}
      />
      <SummaryCard
        icon={<PackageCheck aria-hidden="true" className="size-5" />}
        label="Pacotes adicionais"
        value={`${activePackages} ativo${activePackages === 1 ? "" : "s"}`}
      />
      <SummaryCard
        icon={<CalendarClock aria-hidden="true" className="size-5" />}
        label="Próxima renovação"
        value={periodEndLabel(overview.subscription?.currentPeriodEnd)}
      />
    </section>
  );
}

function periodEndLabel(value: string | null | undefined) {
  if (!value) return "A confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
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
          <p>Composição do plano e investimento mensal de cada operação.</p>
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
              <th>Pacotes</th>
              <th>Mensal</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.storeId}>
                <td>{allocation.storeName}</td>
                <td>{allocation.planName ?? "Sem plano"}</td>
                <td>
                  {subscriptionStatusLabel(allocation.subscriptionStatus)}
                </td>
                <td>{allocation.addonCount}</td>
                <td>{money(allocation.monthlyAmountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function subscriptionStatusLabel(
  status: BillingStoreAllocation["subscriptionStatus"],
) {
  const labels = {
    active: "Ativa",
    cancelled: "Encerrada",
    expired: "Expirada",
    past_due: "Pagamento pendente",
    trialing: "Em teste",
  } as const;
  return status ? labels[status] : "Sem assinatura";
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
