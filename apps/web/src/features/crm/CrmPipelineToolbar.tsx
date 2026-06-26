import { Download, Plus } from "lucide-react";
import {
  FeatureSearchField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import {
  listFilterStatuses,
  sourceLabels,
  sourceOptions,
  statusLabels,
} from "./crmPipelineConfig";
import type { LeadFilters } from "./crmPipelineModels";

type CrmPipelineToolbarProps = {
  filters: LeadFilters;
  onChangeFilters: (filters: LeadFilters) => void;
  onCreateClick: () => void;
  onExport: () => void;
};

export function CrmPipelineToolbar({
  filters,
  onChangeFilters,
  onCreateClick,
  onExport,
}: CrmPipelineToolbarProps) {
  return (
    <FeatureToolbar className="crm-client-toolbar">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] items-center">
        <FeatureSearchField
          label="Buscar clientes"
          onChange={(event) =>
            onChangeFilters({ ...filters, search: event.target.value })
          }
          placeholder="Buscar por nome, email, CPF ou CNPJ"
          value={filters.search}
        />
        <FeatureSelect
          className="crm-input"
          onChange={(status) => onChangeFilters({ ...filters, status })}
          options={listFilterStatuses.map((status) => ({
            label: status === "all" ? "Todos" : statusLabels[status],
            value: status,
          }))}
          value={filters.status}
        />
        <FeatureSelect
          className="crm-input"
          onChange={(source) => onChangeFilters({ ...filters, source })}
          options={sourceOptions.map((source) => ({
            label: source === "all" ? "Todos os canais" : sourceLabels[source],
            value: source,
          }))}
          value={filters.source}
        />
        <div className="crm-client-toolbar-actions">
          <FeatureActionButton
            icon={Download}
            label="Exportar"
            onClick={onExport}
          />
          <FeatureActionButton
            icon={Plus}
            label="Novo cliente"
            onClick={onCreateClick}
            variant="primary"
          />
        </div>
      </div>
    </FeatureToolbar>
  );
}
