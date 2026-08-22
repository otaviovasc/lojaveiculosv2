import { AlertTriangle, Car, FileX2 } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import { formatCurrency } from "../finance/financeBillsFormat";
import {
  AvailabilityPanel,
  formatReportDate,
  MetricDeck,
  ReportMetric,
} from "./ReportParts";
import type {
  OwnerVehicleReportRow,
  ReportsDashboard,
  ReportTab,
} from "./types";

export function OwnerReport({
  comparison,
  dashboard,
  search,
  tab,
}: {
  comparison: ReportsDashboard | null;
  dashboard: ReportsDashboard;
  search: string;
  tab: Extract<ReportTab, "summary" | "sold" | "costs">;
}) {
  if (dashboard.owner.availability.status !== "available") {
    return (
      <AvailabilityPanel
        availability={dashboard.owner.availability}
        label="Relatório do proprietário"
      />
    );
  }
  if (tab === "summary") {
    return <OwnerSummary comparison={comparison} dashboard={dashboard} />;
  }
  const rows =
    tab === "costs"
      ? [...dashboard.owner.vehicles].sort(
          (left, right) =>
            Number(left.marginStatus === "complete") -
            Number(right.marginStatus === "complete"),
        )
      : dashboard.owner.vehicles;
  return (
    <FeatureSection
      className="reports-section-surface"
      description={
        tab === "sold"
          ? "Venda, custos registrados e margem por veículo."
          : "Aquisição, preparação e comissões registradas em cada venda."
      }
      title={tab === "sold" ? "Veículos vendidos" : "Custos e margens"}
    >
      <VehicleLedger rows={filterRows(rows, search)} />
    </FeatureSection>
  );
}

function OwnerSummary({
  comparison,
  dashboard,
}: {
  comparison: ReportsDashboard | null;
  dashboard: ReportsDashboard;
}) {
  const previousOwner =
    comparison?.owner.availability.status === "available"
      ? comparison.owner
      : null;
  const previousFinance =
    comparison?.finance.availability.status === "available"
      ? comparison.finance
      : null;
  const pendingCount =
    dashboard.owner.missingAcquisitionCount +
    dashboard.attention.pendingChecklistsCount;
  return (
    <div className="reports-dashboard">
      <MetricDeck>
        <ReportMetric
          current={dashboard.finance.realizedBalanceCents}
          label="Saldo realizado"
          previous={previousFinance?.realizedBalanceCents}
          tone={
            dashboard.finance.realizedBalanceCents >= 0 ? "good" : "warning"
          }
        />
        <ReportMetric
          current={dashboard.finance.receivedRevenueCents}
          label="Receitas recebidas"
          previous={previousFinance?.receivedRevenueCents}
          tone="good"
        />
        <ReportMetric
          current={dashboard.finance.paidOutflowCents}
          label="Saídas pagas"
          previous={previousFinance?.paidOutflowCents}
          tone="warning"
        />
        <ReportMetric
          current={dashboard.sales.closedCount}
          formatter={(value) => value.toLocaleString("pt-BR")}
          label="Veículos vendidos"
          previous={comparison?.sales.closedCount}
        />
        <ReportMetric
          current={dashboard.owner.officialMarginCents}
          label="Margem apurada"
          previous={previousOwner?.officialMarginCents}
          tone={dashboard.owner.officialMarginCents >= 0 ? "good" : "warning"}
        />
        <ReportMetric
          current={pendingCount}
          formatter={(value) => value.toLocaleString("pt-BR")}
          label="Pendências"
          tone={pendingCount > 0 ? "warning" : "good"}
        />
      </MetricDeck>

      <FeatureAlert>
        <FileX2 aria-hidden="true" className="size-4" />O PDF executivo ainda
        não possui materialização byte a byte no V2. Os números abaixo são
        consultados no banco, mas nenhum arquivo foi sintetizado para download.
      </FeatureAlert>

      <FeatureSection
        className="reports-section-surface"
        description="Vendas sem aquisição registrada ficam fora da margem apurada."
        title="Vendas que precisam de atenção"
      >
        {dashboard.owner.missingAcquisitionCount > 0 ? (
          <VehicleLedger
            rows={dashboard.owner.vehicles
              .filter((row) => row.marginStatus === "missing_acquisition")
              .slice(0, 6)}
          />
        ) : (
          <FeatureEmptyState
            body="Todas as vendas do período têm aquisição registrada para cálculo da margem."
            density="compact"
            icon={Car}
            title="Custos de aquisição completos"
            tone="green"
          />
        )}
      </FeatureSection>

      {dashboard.attention.pendingChecklistsCount > 0 ? (
        <FeatureAlert>
          <AlertTriangle aria-hidden="true" className="size-4" />
          {dashboard.attention.pendingChecklistsCount}{" "}
          {dashboard.attention.pendingChecklistsCount === 1
            ? "checklist aguarda"
            : "checklists aguardam"}{" "}
          conclusão.
        </FeatureAlert>
      ) : null}
    </div>
  );
}

function VehicleLedger({ rows }: { rows: readonly OwnerVehicleReportRow[] }) {
  if (!rows.length) {
    return (
      <FeatureEmptyState
        body="Nenhuma venda corresponde ao período e à busca atual."
        density="compact"
        icon={Car}
        title="Nenhum veículo encontrado"
      />
    );
  }
  return (
    <div className="reports-table-wrap">
      <table className="reports-table">
        <thead>
          <tr>
            <th>Veículo</th>
            <th>Venda</th>
            <th>Aquisição</th>
            <th>Preparação</th>
            <th>Comissão</th>
            <th>Margem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.saleId}>
              <td>
                <strong>{row.title}</strong>
                <small>
                  {row.plate ? `${row.plate} · ` : ""}
                  {formatReportDate(row.closedAt)}
                </small>
              </td>
              <td>{formatCurrency(row.salePriceCents)}</td>
              <td>{formatCurrency(row.acquisitionCents)}</td>
              <td>{formatCurrency(row.operationalCostsCents)}</td>
              <td>{formatCurrency(row.commissionCents)}</td>
              <td>
                {row.marginCents === null ? (
                  <span className="reports-status" data-tone="warning">
                    Aquisição pendente
                  </span>
                ) : (
                  <strong
                    className="reports-money-state"
                    data-negative={row.marginCents < 0 || undefined}
                  >
                    {formatCurrency(row.marginCents)}
                  </strong>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function filterRows(rows: readonly OwnerVehicleReportRow[], search: string) {
  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return rows;
  return rows.filter((row) =>
    [row.title, row.plate, formatReportDate(row.closedAt)].some((value) =>
      (value ?? "").toLocaleLowerCase("pt-BR").includes(normalized),
    ),
  );
}
