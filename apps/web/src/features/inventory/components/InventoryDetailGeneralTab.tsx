import { Info } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail, InventoryMedia } from "../model/types";
import { InternalPhotosZone } from "./InternalPhotosZone";
import { InventoryMediaWorkspace } from "./InventoryMediaWorkspace";
import { TechnicalSpecsPanel } from "./InventoryDetailWorkspaceParts";
import type {
  initialObservacoes,
  initialOpcionais,
} from "./InventoryDetailWorkspaceMocks";

type Specs = {
  bodyType: string;
  color: string;
  doors: string;
  engine: string;
  fuel: string;
  km: string;
  modality: string;
  plate: string;
  transmission: string;
  vin: string;
};

type ToggleOption = (typeof initialOpcionais)[number];
type ToggleObservation = (typeof initialObservacoes)[number];

export function InventoryDetailGeneralTab({
  api,
  detail,
  initialUnitId,
  internalPhotos,
  notasInternas,
  observacoes,
  onUpdated,
  onSaveNotasInternas,
  onToggleObservacao,
  onToggleOpcional,
  opcionais,
  setIsSpecsOpen,
  specs,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  initialUnitId?: string | null;
  internalPhotos: InventoryMedia[];
  notasInternas: string;
  observacoes: ToggleObservation[];
  onUpdated: (detail: InventoryListingDetail) => void;
  onSaveNotasInternas: (notes: string) => void;
  onToggleObservacao: (id: string) => void;
  onToggleOpcional: (id: string) => void;
  opcionais: ToggleOption[];
  setIsSpecsOpen: Dispatch<SetStateAction<boolean>>;
  specs: Specs;
}) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-none">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] w-full">
        <div className="min-w-0">
          <InventoryMediaWorkspace
            api={api}
            detail={detail}
            initialUnitId={initialUnitId ?? null}
            onUpdated={onUpdated}
          />
        </div>

        <div className="flex flex-col gap-4">
          <TechnicalSpecsPanel
            specs={specs}
            onEditSpecs={() => setIsSpecsOpen(true)}
            opcionais={opcionais}
            onToggleOpcional={onToggleOpcional}
            observacoes={observacoes}
            onToggleObservacao={onToggleObservacao}
            notasInternas={notasInternas}
            onSaveNotasInternas={onSaveNotasInternas}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-4 w-full">
        <div>
          <h3 className="text-lg font-black text-app-text">
            Fotos e Registros Internos
          </h3>
          <p className="text-xs text-muted font-bold mt-0.5">
            Arquivos para controle interno da equipe comercial.
          </p>
        </div>

        <div className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-4 py-3 rounded-2xl flex items-center gap-3">
          <Info className="size-5 shrink-0 animate-pulse text-blue-500" />
          <p className="text-xs font-bold leading-relaxed">
            <strong>Atenção:</strong> Estas fotos são estritamente para uso
            interno (avaliações, pequenos reparos, etc.) e <strong>NÃO</strong>{" "}
            serão publicadas em anúncios ou feeds externos.
          </p>
        </div>

        <InternalPhotosZone internalPhotos={internalPhotos} />
      </div>
    </div>
  );
}
