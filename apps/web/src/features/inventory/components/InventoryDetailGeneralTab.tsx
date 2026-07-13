import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail } from "../model/types";
import { InventoryMediaWorkspace } from "./InventoryMediaWorkspace";
import { InventoryEditPanel } from "./InventoryEditPanel";
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
  notasInternas,
  observacoes,
  onUpdated,
  onSaveNotasInternas,
  onEditSaved,
  onToggleObservacao,
  onToggleOpcional,
  opcionais,
  specs,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  initialUnitId?: string | null;
  notasInternas: string;
  observacoes: ToggleObservation[];
  onUpdated: (detail: InventoryListingDetail) => void;
  onSaveNotasInternas: (notes: string) => void;
  onEditSaved?: () => void;
  onToggleObservacao: (id: string) => void;
  onToggleOpcional: (id: string) => void;
  opcionais: ToggleOption[];
  specs: Specs;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <InventoryEditPanel
        api={api}
        detail={detail}
        onCancel={() => setIsEditing(false)}
        onSaved={() => {
          setIsEditing(false);
          onEditSaved?.();
        }}
        onUpdated={onUpdated}
        unitId={initialUnitId ?? null}
      />
    );
  }

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
            onEditSpecs={() => setIsEditing(true)}
            opcionais={opcionais}
            onToggleOpcional={onToggleOpcional}
            observacoes={observacoes}
            onToggleObservacao={onToggleObservacao}
            notasInternas={notasInternas}
            onSaveNotasInternas={onSaveNotasInternas}
          />
        </div>
      </div>
    </div>
  );
}
