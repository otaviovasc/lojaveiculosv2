import { useState } from "react";
import { ChevronDown, Gauge } from "lucide-react";
import { NotesBlockField } from "./NotesBlockField";

export type TabId =
  "geral" | "financeiro" | "anuncio" | "documentos" | "historico" | "vitrine";

export function TechnicalSpecsPanel({
  specs,
  onEditSpecs,
  opcionais,
  onToggleOpcional,
  observacoes,
  onToggleObservacao,
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
  opcionais: readonly { id: string; label: string; checked: boolean }[];
  onToggleOpcional: (id: string) => void;
  observacoes: readonly { id: string; label: string; checked: boolean }[];
  onToggleObservacao: (id: string) => void;
  notasInternas: string;
  onSaveNotasInternas: (notes: string) => void;
}) {
  const [isOpcionaisExpanded, setIsOpcionaisExpanded] = useState(false);
  const [isObservacoesExpanded, setIsObservacoesExpanded] = useState(false);
  const [isNotasExpanded, setIsNotasExpanded] = useState(false);

  const activeOpcionaisCount = opcionais.filter((o) => o.checked).length;
  const activeObservacoesCount = observacoes.filter((o) => o.checked).length;

  return (
    <div className="glass-panel-branded rounded-2xl p-5 border border-line flex flex-col gap-4 hover:border-accent/40 hover:shadow-md transition-all group">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-app-text uppercase tracking-wider">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Gauge className="size-4" />
          </span>
          Especificações Técnicas
        </h3>
        <button
          className="text-xs font-black text-accent-strong hover:underline"
          onClick={onEditSpecs}
          type="button"
        >
          Editar especificações
        </button>
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

      {/* Accordions Stack */}
      <div className="mt-2 overflow-hidden rounded-xl border border-line divide-y divide-line/60">
        {/* 1. Opcionais dropdown */}
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpcionaisExpanded(!isOpcionaisExpanded);
            }}
            className="w-full flex items-center justify-between p-3.5 text-left text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <div className="flex items-center gap-2">
              <span>Opcionais do Veículo</span>
              <span className="bg-accent-soft text-accent-strong text-xs font-black px-2 py-0.5 rounded-full">
                {activeOpcionaisCount}
              </span>
            </div>
            <ChevronDown
              className={
                "size-4 text-muted transition-transform duration-200 " +
                (isOpcionaisExpanded ? "rotate-180" : "")
              }
            />
          </button>

          {isOpcionaisExpanded && (
            <div
              className="p-3.5 bg-app/40 border-t border-line/60 flex flex-col gap-2.5 max-h-48 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {opcionais.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2.5 cursor-pointer text-xs select-none"
                >
                  <input
                    type="checkbox"
                    checked={o.checked}
                    onChange={() => onToggleOpcional(o.id)}
                    className="size-4.5 rounded border-line text-accent focus:ring-accent accent-accent cursor-pointer animate-none"
                  />
                  <span className="font-bold text-app-text">{o.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 2. Observações Especiais dropdown */}
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsObservacoesExpanded(!isObservacoesExpanded);
            }}
            className="w-full flex items-center justify-between p-3.5 text-left text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <div className="flex items-center gap-2">
              <span>Observações Especiais</span>
              <span className="bg-accent-soft text-accent-strong text-xs font-black px-2 py-0.5 rounded-full">
                {activeObservacoesCount}
              </span>
            </div>
            <ChevronDown
              className={
                "size-4 text-muted transition-transform duration-200 " +
                (isObservacoesExpanded ? "rotate-180" : "")
              }
            />
          </button>

          {isObservacoesExpanded && (
            <div
              className="p-3.5 bg-app/40 border-t border-line/60 flex flex-col gap-2.5 max-h-48 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {observacoes.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2.5 cursor-pointer text-xs select-none"
                >
                  <input
                    type="checkbox"
                    checked={o.checked}
                    onChange={() => onToggleObservacao(o.id)}
                    className="size-4.5 rounded border-line text-accent focus:ring-accent accent-accent cursor-pointer animate-none"
                  />
                  <span className="font-bold text-app-text">{o.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 3. Notas Internas dropdown */}
        <div>
          <button
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
              className={
                "size-4 text-muted transition-transform duration-200 " +
                (isNotasExpanded ? "rotate-180" : "")
              }
            />
          </button>

          {isNotasExpanded && (
            <div
              className="p-3.5 bg-app/40 border-t border-line/60"
              onClick={(e) => e.stopPropagation()}
            >
              <NotesBlockField
                label="Nota Interna"
                value={notasInternas}
                onSave={onSaveNotasInternas}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-line pt-3.5 mt-1">
        {["Destaque", "Laudo Aprovado", "Único Dono"].map((tag) => (
          <span
            key={tag}
            className="bg-accent-soft text-accent-strong text-xs font-black uppercase px-2 py-0.5 rounded-full border border-accent-soft/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
