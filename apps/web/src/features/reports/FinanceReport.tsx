import { ReceiptText } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import {
  formatCurrency,
  formatFinanceCategory,
} from "../finance/financeBillsFormat";
import {
  AvailabilityPanel,
  BarRow,
  MetricDeck,
  ReportMetric,
} from "./ReportParts";
import type { ReportsDashboard } from "./types";

export function FinanceReport({
  comparison,
  dashboard,
}: {
  comparison: ReportsDashboard | null;
  dashboard: ReportsDashboard;
}) {
  const finance = dashboard.finance;
  if (finance.availability.status !== "available") {
    return (
      <AvailabilityPanel
        availability={finance.availability}
        label="Relatório financeiro"
      />
    );
  }
  const previous =
    comparison?.finance.availability.status === "available"
      ? comparison.finance
      : null;
  const categories = [...finance.categoryBreakdown].sort(
    (left, right) => right.plannedCents - left.plannedCents,
  );
  const max = Math.max(...categories.map((row) => row.plannedCents), 0);
  return (
    <div className="reports-dashboard">
      <MetricDeck>
        <ReportMetric
          current={finance.plannedRevenueCents}
          label="Entradas previstas"
          previous={previous?.plannedRevenueCents}
        />
        <ReportMetric
          current={finance.receivedRevenueCents}
          label="Entradas realizadas"
          previous={previous?.receivedRevenueCents}
          tone="good"
        />
        <ReportMetric
          current={finance.plannedOutflowCents}
          label="Saídas previstas"
          previous={previous?.plannedOutflowCents}
        />
        <ReportMetric
          current={finance.paidOutflowCents}
          label="Saídas realizadas"
          previous={previous?.paidOutflowCents}
          tone="warning"
        />
        <ReportMetric
          current={finance.pendingOutflowCents}
          label="Saídas pendentes"
          previous={previous?.pendingOutflowCents}
          tone={finance.pendingOutflowCents > 0 ? "warning" : "good"}
        />
        <ReportMetric
          current={finance.realizedBalanceCents}
          label="Saldo realizado"
          previous={previous?.realizedBalanceCents}
          tone={finance.realizedBalanceCents >= 0 ? "good" : "warning"}
        />
      </MetricDeck>

      {categories.length ? (
        <FeatureSection
          className="reports-section-surface"
          description="Valores previstos usam o vencimento. Valores realizados usam a data de pagamento."
          title="Saídas por categoria"
        >
          <div className="reports-category-breakdown">
            {categories.map((row) => (
              <div className="reports-category-breakdown__row" key={row.key}>
                <BarRow
                  formatter={formatCurrency}
                  label={formatFinanceCategory(row.key)}
                  max={max}
                  value={row.plannedCents}
                />
                <span>
                  {row.count} {row.count === 1 ? "lançamento" : "lançamentos"} ·{" "}
                  {formatCurrency(row.paidCents)} pago
                </span>
              </div>
            ))}
          </div>
        </FeatureSection>
      ) : (
        <FeatureEmptyState
          body="Não há saídas com vencimento no período selecionado."
          density="compact"
          icon={ReceiptText}
          title="Saídas por categoria"
        />
      )}
    </div>
  );
}
