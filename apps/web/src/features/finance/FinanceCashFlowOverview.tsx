import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDollarSign,
  Landmark,
} from "lucide-react";
import { summarizeCashFlow } from "./financeCashFlowModel";
import { formatCurrency } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";
import { cn } from "../../lib/utils";

export function FinanceCashFlowOverview({
  entries,
  onShowOverdue,
  onShowPending,
}: {
  entries: readonly FinanceEntry[];
  onShowOverdue: () => void;
  onShowPending: () => void;
}) {
  const summary = summarizeCashFlow(entries);
  const plannedBalanceTone = summary.plannedBalanceCents >= 0 ? "info" : "pink";
  const realizedBalanceTone =
    summary.realizedBalanceCents >= 0 ? "green" : "pink";

  return (
    <section
      aria-labelledby="finance-cash-flow-summary-title"
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
        <strong className="fiscal-kpi-card__value">
          {formatCurrency(summary.revenueCents)}
        </strong>
        <span className="fiscal-kpi-card__hint">
          Recebido {formatCurrency(summary.paidRevenueCents)}
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
        <strong className="fiscal-kpi-card__value">
          {formatCurrency(summary.outflowCents)}
        </strong>
        <span className="fiscal-kpi-card__hint">
          Pago {formatCurrency(summary.paidOutflowCents)}
        </span>
      </article>

      <button
        aria-label="Mostrar lançamentos em aberto"
        className={cn(
          "fiscal-kpi-card feature-stat-card text-left",
          `fiscal-kpi-card--${plannedBalanceTone}`,
        )}
        onClick={onShowPending}
        type="button"
      >
        <Landmark aria-hidden="true" className="fiscal-kpi-card__watermark" />
        <span className="fiscal-kpi-card__label">Saldo planejado</span>
        <strong className="fiscal-kpi-card__value">
          {formatCurrency(summary.plannedBalanceCents)}
        </strong>
        <span className="fiscal-kpi-card__hint">
          Em aberto {formatCurrency(summary.pendingCents)}
        </span>
      </button>

      <button
        aria-label="Mostrar lançamentos vencidos"
        className={cn(
          "fiscal-kpi-card feature-stat-card text-left",
          `fiscal-kpi-card--${realizedBalanceTone}`,
        )}
        onClick={onShowOverdue}
        type="button"
      >
        <CircleDollarSign
          aria-hidden="true"
          className="fiscal-kpi-card__watermark"
        />
        <span className="fiscal-kpi-card__label">Saldo real</span>
        <strong className="fiscal-kpi-card__value">
          {formatCurrency(summary.realizedBalanceCents)}
        </strong>
        <span className="fiscal-kpi-card__hint">
          Vencido {formatCurrency(summary.overdueCents)}
        </span>
      </button>
    </section>
  );
}
