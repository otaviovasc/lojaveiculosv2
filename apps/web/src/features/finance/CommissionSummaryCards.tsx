import { CheckCircle2, Clock3, Sigma, Users } from "lucide-react";
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
      icon: Clock3,
      label: "A pagar",
      tone: "accent",
      value: formatCurrency(summary.pendingCents),
    },
    {
      icon: CheckCircle2,
      label: "Pago",
      tone: "green",
      value: formatCurrency(summary.paidCents),
    },
    {
      icon: Sigma,
      label: "Total",
      tone: "blue",
      value: formatCurrency(summary.totalCents),
    },
    {
      icon: Users,
      label: "Vendedores com pendencia",
      tone: "violet",
      value: String(summary.sellersWithPending),
    },
  ] as const;

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(({ icon, label, tone, value }) => (
        <FeatureStatCard
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
