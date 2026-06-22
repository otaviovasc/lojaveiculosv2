import { LayoutGrid, List, Search, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  listFilterStatuses,
  sourceLabels,
  sourceOptions,
  statusLabels,
} from "./crmPipelineConfig";
import type { CrmViewMode, LeadFilters } from "./crmPipelineModels";
import type { CrmLeadSource, CrmLeadStatus } from "./productCrmTypes";

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
      <select
        className="crm-input"
        onChange={(event) =>
          onChangeFilters({
            ...filters,
            status: event.target.value as CrmLeadStatus | "all",
          })
        }
        value={filters.status}
      >
        {listFilterStatuses.map((status) => (
          <option key={status} value={status}>
            {status === "all" ? "Todas as fases" : statusLabels[status]}
          </option>
        ))}
      </select>
      <select
        className="crm-input"
        onChange={(event) =>
          onChangeFilters({
            ...filters,
            source: event.target.value as CrmLeadSource | "all",
          })
        }
        value={filters.source}
      >
        {sourceOptions.map((source) => (
          <option key={source} value={source}>
            {source === "all" ? "Todas as origens" : sourceLabels[source]}
          </option>
        ))}
      </select>
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
