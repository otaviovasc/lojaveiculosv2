import { useEffect, useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail } from "../model/types";
import { InventoryMediaWorkspace } from "./InventoryMediaWorkspace";
import { InventoryEditPanel } from "./InventoryEditPanel";
import { TechnicalSpecsPanel } from "./InventoryDetailWorkspaceParts";

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

export function InventoryDetailGeneralTab({
  api,
  detail,
  isEditRequested = false,
  initialUnitId,
  notasInternas,
  onUpdated,
  onSaveNotasInternas,
  onEditSaved,
  onEditRequestHandled,
  specs,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  isEditRequested?: boolean;
  initialUnitId?: string | null;
  notasInternas: string;
  onUpdated: (detail: InventoryListingDetail) => void;
  onSaveNotasInternas: (notes: string) => void;
  onEditSaved?: () => void;
  onEditRequestHandled?: () => void;
  specs: Specs;
}) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditRequested) return;
    setIsEditing(true);
    onEditRequestHandled?.();
  }, [isEditRequested, onEditRequestHandled]);

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
            notasInternas={notasInternas}
            onSaveNotasInternas={onSaveNotasInternas}
          />
        </div>
      </div>
    </div>
  );
}
