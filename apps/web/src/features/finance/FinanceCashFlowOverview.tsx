import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDollarSign,
  Landmark,
} from "lucide-react";
import { FeatureStatCard } from "../../components/ui/FeatureCards";
import { summarizeCashFlow } from "./financeCashFlowModel";
import { formatCurrency } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";

export function FinanceCashFlowOverview({
  entries,
  onShowOverdue,
  onShowPending,
}: {
  entries: readonly FinanceEntry[];
  onShowOverdue: () => void;
  onShowPending: () => void;
}) {
  const summary = summarizeCashFlow(entries);
  const plannedBalanceTone =
    summary.plannedBalanceCents >= 0 ? "neutral" : "danger";
  const realizedBalanceTone =
    summary.realizedBalanceCents >= 0 ? "neutral" : "danger";

  return (
    <section
      aria-labelledby="finance-cash-flow-summary-title"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <h2 className="sr-only" id="finance-cash-flow-summary-title">
        Fluxo de caixa
      </h2>
      <FeatureStatCard
        className="finance-cash-flow-card"
        hint={`Recebido ${formatCurrency(summary.paidRevenueCents)}`}
        icon={ArrowUpCircle}
        label="Entradas"
        value={formatCurrency(summary.revenueCents)}
      />
      <FeatureStatCard
        className="finance-cash-flow-card"
        hint={`Pago ${formatCurrency(summary.paidOutflowCents)}`}
        icon={ArrowDownCircle}
        label="Saídas"
        value={formatCurrency(summary.outflowCents)}
      />
      <FeatureStatCard
        ariaLabel="Mostrar lançamentos em aberto"
        className="finance-cash-flow-card"
        hint={`Em aberto ${formatCurrency(summary.pendingCents)}`}
        icon={Landmark}
        label="Saldo planejado"
        onClick={onShowPending}
        tone={plannedBalanceTone}
        value={formatCurrency(summary.plannedBalanceCents)}
      />
      <FeatureStatCard
        ariaLabel="Mostrar lançamentos vencidos"
        className="finance-cash-flow-card"
        hint={`Vencido ${formatCurrency(summary.overdueCents)}`}
        icon={CircleDollarSign}
        label="Saldo real"
        onClick={onShowOverdue}
        tone={realizedBalanceTone}
        value={formatCurrency(summary.realizedBalanceCents)}
      />
    </section>
  );
}
