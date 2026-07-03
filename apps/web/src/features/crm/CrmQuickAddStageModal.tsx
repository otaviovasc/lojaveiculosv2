import { useState } from "react";
import { Plus, X, Layers } from "lucide-react";
import { FeatureColorPicker } from "../../components/ui/FeatureColorPicker";
import { FeatureInput } from "../../components/ui/FeatureControls";

type Props = {
  onClose: () => void;
  onAddStage: (name: string, color: string, slaDays: number) => void;
};

const defaultStageColor = ["#", "3b82f6"].join("");
const stageColorPresets = [
  "3b82f6",
  "6366f1",
  "a855f7",
  "ec4899",
  "ef4444",
  "f97316",
  "eab308",
  "22c55e",
].map((color) => ["#", color].join(""));

export function CrmQuickAddStageModal({ onClose, onAddStage }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultStageColor);
  const [slaDays, setSlaDays] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddStage(name.trim(), color, slaDays);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        className="w-full max-w-md glass-panel-branded bg-panel rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col"
        onSubmit={handleSubmit}
      >
        <header className="p-4 border-b border-line/45 flex items-center justify-between shrink-0 bg-app-elevated/45">
          <div className="flex items-center gap-2">
            <Layers aria-hidden="true" className="size-5 text-accent" />
            <div>
              <h3 className="text-sm font-black text-app-text">
                Criar Nova Fase
              </h3>
              <p className="text-xs font-bold text-muted mt-0.5">
                Adicionar etapa ao funil de vendas
              </p>
            </div>
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
              Nome da Fase *
            </span>
            <FeatureInput
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Proposta Enviada"
              required
              type="text"
              value={name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                SLA de Atendimento (Dias)
              </span>
              <FeatureInput
                min={1}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                type="number"
                value={slaDays}
              />
            </label>
            <FeatureColorPicker
              label="Cor da Etapa"
              onChange={setColor}
              presets={stageColorPresets}
              value={color}
            />
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
            Adicionar Fase
          </button>
        </footer>
      </form>
    </div>
  );
}
