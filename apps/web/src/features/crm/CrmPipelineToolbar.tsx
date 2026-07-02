import { useState, useEffect } from "react";
import {
  Plus,
  Settings,
  Grid,
  List,
  Eye,
  Search,
  Handshake,
} from "lucide-react";
import type { LeadFilters, CrmViewMode } from "./crmPipelineModels";
import type { Pipeline, PipelineStage } from "./crmPipelineStorage";
import { FILTER_CONFIGS, type CustomFilters } from "./CrmPipelineToolbarTypes";

type Props = {
  pipelines: Pipeline[];
  activePipelineId: string;
  onSelectPipeline: (id: string) => void;
  onCreatePipeline: () => void;
  onConfigureClick: () => void;
  filters: LeadFilters;
  onChangeFilters: (filters: LeadFilters) => void;
  onCreateClick: () => void;
  visibleStages: Record<string, boolean>;
  onToggleStageVisibility: (stageId: string) => void;
  stages: PipelineStage[];
  customFilters: CustomFilters;
  onChangeCustomFilters: (next: CustomFilters) => void;
  viewMode: CrmViewMode;
  onChangeViewMode: (mode: CrmViewMode) => void;
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
  customFilters,
  onChangeCustomFilters,
  viewMode,
  onChangeViewMode,
}: Props) {
  const [showFasesDropdown, setShowFasesDropdown] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<keyof CustomFilters | null>(
    null,
  );
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

  const handleToggleOption = (key: keyof CustomFilters, id: string) => {
    if (key === "semInteracao") {
      const nextVal = customFilters.semInteracao === id ? "" : id;
      onChangeCustomFilters({ ...customFilters, semInteracao: nextVal });
    } else {
      const current = customFilters[key] as string[];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      onChangeCustomFilters({ ...customFilters, [key]: next });
    }
  };

  return (
    <div className="crm-pipeline-toolbar flex flex-col gap-4 relative z-30 pb-2.5">
      {/* Active Pipeline Selector Tabs Row */}
      <div className="flex items-center justify-between gap-4 border-b border-line/20 pb-3">
        <div className="flex items-center gap-1">
          {pipelines.map((p) => (
            <button
              className={
                "min-h-9 items-center justify-center px-4 rounded-lg text-xs font-black transition-all cursor-pointer " +
                (p.id === activePipelineId
                  ? "bg-panel border border-line/60 text-app-text shadow-sm"
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
            className="inline-flex min-h-9 items-center gap-1.5 px-3 rounded-lg text-xs font-black text-muted hover:text-app-text hover:bg-line/10 cursor-pointer transition-all"
            onClick={onCreatePipeline}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Novo pipeline
          </button>
        </div>

        <button
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-black text-muted hover:text-app-text hover:bg-line/10 cursor-pointer transition-colors"
          onClick={onConfigureClick}
          type="button"
        >
          <Settings aria-hidden="true" className="size-3.5" />
          Configurar
        </button>
      </div>

      {/* Filters and Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Search + Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <input
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
            const filteredOptions = cfg.options.filter((o) =>
              o.label.toLowerCase().includes(searchQuery.toLowerCase()),
            );

            return (
              <div className="relative" key={cfg.key}>
                <button
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line/50 bg-app-elevated/45 px-3 text-[11px] font-black text-app-text hover:bg-line/25 cursor-pointer transition-colors"
                  onClick={() => {
                    setOpenDropdown(isOpen ? null : cfg.key);
                    setSearchQuery("");
                  }}
                  type="button"
                >
                  <Plus className="size-3 text-muted" />
                  {cfg.label}
                </button>

                {isOpen && (
                  <div className="absolute top-full mt-1.5 left-0 z-50 w-56 bg-panel border border-line rounded-xl shadow-xl p-2.5 flex flex-col gap-2">
                    {/* search inside dropdown */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3 text-muted" />
                      <input
                        className="w-full min-h-8 rounded-lg border border-line bg-app pl-7 pr-2.5 text-xs font-bold text-app-text outline-none"
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Q ${cfg.label}`}
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
                            : (customFilters[cfg.key] as string[]).includes(
                                opt.id,
                              );

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
                        <span className="text-[10px] text-muted text-center py-2">
                          Nenhum resultado
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Phase Count + Layout + Create Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-app-elevated border border-line/50 px-3 text-xs font-black text-app-text hover:bg-line/25 cursor-pointer"
              onClick={() => setShowFasesDropdown(!showFasesDropdown)}
              type="button"
            >
              <Eye className="size-3.5 text-muted" />
              <span>Fases</span>
              <span className="bg-line/20 rounded px-1 text-[10px] font-black">
                {visibleStagesCount}/{stages.length}
              </span>
            </button>

            {showFasesDropdown && (
              <div className="absolute top-full mt-1.5 right-0 z-50 w-56 bg-panel border border-line rounded-xl shadow-xl p-3 flex flex-col gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted">
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

          <div className="flex items-center border border-line/50 rounded-lg overflow-hidden shrink-0 bg-app-elevated/45">
            <button
              className={
                "p-2 cursor-pointer " +
                (viewMode === "kanban"
                  ? "text-accent bg-line/20"
                  : "text-muted hover:text-app-text hover:bg-line/25")
              }
              onClick={() => onChangeViewMode("kanban")}
              type="button"
            >
              <Grid className="size-3.5" />
            </button>
            <button
              className={
                "p-2 cursor-pointer " +
                (viewMode === "list"
                  ? "text-accent bg-line/20"
                  : "text-muted hover:text-app-text hover:bg-line/25")
              }
              onClick={() => onChangeViewMode("list")}
              type="button"
            >
              <List className="size-3.5" />
            </button>
          </div>

          <button
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 cursor-pointer shadow-sm"
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
