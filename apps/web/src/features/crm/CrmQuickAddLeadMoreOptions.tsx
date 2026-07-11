import { CrmDateField, CrmSelect } from "./CrmFormControls";
import { crmPriorityOptions } from "./crmLeadData";
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

const categoryOptions = [
  { label: "Não definida", value: "Não definida" },
  { label: "Venda", value: "Venda" },
  { label: "Troca", value: "Troca" },
  { label: "Financiamento", value: "Financiamento" },
  { label: "Consórcio", value: "Consórcio" },
];
const contactOptions = [
  { label: "WhatsApp", value: "WhatsApp" },
  { label: "Telefone", value: "Telefone" },
  { label: "E-mail", value: "E-mail" },
];
const sourceOptions = [
  { label: "Selecionar origem", value: "" },
  { label: "Manual", value: "manual" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Site público", value: "public_site" },
  { label: "CRM", value: "crm" },
  { label: "API externa", value: "external_api" },
  { label: "OLX", value: "olx" },
  { label: "Outro", value: "other" },
];

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
          <CrmSelect
            className="min-h-10 px-2.5 text-xs"
            onChange={setSelectedStageId}
            options={stages.map((stage) => ({
              label: stage.name,
              value: stage.id,
            }))}
            value={selectedStageId}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Prioridade
          </span>
          <CrmSelect
            className="min-h-10 px-2.5 text-xs"
            onChange={setPriority}
            options={crmPriorityOptions}
            value={priority}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Previsão fechamento
          </span>
          <CrmDateField
            label="Previsão"
            onChange={setEstimatedClosedDate}
            value={estimatedClosedDate}
          />
        </div>
      </div>

      {/* Row 2: Urgência, Categoria, Contato preferido */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Urgência
          </span>
          <CrmSelect
            className="min-h-10 px-2.5 text-xs"
            onChange={setUrgency}
            options={crmPriorityOptions}
            value={urgency}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Categoria
          </span>
          <CrmSelect
            className="min-h-10 px-2.5 text-xs"
            onChange={setCategory}
            options={categoryOptions}
            value={category}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted">
            Contato preferido
          </span>
          <CrmSelect
            className="min-h-10 px-2.5 text-xs"
            onChange={setPreferredContact}
            options={contactOptions}
            value={preferredContact}
          />
        </label>
      </div>

      {/* Row 3: Fonte */}
      <div className="grid grid-cols-1 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Fonte
          </span>
          <CrmSelect
            onChange={(value) => setSource(value as CrmLeadSource | "")}
            options={sourceOptions}
            value={source}
          />
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
