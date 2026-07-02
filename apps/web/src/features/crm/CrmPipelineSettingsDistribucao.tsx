import { useState } from "react";
import { Users } from "lucide-react";
import type { Pipeline } from "./crmPipelineStorage";

type Props = {
  pipeline: Pipeline;
  onUpdate: (updated: Pipeline) => void;
};

export function CrmPipelineSettingsDistribucao({ pipeline, onUpdate }: Props) {
  const [rotationActive, setRotationActive] = useState(pipeline.rotationActive);

  const handleToggle = (checked: boolean) => {
    setRotationActive(checked);
    onUpdate({ ...pipeline, rotationActive: checked });
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-black text-app-text">Distribuição</h2>
        <p className="text-xs font-bold text-muted mt-0.5 max-w-xl leading-relaxed">
          Distribua automaticamente novos leads recebidos entre os vendedores
          ativos cadastrados na loja.
        </p>
      </div>

      {/* Main toggle card */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between border border-line/20 rounded-xl p-4 bg-panel/10 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-black text-app-text flex items-center gap-1.5">
              <Users className="size-3.5 text-muted" />
              <span>Ativar Fila de Distribuição de Vendedores</span>
            </span>
            <span className="text-xs font-bold text-muted max-w-xl leading-relaxed">
              Quando habilitado, qualquer lead entrante via integrações (Site,
              WhatsApp, OLX, API) será atribuído de forma sequencial (Round
              Robin) para os vendedores que estiverem online e com a escala de
              atendimento ativa.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggle(!rotationActive)}
            className={
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 " +
              (rotationActive ? "bg-blue-600" : "bg-line/45")
            }
          >
            <span
              className={
                "inline-block size-3.5 transform rounded-full bg-white transition-transform " +
                (rotationActive ? "translate-x-4.5" : "translate-x-1")
              }
            />
          </button>
        </div>

        {rotationActive && (
          <div className="border border-dashed border-line/40 rounded-xl p-5 bg-panel/5 text-center mt-2">
            <span className="text-xs font-bold text-muted">
              Nenhum vendedor disponível na escala no momento. Cadastre escalas
              de atendimento para iniciar a rondante.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
