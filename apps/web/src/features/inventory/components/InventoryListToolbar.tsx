import {
  Filter,
  Plus,
  RefreshCw,
  Columns,
  List,
  LayoutGrid,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { InventorySelect } from "./InventoryFormParts";
import {
  FeatureSearchField,
  FeatureSegmentedControl,
} from "../../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeatureToolbar,
} from "../../../components/ui/FeatureLayout";
import {
  inventoryListStatusOptions,
  type InventoryListStatusFilter,
} from "../model/listCatalogModel";
import {
  inventoryListSortOptions,
  type InventoryListSortKey,
} from "../model/inventoryListSortModel";

export const INVENTORY_PAGE_SIZE = 100;

export function InventoryListToolbar({
  loading,
  onCreate,
  onRefresh,
  onSearchChange,
  onStatusChange,
  search,
  status,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  visibleColumns,
  onColumnToggle,
}: {
  loading: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: InventoryListStatusFilter) => void;
  search: string;
  status: InventoryListStatusFilter;
  viewMode: "list" | "cards";
  onViewModeChange: (mode: "list" | "cards") => void;
  sortBy: InventoryListSortKey;
  onSortChange: (value: InventoryListSortKey) => void;
  visibleColumns: Record<string, boolean>;
  onColumnToggle: (key: string, visible: boolean) => void;
}) {
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRefresh();
  };

  const columnOptions = [
    { key: "fotos", label: "Fotos" },
    { key: "placa", label: "Placa" },
    { key: "marcaModelo", label: "Marca/Modelo" },
    { key: "anoKm", label: "Ano/KM" },
    { key: "preco", label: "Preço" },
    { key: "dias", label: "Dias em Estoque" },
    { key: "fase", label: "Fase (Status)" },
    { key: "leads", label: "Leads" },
  ];

  return (
    <FeatureToolbar className="relative z-30">
      <form
        className="grid gap-4 md:grid-cols-[1fr_240px_auto] items-center"
        onSubmit={submit}
      >
        <FeatureSearchField
          label="Buscar veículos"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por título, marca, modelo ou placa"
          value={search}
        />

        <label className="relative block">
          <span className="sr-only">Filtrar por status</span>
          <Filter
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <InventorySelect
            className="w-full pl-10"
            onChange={onStatusChange}
            options={inventoryListStatusOptions}
            value={status}
          />
        </label>

        <div className="flex">
          <FeatureActionButton
            className="min-h-11 w-full px-5 text-sm md:w-auto"
            icon={Plus}
            label="Novo Veículo"
            onClick={onCreate}
            variant="primary"
          >
            Novo Veículo
          </FeatureActionButton>
        </div>
      </form>

      {/* Row 2: Sort, Column Visibility, and View Toggle */}
      <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-line/20 pt-4 mt-4 text-xs font-bold w-full">
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <label className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-muted">Ordenar por:</span>
            <InventorySelect
              className="min-h-9 text-xs py-1"
              onChange={onSortChange}
              options={inventoryListSortOptions}
              value={sortBy}
            />
          </label>

          {viewMode === "list" && (
            <div className="relative z-50 inline-block text-left">
              <button
                type="button"
                onClick={() => setColumnsDropdownOpen(!columnsDropdownOpen)}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-app-elevated border border-line px-3 text-xs font-black text-app-text hover:bg-line/25 cursor-pointer"
              >
                <Columns className="size-3.5 text-muted" />
                <span>Colunas</span>
              </button>
              {columnsDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setColumnsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 z-50 w-44 rounded-xl border border-line bg-panel p-2 shadow-2xl">
                    <div className="flex flex-col gap-1 text-xs font-bold">
                      {columnOptions.map((opt) => (
                        <label
                          key={opt.key}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-line/25 cursor-pointer text-app-text"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[opt.key]}
                            onChange={(e) =>
                              onColumnToggle(opt.key, e.target.checked)
                            }
                            className="rounded border-line text-accent focus:ring-accent"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <FeatureSegmentedControl
          ariaLabel="Modo de visualização do estoque"
          onChange={onViewModeChange}
          options={[
            { icon: List, label: "Lista", value: "list" },
            { icon: LayoutGrid, label: "Cards", value: "cards" },
          ]}
          value={viewMode}
        />
      </div>
    </FeatureToolbar>
  );
}

export function InventoryLoadMore({
  loading,
  onLoadMore,
}: {
  loading: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex justify-center py-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-soft px-6 text-sm font-black text-accent-strong disabled:opacity-70 cursor-pointer border border-accent-soft/20 shadow-sm"
        disabled={loading}
        onClick={onLoadMore}
        type="button"
      >
        <RefreshCw
          aria-hidden="true"
          className={"size-4 " + (loading ? "animate-spin" : "")}
        />
        <span>Carregar mais {INVENTORY_PAGE_SIZE}</span>
      </motion.button>
    </div>
  );
}
