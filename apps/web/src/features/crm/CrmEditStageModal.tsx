import { useState } from "react";
import { X, Check } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import type { PipelineStage } from "./crmPipelineStorage";

type Props = {
  stage: PipelineStage;
  onClose: () => void;
  onSave: (name: string, color: string, slaDays: number | null) => void;
};

const PRESET_COLORS = [
  "#" + "3b82f6", // Blue
  "#" + "6366f1", // Indigo
  "#" + "a855f7", // Purple
  "#" + "ec4899", // Pink
  "#" + "ef4444", // Red
  "#" + "f97316", // Orange
  "#" + "eab308", // Yellow
  "#" + "22c55e", // Green
];

export function CrmEditStageModal({ stage, onClose, onSave }: Props) {
  const [name, setName] = useState(stage.name);
  const [slaDays, setSlaDays] = useState(stage.slaDays ?? 1);
  const [color, setColor] = useState(stage.color);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color, stage.status === "open" ? slaDays : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        className="w-full max-w-md glass-panel-branded bg-panel rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col"
        onSubmit={handleSubmit}
      >
        <header className="p-4 border-b border-line/45 flex items-center justify-between shrink-0 bg-app-elevated/45">
          <div>
            <h3 className="text-sm font-black text-app-text">Editar Etapa</h3>
            <p className="text-xs font-bold text-muted mt-0.5">
              Altere o nome, cor ou SLA da etapa
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

        <div className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-black text-app-text">
              Nome da Etapa *
            </span>
            <FeatureInput
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Qualificado"
              required
              type="text"
              value={name}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                SLA de Atendimento (Dias)
              </span>
              <FeatureInput
                disabled={stage.status !== "open"}
                min={1}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                type="number"
                value={slaDays}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Cor da Etapa
              </span>
              <div className="flex items-center gap-2">
                <input
                  className="size-11 rounded-lg border border-line bg-transparent p-0.5 cursor-pointer"
                  onChange={(e) => setColor(e.target.value)}
                  type="color"
                  value={color}
                />
                <span className="text-xs font-mono font-bold text-muted uppercase">
                  {color}
                </span>
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-line/20 pt-3">
            <span className="text-xs font-black uppercase text-muted tracking-wider">
              Cores sugeridas
            </span>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={
                    "size-6 rounded-full border transition-all hover:scale-110 cursor-pointer " +
                    (color.toLowerCase() === preset.toLowerCase()
                      ? "border-accent ring-2 ring-accent/20 scale-105"
                      : "border-line/60")
                  }
                  style={{ backgroundColor: preset }}
                  onClick={() => setColor(preset)}
                  title={preset}
                />
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
            <Check aria-hidden="true" className="size-4" />
            Salvar
          </button>
        </footer>
      </form>
    </div>
  );
}
