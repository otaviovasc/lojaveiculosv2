import { Download, Plus, Search } from "lucide-react";
import { CustomSelect } from "../../components/ui/CustomSelect";
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
    <section className="crm-toolbar crm-client-toolbar">
      <label className="crm-search">
        <Search aria-hidden="true" className="size-4" />
        <input
          onChange={(event) =>
            onChangeFilters({ ...filters, search: event.target.value })
          }
          placeholder="Buscar por nome, email, CPF ou CNPJ"
          value={filters.search}
        />
      </label>
      <CustomSelect
        className="crm-input"
        onChange={(status) => onChangeFilters({ ...filters, status })}
        options={listFilterStatuses.map((status) => ({
          label: status === "all" ? "Todos" : statusLabels[status],
          value: status,
        }))}
        value={filters.status}
      />
      <CustomSelect
        className="crm-input"
        onChange={(source) => onChangeFilters({ ...filters, source })}
        options={sourceOptions.map((source) => ({
          label: source === "all" ? "Todos os canais" : sourceLabels[source],
          value: source,
        }))}
        value={filters.source}
      />
      <div className="crm-client-toolbar-actions">
        <button
          className="crm-action crm-action-secondary"
          onClick={onExport}
          type="button"
        >
          <Download aria-hidden="true" className="size-4" />
          Exportar
        </button>
        <button className="crm-action" onClick={onCreateClick} type="button">
          <Plus aria-hidden="true" className="size-4" />
          Novo cliente
        </button>
      </div>
    </section>
  );
}
