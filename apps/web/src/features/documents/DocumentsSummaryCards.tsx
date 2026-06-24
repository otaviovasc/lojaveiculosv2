import {
  Bot,
  CarFront,
  FileCheck2,
  FileText,
  FolderArchive,
  UploadCloud,
} from "lucide-react";
import type { ComponentType } from "react";

export type DocumentsSummary = {
  automatic: number;
  general: number;
  linkedToVehicles: number;
  manual: number;
  pending: number;
  ready: number;
  total: number;
  voided: number;
};

export function DocumentsSummaryCards({
  summary,
}: {
  summary: DocumentsSummary;
}) {
  return (
    <section
      className="documents-summary-cards"
      aria-label="Resumo de documentos"
    >
      <SummaryCard
        context={`${summary.ready} disponíveis · ${summary.pending} pendentes · ${summary.voided} cancelados`}
        icon={FileText}
        label="Total"
        value={summary.total}
      />
      <SummaryCard
        context="Emitidos por contratos e fluxos da loja"
        icon={Bot}
        label="Automáticos"
        value={summary.automatic}
      />
      <SummaryCard
        context="Arquivos anexados pela equipe"
        icon={UploadCloud}
        label="Envios manuais"
        value={summary.manual}
      />
      <SummaryCard
        context="Com vínculo a uma unidade do estoque"
        icon={CarFront}
        label="Unidades"
        value={summary.linkedToVehicles}
      />
      <SummaryCard
        context="Sem unidade vinculada"
        icon={FolderArchive}
        label="Geral"
        value={summary.general}
      />
    </section>
  );
}

function SummaryCard({
  context,
  icon: Icon,
  label,
  value,
}: {
  context: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <article className="documents-summary-card">
      <span className="documents-summary-icon">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
      <span className="documents-summary-context">{context}</span>
      <FileCheck2
        aria-hidden="true"
        className="documents-summary-mark size-4"
      />
    </article>
  );
}
