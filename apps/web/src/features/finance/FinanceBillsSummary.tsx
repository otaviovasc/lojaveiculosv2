import { AlertTriangle, CheckCircle2, Clock3, Sigma } from "lucide-react";
import type { FinanceEntry } from "./types";
import { summarizeEntries, upcomingEntries } from "./financeBillsModel";
import { formatCurrency, formatDate } from "./financeBillsFormat";

export function FinanceBillsSummary({
  entries,
  onViewAll,
}: {
  entries: FinanceEntry[];
  onViewAll: () => void;
}) {
  const local = summarizeEntries(entries);
  const upcoming = upcomingEntries(entries);
  const items = [
    {
      icon: Sigma,
      label: "Gastos",
      value: local.totalCents,
    },
    { icon: CheckCircle2, label: "Pago", value: local.paidCents },
    { icon: Clock3, label: "Pendente", value: local.pendingCents },
    { icon: AlertTriangle, label: "Vencido", value: local.overdueCents },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {items.map(({ icon: Icon, label, value }) => (
            <article
              className="rounded-lg border border-line bg-app p-3"
              key={label}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-muted">
                  {label}
                </span>
                <Icon
                  aria-hidden="true"
                  className="size-4 text-accent-strong"
                />
              </div>
              <strong className="mt-2 block text-xl font-black text-app-text">
                {formatCurrency(value)}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-app-text">
              Próximos vencimentos
            </h3>
            <p className="text-xs font-bold text-muted">
              Contas pendentes ordenadas por data.
            </p>
          </div>
          <button
            className="rounded-lg border border-line bg-app px-3 py-2 text-xs font-black text-app-text"
            onClick={onViewAll}
            type="button"
          >
            Ver tabela
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {upcoming.length ? (
            upcoming.map((entry) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app p-3"
                key={entry.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-black text-app-text">
                    {entry.name}
                  </strong>
                  <span className="text-xs font-bold text-muted">
                    {formatDate(entry.dueAt)}
                  </span>
                </div>
                <span className="text-sm font-black text-danger">
                  {formatCurrency(entry.amountCents)}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted">
              Nenhum vencimento pendente no filtro atual.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
