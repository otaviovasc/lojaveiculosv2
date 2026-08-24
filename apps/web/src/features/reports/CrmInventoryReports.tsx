import { Inbox, Warehouse } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import { formatCurrency } from "../finance/financeBillsFormat";
import {
  AvailabilityPanel,
  BarRow,
  count,
  MetricDeck,
  percent,
  ReportMetric,
} from "./ReportParts";
import {
  getReportAgeBucketLabel,
  getReportFunnelLabel,
  getReportSourceLabel,
} from "./reportsLabels";
import type { ReportsDashboard } from "./types";

export function CrmReport({
  comparison,
  dashboard,
}: {
  comparison: ReportsDashboard | null;
  dashboard: ReportsDashboard;
}) {
  const crm = dashboard.crm;
  if (crm.availability.status !== "available") {
    return <AvailabilityPanel availability={crm.availability} label="CRM" />;
  }
  const previous =
    comparison?.crm.availability.status === "available" ? comparison.crm : null;
  return (
    <div className="reports-dashboard">
      <MetricDeck>
        <ReportMetric
          current={crm.totalLeads}
          formatter={count}
          label="Leads criados"
          previous={previous?.totalLeads}
        />
        <ReportMetric
          current={crm.wonLeads}
          formatter={count}
          label="Ganhos"
          previous={previous?.wonLeads}
          tone="good"
        />
        <ReportMetric
          current={crm.lostLeads}
          formatter={count}
          label="Perdidos"
          previous={previous?.lostLeads}
          tone={crm.lostLeads > 0 ? "warning" : "neutral"}
        />
        <ReportMetric
          current={crm.conversionRate}
          formatter={percent}
          label="Conversão"
          previous={previous?.conversionRate}
          tone="good"
        />
        <ReportMetric
          current={crm.interactionCount}
          formatter={count}
          label="Interações"
          previous={previous?.interactionCount}
        />
        <ReportMetric
          current={crm.averageInteractionsPerLead}
          formatter={(value) =>
            value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
          }
          label="Interações por lead"
          previous={previous?.averageInteractionsPerLead}
        />
      </MetricDeck>
      <section className="reports-two-column">
        <Breakdown
          empty="Nenhum lead foi criado no período."
          items={dashboard.leadFunnel.map((row) => ({
            key: row.key,
            label: getReportFunnelLabel(row.key),
            value: row.count,
          }))}
          title="Etapas do funil"
        />
        <Breakdown
          empty="As origens aparecerão após os primeiros cadastros."
          items={dashboard.leadSources.map((row) => ({
            key: row.key,
            label: getReportSourceLabel(row.key),
            value: row.value,
          }))}
          title="Origem dos leads"
        />
      </section>
    </div>
  );
}

export function InventoryReport({
  comparison,
  dashboard,
}: {
  comparison: ReportsDashboard | null;
  dashboard: ReportsDashboard;
}) {
  const inventory = dashboard.inventory;
  const ageRows = Object.entries(inventory.ageBuckets).map(([key, value]) => ({
    key,
    label: getReportAgeBucketLabel(key),
    value,
  }));
  const max = Math.max(...ageRows.map((row) => row.value), 0);
  return (
    <div className="reports-dashboard">
      <MetricDeck>
        <ReportMetric
          current={inventory.availableListings}
          formatter={count}
          label="Disponíveis"
          previous={comparison?.inventory.availableListings}
          tone="good"
        />
        <ReportMetric
          current={inventory.reservedListings}
          formatter={count}
          label="Reservados"
          previous={comparison?.inventory.reservedListings}
        />
        <ReportMetric
          current={inventory.soldListings}
          formatter={count}
          label="Anúncios vendidos"
          previous={comparison?.inventory.soldListings}
        />
        <ReportMetric
          current={inventory.totalListings}
          formatter={count}
          label="Anúncios totais"
          previous={comparison?.inventory.totalListings}
        />
        <ReportMetric
          current={inventory.availableAskingValueCents}
          formatter={formatCurrency}
          label="Preço pedido disponível"
          previous={comparison?.inventory.availableAskingValueCents}
        />
        <ReportMetric
          current={inventory.averagePriceCents}
          formatter={formatCurrency}
          label="Preço médio anunciado"
          previous={comparison?.inventory.averagePriceCents}
        />
      </MetricDeck>
      {ageRows.some((row) => row.value > 0) ? (
        <FeatureSection
          className="reports-section-surface"
          description="Idade das unidades disponíveis desde a aquisição; quando ausente, usa a criação do anúncio."
          title="Idade do estoque"
        >
          <div className="reports-bars">
            {ageRows.map((row) => (
              <BarRow
                key={row.key}
                label={row.label}
                max={max}
                value={row.value}
              />
            ))}
          </div>
        </FeatureSection>
      ) : (
        <FeatureEmptyState
          body="Nenhuma unidade disponível entrou nas faixas de idade."
          density="compact"
          icon={Warehouse}
          title="Idade do estoque"
        />
      )}
    </div>
  );
}

function Breakdown({
  empty,
  items,
  title,
}: {
  empty: string;
  items: readonly { key: string; label: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...items.map((row) => row.value), 0);
  if (!items.length) {
    return (
      <FeatureEmptyState
        body={empty}
        density="compact"
        icon={Inbox}
        title={title}
      />
    );
  }
  return (
    <FeatureSection className="reports-section-surface" title={title}>
      <div className="reports-bars">
        {items.map((row) => (
          <BarRow key={row.key} label={row.label} max={max} value={row.value} />
        ))}
      </div>
    </FeatureSection>
  );
}
