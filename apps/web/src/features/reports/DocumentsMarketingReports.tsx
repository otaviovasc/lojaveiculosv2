import { FileText, Megaphone } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import {
  AvailabilityPanel,
  BarRow,
  count,
  MetricDeck,
  ReportMetric,
} from "./ReportParts";
import { getReportDocumentKindLabel } from "./reportsLabels";
import type { ReportsDashboard } from "./types";

export function DocumentsReport({
  comparison,
  dashboard,
}: {
  comparison: ReportsDashboard | null;
  dashboard: ReportsDashboard;
}) {
  const documents = dashboard.documents;
  if (documents.availability.status !== "available") {
    return (
      <AvailabilityPanel
        availability={documents.availability}
        label="Documentos"
      />
    );
  }
  const previous =
    comparison?.documents.availability.status === "available"
      ? comparison.documents
      : null;
  const max = Math.max(...documents.byKind.map((row) => row.count), 0);
  return (
    <div className="reports-dashboard">
      <MetricDeck>
        <ReportMetric
          current={documents.total}
          formatter={count}
          label="Documentos no período"
          previous={previous?.total}
        />
        <ReportMetric
          current={documents.issued}
          formatter={count}
          label="Emitidos"
          previous={previous?.issued}
          tone="good"
        />
        <ReportMetric
          current={documents.signed}
          formatter={count}
          label="Assinados"
          previous={previous?.signed}
          tone="good"
        />
        <ReportMetric
          current={documents.pendingSignature}
          formatter={count}
          label="Aguardando assinatura"
          previous={previous?.pendingSignature}
          tone={documents.pendingSignature > 0 ? "warning" : "good"}
        />
      </MetricDeck>
      <FeatureSection
        className="reports-section-surface"
        title="Documentos por tipo"
      >
        {documents.byKind.length ? (
          <div className="reports-bars">
            {documents.byKind.map((row) => (
              <BarRow
                key={row.key}
                label={getReportDocumentKindLabel(row.key)}
                max={max}
                value={row.count}
              />
            ))}
          </div>
        ) : (
          <FeatureEmptyState
            body="Nenhum documento foi enviado ou gerado no período."
            density="compact"
            icon={FileText}
            title="Sem documentos"
          />
        )}
      </FeatureSection>
    </div>
  );
}

export function MarketingReport({
  dashboard,
}: {
  dashboard: ReportsDashboard;
}) {
  if (dashboard.marketing.availability.status !== "available") {
    return (
      <AvailabilityPanel
        availability={dashboard.marketing.availability}
        label="Marketing"
      />
    );
  }
  return (
    <FeatureEmptyState
      body="O contrato de métricas de marketing ainda não expõe dados para este relatório."
      icon={Megaphone}
      title="Marketing sem métricas disponíveis"
    />
  );
}
