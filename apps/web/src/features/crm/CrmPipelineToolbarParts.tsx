import { ArrowUpDown, Car, Eye, Headset, Search, X } from "lucide-react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import type { LeadFilters } from "./crmPipelineModels";
import type { PipelineStage } from "./crmPipelineStorage";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { CustomFilters } from "./CrmPipelineToolbarTypes";

export function CrmHumanAttendanceDropdown({
  filters,
  isOpen,
  onClose,
  onToggleOpen,
  onChangeFilters,
}: {
  filters: LeadFilters;
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen: () => void;
  onChangeFilters: (filters: LeadFilters) => void;
}) {
  const isFiltered = Boolean(
    filters.humanAttendanceState && filters.humanAttendanceState !== "all",
  );

  const label =
    filters.humanAttendanceState === "waiting_human"
      ? "Aguardando humano"
      : filters.humanAttendanceState === "in_human_service"
        ? "Em atendimento humano"
        : "Atendimento humano";

  return (
    <div className="relative inline-flex items-center">
      <div
        className={
          "inline-flex min-h-9 items-center rounded-full border text-xs font-black transition-colors " +
          (isFiltered
            ? "border-accent bg-accent/15 text-accent"
            : "border-line/50 bg-app-elevated/45 text-app-text hover:bg-line/25")
        }
      >
        <button
          aria-expanded={isOpen}
          aria-label="Atendimento humano"
          className="inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-black cursor-pointer rounded-full focus-visible:outline-none"
          onClick={onToggleOpen}
          type="button"
        >
          <Headset className="size-3 text-muted" />
          <span>{label}</span>
        </button>
        {isFiltered && (
          <button
            aria-label="Limpar filtro de atendimento"
            className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full text-app-text hover:bg-line/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
            onClick={() => {
              onChangeFilters({ ...filters, humanAttendanceState: "all" });
            }}
            type="button"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-60 bg-panel border border-line rounded-xl shadow-xl p-2 flex flex-col gap-1 text-app-text">
          <span className="px-2 py-1 text-xs font-black uppercase tracking-wider text-muted">
            Atendimento humano
          </span>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-line/10 text-xs font-bold text-app-text cursor-pointer select-none">
            <input
              checked={
                !filters.humanAttendanceState ||
                filters.humanAttendanceState === "all"
              }
              className="size-3.5 rounded-full border-line text-accent focus:ring-accent bg-app cursor-pointer"
              name="crmHumanAttendance"
              onChange={() => {
                onChangeFilters({ ...filters, humanAttendanceState: "all" });
                onClose();
              }}
              type="radio"
            />
            <span>Todos os atendimentos</span>
          </label>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-line/10 text-xs font-bold text-app-text cursor-pointer select-none">
            <input
              checked={filters.humanAttendanceState === "waiting_human"}
              className="size-3.5 rounded border-line text-accent focus:ring-accent bg-app cursor-pointer"
              onChange={() => {
                onChangeFilters({
                  ...filters,
                  humanAttendanceState:
                    filters.humanAttendanceState === "waiting_human"
                      ? "all"
                      : "waiting_human",
                });
                onClose();
              }}
              type="checkbox"
            />
            <span>Aguardando humano</span>
          </label>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-line/10 text-xs font-bold text-app-text cursor-pointer select-none">
            <input
              checked={filters.humanAttendanceState === "in_human_service"}
              className="size-3.5 rounded border-line text-accent focus:ring-accent bg-app cursor-pointer"
              onChange={() => {
                onChangeFilters({
                  ...filters,
                  humanAttendanceState:
                    filters.humanAttendanceState === "in_human_service"
                      ? "all"
                      : "in_human_service",
                });
                onClose();
              }}
              type="checkbox"
            />
            <span>Em atendimento humano</span>
          </label>
        </div>
      )}
    </div>
  );
}

export function CrmSortByDropdown({
  filters,
  isOpen,
  onClose,
  onToggleOpen,
  onChangeFilters,
}: {
  filters: LeadFilters;
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen: () => void;
  onChangeFilters: (filters: LeadFilters) => void;
}) {
  const isSorted = Boolean(filters.sortBy && filters.sortBy !== "created_at");

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Ordenar"
        className={
          "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-black cursor-pointer transition-colors " +
          (isSorted
            ? "border-accent bg-accent/15 text-accent"
            : "border-line/50 bg-app-elevated text-app-text hover:bg-line/25")
        }
        onClick={onToggleOpen}
        type="button"
      >
        <ArrowUpDown className="size-3.5 text-muted" />
        <span>
          {filters.sortBy === "next_task"
            ? "Próxima tarefa"
            : "Data de criação"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50 w-48 bg-panel border border-line rounded-xl shadow-xl p-2 flex flex-col gap-1 text-app-text">
          <span className="px-2 py-1 text-xs font-black uppercase tracking-wider text-muted">
            Ordenar por
          </span>
          <button
            className={
              "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors " +
              (!filters.sortBy || filters.sortBy === "created_at"
                ? "bg-accent/15 text-accent"
                : "hover:bg-line/10 text-app-text")
            }
            onClick={() => {
              onChangeFilters({ ...filters, sortBy: "created_at" });
              onClose();
            }}
            type="button"
          >
            Data de criação
          </button>
          <button
            className={
              "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors " +
              (filters.sortBy === "next_task"
                ? "bg-accent/15 text-accent"
                : "hover:bg-line/10 text-app-text")
            }
            onClick={() => {
              onChangeFilters({ ...filters, sortBy: "next_task" });
              onClose();
            }}
            type="button"
          >
            Próxima tarefa
          </button>
        </div>
      )}
    </div>
  );
}

export function CrmVehicleFilterDropdown({
  customFilters,
  isOpen,
  onClose,
  onToggleOpen,
  onChangeCustomFilters,
  searchQuery,
  onSearchChange,
  vehicleOptions,
}: {
  customFilters: CustomFilters;
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen: () => void;
  onChangeCustomFilters: (next: CustomFilters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  vehicleOptions?: LeadVehicleOption[] | undefined;
}) {
  if (!vehicleOptions || vehicleOptions.length === 0) return null;

  return (
    <div className="relative inline-flex items-center">
      <div
        className={
          "inline-flex min-h-9 items-center rounded-full border text-xs font-black transition-colors " +
          (customFilters.veiculoId
            ? "border-accent bg-accent/15 text-accent"
            : "border-line/50 bg-app-elevated/45 text-app-text hover:bg-line/25")
        }
      >
        <button
          aria-expanded={isOpen}
          aria-label="Filtrar por veículo"
          className="inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-black cursor-pointer rounded-full focus-visible:outline-none"
          onClick={onToggleOpen}
          type="button"
        >
          <Car className="size-3 text-muted" />
          <span className="max-w-[140px] truncate">
            {customFilters.veiculoId
              ? vehicleOptions.find((v) => v.id === customFilters.veiculoId)
                  ?.label || "Veículo"
              : "Veículo"}
          </span>
        </button>
        {customFilters.veiculoId && (
          <button
            aria-label="Limpar filtro de veículo"
            className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full text-app-text hover:bg-line/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
            onClick={() => {
              onChangeCustomFilters({
                ...customFilters,
                veiculoId: undefined,
              });
            }}
            type="button"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-64 bg-panel border border-line rounded-xl shadow-xl p-2 flex flex-col gap-1.5 text-app-text">
          <div className="relative">
            <input
              aria-label="Buscar veículo do estoque"
              className="min-h-8 w-full rounded-md border border-line bg-app px-2 text-xs text-app-text outline-none placeholder:text-muted"
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar veículo do estoque..."
              type="text"
              value={searchQuery}
            />
          </div>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
            <button
              className={
                "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors " +
                (!customFilters.veiculoId
                  ? "bg-accent/15 text-accent"
                  : "hover:bg-line/10 text-app-text")
              }
              onClick={() => {
                onChangeCustomFilters({
                  ...customFilters,
                  veiculoId: undefined,
                });
                onClose();
              }}
              type="button"
            >
              Todos os veículos
            </button>
            {vehicleOptions
              .filter((v) =>
                v.label.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((v) => (
                <button
                  className={
                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors truncate " +
                    (customFilters.veiculoId === v.id
                      ? "bg-accent/15 text-accent"
                      : "hover:bg-line/10 text-app-text")
                  }
                  key={v.id}
                  onClick={() => {
                    onChangeCustomFilters({
                      ...customFilters,
                      veiculoId: v.id,
                    });
                    onClose();
                  }}
                  type="button"
                >
                  {v.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CrmFasesDropdown({
  isOpen,
  onToggleOpen,
  stages,
  visibleStages,
  visibleStagesCount,
  onToggleStageVisibility,
}: {
  isOpen: boolean;
  onToggleOpen: () => void;
  stages: PipelineStage[];
  visibleStages: Record<string, boolean>;
  visibleStagesCount: number;
  onToggleStageVisibility: (stageId: string) => void;
}) {
  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-app-elevated border border-line/50 px-3 text-xs font-black text-app-text hover:bg-line/25 cursor-pointer"
        onClick={onToggleOpen}
        type="button"
      >
        <AnimatedIconSwap stateKey={isOpen} variant="rotate-spin">
          <Eye className="size-3.5 text-muted" />
        </AnimatedIconSwap>
        <span>Fases</span>
        <span className="bg-line/20 rounded px-1 text-xs font-black">
          {visibleStagesCount}/{stages.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50 w-56 bg-panel border border-line rounded-xl shadow-xl p-3 flex flex-col gap-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-muted">
            Fases do Quadro
          </span>
          <div className="flex flex-col gap-2">
            {stages.map((stage) => (
              <label
                className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-app-text hover:bg-line/10 p-1 rounded"
                key={stage.id}
              >
                <input
                  checked={visibleStages[stage.id] !== false}
                  className="size-4 rounded border-line text-accent focus:ring-accent bg-app cursor-pointer"
                  onChange={() => onToggleStageVisibility(stage.id)}
                  type="checkbox"
                />
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span>{stage.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
