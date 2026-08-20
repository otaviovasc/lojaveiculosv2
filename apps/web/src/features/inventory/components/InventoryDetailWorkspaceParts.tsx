import { useState } from "react";
import { ChevronDown, Gauge, PencilLine } from "lucide-react";
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import { NotesBlockField } from "./NotesBlockField";

export type TabId =
  "geral" | "financeiro" | "anuncio" | "documentos" | "historico" | "vitrine";

export function TechnicalSpecsPanel({
  specs,
  onEditSpecs,
  notasInternas,
  onSaveNotasInternas,
}: {
  specs: {
    plate: string;
    color: string;
    km: string;
    fuel: string;
    transmission: string;
    bodyType: string;
    engine: string;
    doors: string;
    modality: string;
    vin: string;
  };
  onEditSpecs: () => void;
  notasInternas: string;
  onSaveNotasInternas: (notes: string) => void;
}) {
  const [isNotasExpanded, setIsNotasExpanded] = useState(false);

  return (
    <div className="glass-panel-branded rounded-2xl p-5 border border-line flex flex-col gap-4 hover:border-accent/40 hover:shadow-md transition-all group">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-app-text uppercase tracking-wider">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Gauge className="size-4" />
          </span>
          Especificações Técnicas
        </h3>
        <FeatureActionButton
          icon={PencilLine}
          label="Editar dados do veículo"
          onClick={onEditSpecs}
        >
          Editar veículo
        </FeatureActionButton>
      </div>

      <div className="flex flex-col gap-2.5">
        {[
          { label: "Placa", value: specs.plate },
          { label: "Cor", value: specs.color },
          { label: "Quilometragem", value: specs.km },
          { label: "Combustível", value: specs.fuel },
          { label: "Transmissão", value: specs.transmission },
          { label: "Carroceria", value: specs.bodyType },
          { label: "Motor", value: specs.engine },
          { label: "Portas", value: specs.doors },
          { label: "Modalidade", value: specs.modality },
          { label: "Chassi", value: specs.vin },
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between items-center text-xs font-bold border-b border-line/30 pb-2"
          >
            <span className="text-muted">{row.label}</span>
            <span className="text-app-text font-black">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-line">
        <div>
          <button
            aria-controls="inventory-internal-notes"
            aria-expanded={isNotasExpanded}
            onClick={(e) => {
              e.stopPropagation();
              setIsNotasExpanded(!isNotasExpanded);
            }}
            className="w-full flex items-center justify-between p-3.5 text-left text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <div className="flex items-center gap-2">
              <span>Notas Internas</span>
              {notasInternas.trim() && (
                <span className="size-2 rounded-full bg-emerald-500 block animate-none" />
              )}
            </div>
            <ChevronDown
              aria-hidden="true"
              className={
                "size-4 text-muted transition-transform duration-200 " +
                (isNotasExpanded ? "rotate-180" : "")
              }
            />
          </button>

          {isNotasExpanded ? (
            <div
              id="inventory-internal-notes"
              className="p-3.5 bg-app/40 border-t border-line/60"
              onClick={(e) => e.stopPropagation()}
            >
              <NotesBlockField
                label="Nota Interna"
                value={notasInternas}
                onSave={onSaveNotasInternas}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
