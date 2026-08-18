import { CarFront, FolderArchive, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FeatureSearchField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import {
  filterDocumentsForFolder,
  type DocumentVehicleOption,
  type DocumentsFolderKey,
} from "./documentDisplayModel";
import type { WorkspaceDocument } from "./types";

export type FolderGridSort =
  "docs_asc" | "docs_desc" | "title_asc" | "title_desc";

export type FolderPresenceFilter = "all" | "empty" | "has_docs";

const SORT_OPTIONS = [
  { label: "Mais documentos", value: "docs_desc" },
  { label: "Menos documentos", value: "docs_asc" },
  { label: "Título (A-Z)", value: "title_asc" },
  { label: "Título (Z-A)", value: "title_desc" },
];

const PRESENCE_OPTIONS = [
  { label: "Todas as pastas", value: "all" },
  { label: "Com documentos", value: "has_docs" },
  { label: "Pastas vazias", value: "empty" },
];

const FOLDER_CARD_BASE_CLASS =
  "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg";
const FOLDER_CARD_VARIANT_CLASS = {
  idle: "border-line bg-panel hover:border-accent/40",
  selected: "border-accent bg-accent/5 ring-2 ring-accent/30",
} as const;

const COUNT_BADGE_BASE_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums";
const COUNT_BADGE_VARIANT_CLASS = {
  empty: "border-line bg-app-elevated text-muted",
  hasDocs: "border-accent/30 bg-accent-soft text-accent-strong",
} as const;

export function DocumentsFolderCardsGrid({
  documents,
  isLoading,
  onSelectFolder,
  selectedKey,
  vehicleOptions,
}: {
  documents: readonly WorkspaceDocument[];
  isLoading?: boolean;
  onSelectFolder: (key: DocumentsFolderKey) => void;
  selectedKey: DocumentsFolderKey;
  vehicleOptions: readonly DocumentVehicleOption[];
}) {
  const [search, setSearch] = useState("");
  const [presenceFilter, setPresenceFilter] =
    useState<FolderPresenceFilter>("all");
  const [sortBy, setSortBy] = useState<FolderGridSort>("docs_desc");

  const generalDocs = useMemo(
    () => filterDocumentsForFolder(documents, "general"),
    [documents],
  );

  const vehicleFolders = useMemo(() => {
    return vehicleOptions.map((vehicle) => {
      const folderKey: DocumentsFolderKey = vehicle.unitId
        ? `unit:${vehicle.unitId}`
        : `unit:${vehicle.id}`;
      const folderDocs = filterDocumentsForFolder(documents, folderKey);
      const searchHaystack = [
        vehicle.label,
        vehicle.plate,
        vehicle.vin,
        vehicle.stockNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        count: folderDocs.length,
        folderKey,
        plate: vehicle.plate,
        primaryMediaUrl: vehicle.primaryMediaUrl,
        searchHaystack,
        stockNumber: vehicle.stockNumber,
        title: vehicle.label,
        vin: vehicle.vin,
      };
    });
  }, [documents, vehicleOptions]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicleFolders
      .filter((folder) => {
        if (q && !folder.searchHaystack.includes(q)) return false;
        if (presenceFilter === "has_docs" && folder.count === 0) return false;
        if (presenceFilter === "empty" && folder.count > 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "docs_desc") return b.count - a.count;
        if (sortBy === "docs_asc") return a.count - b.count;
        if (sortBy === "title_asc") return a.title.localeCompare(b.title);
        if (sortBy === "title_desc") return b.title.localeCompare(a.title);
        return 0;
      });
  }, [presenceFilter, search, sortBy, vehicleFolders]);

  const showGeneralFolder = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q && !"documentos gerais pasta geral avulsos".includes(q)) return false;
    if (presenceFilter === "has_docs" && generalDocs.length === 0) return false;
    if (presenceFilter === "empty" && generalDocs.length > 0) return false;
    return true;
  }, [generalDocs.length, presenceFilter, search]);

  return (
    <section
      aria-label="Grade de pastas de veículos"
      className="w-full space-y-5"
    >
      {/* Search and filter toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md">
          <FeatureSearchField
            disabled={isLoading}
            label="Buscar pastas"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por veículo, placa ou chassi..."
            value={search}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-44">
            <FeatureSelect
              ariaLabel="Filtrar por presença de documentos"
              disabled={isLoading}
              onChange={(val) => setPresenceFilter(val as FolderPresenceFilter)}
              options={PRESENCE_OPTIONS}
              value={presenceFilter}
            />
          </div>
          <div className="w-48">
            <FeatureSelect
              ariaLabel="Ordenar pastas"
              disabled={isLoading}
              onChange={(val) => setSortBy(val as FolderGridSort)}
              options={SORT_OPTIONS}
              value={sortBy}
            />
          </div>
        </div>
      </div>

      {/* Grid of Folder Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* General Folder Card */}
        {showGeneralFolder ? (
          <button
            className={`${FOLDER_CARD_BASE_CLASS} ${
              selectedKey === "general"
                ? FOLDER_CARD_VARIANT_CLASS.selected
                : FOLDER_CARD_VARIANT_CLASS.idle
            }`}
            onClick={() => onSelectFolder("general")}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent-strong transition-colors group-hover:scale-105">
                <FolderArchive aria-hidden="true" className="size-6" />
              </div>
              <span className="inline-flex items-center rounded-full border border-line bg-app-elevated px-2.5 py-0.5 text-xs font-bold text-muted tabular-nums">
                {generalDocs.length} {generalDocs.length === 1 ? "doc" : "docs"}
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-strong">
                Geral
              </span>
              <h3 className="line-clamp-1 text-sm font-extrabold text-text">
                Documentos Gerais
              </h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                Envios manuais e avulsos sem vínculo
              </p>
            </div>
          </button>
        ) : null}

        {/* Vehicle Folder Cards */}
        {filteredVehicles.map((vehicle) => {
          const isSelected = selectedKey === vehicle.folderKey;
          return (
            <button
              className={`${FOLDER_CARD_BASE_CLASS} ${
                isSelected
                  ? FOLDER_CARD_VARIANT_CLASS.selected
                  : FOLDER_CARD_VARIANT_CLASS.idle
              }`}
              key={vehicle.folderKey}
              onClick={() => onSelectFolder(vehicle.folderKey)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                {vehicle.primaryMediaUrl ? (
                  <div className="relative h-12 w-18 shrink-0 overflow-hidden rounded-xl border border-line bg-app-elevated">
                    <img
                      alt={vehicle.title}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                      src={vehicle.primaryMediaUrl}
                    />
                  </div>
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-app-elevated text-muted transition-colors group-hover:border-line-strong group-hover:text-text">
                    <CarFront aria-hidden="true" className="size-6" />
                  </div>
                )}
                <span
                  className={`${COUNT_BADGE_BASE_CLASS} ${
                    vehicle.count > 0
                      ? COUNT_BADGE_VARIANT_CLASS.hasDocs
                      : COUNT_BADGE_VARIANT_CLASS.empty
                  }`}
                >
                  {vehicle.count} {vehicle.count === 1 ? "doc" : "docs"}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-1.5">
                  {vehicle.plate ? (
                    <span className="inline-block rounded border border-line-strong bg-app px-1.5 py-0.5 font-mono text-xs font-black uppercase tracking-wider text-text">
                      {vehicle.plate}
                    </span>
                  ) : null}
                  {vehicle.stockNumber ? (
                    <span className="text-xs text-muted">
                      #{vehicle.stockNumber}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-1 line-clamp-1 text-sm font-extrabold text-text group-hover:text-accent-strong">
                  {vehicle.title}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                  {vehicle.vin ? `CHASSI: ${vehicle.vin}` : "Pasta de veículo"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty Search State */}
      {!showGeneralFolder && filteredVehicles.length === 0 ? (
        <FeatureEmptyState
          body={`Nenhuma pasta encontrada para o filtro "${search}".`}
          density="compact"
          icon={FolderOpen}
          title="Nenhuma pasta encontrada"
        />
      ) : null}
    </section>
  );
}
