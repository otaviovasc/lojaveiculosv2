import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDollarSign,
  Landmark,
} from "lucide-react";
import { summarizeCashFlow } from "./financeCashFlowModel";
import { formatCurrency } from "./financeBillsFormat";
import type { FinanceListState } from "./financeBillsModel";
import type { FinanceEntry } from "./types";
import { cn } from "../../lib/utils";

export function FinanceCashFlowOverview({
  entries,
  onShowOverdue,
  onShowPending,
  status,
}: {
  entries: readonly FinanceEntry[];
  onShowOverdue: () => void;
  onShowPending: () => void;
  status: FinanceListState["kind"];
}) {
  const summary = status === "ready" ? summarizeCashFlow(entries) : null;
  const plannedBalanceTone =
    (summary?.plannedBalanceCents ?? 0) >= 0 ? "info" : "pink";
  const realizedBalanceTone =
    (summary?.realizedBalanceCents ?? 0) >= 0 ? "green" : "pink";
  const isReady = summary !== null;

  return (
    <section
      aria-labelledby="finance-cash-flow-summary-title"
      aria-busy={status === "loading" || undefined}
      className="fiscal-kpi-grid finance-kpi-grid"
    >
      <h2 className="sr-only" id="finance-cash-flow-summary-title">
        Fluxo de caixa
      </h2>
      <article
        className={cn(
          "fiscal-kpi-card fiscal-kpi-card--green feature-stat-card",
        )}
      >
        <ArrowUpCircle
          aria-hidden="true"
          className="fiscal-kpi-card__watermark"
        />
        <span className="fiscal-kpi-card__label">Entradas</span>
        <FinanceKpiValue
          status={status}
          value={summary ? formatCurrency(summary.revenueCents) : undefined}
        />
        <span className="fiscal-kpi-card__hint">
          {summary
            ? `Recebido ${formatCurrency(summary.paidRevenueCents)}`
            : unavailableHint(status)}
        </span>
      </article>

      <article
        className={cn(
          "fiscal-kpi-card fiscal-kpi-card--violet feature-stat-card",
        )}
      >
        <ArrowDownCircle
          aria-hidden="true"
          className="fiscal-kpi-card__watermark"
        />
        <span className="fiscal-kpi-card__label">Saídas</span>
        <FinanceKpiValue
          status={status}
          value={summary ? formatCurrency(summary.outflowCents) : undefined}
        />
        <span className="fiscal-kpi-card__hint">
          {summary
            ? `Pago ${formatCurrency(summary.paidOutflowCents)}`
            : unavailableHint(status)}
        </span>
      </article>

      <button
        aria-label="Mostrar lançamentos em aberto"
        className={cn(
          "fiscal-kpi-card feature-stat-card text-left",
          `fiscal-kpi-card--${plannedBalanceTone}`,
        )}
        disabled={!isReady}
        onClick={onShowPending}
        type="button"
      >
        <Landmark aria-hidden="true" className="fiscal-kpi-card__watermark" />
        <span className="fiscal-kpi-card__label">Saldo planejado</span>
        <FinanceKpiValue
          status={status}
          value={
            summary ? formatCurrency(summary.plannedBalanceCents) : undefined
          }
        />
        <span className="fiscal-kpi-card__hint">
          {summary
            ? `Em aberto ${formatCurrency(summary.pendingCents)}`
            : unavailableHint(status)}
        </span>
      </button>

      <button
        aria-label="Mostrar lançamentos vencidos"
        className={cn(
          "fiscal-kpi-card feature-stat-card text-left",
          `fiscal-kpi-card--${realizedBalanceTone}`,
        )}
        disabled={!isReady}
        onClick={onShowOverdue}
        type="button"
      >
        <CircleDollarSign
          aria-hidden="true"
          className="fiscal-kpi-card__watermark"
        />
        <span className="fiscal-kpi-card__label">Saldo real</span>
        <FinanceKpiValue
          status={status}
          value={
            summary ? formatCurrency(summary.realizedBalanceCents) : undefined
          }
        />
        <span className="fiscal-kpi-card__hint">
          {summary
            ? `Vencido ${formatCurrency(summary.overdueCents)}`
            : unavailableHint(status)}
        </span>
      </button>
    </section>
  );
}

function FinanceKpiValue({
  status,
  value,
}: {
  status: FinanceListState["kind"];
  value: string | undefined;
}) {
  if (status === "loading") {
    return (
      <strong className="fiscal-kpi-card__value">
        <span className="sr-only">Carregando valor</span>
        <span
          aria-hidden="true"
          className="block h-7 w-28 animate-pulse rounded bg-app-elevated"
        />
      </strong>
    );
  }

  return (
    <strong className="fiscal-kpi-card__value">
      {status === "error" ? "Indisponível" : value}
    </strong>
  );
}

function unavailableHint(status: FinanceListState["kind"]) {
  return status === "loading" ? "Aguardando dados" : "Tente carregar novamente";
}
