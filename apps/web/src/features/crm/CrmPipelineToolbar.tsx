import { useState, useEffect } from "react";
import {
  Plus,
  Settings,
  Grid,
  List,
  Search,
  Handshake,
  Download,
  Upload,
  X,
} from "lucide-react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import type { LeadFilters, CrmViewMode } from "./crmPipelineModels";
import type { Pipeline, PipelineStage } from "./crmPipelineStorage";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import { FILTER_CONFIGS, type CustomFilters } from "./CrmPipelineToolbarTypes";
import {
  CrmFasesDropdown,
  CrmHumanAttendanceDropdown,
  CrmSortByDropdown,
  CrmVehicleFilterDropdown,
} from "./CrmPipelineToolbarParts";
import { CrmResponsibleFilterDropdown } from "./CrmResponsibleFilterDropdown";
import type { CrmSellerOption } from "./useCrmSellerOptions";

type Props = {
  pipelines: Pipeline[];
  activePipelineId: string;
  onSelectPipeline: (id: string) => void;
  onCreatePipeline: () => void;
  onConfigureClick: () => void;
  filters: LeadFilters;
  onChangeFilters: (filters: LeadFilters) => void;
  onCreateClick: () => void;
  onExportCsv?: (() => void) | undefined;
  canImportLeads?: boolean | undefined;
  onImportClick?: (() => void) | undefined;
  visibleStages: Record<string, boolean>;
  onToggleStageVisibility: (stageId: string) => void;
  stages: PipelineStage[];
  customFilters: CustomFilters;
  onChangeCustomFilters: (next: CustomFilters) => void;
  vehicleOptions?: LeadVehicleOption[] | undefined;
  viewMode: CrmViewMode;
  onChangeViewMode: (mode: CrmViewMode) => void;
  hasUserContext?: boolean | undefined;
  sellerMembers?: CrmSellerOption[] | undefined;
  isLoadingMembers?: boolean | undefined;
  memberError?: Error | null | undefined;
  onRetryMembers?: (() => void) | undefined;
};

export function CrmPipelineToolbar({
  pipelines,
  activePipelineId,
  onSelectPipeline,
  onCreatePipeline,
  onConfigureClick,
  filters,
  onChangeFilters,
  visibleStages,
  onToggleStageVisibility,
  stages,
  onCreateClick,
  onExportCsv,
  canImportLeads,
  onImportClick,
  customFilters,
  onChangeCustomFilters,
  vehicleOptions,
  viewMode,
  onChangeViewMode,
  hasUserContext,
  sellerMembers,
  isLoadingMembers,
  memberError,
  onRetryMembers,
}: Props) {
  const [showFasesDropdown, setShowFasesDropdown] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<
    keyof CustomFilters | "veiculo" | "humanAttendance" | "sortBy" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".crm-pipeline-toolbar")) {
        setOpenDropdown(null);
        setShowFasesDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const visibleStagesCount = stages.filter(
    (s) => visibleStages[s.id] !== false,
  ).length;

  const handleToggleOption = (
    key: "origem" | "resposta" | "semInteracao",
    id: string,
  ) => {
    if (key === "semInteracao") {
      const nextVal = customFilters.semInteracao === id ? "" : id;
      onChangeCustomFilters({ ...customFilters, semInteracao: nextVal });
    } else {
      const current = (customFilters[key] ?? []) as string[];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      onChangeCustomFilters({ ...customFilters, [key]: next });
    }
  };

  return (
    <div className="crm-pipeline-toolbar relative z-30 flex min-w-0 flex-col gap-4 pb-2.5">
      {/* Active Pipeline Selector Tabs Row */}
      <div className="flex flex-col gap-3 border-b border-line/20 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-1 py-0.5 pb-1 sm:pb-0.5">
          {pipelines.map((p) => (
            <button
              className={
                "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg px-4 text-xs font-black transition-all duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.97] " +
                (p.id === activePipelineId
                  ? "bg-panel border border-line/60 text-app-text"
                  : "text-muted hover:text-app-text hover:bg-line/10")
              }
              key={p.id}
              onClick={() => onSelectPipeline(p.id)}
              type="button"
            >
              {p.name}
            </button>
          ))}
          <button
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-black text-muted hover:text-app-text hover:bg-line/10 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
            onClick={onCreatePipeline}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Novo pipeline
          </button>
        </div>

        <button
          className="inline-flex min-h-9 w-fit shrink-0 self-start items-center justify-center gap-1.5 rounded-lg text-xs font-black text-muted hover:text-app-text hover:bg-line/10 cursor-pointer transition-colors sm:self-auto"
          onClick={onConfigureClick}
          type="button"
        >
          <Settings aria-hidden="true" className="size-3.5" />
          Configurar
        </button>
      </div>

      {/* Filters and Actions Row */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {/* Left Side: Search + Filter Pills */}
        <div className="flex min-w-0 w-full flex-wrap items-center gap-2 xl:w-auto">
          <div className="relative min-w-0 w-full sm:min-w-[200px] sm:w-auto">
            <input
              aria-label="Buscar negócios"
              className="min-h-9 w-full rounded-lg border border-line bg-app px-3 text-xs font-bold text-app-text outline-none placeholder:text-muted"
              onChange={(e) =>
                onChangeFilters({ ...filters, search: e.target.value })
              }
              placeholder="Buscar negócios..."
              type="text"
              value={filters.search}
            />
          </div>

          {/* Dynamic Filter dropdowns */}
          {FILTER_CONFIGS.map((cfg) => {
            const isOpen = openDropdown === cfg.key;
            const isFiltered =
              cfg.key === "semInteracao"
                ? Boolean(customFilters.semInteracao)
                : ((customFilters[cfg.key] as string[]) ?? []).length > 0;
            const count =
              cfg.key === "semInteracao"
                ? 0
                : ((customFilters[cfg.key] as string[]) ?? []).length;
            const filteredOptions = cfg.options.filter((o) =>
              o.label.toLowerCase().includes(searchQuery.toLowerCase()),
            );

            return (
              <div className="relative inline-flex items-center" key={cfg.key}>
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
                    aria-label={cfg.label}
                    className="inline-flex min-h-9 items-center gap-1 px-3 text-xs font-black cursor-pointer rounded-full focus-visible:outline-none"
                    onClick={() => {
                      setOpenDropdown(isOpen ? null : cfg.key);
                      setSearchQuery("");
                    }}
                    type="button"
                  >
                    {!isFiltered && <Plus className="size-3 text-muted" />}
                    <span>
                      {cfg.label}
                      {count > 0 ? ` (${count})` : ""}
                    </span>
                  </button>
                  {isFiltered && (
                    <button
                      aria-label={`Limpar filtro de ${cfg.label.toLowerCase()}`}
                      className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full text-app-text hover:bg-line/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cfg.key === "semInteracao") {
                          onChangeCustomFilters({
                            ...customFilters,
                            semInteracao: "",
                          });
                        } else {
                          onChangeCustomFilters({
                            ...customFilters,
                            [cfg.key]: [],
                          });
                        }
                      }}
                      type="button"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="absolute top-full mt-1.5 left-0 z-50 w-56 bg-panel border border-line rounded-xl shadow-xl p-2.5 flex flex-col gap-2">
                    {/* search inside dropdown */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3 text-muted" />
                      <input
                        aria-label={`Buscar opções de ${cfg.label}`}
                        className="w-full min-h-8 rounded-lg border border-line bg-app pl-7 pr-2.5 text-xs font-bold text-app-text outline-none"
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Buscar ${cfg.label.toLowerCase()}`}
                        type="text"
                        value={searchQuery}
                      />
                    </div>
                    {/* options checkboxes */}
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto mt-1">
                      {filteredOptions.map((opt) => {
                        const isChecked =
                          cfg.key === "semInteracao"
                            ? customFilters.semInteracao === opt.id
                            : (
                                (customFilters[cfg.key] as string[]) ?? []
                              ).includes(opt.id);

                        return (
                          <label
                            className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-line/10 text-xs font-bold text-app-text cursor-pointer select-none"
                            key={opt.id}
                          >
                            <input
                              checked={isChecked}
                              className="size-3.5 rounded border-line text-accent focus:ring-accent bg-app cursor-pointer"
                              onChange={() =>
                                handleToggleOption(cfg.key, opt.id)
                              }
                              type="checkbox"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                      {filteredOptions.length === 0 && (
                        <span className="text-xs text-muted text-center py-2">
                          Nenhum resultado
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <CrmResponsibleFilterDropdown
            assignee={customFilters.responsavel}
            hasUserContext={hasUserContext}
            isLoadingMembers={isLoadingMembers}
            isOpen={openDropdown === "responsavel"}
            memberError={memberError}
            onClose={() => setOpenDropdown(null)}
            onRetryMembers={onRetryMembers}
            onSelectAssignee={(nextAssignee) => {
              onChangeCustomFilters({
                ...customFilters,
                responsavel: nextAssignee,
              });
            }}
            onToggleOpen={() =>
              setOpenDropdown(
                openDropdown === "responsavel" ? null : "responsavel",
              )
            }
            sellerMembers={sellerMembers}
          />

          <CrmHumanAttendanceDropdown
            filters={filters}
            isOpen={openDropdown === "humanAttendance"}
            onChangeFilters={onChangeFilters}
            onClose={() => setOpenDropdown(null)}
            onToggleOpen={() =>
              setOpenDropdown(
                openDropdown === "humanAttendance" ? null : "humanAttendance",
              )
            }
          />

          <CrmVehicleFilterDropdown
            customFilters={customFilters}
            isOpen={openDropdown === "veiculo"}
            onChangeCustomFilters={onChangeCustomFilters}
            onClose={() => setOpenDropdown(null)}
            onSearchChange={setSearchQuery}
            onToggleOpen={() => {
              setOpenDropdown(openDropdown === "veiculo" ? null : "veiculo");
              setSearchQuery("");
            }}
            searchQuery={searchQuery}
            vehicleOptions={vehicleOptions}
          />
        </div>

        {/* Right Side: Phase Count + Layout + Create Button */}
        <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto">
          <CrmFasesDropdown
            isOpen={showFasesDropdown}
            onToggleOpen={() => setShowFasesDropdown(!showFasesDropdown)}
            onToggleStageVisibility={onToggleStageVisibility}
            stages={stages}
            visibleStages={visibleStages}
            visibleStagesCount={visibleStagesCount}
          />

          <CrmSortByDropdown
            filters={filters}
            isOpen={openDropdown === "sortBy"}
            onChangeFilters={onChangeFilters}
            onClose={() => setOpenDropdown(null)}
            onToggleOpen={() =>
              setOpenDropdown(openDropdown === "sortBy" ? null : "sortBy")
            }
          />

          <div className="flex items-center border border-line/50 rounded-lg overflow-hidden shrink-0 bg-app-elevated/45">
            <button
              aria-label="Exibir kanban"
              aria-pressed={viewMode === "kanban"}
              className={
                "p-2 cursor-pointer transition-all duration-150 hover:scale-105 active:scale-90 " +
                (viewMode === "kanban"
                  ? "text-accent bg-line/20 font-black"
                  : "text-muted hover:text-app-text hover:bg-line/25")
              }
              onClick={() => onChangeViewMode("kanban")}
              type="button"
            >
              <AnimatedIconSwap
                stateKey={viewMode === "kanban"}
                variant="scale-fade"
              >
                <Grid className="size-3.5" />
              </AnimatedIconSwap>
            </button>
            <button
              aria-label="Exibir lista"
              aria-pressed={viewMode === "list"}
              className={
                "p-2 cursor-pointer transition-all duration-150 hover:scale-105 active:scale-90 " +
                (viewMode === "list"
                  ? "text-accent bg-line/20 font-black"
                  : "text-muted hover:text-app-text hover:bg-line/25")
              }
              onClick={() => onChangeViewMode("list")}
              type="button"
            >
              <AnimatedIconSwap
                stateKey={viewMode === "list"}
                variant="scale-fade"
              >
                <List className="size-3.5" />
              </AnimatedIconSwap>
            </button>
          </div>

          {canImportLeads && onImportClick && (
            <button
              aria-label="Importar leads em CSV"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line/50 bg-app-elevated/45 px-3 text-xs font-black text-muted hover:text-app-text hover:bg-line/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
              onClick={onImportClick}
              title="Importar leads via CSV"
              type="button"
            >
              <Upload aria-hidden="true" className="size-3.5" />
              <span className="hidden md:inline">Importar CSV</span>
            </button>
          )}

          {onExportCsv && (
            <button
              aria-label="Exportar leads em CSV"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line/50 bg-app-elevated/45 px-3 text-xs font-black text-muted hover:text-app-text hover:bg-line/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
              onClick={onExportCsv}
              title="Exportar leads filtrados para CSV"
              type="button"
            >
              <Download aria-hidden="true" className="size-3.5" />
              <span className="hidden md:inline">Exportar CSV</span>
            </button>
          )}

          <button
            className="crm-action min-h-9 flex-1 px-4 text-xs sm:flex-none"
            onClick={onCreateClick}
            type="button"
          >
            <Handshake className="size-3.5" />
            Nova negociação
          </button>
        </div>
      </div>
    </div>
  );
}
