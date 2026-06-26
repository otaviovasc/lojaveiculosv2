import { LayoutGrid, List, Table2 } from "lucide-react";
import {
  FeatureSearchField,
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureToolbar } from "../../components/ui/FeatureLayout";
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
    <FeatureToolbar>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] items-center">
        <FeatureSearchField
          label="Buscar leads"
          onChange={(event) =>
            onChangeFilters({ ...filters, search: event.target.value })
          }
          placeholder="Buscar por nome, email, telefone ou veiculo"
          value={filters.search}
        />
        <FeatureSelect
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
        <FeatureSelect
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
        <FeatureSegmentedControl
          ariaLabel="Modo de visualização de leads"
          onChange={onChangeMode}
          options={[
            { icon: LayoutGrid, label: "Kanban", value: "kanban" },
            { icon: List, label: "Lista", value: "list" },
            { icon: Table2, label: "Tabela", value: "table" },
          ]}
          value={mode}
        />
      </div>
    </FeatureToolbar>
  );
}
