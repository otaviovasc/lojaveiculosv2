import { useState } from "react";
import { Plus, Briefcase, CheckSquare, RefreshCw, Layers } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import type { PipelineStageDraft } from "./crmPipelineStorage";
import { crmPipelinePresets } from "./crmPipelinePresets";

type Props = {
  onClose: () => void;
  onCreatePipeline: (name: string, stages?: PipelineStageDraft[]) => void;
};

export function CrmQuickAddPipelineModal({ onClose, onCreatePipeline }: Props) {
  const [name, setName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("vendas");

  const handleSubmit = () => {
    if (!name.trim()) return;
    const preset =
      crmPipelinePresets.find((p) => p.id === selectedPresetId) ??
      crmPipelinePresets[0]!;
    onCreatePipeline(name.trim(), preset.stages);
    onClose();
  };

  const selectedPreset =
    crmPipelinePresets.find((p) => p.id === selectedPresetId) ??
    crmPipelinePresets[0]!;

  const renderIcon = (name: string) => {
    const classes =
      "size-4 shrink-0 text-muted group-data-[selected=true]:text-accent";
    if (name === "vendas") return <Briefcase className={classes} />;
    if (name === "pos_venda") return <CheckSquare className={classes} />;
    if (name === "recuperacao") return <RefreshCw className={classes} />;
    return <Layers className={classes} />;
  };

  return (
    <FeatureDialog
      className="max-w-xl"
      description="Criar funil de vendas personalizado"
      footer={
        <FeatureDialogActions
          confirmDisabled={!name.trim()}
          confirmIcon={<Plus aria-hidden="true" className="size-4" />}
          confirmLabel="Criar Pipeline"
          onCancel={onClose}
          onConfirm={handleSubmit}
        />
      }
      isOpen
      onClose={onClose}
      title="Novo Pipeline"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <FeatureField label="Nome do Funil / Pipeline *">
          <FeatureInput
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Vendas Repasse, Pós-Venda Sul..."
            required
            type="text"
            value={name}
          />
        </FeatureField>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-black text-app-text">
            Selecione um Modelo
          </span>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {crmPipelinePresets.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  aria-pressed={isSelected}
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
                  <p className="text-xs font-bold text-muted mt-1.5 leading-relaxed">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 bg-app-elevated/20 border border-line/60 rounded-xl p-3.5 mt-1">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Visualização das Etapas Iniciais ({selectedPreset.stages.length})
          </span>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {selectedPreset.stages.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border uppercase tracking-wider"
                  style={{
                    backgroundColor: stage.color + "15",
                    borderColor: stage.color,
                    color: stage.color,
                  }}
                >
                  {stage.name}
                </span>
                {idx < selectedPreset.stages.length - 1 && (
                  <span className="text-muted text-xs font-black font-mono">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button
          aria-hidden="true"
          className="hidden"
          tabIndex={-1}
          type="submit"
        />
      </form>
    </FeatureDialog>
  );
}
