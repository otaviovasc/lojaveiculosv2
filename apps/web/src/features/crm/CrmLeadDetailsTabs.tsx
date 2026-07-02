import { useState } from "react";
import {
  Calendar,
  Plus,
  MessageSquare,
  Mail,
  Upload,
  Globe,
} from "lucide-react";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead, ProductCrmLeadActivity } from "./productCrmTypes";
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
  onCreateActivity: (leadId: string, input: any) => Promise<void>;
  onUpdateLead: (leadId: string, input: any) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmLeadDetailsTabs({
  activeTab,
  lead,
  activities,
  stages,
  onCreateActivity,
  onUpdateLead,
  vehicleOptions,
}: Props) {
  // 1. Overview Tab
  if (activeTab === "visao") {
    return (
      <CrmLeadDetailsTabsVisao
        activities={activities}
        lead={lead}
        onCreateActivity={onCreateActivity}
        stages={stages}
        vehicleOptions={vehicleOptions}
      />
    );
  }

  // 2. Chat Tab
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
          Inicie uma conversa para registrar todas as mensagens neste lead.
        </p>
        <div className="flex items-center gap-3">
          <button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer">
            <MessageSquare className="size-3.5" />
            <span>Iniciar por WhatsApp</span>
          </button>
          <button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-line bg-panel/10 px-4 text-xs font-bold text-app-text hover:bg-line/10 transition-colors cursor-pointer">
            <Mail className="size-3.5" />
            <span>Iniciar por E-mail</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Tarefas Tab
  if (activeTab === "tarefas") {
    return (
      <CrmLeadDetailsTabsTarefas
        lead={lead}
        activities={activities}
        onCreateActivity={onCreateActivity}
      />
    );
  }

  // 4. Reuniões Tab
  if (activeTab === "reunioes") {
    return (
      <CrmLeadDetailsTabsReunioes
        lead={lead}
        activities={activities}
        onCreateActivity={onCreateActivity}
      />
    );
  }

  // 5. Notas Tab
  if (activeTab === "notas") {
    return (
      <CrmLeadDetailsTabsNotas
        lead={lead}
        activities={activities}
        onCreateActivity={onCreateActivity}
      />
    );
  }

  // 6. Arquivos Tab
  if (activeTab === "arquivos") {
    return (
      <div className="flex flex-col gap-5 select-none text-app-text">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-app-text">Arquivos</span>
          <button className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-panel/10 px-3 text-xs font-bold text-app-text hover:bg-line/15 transition-colors cursor-pointer">
            <Plus className="size-3.5" />
            <span>Adicionar</span>
          </button>
        </div>
        <div className="border border-dashed border-line/35 bg-panel/5 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
          <Upload className="size-7 text-muted" />
          <span className="text-xs font-bold text-app-text">
            Arraste um arquivo aqui ou{" "}
            <span className="text-blue-500 cursor-pointer hover:underline">
              selecione do computador
            </span>
          </span>
          <span className="text-[10px] font-bold text-muted">Máximo 30MB</span>
        </div>
        <div className="text-center py-2">
          <span className="text-xs font-bold text-muted">
            Nenhum arquivo enviado.
          </span>
        </div>
      </div>
    );
  }

  // 7. Financiamento Tab
  if (activeTab === "financeiro") {
    return (
      <CrmLeadDetailsFinanciamento
        lead={lead}
        onCreateActivity={onCreateActivity}
        onUpdateLead={onUpdateLead}
      />
    );
  }

  // 8. Portal Tab
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

  // Fallback empty view for other tabs
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
      <Calendar className="size-8 text-muted/65 mb-2" />
      <span className="text-xs font-bold">
        Nenhum registro encontrado nesta aba.
      </span>
    </div>
  );
}
