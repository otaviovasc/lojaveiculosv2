import { CalendarDays, Filter, RotateCcw, Search } from "lucide-react";
import {
  InventoryInput,
  InventorySelect,
} from "../inventory/components/InventoryFormParts";
import { kindOptions, statusOptions } from "./documentLabels";
import type { DocumentsWorkspaceFilters } from "./documentDisplayModel";
import type { DocumentKind, DocumentStatus } from "./types";

export function DocumentsFiltersPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: DocumentsWorkspaceFilters;
  onChange: (filters: DocumentsWorkspaceFilters) => void;
  onReset: () => void;
}) {
  const setFilter = <Key extends keyof DocumentsWorkspaceFilters>(
    key: Key,
    value: DocumentsWorkspaceFilters[Key],
  ) => onChange({ ...filters, [key]: value });

  return (
    <section className="documents-filter-panel" aria-label="Refinar documentos">
      <div className="documents-filter-title">
        <Filter aria-hidden="true" className="size-4" />
        <strong>Refinar lista</strong>
        <button
          aria-label="Limpar filtros"
          className="documents-icon-button"
          onClick={onReset}
          title="Limpar filtros"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </div>

      <label className="documents-filter-field documents-search-field">
        <span>Busca</span>
        <span className="documents-input-icon">
          <Search aria-hidden="true" className="size-4" />
          <InventoryInput
            onChange={(event) => setFilter("search", event.target.value)}
            placeholder="Título, placa, chassi, tipo ou responsável"
            value={filters.search}
          />
        </span>
      </label>

      <SelectField
        label="Origem"
        onChange={(origin) => setFilter("origin", origin)}
        options={[
          { label: "Todas", value: "all" },
          { label: "Automáticos", value: "automatic" },
          { label: "Envios manuais", value: "manual" },
        ]}
        value={filters.origin}
      />

      <SelectField
        label="Tipo"
        onChange={(kind) => setFilter("kind", kind as DocumentKind | "")}
        options={kindOptions}
        value={filters.kind}
      />

      <SelectField
        label="Status"
        onChange={(status) =>
          setFilter("status", status as DocumentStatus | "")
        }
        options={statusOptions}
        value={filters.status}
      />

      <div className="documents-date-group" aria-label="Período">
        <span>
          <CalendarDays aria-hidden="true" className="size-4" />
          Período
        </span>
        <label className="documents-filter-field">
          <span>De</span>
          <InventoryInput
            max={filters.dateTo || undefined}
            onChange={(event) => setFilter("dateFrom", event.target.value)}
            type="date"
            value={filters.dateFrom}
          />
        </label>
        <label className="documents-filter-field">
          <span>Até</span>
          <InventoryInput
            min={filters.dateFrom || undefined}
            onChange={(event) => setFilter("dateTo", event.target.value)}
            type="date"
            value={filters.dateTo}
          />
        </label>
      </div>
    </section>
  );
}

function SelectField<Value extends string>({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: Value) => void;
  options: readonly { label: string; value: Value }[];
  value: Value;
}) {
  return (
    <label className="documents-filter-field">
      <span>{label}</span>
      <InventorySelect
        ariaLabel={label}
        disabled={disabled ?? false}
        onChange={onChange}
        options={options}
        value={value}
      />
    </label>
  );
}
