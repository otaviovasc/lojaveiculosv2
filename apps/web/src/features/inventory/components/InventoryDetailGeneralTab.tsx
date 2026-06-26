import { Info } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { InventoryMedia } from "../model/types";
import { InternalPhotosZone } from "./InternalPhotosZone";
import { InventoryPhotosWorkspace } from "./InventoryPhotosWorkspace";
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
  internalPhotos,
  notasInternas,
  observacoes,
  onAddPhoto,
  onDeletePhoto,
  onMovePhoto,
  onSaveNotasInternas,
  onToggleObservacao,
  onToggleOpcional,
  opcionais,
  photosList,
  setIsSpecsOpen,
  specs,
}: {
  internalPhotos: InventoryMedia[];
  notasInternas: string;
  observacoes: ToggleObservation[];
  onAddPhoto: () => void;
  onDeletePhoto: (id: string) => void;
  onMovePhoto: (from: number, to: number) => void;
  onSaveNotasInternas: (notes: string) => void;
  onToggleObservacao: (id: string) => void;
  onToggleOpcional: (id: string) => void;
  opcionais: ToggleOption[];
  photosList: InventoryMedia[];
  setIsSpecsOpen: Dispatch<SetStateAction<boolean>>;
  specs: Specs;
}) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-none">
      <div className="grid gap-6 md:grid-cols-12 w-full">
        <div className="md:col-span-8 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-black text-app-text">
              Foto de Destaque e Imagens Públicas
            </h2>
            <p className="text-xs text-muted font-bold mt-0.5">
              Essas imagens serão exibidas no portal público de vendas.
            </p>
          </div>

          <InventoryPhotosWorkspace
            photos={photosList}
            onMove={onMovePhoto}
            onDelete={onDeletePhoto}
            onUpload={onAddPhoto}
          />
        </div>

        <div className="md:col-span-4 flex flex-col gap-4">
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
