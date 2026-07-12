import { useState } from "react";
import { Check, Edit2, ShieldCheck } from "lucide-react";

export function DocumentosRenaveCard() {
  const [renaveCode, setRenaveCode] = useState("REV-82947118");
  const [isEditing, setIsEditing] = useState(false);
  const [tempCode, setTempCode] = useState(renaveCode);

  const steps = [
    { id: "e1", label: "Entrada", status: "completed" },
    { id: "e2", label: "Intenção", status: "active" },
    { id: "e3", label: "Autorização", status: "pending" },
    { id: "e4", label: "Conclusão", status: "pending" },
  ];

  const handleSave = () => {
    setRenaveCode(tempCode);
    setIsEditing(false);
  };

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-accent shrink-0" />
          <span>Fluxo RENAVE</span>
        </h3>
        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 text-xs font-black px-2 py-0.5 rounded-full select-none">
          Entrada Concluída
        </span>
      </div>

      {/* Code Area */}
      <div className="flex flex-col gap-1.5 text-xs font-bold">
        <span className="text-xs font-black uppercase tracking-wider text-muted">
          Código de Registro (CRV/ATPV-e)
        </span>
        <div className="flex gap-2">
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Adicionar código..."
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value)}
                className="min-h-9 flex-1 rounded-lg border border-line bg-app px-3 text-xs font-bold outline-none"
              />
              <button
                aria-label="Salvar código RENAVE"
                onClick={handleSave}
                className="p-2 bg-accent text-inverse rounded-lg hover:bg-accent-strong cursor-pointer shrink-0"
                type="button"
              >
                <Check aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between min-h-9 rounded-lg border border-line bg-app/30 px-3">
              <span className="text-app-text font-black">
                {renaveCode || "Não Informado"}
              </span>
              <button
                aria-label="Editar código RENAVE"
                onClick={() => {
                  setTempCode(renaveCode);
                  setIsEditing(true);
                }}
                className="text-muted hover:text-accent cursor-pointer transition-colors"
                type="button"
              >
                <Edit2 aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Flow */}
      <div className="flex flex-col gap-3 pt-2">
        <span className="text-xs font-black uppercase tracking-wider text-muted">
          Etapas do Processo
        </span>
        <div className="flex items-center gap-1.5 justify-between">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div
                className={
                  "h-1.5 rounded-full transition-all duration-300 " +
                  (step.status === "completed"
                    ? "bg-emerald-500"
                    : step.status === "active"
                      ? "bg-accent animate-pulse"
                      : "bg-line")
                }
              />
              <div className="flex min-w-0 items-center justify-center text-xs font-black uppercase leading-tight tracking-normal">
                <span
                  className={
                    "text-center " +
                    (step.status === "completed"
                      ? "text-emerald-500 font-bold"
                      : step.status === "active"
                        ? "text-accent font-bold"
                        : "text-muted")
                  }
                >
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
