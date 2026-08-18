import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Flame,
  Sigma,
} from "lucide-react";
import { FeatureStatCard } from "../../components/ui/FeatureCards";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
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

  const stats = [
    {
      hint: `${entries.length} lançamentos`,
      icon: Sigma,
      label: "Total de Gastos",
      tone: "accent" as const,
      value: formatCurrency(local.totalCents),
    },
    {
      hint: undefined,
      icon: CheckCircle2,
      label: "Pago / Liquidado",
      tone: "green" as const,
      value: formatCurrency(local.paidCents),
    },
    {
      hint: undefined,
      icon: Clock3,
      label: "A Pagar (Pendente)",
      tone: "warning" as const,
      value: formatCurrency(local.pendingCents),
    },
    {
      hint: local.overdueCents > 0 ? "Atenção necessária" : "Em dia",
      icon: AlertTriangle,
      label: "Vencido / Em Atraso",
      tone: local.overdueCents > 0 ? ("danger" as const) : ("neutral" as const),
      value: formatCurrency(local.overdueCents),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      {/* 4 KPI Cards in a modern 2x2 grid */}
      <section className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <FeatureStatCard
            appearance="tinted"
            hint={stat.hint}
            icon={stat.icon}
            key={stat.label}
            label={stat.label}
            tone={stat.tone}
            value={stat.value}
          />
        ))}
      </section>

      {/* Upcoming dues panel */}
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent-strong uppercase tracking-wider">
              <Calendar aria-hidden="true" className="size-3.5" />
              <span>Cronograma</span>
            </div>
            <h3 className="text-sm md:text-base font-extrabold text-text mt-0.5">
              Próximos Vencimentos
            </h3>
          </div>
          <FeatureActionButton label="Ver todos" onClick={onViewAll} />
        </div>

        <div className="mt-3 flex-1 space-y-2">
          {upcoming.length ? (
            upcoming.slice(0, 3).map((entry) => (
              <div
                className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-app-elevated/70 p-3 hover:border-line-strong transition-colors"
                key={entry.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate text-xs font-bold text-text">
                    {entry.name}
                  </strong>
                  <span className="text-xs font-medium text-muted flex items-center gap-1 mt-0.5">
                    <Clock3 aria-hidden="true" className="size-3 text-muted" />
                    Vence em {formatDate(entry.dueAt)}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-danger tabular-nums">
                  {formatCurrency(entry.amountCents)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted">
              <CheckCircle2
                aria-hidden="true"
                className="size-6 text-success/60 mb-1"
              />
              <p className="text-xs font-bold">
                Nenhum vencimento pendente para o filtro atual.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
