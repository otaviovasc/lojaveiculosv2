import { Calendar } from "lucide-react";
import type { PipelineStage } from "./crmPipelineStorage";
import type { CrmLeadSource } from "./productCrmTypes";

type Props = {
  stages: PipelineStage[];
  selectedStageId: string;
  setSelectedStageId: (val: string) => void;
  priority: string;
  setPriority: (val: string) => void;
  urgency: string;
  setUrgency: (val: string) => void;
  preferredContact: string;
  setPreferredContact: (val: string) => void;
  source: CrmLeadSource | "";
  setSource: (val: CrmLeadSource | "") => void;
  notes: string;
  setNotes: (val: string) => void;
  estimatedClosedDate: string;
  setEstimatedClosedDate: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
};

export function CrmQuickAddLeadMoreOptions({
  stages,
  selectedStageId,
  setSelectedStageId,
  priority,
  setPriority,
  urgency,
  setUrgency,
  preferredContact,
  setPreferredContact,
  source,
  setSource,
  notes,
  setNotes,
  estimatedClosedDate,
  setEstimatedClosedDate,
  category,
  setCategory,
}: Props) {
  return (
    <div className="flex flex-col gap-4 border-t border-line/35 pt-4 mt-1">
      {/* Row 1: Fase, Prioridade, Previsão fechamento */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">Fase</span>
          <select
            className="min-h-10 rounded-lg border border-line bg-app px-2.5 text-xs font-bold text-app-text cursor-pointer outline-none"
            onChange={(e) => setSelectedStageId(e.target.value)}
            value={selectedStageId}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Prioridade
          </span>
          <select
            className="min-h-10 rounded-lg border border-line bg-app px-2.5 text-xs font-bold text-app-text cursor-pointer outline-none"
            onChange={(e) => setPriority(e.target.value)}
            value={priority}
          >
            <option>Baixa</option>
            <option>Média</option>
            <option>Alta</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Previsão fechamento
          </span>
          <div className="relative">
            <span className="absolute left-2.5 top-3 text-muted">
              <Calendar aria-hidden="true" className="size-3.5" />
            </span>
            <input
              className="w-full min-h-10 rounded-lg border border-line bg-app pl-8 pr-2.5 text-xs font-bold text-app-text outline-none"
              onChange={(e) => setEstimatedClosedDate(e.target.value)}
              type="date"
              value={estimatedClosedDate}
            />
          </div>
        </label>
      </div>

      {/* Row 2: Urgência, Categoria, Contato preferido */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Urgência
          </span>
          <select
            className="min-h-10 rounded-lg border border-line bg-app px-2.5 text-xs font-bold text-app-text cursor-pointer outline-none"
            onChange={(e) => setUrgency(e.target.value)}
            value={urgency}
          >
            <option>Baixa</option>
            <option>Média</option>
            <option>Alta</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Categoria
          </span>
          <select
            className="min-h-10 rounded-lg border border-line bg-app px-2.5 text-xs font-bold text-app-text cursor-pointer outline-none"
            onChange={(e) => setCategory(e.target.value)}
            value={category}
          >
            <option>Não definida</option>
            <option>Venda</option>
            <option>Troca</option>
            <option>Financiamento</option>
            <option>Consórcio</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Contato preferido
          </span>
          <select
            className="min-h-10 rounded-lg border border-line bg-app px-2.5 text-xs font-bold text-app-text cursor-pointer outline-none"
            onChange={(e) => setPreferredContact(e.target.value)}
            value={preferredContact}
          >
            <option>WhatsApp</option>
            <option>Telefone</option>
            <option>E-mail</option>
          </select>
        </label>
      </div>

      {/* Row 3: Fonte */}
      <div className="grid grid-cols-1 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Fonte
          </span>
          <select
            className="min-h-11 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none cursor-pointer"
            onChange={(e) => setSource(e.target.value as CrmLeadSource | "")}
            value={source}
          >
            <option value="">Selecionar origem</option>
            <option value="manual">Manual</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="public_site">Site público</option>
            <option value="crm">CRM</option>
            <option value="external_api">API externa</option>
            <option value="olx">OLX</option>
            <option value="other">Outro</option>
          </select>
        </label>
      </div>

      {/* Row 4: Observações */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-black uppercase text-muted tracking-wider">
          Observações
        </span>
        <textarea
          className="w-full min-h-20 rounded-lg border border-line bg-app p-3 text-sm font-bold text-app-text outline-none"
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Detalhes do negócio"
          value={notes}
        />
      </label>
    </div>
  );
}
