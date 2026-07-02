import { useState } from "react";
import { Plus, X, Layers } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";

type Props = {
  onClose: () => void;
  onAddStage: (name: string, color: string, slaDays: number) => void;
};

export function CrmQuickAddStageModal({ onClose, onAddStage }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#" + "3b82f6");
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
              <p className="text-[10px] font-bold text-muted mt-0.5">
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

          <div className="grid grid-cols-2 gap-4">
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
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Cores sugeridas
            </span>
            <div className="flex items-center gap-2">
              {[
                "#" + "3b82f6", // Blue
                "#" + "6366f1", // Indigo
                "#" + "a855f7", // Purple
                "#" + "ec4899", // Pink
                "#" + "ef4444", // Red
                "#" + "f97316", // Orange
                "#" + "eab308", // Yellow
                "#" + "22c55e", // Green
              ].map((preset) => (
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
            <Plus aria-hidden="true" className="size-4" />
            Adicionar Fase
          </button>
        </footer>
      </form>
    </div>
  );
}
