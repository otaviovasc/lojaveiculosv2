import {
  AlertTriangle,
  Banknote,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Sigma,
} from "lucide-react";
import { FeatureStatCard } from "../../components/ui/FeatureCards";
import type { CommissionSummary } from "./commissionWorkspaceModel";
import { formatCurrency } from "./financeBillsFormat";

export function CommissionSummaryCards({
  summary,
}: {
  summary: CommissionSummary;
}) {
  const items = [
    {
      hint: undefined,
      icon: Clock3,
      label: "A pagar",
      tone: "warning",
      value: formatCurrency(summary.pendingCents),
    },
    {
      hint: undefined,
      icon: CheckCircle2,
      label: "Pago",
      tone: "green",
      value: formatCurrency(summary.paidCents),
    },
    {
      hint: `${summary.count} lançamento${summary.count === 1 ? "" : "s"}`,
      icon: Sigma,
      label: "Total",
      tone: "accent",
      value: formatCurrency(summary.totalCents),
    },
    {
      hint: undefined,
      icon: BadgeDollarSign,
      label: "Vendas no período",
      tone: "violet",
      value: String(summary.salesCount),
    },
    {
      hint: undefined,
      icon: Banknote,
      label: "Valor vendido",
      tone: "blue",
      value: formatCurrency(summary.salesValueCents),
    },
    {
      hint:
        summary.reconciliationCount > 0
          ? "Requer conferência antes do fechamento"
          : "Período conciliado",
      icon: AlertTriangle,
      label: "Conciliação",
      tone: summary.reconciliationCount > 0 ? "warning" : "green",
      value: String(summary.reconciliationCount),
    },
  ] as const;

  return (
    <section className="commission-summary-cards grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map(({ hint, icon, label, tone, value }) => (
        <FeatureStatCard
          appearance="tinted"
          hint={hint}
          icon={icon}
          key={label}
          label={label}
          tone={tone}
          value={value}
        />
      ))}
    </section>
  );
}
