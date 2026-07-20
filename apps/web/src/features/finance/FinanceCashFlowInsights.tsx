import { ChartNoAxesColumn, Link2, Repeat2 } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import {
  categoryBreakdown,
  sourceBreakdown,
  sourceLabel,
} from "./financeCashFlowModel";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import type {
  CommissionRule,
  FinanceEntry,
  FinanceRecurringEntry,
} from "./types";

const MAX_CATEGORY_ROWS = 5;

export function FinanceCashFlowInsights({
  commissionRules,
  entries,
  recurringEntries,
}: {
  commissionRules: readonly CommissionRule[];
  entries: readonly FinanceEntry[];
  recurringEntries: readonly FinanceRecurringEntry[];
}) {
  const categories = categoryBreakdown(entries, "outflow").slice(
    0,
    MAX_CATEGORY_ROWS,
  );
  const maxCategoryCents = categories[0]?.amountCents ?? 0;
  const sources = sourceBreakdown(entries);
  const pendingCommissions = entries.filter(
    (entry) => entry.type === "commission" && entry.status === "pending",
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.78fr] xl:items-stretch w-full h-full">
      <FeatureSection
        description="Maiores centros de custo considerando gastos e comissões."
        icon={<ChartNoAxesColumn className="size-5" />}
        title="Análise de gastos"
      >
        <div className="mt-3 grid gap-3">
          {categories.length ? (
            categories.map((item) => (
              <div className="finance-insight-bar-row" key={item.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-xs font-black text-app-text">
                    {item.label}
                  </span>
                  <strong className="shrink-0 text-xs font-black text-app-text tabular-nums">
                    {formatCurrency(item.amountCents)}
                  </strong>
                </div>
                <div
                  aria-hidden="true"
                  className="finance-insight-bar"
                  role="presentation"
                >
                  <span
                    className="finance-insight-bar__fill"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round(
                          (item.amountCents / Math.max(1, maxCategoryCents)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted">
              Nenhuma saída encontrada nos filtros atuais.
            </p>
          )}
        </div>
      </FeatureSection>

      <div className="grid gap-4 h-full xl:grid-rows-2">
        <FeatureSection
          description="Separação por origem operacional."
          icon={<Link2 className="size-5" />}
          title="Origem"
        >
          <div className="mt-3">
            {sources.length ? (
              <div className="grid grid-cols-2 gap-3 finance-origins-grid">
                {sources.map((source) => (
                  <div
                    className="rounded-lg border border-line bg-surface-subtle p-3 flex flex-col gap-1 finance-origin-stat-block"
                    key={source.source}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-muted finance-origin-stat-label">
                      {sourceLabel(source.source)}
                    </span>
                    <strong className="text-sm font-black text-app-text tabular-nums finance-origin-stat-amount">
                      {formatCurrency(source.amountCents)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted">
                Sem origem para exibir.
              </p>
            )}
          </div>
        </FeatureSection>

        <FeatureSection
          description="Regras e cobranças recorrentes ativas no financeiro."
          icon={<Repeat2 className="size-5" />}
          title="Recorrências e comissões"
        >
          <div className="mt-3 grid gap-3">
            <div className="rounded-lg border border-line bg-surface-subtle p-3 flex items-center justify-between gap-3 finance-recurrent-commissions-block">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Comissões a pagar
              </span>
              <strong className="text-sm font-black text-app-text tabular-nums">
                {formatCurrency(sumEntries(pendingCommissions))}
              </strong>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
              <FeatureStatusBadge
                size="dense"
                tone={commissionRules.length ? "success" : "neutral"}
              >
                {commissionRules.length
                  ? `${commissionRules.length} regra(s) de comissão`
                  : "Sem regras de comissão"}
              </FeatureStatusBadge>
              <span className="text-xs font-bold text-muted">
                {recurringEntries.length
                  ? `Próxima recorrência ${nextRecurringLabel(recurringEntries)}`
                  : "Sem recorrências"}
              </span>
            </div>
          </div>
        </FeatureSection>
      </div>
    </div>
  );
}

function nextRecurringLabel(entries: readonly FinanceRecurringEntry[]) {
  const next = [...entries].sort(
    (left, right) =>
      Number(new Date(left.nextDueAt)) - Number(new Date(right.nextDueAt)),
  )[0];
  return next ? formatDate(next.nextDueAt) : "sem data";
}

function sumEntries(entries: readonly FinanceEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.amountCents, 0);
}
