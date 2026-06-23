import { useState } from "react";
import {
  Briefcase,
  Shield,
  ChevronDown,
  Info,
  Upload,
  AlertTriangle,
} from "lucide-react";

export type TabId =
  | "geral"
  | "financeiro"
  | "anuncio"
  | "documentos"
  | "vendas"
  | "historico"
  | "vitrine";

export function WorkspaceKPIStrip({
  salePrice,
  acquisitionPrice,
  margin,
  stockTime,
  renaveStatus,
  isFinancingActive,
  isInsuranceActive,
  onFinancingToggle,
  onInsuranceToggle,
}: {
  salePrice: string;
  acquisitionPrice: string;
  margin: string;
  stockTime: string;
  renaveStatus: string;
  isFinancingActive: boolean;
  isInsuranceActive: boolean;
  onFinancingToggle: () => void;
  onInsuranceToggle: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center bg-panel/30 border border-line/60 rounded-2xl p-4.5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4.5 flex-1 min-w-0">
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Preço de Venda
          </span>
          <span className="block text-base font-black text-accent-strong mt-0.5">
            {salePrice}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Valor de Aquisição
          </span>
          <span className="block text-base font-black mt-0.5 text-app-text">
            {acquisitionPrice}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Margem Estimada
          </span>
          <span className="block text-base font-black text-emerald-500 mt-0.5">
            {margin}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Tempo em Pátio
          </span>
          <span className="block text-base font-black text-violet-500 mt-0.5">
            {stockTime}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Status RENAVE
          </span>
          <span className="block text-base font-black text-blue-500 mt-0.5">
            {renaveStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-line/60 pt-4 lg:pt-0 lg:pl-6 shrink-0">
        <button
          onClick={onFinancingToggle}
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer border " +
            (isFinancingActive
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
              : "bg-app-elevated text-app-text hover:bg-line/25 border-line")
          }
        >
          <Briefcase className="size-3.5" />
          <span>Financiamento</span>
        </button>
        <button
          onClick={onInsuranceToggle}
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer border " +
            (isInsuranceActive
              ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
              : "bg-app-elevated text-app-text hover:bg-line/25 border-line")
          }
        >
          <Shield className="size-3.5" />
          <span>Seguros</span>
        </button>
      </div>
    </div>
  );
}

export function TechnicalSpecsPanel({
  plate,
  fuel,
  vin,
}: {
  plate: string;
  fuel: string;
  vin: string;
}) {
  const [opcionaisOpen, setOpcionaisOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [notasOpen, setNotasOpen] = useState(false);

  return (
    <div className="glass-panel-branded rounded-2xl p-5 border border-line flex flex-col gap-4">
      <h3 className="text-sm font-black text-app-text uppercase tracking-wider border-b border-line pb-2">
        Especificações Técnicas
      </h3>

      <div className="flex flex-col gap-2.5">
        {[
          { label: "Placa", value: plate },
          { label: "Cor", value: "Cinza Metálico" },
          { label: "Quilometragem", value: "32.500 km" },
          { label: "Combustível", value: fuel },
          { label: "Transmissão", value: "Automático" },
          { label: "Carroceria", value: "Sedan" },
          { label: "Motor", value: "2.0 Turbo" },
          { label: "Portas", value: "4 Portas" },
          { label: "Modalidade", value: "Estoque Próprio" },
          { label: "Chassi", value: vin },
        ].map((row, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center text-xs font-bold border-b border-line/30 pb-2"
          >
            <span className="text-muted">{row.label}</span>
            <span className="text-app-text font-black">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <div className="border border-line/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpcionaisOpen(!opcionaisOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-app text-left text-xs font-black text-app-text hover:bg-line/25 transition-all"
            type="button"
          >
            <span>Opcionais do Veículo</span>
            <ChevronDown
              className={
                "size-4 text-muted transition-transform " +
                (opcionaisOpen ? "rotate-180" : "")
              }
            />
          </button>
          {opcionaisOpen && (
            <div className="p-3.5 border-t border-line/30 text-xs font-bold text-muted flex flex-wrap gap-1.5 bg-panel/30">
              {[
                "Ar Condicionado Digital",
                "Direção Elétrica",
                "Teto Solar",
                "Couro",
                "Central Multimídia",
                "Sensor de Ré",
                "Piloto Automático",
              ].map((o) => (
                <span
                  key={o}
                  className="bg-app-elevated border border-line px-2 py-1 rounded-lg text-[10px]"
                >
                  {o}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border border-line/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setObsOpen(!obsOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-app text-left text-xs font-black text-app-text hover:bg-line/25 transition-all"
            type="button"
          >
            <span>Observações Especiais</span>
            <ChevronDown
              className={
                "size-4 text-muted transition-transform " +
                (obsOpen ? "rotate-180" : "")
              }
            />
          </button>
          {obsOpen && (
            <div className="p-3.5 border-t border-line/30 text-xs font-bold text-muted bg-panel/30">
              Veículo impecável, revisões feitas na concessionária autorizada.
              Laudo cautelar 100% aprovado, sem sinistros ou leilão.
            </div>
          )}
        </div>

        <div className="border border-line/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setNotasOpen(!notasOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-app text-left text-xs font-black text-app-text hover:bg-line/25 transition-all"
            type="button"
          >
            <span>Notas Internas</span>
            <ChevronDown
              className={
                "size-4 text-muted transition-transform " +
                (notasOpen ? "rotate-180" : "")
              }
            />
          </button>
          {notasOpen && (
            <div className="p-3.5 border-t border-line/30 text-xs font-bold text-muted bg-panel/30">
              Negociar IPVA proporcional. Verificar detalhe no para-choque
              traseiro antes da entrega. Margem livre de negociação R$ 5.000.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-line pt-3.5 mt-1">
        {["Destaque", "Laudo Aprovado", "Único Dono"].map((tag) => (
          <span
            key={tag}
            className="bg-accent-soft text-accent-strong text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-accent-soft/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PublicPhotosZone({
  publicPhotos,
}: {
  publicPhotos: readonly { id: string; url: string }[];
}) {
  return (
    <div className="border-2 border-dashed border-line hover:border-accent-soft/80 rounded-2xl bg-panel/30 p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer min-h-[300px] transition-all hover:bg-panel/50">
      {publicPhotos.length > 0 ? (
        <div className="w-full grid grid-cols-2 gap-2">
          {publicPhotos.slice(0, 4).map((p, idx) => (
            <div
              key={p.id}
              className="relative aspect-[16/10] overflow-hidden rounded-xl bg-app border border-line"
            >
              <img
                src={p.url}
                className="size-full object-cover"
                alt="Public vehicle"
              />
              {idx === 0 && (
                <span className="absolute bottom-2 left-2 bg-accent text-inverse text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                  Destaque
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="size-12 rounded-full bg-accent-soft flex items-center justify-center text-accent-strong border border-accent-soft/20 animate-bounce">
            <Upload className="size-6" />
          </div>
          <div>
            <p className="text-sm font-black text-app-text">
              Arraste ou clique para enviar fotos públicas
            </p>
            <p className="text-xs text-muted font-bold mt-1">
              Formatos suportados: JPG, PNG. Recomendado 1920x1080.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function InternalPhotosZone({
  internalPhotos,
}: {
  internalPhotos: readonly { id: string; url: string }[];
}) {
  return (
    <div className="border-2 border-dashed border-line hover:border-accent-soft/80 rounded-2xl bg-panel/30 p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer min-h-[160px] transition-all hover:bg-panel/50">
      {internalPhotos.length > 0 ? (
        <div className="w-full grid grid-cols-4 gap-2">
          {internalPhotos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-[16/10] overflow-hidden rounded-xl bg-app border border-line"
            >
              <img
                src={p.url}
                className="size-full object-cover"
                alt="Internal check"
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <Upload className="size-5 text-muted animate-pulse" />
          <div>
            <p className="text-xs font-black text-app-text">
              Clique ou arraste fotos internas aqui
            </p>
            <p className="text-[10px] text-muted font-bold mt-0.5">
              Adicione laudos cautelares ou imagens de avarias.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
