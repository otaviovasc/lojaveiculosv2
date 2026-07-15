import { ChartNoAxesColumn, Link2, Repeat2, UsersRound } from "lucide-react";
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

export function FinanceCashFlowInsights({
  commissionRules,
  entries,
  recurringEntries,
}: {
  commissionRules: readonly CommissionRule[];
  entries: readonly FinanceEntry[];
  recurringEntries: readonly FinanceRecurringEntry[];
}) {
  const categories = categoryBreakdown(entries, "outflow");
  const sources = sourceBreakdown(entries);
  const pendingCommissions = entries.filter(
    (entry) => entry.type === "commission" && entry.status === "pending",
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.78fr] xl:items-start">
      <FeatureSection
        description="Maiores centros de custo considerando gastos e comissões."
        icon={<ChartNoAxesColumn className="size-5" />}
        title="Análise de gastos"
      >
        <div className="grid gap-3">
          {categories.length ? (
            categories.map((item) => (
              <InsightRow
                amount={formatCurrency(item.amountCents)}
                key={item.label}
                label={item.label}
              />
            ))
          ) : (
            <p className="rounded-lg border border-line bg-app p-4 text-sm font-bold text-muted">
              Nenhuma saída encontrada nos filtros atuais.
            </p>
          )}
        </div>
      </FeatureSection>

      <div className="grid gap-4">
        <FeatureSection
          description="Separação por origem operacional."
          icon={<Link2 className="size-5" />}
          title="Origem"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.length ? (
              sources.map((source) => (
                <div
                  className="rounded-lg border border-line bg-app p-3 finance-source-card"
                  key={source.source}
                >
                  <span className="text-xs font-black uppercase tracking-wider text-muted">
                    {sourceLabel(source.source)}
                  </span>
                  <strong className="mt-1 block text-sm font-black text-app-text">
                    {formatCurrency(source.amountCents)}
                  </strong>
                </div>
              ))
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
          title="Recorrências"
        >
          <div className="grid gap-3">
            <InsightRow
              amount={`${recurringEntries.length}`}
              label="Regras cadastradas"
            />
            <InsightRow
              amount={nextRecurringLabel(recurringEntries)}
              label="Próximo vencimento"
            />
          </div>
        </FeatureSection>

        <FeatureSection
          description="Comissões entram como saída no saldo de caixa."
          icon={<UsersRound className="size-5" />}
          title="Comissões"
        >
          <div className="grid gap-3">
            <InsightRow
              amount={formatCurrency(sumEntries(pendingCommissions))}
              label="A pagar"
            />
            <FeatureStatusBadge
              tone={commissionRules.length ? "success" : "neutral"}
            >
              {commissionRules.length
                ? `${commissionRules.length} regra(s)`
                : "Sem regras cadastradas"}
            </FeatureStatusBadge>
          </div>
        </FeatureSection>
      </div>
    </div>
  );
}

function InsightRow({ amount, label }: { amount: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app p-3 finance-insight-row">
      <span className="min-w-0 truncate text-sm font-black text-app-text">
        {label}
      </span>
      <strong className="shrink-0 text-sm font-black text-app-text">
        {amount}
      </strong>
    </div>
  );
}

function nextRecurringLabel(entries: readonly FinanceRecurringEntry[]) {
  if (entries.length === 0) return "Sem vencimento";
  const next = [...entries].sort(
    (left, right) =>
      Number(new Date(left.nextDueAt)) - Number(new Date(right.nextDueAt)),
  )[0];
  return next ? formatDate(next.nextDueAt) : "Sem vencimento";
}

function sumEntries(entries: readonly FinanceEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.amountCents, 0);
}
