import {
  CalendarClock,
  ChartNoAxesColumn,
  Link2,
  ListChecks,
  Repeat2,
} from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
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
  const categoriesTotal = categories.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );
  const sources = sourceBreakdown(entries);
  const pendingCommissionsTotal = sumEntries(
    entries.filter(
      (entry) => entry.type === "commission" && entry.status === "pending",
    ),
  );
  const emptyLayout = {
    className: "flex h-full flex-col",
    headerClassName: "p-5",
    padding: "none" as const,
  };

  return (
    <div className="finance-insights-grid grid gap-4 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch w-full h-full">
      <FeatureSection
        {...(categories.length
          ? { padding: "default" as const }
          : { ...emptyLayout })}
        description="Maiores centros de custo considerando gastos e comissões."
        icon={<ChartNoAxesColumn aria-hidden="true" className="size-5" />}
        title="Análise de gastos"
      >
        <div
          className={categories.length ? "mt-4 grid gap-1" : "min-h-0 flex-1"}
        >
          {categories.length ? (
            <>
              {categories.map((item) => (
                <div className="finance-insight-bar-row" key={item.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs font-semibold text-app-text">
                      {item.label}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                      {shareLabel(item.amountCents, categoriesTotal)}
                    </span>
                    <strong className="shrink-0 text-xs font-bold text-app-text tabular-nums">
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
                        width: `${barWidth(item.amountCents, maxCategoryCents)}`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="finance-insights-total">
                <span>Total analisado</span>
                <strong>{formatCurrency(categoriesTotal)}</strong>
              </div>
            </>
          ) : (
            <FeatureEmptyState
              body="Nenhuma saída encontrada nos filtros atuais."
              className="h-full w-full"
              density="compact"
              icon={ChartNoAxesColumn}
              title="Nenhum gasto encontrado"
            />
          )}
        </div>
      </FeatureSection>

      <div className="grid content-start gap-4">
        <FeatureSection
          {...(sources.length
            ? { padding: "default" as const }
            : { ...emptyLayout })}
          description="Separação por origem operacional."
          icon={<Link2 aria-hidden="true" className="size-5" />}
          title="Origem"
        >
          {sources.length ? (
            <ul className="finance-origin-list mt-3">
              {sources.map((source) => (
                <li key={source.source}>
                  <span>{sourceLabel(source.source)}</span>
                  <strong>{formatCurrency(source.amountCents)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="min-h-0 flex-1">
              <FeatureEmptyState
                body="Sem origem para exibir."
                className="h-full w-full"
                density="compact"
                icon={Link2}
                title="Nenhuma origem encontrada"
              />
            </div>
          )}
        </FeatureSection>

        <FeatureSection
          description="Regras e cobranças recorrentes ativas no financeiro."
          icon={<Repeat2 aria-hidden="true" className="size-5" />}
          title="Recorrências e comissões"
        >
          <div className="mt-4 grid gap-4">
            <div className="finance-commission-hero">
              <small>Comissões a pagar</small>
              <strong>{formatCurrency(pendingCommissionsTotal)}</strong>
            </div>
            <div className="grid gap-3">
              <div className="finance-insight-meta-row">
                <span className="finance-insight-meta-label">
                  <ListChecks aria-hidden="true" className="size-3.5" />
                  Regras de comissão
                </span>
                <FeatureStatusBadge
                  size="dense"
                  tone={commissionRules.length ? "success" : "neutral"}
                >
                  {commissionRules.length
                    ? `${commissionRules.length} ativa${commissionRules.length === 1 ? "" : "s"}`
                    : "Nenhuma"}
                </FeatureStatusBadge>
              </div>
              <div className="finance-insight-meta-row">
                <span className="finance-insight-meta-label">
                  <CalendarClock aria-hidden="true" className="size-3.5" />
                  Próxima recorrência
                </span>
                <span className="finance-insight-meta-value">
                  {recurringEntries.length
                    ? nextRecurringLabel(recurringEntries)
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </FeatureSection>
      </div>
    </div>
  );
}

function barWidth(amountCents: number, maxCents: number) {
  return `${Math.max(4, Math.round((amountCents / Math.max(1, maxCents)) * 100))}%`;
}

function shareLabel(amountCents: number, totalCents: number) {
  if (totalCents <= 0) return "0%";
  return `${Math.round((amountCents / totalCents) * 100)}%`;
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
