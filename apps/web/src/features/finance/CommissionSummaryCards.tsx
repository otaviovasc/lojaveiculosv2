import { CheckCircle2, Clock3, Sigma, Users } from "lucide-react";
import type { CommissionSummary } from "./commissionWorkspaceModel";
import { formatCurrency } from "./financeBillsFormat";

export function CommissionSummaryCards({
  summary,
}: {
  summary: CommissionSummary;
}) {
  const items = [
    { icon: Clock3, label: "A pagar", value: formatCurrency(summary.pendingCents) },
    { icon: CheckCircle2, label: "Pago", value: formatCurrency(summary.paidCents) },
    { icon: Sigma, label: "Total", value: formatCurrency(summary.totalCents) },
    {
      icon: Users,
      label: "Vendedores com pendencia",
      value: String(summary.sellersWithPending),
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(({ icon: Icon, label, value }) => (
        <article
          className="rounded-lg border border-line bg-panel p-4 shadow-[var(--shadow-panel)]"
          key={label}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-muted">
              {label}
            </span>
            <Icon aria-hidden="true" className="size-4 text-accent-strong" />
          </div>
          <strong className="mt-2 block text-xl font-black text-app-text">
            {value}
          </strong>
        </article>
      ))}
    </section>
  );
}
