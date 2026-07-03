import { Calendar, MessageSquare, Upload, Globe } from "lucide-react";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
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

type Props = {
  activeTab: string;
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
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
  stages,
  onCreateActivity,
  vehicleOptions,
}: Props) {
  if (activeTab === "visao") {
    return (
      <CrmLeadDetailsTabsVisao
        activities={activities}
        lead={lead}
        stages={stages}
        vehicleOptions={vehicleOptions}
      />
    );
  }

  if (activeTab === "chat") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-app-text">
        <div className="size-14 rounded-full bg-line/15 border border-line/25 flex items-center justify-center text-muted mb-4">
          <MessageSquare className="size-6 text-muted/70" />
        </div>
        <h3 className="text-sm font-black text-app-text">
          Nenhuma mensagem com esse cliente ainda
        </h3>
        <p className="text-xs font-bold text-muted max-w-sm mt-1 mb-6 leading-relaxed">
          As conversas aparecerão aqui quando uma integração de mensagens
          estiver vinculada a este cliente.
        </p>
      </div>
    );
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
        <div className="border border-dashed border-line/35 bg-panel/5 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
          <Upload className="size-7 text-muted" />
          <span className="text-xs font-bold text-app-text">
            Nenhum arquivo enviado.
          </span>
          <span className="text-xs font-bold text-muted">Máximo 30MB</span>
        </div>
        <div className="text-center py-2">
          <span className="text-xs font-bold text-muted">
            O envio aparecerá aqui quando a integração de documentos estiver
            ativa.
          </span>
        </div>
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
