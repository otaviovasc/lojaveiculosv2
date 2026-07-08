import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Gauge,
  WalletCards,
} from "lucide-react";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { cx } from "../../components/ui/featureShared";
import {
  summarizeCashFlow,
  type FinanceCashFlowSummary,
} from "./financeCashFlowModel";
import { formatCurrency } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";

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
  const balanceTone = summary.plannedBalanceCents >= 0 ? "success" : "danger";

  return (
    <FeatureSection
      description="Entradas, saídas e saldo com base nos filtros atuais."
      icon={<Gauge className="size-5" />}
      title="Fluxo de caixa"
    >
      <FeatureKpiStrip ariaLabel="Indicadores do fluxo de caixa">
        <FeatureKpiCard
          animationIndex={0}
          icon={ArrowUpCircle}
          label="Entradas"
          tone="green"
          value={formatCurrency(summary.revenueCents)}
        />
        <FeatureKpiCard
          animationIndex={1}
          icon={ArrowDownCircle}
          label="Saídas"
          tone="pink"
          value={formatCurrency(summary.outflowCents)}
        />
        <FeatureKpiCard
          animationIndex={2}
          icon={WalletCards}
          label="Saldo planejado"
          tone="violet"
          value={formatCurrency(summary.plannedBalanceCents)}
        />
        <FeatureKpiCard
          animationIndex={3}
          icon={CheckCircle2}
          label="Saldo real"
          tone="blue"
          value={formatCurrency(summary.realizedBalanceCents)}
        />
      </FeatureKpiStrip>
      <CashFlowDetailStrip
        balanceTone={balanceTone}
        onShowOverdue={onShowOverdue}
        onShowPending={onShowPending}
        summary={summary}
      />
    </FeatureSection>
  );
}

function CashFlowDetailStrip({
  balanceTone,
  onShowOverdue,
  onShowPending,
  summary,
}: {
  balanceTone: "danger" | "success";
  onShowOverdue: () => void;
  onShowPending: () => void;
  summary: FinanceCashFlowSummary;
}) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-4 finance-detail-strip">
      <DetailMetric
        className="finance-metric-received"
        label="Recebido"
        value={formatCurrency(summary.paidRevenueCents)}
      />
      <DetailMetric
        className="finance-metric-paid"
        label="Pago"
        value={formatCurrency(summary.paidOutflowCents)}
      />
      <button
        className="rounded-lg border border-line bg-app p-3 text-left finance-btn-pending"
        onClick={onShowPending}
        type="button"
      >
        <span className="text-xs font-black uppercase tracking-wider text-muted">
          Em aberto
        </span>
        <strong className="mt-1 block text-base font-black text-app-text">
          {formatCurrency(summary.pendingCents)}
        </strong>
      </button>
      <button
        className="rounded-lg border border-line bg-app p-3 text-left finance-btn-overdue"
        onClick={onShowOverdue}
        type="button"
      >
        <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted">
          <AlertTriangle aria-hidden="true" className="size-3.5" />
          Vencido
        </span>
        <strong className="mt-1 block text-base font-black text-danger">
          {formatCurrency(summary.overdueCents)}
        </strong>
      </button>
      <div className="md:col-span-4 finance-status-badge-container">
        <FeatureStatusBadge tone={balanceTone}>
          {balanceTone === "success"
            ? "Saldo planejado positivo"
            : "Saldo planejado negativo"}
        </FeatureStatusBadge>
      </div>
    </div>
  );
}

function DetailMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={cx("rounded-lg border border-line bg-app p-3", className)}>
      <span className="text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </span>
      <strong className="mt-1 block text-base font-black text-app-text">
        {value}
      </strong>
    </div>
  );
}
