import { CalendarDays, Clock } from "lucide-react";
import { FeatureStatCard } from "../../components/ui/FeatureCards";
import { commissionDueSummary } from "./financeCashFlowModel";
import { formatCurrency } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";

export function FinanceCommissionDueCards({
  entries,
}: {
  entries: readonly FinanceEntry[];
}) {
  const summary = commissionDueSummary(entries);

  return (
    <section
      aria-label="Comissões a pagar"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <FeatureStatCard
        hint={
          summary.weekTopSeller
            ? `Maior volume: ${summary.weekTopSeller}`
            : "Nenhuma comissão pendente no período"
        }
        icon={Clock}
        label="Comissões a pagar — esta semana"
        tone="warning"
        value={formatCurrency(summary.weekCents)}
      />
      <FeatureStatCard
        hint={
          summary.monthTopSeller
            ? `Maior volume: ${summary.monthTopSeller}`
            : "Nenhuma comissão pendente no período"
        }
        icon={CalendarDays}
        label="Comissões a pagar — este mês"
        tone="accent"
        value={formatCurrency(summary.monthCents)}
      />
    </section>
  );
}
