import {
  BadgeCheck,
  CalendarClock,
  PackageCheck,
  WalletCards,
  Building2,
  History,
} from "lucide-react";
import type { BillingOverview, BillingStoreAllocation } from "./types";
import { BillingSummaryCard as SummaryCard } from "./BillingSummaryCard";
import { featureLabels, isEnabled, money, statusLabels } from "./billingFormat";
import { Badge } from "../../components/ui/badge";

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
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-accent-strong" />
          <div>
            <h3>Alocação por loja</h3>
            <p>Composição do plano e investimento mensal de cada operação.</p>
          </div>
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
            {allocations.length ? (
              allocations.map((allocation) => (
                <tr key={allocation.storeId}>
                  <td className="font-bold text-foreground">
                    {allocation.storeName}
                  </td>
                  <td>{allocation.planName ?? "Sem plano"}</td>
                  <td>
                    <Badge
                      variant={statusBadgeVariant(
                        allocation.subscriptionStatus,
                      )}
                    >
                      {subscriptionStatusLabel(allocation.subscriptionStatus)}
                    </Badge>
                  </td>
                  <td>{allocation.addonCount}</td>
                  <td className="font-black text-accent-strong">
                    {money(allocation.monthlyAmountCents)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted">
                  Nenhuma loja alocada individualmente neste contrato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function statusBadgeVariant(
  status: BillingStoreAllocation["subscriptionStatus"],
): "success" | "secondary" | "destructive" | "warning" | "default" {
  if (status === "active") return "success";
  if (status === "trialing") return "warning";
  if (status === "past_due") return "destructive";
  return "secondary";
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
        <div className="flex items-center gap-2">
          <History className="size-5 text-accent-strong" />
          <div>
            <h3>Histórico de recursos</h3>
            <p>Mudanças recentes feitas no faturamento e acessos.</p>
          </div>
        </div>
      </header>
      <div className="billing-event-list">
        {events.length ? (
          events.map((event) => (
            <article className="billing-event" key={event.id}>
              <div className="billing-event-header">
                <strong>{featureLabels[event.featureKey]}</strong>
                <span className="billing-event-date">
                  {formatDate(event.createdAt)}
                </span>
              </div>
              <div className="billing-event-transition">
                <Badge variant="outline">
                  {event.previousStatus
                    ? statusLabels[event.previousStatus]
                    : "Novo"}
                </Badge>
                <span className="text-muted text-xs">→</span>
                <Badge variant="default">
                  {statusLabels[event.nextStatus]}
                </Badge>
              </div>
              {event.reason || event.source ? (
                <p className="billing-event-reason">
                  {event.reason ?? event.source}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="billing-muted">
            Nenhuma alteração registrada até o momento.
          </p>
        )}
      </div>
    </section>
  );
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}
