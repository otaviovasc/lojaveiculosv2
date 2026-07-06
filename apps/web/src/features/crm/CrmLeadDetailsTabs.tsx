import { Calendar, FileText, Globe, Upload } from "lucide-react";
import { kindLabel, statusLabel } from "../documents/documentLabels";
import { formatDateTime } from "../documents/documentsWorkspaceModel";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { CrmLeadLinkedRecordsState } from "./crmLeadLinkedRecords";
import type {
  CreateProductCrmActivityInput,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";
import type { PipelineStage } from "./crmPipelineStorage";
import { CrmLeadDetailsFinanciamento } from "./CrmLeadDetailsFinanciamento";
import { CrmLeadDetailsTabsTarefas } from "./CrmLeadDetailsTabsTarefas";
import { CrmLeadDetailsTabsReunioes } from "./CrmLeadDetailsTabsReunioes";
import { CrmLeadDetailsTabsNotas } from "./CrmLeadDetailsTabsNotas";
import { CrmLeadDetailsTabsVisao } from "./CrmLeadDetailsTabsVisao";
import { CrmLeadWhatsappPanel } from "./CrmLeadWhatsappPanel";

type Props = {
  activeTab: string;
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  linkedRecords: CrmLeadLinkedRecordsState;
  stages: PipelineStage[];
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmLeadDetailsTabs({
  activeTab,
  lead,
  activities,
  linkedRecords,
  stages,
  onCreateActivity,
  vehicleOptions,
}: Props) {
  if (activeTab === "visao") {
    return (
      <CrmLeadDetailsTabsVisao
        activities={activities}
        lead={lead}
        linkedRecords={linkedRecords}
        stages={stages}
        vehicleOptions={vehicleOptions}
      />
    );
  }

  if (activeTab === "chat") {
    return <CrmLeadWhatsappPanel lead={lead} />;
  }

  if (activeTab === "tarefas") {
    return (
      <CrmLeadDetailsTabsTarefas
        lead={lead}
        activities={activities}
        onCreateActivity={onCreateActivity}
      />
    );
  }

  if (activeTab === "reunioes") {
    return (
      <CrmLeadDetailsTabsReunioes
        lead={lead}
        activities={activities}
        onCreateActivity={onCreateActivity}
      />
    );
  }

  if (activeTab === "notas") {
    return (
      <CrmLeadDetailsTabsNotas
        lead={lead}
        activities={activities}
        onCreateActivity={onCreateActivity}
      />
    );
  }

  if (activeTab === "arquivos") {
    return (
      <div className="flex flex-col gap-5 select-none text-app-text">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-app-text">Arquivos</span>
        </div>
        <LinkedDocumentsPanel linkedRecords={linkedRecords} />
      </div>
    );
  }

  if (activeTab === "financeiro") {
    return (
      <CrmLeadDetailsFinanciamento
        lead={lead}
        onCreateActivity={onCreateActivity}
        vehicleOptions={vehicleOptions}
      />
    );
  }

  if (activeTab === "portal") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-app-text">
        <div className="size-14 rounded-full bg-line/15 border border-line/25 flex items-center justify-center text-muted mb-4">
          <Globe className="size-6 text-muted/70" />
        </div>
        <span className="text-xs font-bold text-muted">
          Este cliente ainda não tem atividade registrada no portal.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
      <Calendar className="size-8 text-muted/65 mb-2" />
      <span className="text-xs font-bold">
        Nenhum registro encontrado nesta aba.
      </span>
    </div>
  );
}

function LinkedDocumentsPanel({
  linkedRecords,
}: {
  linkedRecords: CrmLeadLinkedRecordsState;
}) {
  if (linkedRecords.kind === "loading") {
    return (
      <div className="border border-line/35 bg-panel/5 rounded-xl p-6 text-xs font-bold text-muted">
        Carregando documentos vinculados.
      </div>
    );
  }

  if (linkedRecords.kind === "error") {
    return (
      <div className="border border-line/35 bg-panel/5 rounded-xl p-6 text-xs font-bold text-muted">
        {linkedRecords.message}
      </div>
    );
  }

  if (linkedRecords.documents.length === 0) {
    return (
      <div className="border border-dashed border-line/35 bg-panel/5 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
        <Upload className="size-7 text-muted" />
        <span className="text-xs font-bold text-app-text">
          Nenhum arquivo vinculado a este cliente ainda.
        </span>
        <span className="text-xs font-bold text-muted">
          Documentos de leads e vendas aparecerão aqui automaticamente.
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {linkedRecords.documents.map((document) => (
        <article
          className="rounded-xl border border-line/35 bg-panel/10 p-4"
          key={document.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText aria-hidden="true" className="size-4 text-muted" />
                <strong className="break-words text-sm font-black text-app-text">
                  {document.title}
                </strong>
              </div>
              <p className="mt-1 text-xs font-bold text-muted">
                {kindLabel(document.kind)} · {statusLabel(document.status)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold text-muted">
              {formatDateTime(document.uploadedAt)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
