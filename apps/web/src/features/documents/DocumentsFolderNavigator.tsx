import { CarFront, FolderArchive } from "lucide-react";
import type {
  DocumentVehicleOption,
  DocumentsFolderKey,
} from "./documentDisplayModel";
import { documentUnitFolderInfo } from "./documentDisplayModel";
import type { WorkspaceDocument } from "./types";

type FolderItem = {
  count: number;
  key: DocumentsFolderKey;
  label: string;
  subtitle: string;
};

export function DocumentsFolderNavigator({
  documents,
  isLoading,
  onSelect,
  selectedKey,
  vehicleOptions,
}: {
  documents: readonly WorkspaceDocument[];
  isLoading?: boolean;
  onSelect: (key: DocumentsFolderKey) => void;
  selectedKey: DocumentsFolderKey | null;
  vehicleOptions: readonly DocumentVehicleOption[];
}) {
  const folders = buildFolders(documents, vehicleOptions);

  return (
    <aside className="documents-folder-nav" aria-label="Pastas de documentos">
      <header>
        <strong>Pastas</strong>
        <span>{isLoading ? "Carregando unidades..." : "Geral e unidades"}</span>
      </header>

      <div className="documents-folder-list">
        {folders.map((folder) => {
          const isGeneral = folder.key === "general";
          const Icon = isGeneral ? FolderArchive : CarFront;
          const isActive = selectedKey === folder.key;

          return (
            <button
              aria-pressed={isActive}
              className={isActive ? "is-active" : undefined}
              key={folder.key}
              onClick={() => onSelect(folder.key)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
              <span>
                <strong>{folder.label}</strong>
                <small>{folder.subtitle}</small>
              </span>
              <em>{folder.count}</em>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function buildFolders(
  documents: readonly WorkspaceDocument[],
  vehicleOptions: readonly DocumentVehicleOption[],
): FolderItem[] {
  const generalCount = documents.filter(
    (document) => !documentUnitFolderInfo(document),
  ).length;
  const unitFolders = vehicleOptions.map((vehicle) => ({
    count: documents.filter(
      (document) => documentUnitFolderInfo(document)?.id === vehicle.id,
    ).length,
    key: `unit:${vehicle.id}` as const,
    label: vehicle.label,
    subtitle: formatUnitSubtitle(vehicle),
  }));

  return [
    {
      count: generalCount,
      key: "general",
      label: "Geral",
      subtitle: "Loja e documentos sem unidade",
    },
    ...unitFolders,
  ];
}

function formatUnitSubtitle(vehicle: DocumentVehicleOption) {
  const details = [
    vehicle.stockNumber ? `Estoque ${vehicle.stockNumber}` : null,
    vehicle.plate ? `Placa ${vehicle.plate}` : null,
    vehicle.vin ? `Chassi ${vehicle.vin}` : null,
  ].filter(Boolean);

  return details.join(" · ") || "Unidade vinculada";
}
