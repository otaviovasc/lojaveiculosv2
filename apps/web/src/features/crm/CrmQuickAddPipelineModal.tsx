import { useState } from "react";
import {
  Plus,
  X,
  Briefcase,
  CheckSquare,
  RefreshCw,
  Layers,
} from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import type { PipelineStageDraft } from "./crmPipelineStorage";

type Props = {
  onClose: () => void;
  onCreatePipeline: (name: string, stages?: PipelineStageDraft[]) => void;
};

type PipelinePreset = {
  id: string;
  name: string;
  description: string;
  iconName: "vendas" | "pos_venda" | "recuperacao" | "em_branco";
  stages: PipelineStageDraft[];
};

const PRESETS: PipelinePreset[] = [
  {
    id: "vendas",
    name: "Vendas",
    description: "Funil de vendas clássico para novos leads e negociações.",
    iconName: "vendas",
    stages: [
      { name: "Novo lead", color: "#" + "3b82f6", slaDays: 1, status: "open" },
      {
        name: "Primeiro contato",
        color: "#" + "a855f7",
        slaDays: 2,
        status: "open",
      },
      {
        name: "Qualificado",
        color: "#" + "6366f1",
        slaDays: 3,
        status: "open",
      },
      { name: "Proposta", color: "#" + "f97316", slaDays: 4, status: "open" },
      { name: "Negociação", color: "#" + "eab308", slaDays: 5, status: "open" },
      { name: "Ganho", color: "#" + "22c55e", slaDays: null, status: "won" },
      { name: "Perdido", color: "#" + "ef4444", slaDays: null, status: "lost" },
    ],
  },
  {
    id: "pos_venda",
    name: "Pós-venda",
    description: "Entrega de veículo, documentação e fidelização.",
    iconName: "pos_venda",
    stages: [
      {
        name: "Entrega agendada",
        color: "#" + "3b82f6",
        slaDays: 1,
        status: "open",
      },
      {
        name: "Documentação",
        color: "#" + "a855f7",
        slaDays: 5,
        status: "open",
      },
      {
        name: "Revisão de entrega",
        color: "#" + "eab308",
        slaDays: 2,
        status: "open",
      },
      { name: "Pesquisa", color: "#" + "f97316", slaDays: 3, status: "open" },
      {
        name: "Finalizado",
        color: "#" + "22c55e",
        slaDays: null,
        status: "won",
      },
    ],
  },
  {
    id: "recuperacao",
    name: "Recuperação",
    description: "Reengajamento de leads frios e clientes perdidos.",
    iconName: "recuperacao",
    stages: [
      {
        name: "Lead inativo",
        color: "#" + "ef4444",
        slaDays: 7,
        status: "open",
      },
      {
        name: "Tentativa de contato",
        color: "#" + "a855f7",
        slaDays: 2,
        status: "open",
      },
      {
        name: "Oferta especial",
        color: "#" + "eab308",
        slaDays: 3,
        status: "open",
      },
      {
        name: "Reativado",
        color: "#" + "22c55e",
        slaDays: null,
        status: "won",
      },
      {
        name: "Definitivo",
        color: "#" + "ef4444",
        slaDays: null,
        status: "lost",
      },
    ],
  },
  {
    id: "em_branco",
    name: "Em branco",
    description: "Comece com etapas mínimas e monte como preferir.",
    iconName: "em_branco",
    stages: [
      { name: "Novo", color: "#" + "3b82f6", slaDays: 1, status: "open" },
      { name: "Ganho", color: "#" + "22c55e", slaDays: null, status: "won" },
      { name: "Perdido", color: "#" + "ef4444", slaDays: null, status: "lost" },
    ],
  },
];

export function CrmQuickAddPipelineModal({ onClose, onCreatePipeline }: Props) {
  const [name, setName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("vendas");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const preset =
      PRESETS.find((p) => p.id === selectedPresetId) ?? PRESETS[0]!;
    onCreatePipeline(name.trim(), preset.stages);
    onClose();
  };

  const selectedPreset =
    PRESETS.find((p) => p.id === selectedPresetId) ?? PRESETS[0]!;

  const renderIcon = (name: string) => {
    const classes =
      "size-4 shrink-0 text-muted group-data-[selected=true]:text-accent";
    if (name === "vendas") return <Briefcase className={classes} />;
    if (name === "pos_venda") return <CheckSquare className={classes} />;
    if (name === "recuperacao") return <RefreshCw className={classes} />;
    return <Layers className={classes} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        className="w-full max-w-xl glass-panel-branded bg-panel rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col"
        onSubmit={handleSubmit}
      >
        <header className="p-4 border-b border-line/45 flex items-center justify-between shrink-0 bg-app-elevated/45">
          <div>
            <h3 className="text-sm font-black text-app-text">Novo Pipeline</h3>
            <p className="text-[10px] font-bold text-muted mt-0.5">
              Criar funil de vendas personalizado
            </p>
          </div>
          <button
            className="p-1 rounded-lg hover:bg-line/25 text-muted hover:text-app-text cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4.5" />
          </button>
        </header>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-black text-app-text">
              Nome do Funil / Pipeline *
            </span>
            <FeatureInput
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendas Repasse, Pós-Venda Sul..."
              required
              type="text"
              value={name}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-black text-app-text">
              Selecione um Modelo
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={
                      "group text-left p-3 rounded-xl border transition-all cursor-pointer " +
                      (isSelected
                        ? "bg-accent-soft/10 border-accent shadow-sm"
                        : "bg-app-elevated/20 border-line hover:border-line/80 hover:bg-line/5")
                    }
                  >
                    <div className="flex items-center gap-2">
                      {renderIcon(preset.iconName)}
                      <span
                        className={
                          "text-xs font-black " +
                          (isSelected ? "text-accent" : "text-app-text")
                        }
                      >
                        {preset.name}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-muted mt-1.5 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-app-elevated/20 border border-line/60 rounded-xl p-3.5 mt-1">
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Visualização das Etapas Iniciais ({selectedPreset.stages.length})
            </span>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {selectedPreset.stages.map((stage, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider"
                    style={{
                      backgroundColor: stage.color + "15",
                      borderColor: stage.color,
                      color: stage.color,
                    }}
                  >
                    {stage.name}
                  </span>
                  {idx < selectedPreset.stages.length - 1 && (
                    <span className="text-muted text-[10px] font-black font-mono">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="p-4 border-t border-line/45 shrink-0 bg-app-elevated/45 flex justify-end gap-2.5">
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/20 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-black text-inverse cursor-pointer hover:opacity-90 shadow-sm"
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" />
            Criar Pipeline
          </button>
        </footer>
      </form>
    </div>
  );
}
