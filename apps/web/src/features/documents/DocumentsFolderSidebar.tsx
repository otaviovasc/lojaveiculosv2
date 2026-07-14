import { CarFront, FolderArchive, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  documentUnitFolderInfo,
  type DocumentVehicleOption,
  type DocumentsFolderKey,
} from "./documentDisplayModel";
import type { WorkspaceDocument } from "./types";

type FolderRow = {
  count: number;
  key: DocumentsFolderKey;
  label: string;
  primaryMediaUrl: string | null;
  searchHaystack: string;
  subtitle: string;
};

type FolderGroup = {
  folders: FolderRow[];
  title: string;
};

export function DocumentsFolderSidebar({
  documents,
  isLoading,
  onSelect,
  searchPlaceholder = "Buscar pasta ou unidade",
  selectedKey,
  vehicleOptions,
}: {
  documents: readonly WorkspaceDocument[];
  isLoading?: boolean;
  onSelect: (key: DocumentsFolderKey) => void;
  searchPlaceholder?: string;
  selectedKey: DocumentsFolderKey;
  vehicleOptions: readonly DocumentVehicleOption[];
}) {
  const [search, setSearch] = useState("");
  const groups = useMemo(
    () => buildGroups(documents, vehicleOptions, search),
    [documents, search, vehicleOptions],
  );

  return (
    <aside
      className="documents-folder-sidebar"
      aria-label="Pastas de documentos"
    >
      <header className="documents-folder-sidebar-header">
        <strong>Pastas</strong>
        <span>{isLoading ? "Carregando unidades..." : "Geral e unidades"}</span>
      </header>

      <label className="documents-folder-sidebar-search">
        <span className="sr-only">Buscar pasta ou unidade</span>
        <Search aria-hidden="true" className="size-4 text-muted" />
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={search}
        />
      </label>

      <nav className="documents-folder-sidebar-list">
        {groups.map((group) => (
          <FolderGroupView
            group={group}
            key={group.title}
            onSelect={onSelect}
            selectedKey={selectedKey}
          />
        ))}

        {groups.every((group) => group.folders.length === 0) ? (
          <p className="documents-folder-sidebar-empty">
            Nenhuma pasta encontrada para "{search}".
          </p>
        ) : null}
      </nav>
    </aside>
  );
}

function FolderGroupView({
  group,
  onSelect,
  selectedKey,
}: {
  group: FolderGroup;
  onSelect: (key: DocumentsFolderKey) => void;
  selectedKey: DocumentsFolderKey;
}) {
  if (group.folders.length === 0) return null;
  return (
    <section className="documents-folder-sidebar-group">
      <header>
        <span>{group.title}</span>
        <small>{group.folders.length}</small>
      </header>
      <ul>
        {group.folders.map((folder) => (
          <FolderRowView
            folder={folder}
            key={folder.key}
            onSelect={onSelect}
            selectedKey={selectedKey}
          />
        ))}
      </ul>
    </section>
  );
}

function FolderRowView({
  folder,
  onSelect,
  selectedKey,
}: {
  folder: FolderRow;
  onSelect: (key: DocumentsFolderKey) => void;
  selectedKey: DocumentsFolderKey;
}) {
  const isActive = selectedKey === folder.key;
  const isUnit = folder.key !== "general";

  return (
    <li>
      <button
        aria-current={isActive ? "page" : undefined}
        className={
          "documents-folder-sidebar-row" +
          (isActive ? " documents-folder-sidebar-row--active" : "")
        }
        onClick={() => onSelect(folder.key)}
        type="button"
      >
        <FolderIcon primaryMediaUrl={folder.primaryMediaUrl} isUnit={isUnit} />
        <span className="documents-folder-sidebar-row-text">
          <strong>{folder.label}</strong>
          <small>{folder.subtitle}</small>
        </span>
        <em className="documents-folder-sidebar-count">{folder.count}</em>
      </button>
    </li>
  );
}

function FolderIcon({
  isUnit,
  primaryMediaUrl,
}: {
  isUnit: boolean;
  primaryMediaUrl: string | null;
}) {
  if (isUnit && primaryMediaUrl) {
    return (
      <span className="documents-folder-sidebar-thumb" aria-hidden="true">
        <img
          alt=""
          className="documents-folder-sidebar-thumb-image"
          loading="lazy"
          src={primaryMediaUrl}
        />
      </span>
    );
  }
  const Fallback = isUnit ? CarFront : FolderArchive;
  return (
    <Fallback
      aria-hidden="true"
      className="size-4 shrink-0 text-muted documents-folder-sidebar-fallback"
    />
  );
}

function buildGroups(
  documents: readonly WorkspaceDocument[],
  vehicleOptions: readonly DocumentVehicleOption[],
  search: string,
): FolderGroup[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const matchesSearch = (haystack: string) =>
    normalizedSearch.length === 0 ||
    haystack.toLocaleLowerCase("pt-BR").includes(normalizedSearch);

  const generalCount = documents.filter(
    (document) => !documentUnitFolderInfo(document),
  ).length;
  const generalRow: FolderRow = {
    count: generalCount,
    key: "general",
    label: "Geral",
    primaryMediaUrl: null,
    searchHaystack: "geral loja documentos sem unidade",
    subtitle: "Loja e documentos sem unidade",
  };

  const unitRows: FolderRow[] = vehicleOptions
    .map((vehicle) => {
      const count = documents.filter(
        (document) => documentUnitFolderInfo(document)?.id === vehicle.id,
      ).length;
      return {
        count,
        key: `unit:${vehicle.id}` as DocumentsFolderKey,
        label: vehicle.label,
        primaryMediaUrl: vehicle.primaryMediaUrl,
        searchHaystack: [
          vehicle.label,
          vehicle.plate,
          vehicle.stockNumber,
          vehicle.vin,
        ]
          .filter(Boolean)
          .join(" "),
        subtitle: formatUnitSubtitle(vehicle),
      };
    })
    .filter((row) => matchesSearch(row.searchHaystack));

  const generalGroup: FolderGroup = matchesSearch(generalRow.searchHaystack)
    ? { folders: [generalRow], title: "Geral" }
    : { folders: [], title: "Geral" };

  return [
    generalGroup,
    {
      folders: unitRows,
      title: `Unidades (${unitRows.length})`,
    },
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
