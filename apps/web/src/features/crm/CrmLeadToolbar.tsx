import { LayoutGrid, List, Search, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import { CustomSelect } from "../../components/ui/CustomSelect";
import {
  listFilterStatuses,
  sourceLabels,
  sourceOptions,
  statusLabels,
} from "./crmPipelineConfig";
import type { CrmViewMode, LeadFilters } from "./crmPipelineModels";

export function LeadToolbar({
  filters,
  mode,
  onChangeFilters,
  onChangeMode,
}: {
  filters: LeadFilters;
  mode: CrmViewMode;
  onChangeFilters: (filters: LeadFilters) => void;
  onChangeMode: (mode: CrmViewMode) => void;
}) {
  return (
    <section className="crm-toolbar">
      <label className="crm-search">
        <Search aria-hidden="true" className="size-4" />
        <input
          onChange={(event) =>
            onChangeFilters({ ...filters, search: event.target.value })
          }
          placeholder="Buscar por nome, email, telefone ou veiculo"
          value={filters.search}
        />
      </label>
      <CustomSelect
        className="crm-input"
        onChange={(status) =>
          onChangeFilters({
            ...filters,
            status,
          })
        }
        options={listFilterStatuses.map((status) => ({
          label: status === "all" ? "Todas as fases" : statusLabels[status],
          value: status,
        }))}
        value={filters.status}
      />
      <CustomSelect
        className="crm-input"
        onChange={(source) =>
          onChangeFilters({
            ...filters,
            source,
          })
        }
        options={sourceOptions.map((source) => ({
          label: source === "all" ? "Todas as origens" : sourceLabels[source],
          value: source,
        }))}
        value={filters.source}
      />
      <div className="crm-segmented" role="group">
        <ModeButton
          active={mode === "kanban"}
          onClick={() => onChangeMode("kanban")}
        >
          <LayoutGrid aria-hidden="true" className="size-4" />
          Kanban
        </ModeButton>
        <ModeButton
          active={mode === "list"}
          onClick={() => onChangeMode("list")}
        >
          <List aria-hidden="true" className="size-4" />
          Lista
        </ModeButton>
        <ModeButton
          active={mode === "table"}
          onClick={() => onChangeMode("table")}
        >
          <Table2 aria-hidden="true" className="size-4" />
          Tabela
        </ModeButton>
      </div>
    </section>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "crm-segmented-active" : ""}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
