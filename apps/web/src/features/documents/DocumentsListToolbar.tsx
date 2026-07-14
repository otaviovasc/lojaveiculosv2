import { ArrowDownNarrowWide } from "lucide-react";
import {
  FeatureDateField,
  FeatureSearchField,
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureToolbar } from "../../components/ui/FeatureLayout";
import { kindOptions, statusOptions } from "./documentLabels";
import type { DocumentOriginFilter } from "./DocumentsKpiSummary";
import type { DocumentsSortKey } from "./documentWorkspaceFilters";
import type { DocumentKind, DocumentStatus } from "./types";

export const DOCUMENTS_SORT_OPTIONS: Array<{
  label: string;
  value: DocumentsSortKey;
}> = [
  { label: "Mais recentes", value: "created_desc" },
  { label: "Mais antigos", value: "created_asc" },
  { label: "Título (A-Z)", value: "title_asc" },
  { label: "Título (Z-A)", value: "title_desc" },
  { label: "Status", value: "status_asc" },
];

export function DocumentsListToolbar({
  activeOrigin,
  dateFrom,
  dateTo,
  hasActiveFilters,
  isLoading,
  kind,
  onClearFilters,
  onDateFromChange,
  onDateToChange,
  onKindChange,
  onOriginSelect,
  onSearchChange,
  onSortChange,
  onStatusChange,
  search,
  sortBy,
  status,
}: {
  activeOrigin: DocumentOriginFilter;
  dateFrom: string;
  dateTo: string;
  hasActiveFilters: boolean;
  isLoading: boolean;
  kind: DocumentKind | "";
  onClearFilters: () => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onKindChange: (value: DocumentKind | "") => void;
  onOriginSelect: (origin: DocumentOriginFilter) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: DocumentsSortKey) => void;
  onStatusChange: (value: DocumentStatus | "") => void;
  search: string;
  sortBy: DocumentsSortKey;
  status: DocumentStatus | "";
}) {
  return (
    <FeatureToolbar eyebrow="Documentos">
      <form
        className="grid gap-3 md:grid-cols-[1fr_220px_200px] items-center mt-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <FeatureSearchField
          disabled={isLoading}
          label="Buscar documentos"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por titulo, placa, chassi ou responsavel"
          value={search}
        />

        <label className="relative block">
          <span className="sr-only">Filtrar por status</span>
          <FeatureSelect
            ariaLabel="Filtrar por status"
            className="w-full"
            disabled={isLoading}
            onChange={(value) => onStatusChange(value as DocumentStatus | "")}
            options={statusOptions}
            value={status}
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Filtrar por tipo</span>
          <FeatureSelect
            ariaLabel="Filtrar por tipo"
            className="w-full"
            disabled={isLoading}
            onChange={(value) => onKindChange(value as DocumentKind | "")}
            options={kindOptions}
            value={kind}
          />
        </label>
      </form>

      <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-line/20 pt-4 mt-4">
        <div className="flex w-full min-w-0 items-center gap-2 flex-wrap sm:flex-1">
          <OriginChip
            activeOrigin={activeOrigin}
            isLoading={isLoading}
            onOriginSelect={onOriginSelect}
          />

          <DateInput
            disabled={isLoading}
            label="De"
            {...(dateTo ? { max: dateTo } : {})}
            onChange={onDateFromChange}
            value={dateFrom}
          />
          <DateInput
            disabled={isLoading}
            label="Ate"
            {...(dateFrom ? { min: dateFrom } : {})}
            onChange={onDateToChange}
            value={dateTo}
          />

          {hasActiveFilters ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg bg-transparent text-accent-strong text-xs font-black uppercase tracking-wider cursor-pointer px-2 py-1"
              onClick={onClearFilters}
              type="button"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="relative flex items-center">
            <span className="sr-only">Ordenar por</span>
            <FeatureSelect
              ariaLabel="Ordenar por"
              className="min-w-[10rem]"
              density="compact"
              disabled={isLoading}
              leftIcon={
                <ArrowDownNarrowWide aria-hidden="true" className="size-4" />
              }
              onChange={(value) => onSortChange(value as DocumentsSortKey)}
              options={DOCUMENTS_SORT_OPTIONS}
              value={sortBy}
            />
          </label>
        </div>
      </div>
    </FeatureToolbar>
  );
}

function OriginChip({
  activeOrigin,
  isLoading,
  onOriginSelect,
}: {
  activeOrigin: DocumentOriginFilter;
  isLoading: boolean;
  onOriginSelect: (origin: DocumentOriginFilter) => void;
}) {
  const chips: Array<{ filter: DocumentOriginFilter; label: string }> = [
    { filter: "all", label: "Todos" },
    { filter: "automatic", label: "Automáticos" },
    { filter: "manual", label: "Manuais" },
  ];
  return (
    <div className="w-full min-w-0 shrink-0 sm:w-80">
      <FeatureSegmentedControl
        ariaLabel="Origem dos documentos"
        disabled={isLoading}
        onChange={onOriginSelect}
        options={chips.map((chip) => ({
          label: chip.label,
          value: chip.filter,
        }))}
        value={activeOrigin}
      />
    </div>
  );
}

function DateInput({
  disabled,
  label,
  max,
  min,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-app-elevated border border-line px-2.5 py-1 text-xs font-black uppercase tracking-wider text-muted">
      <FeatureDateField
        className="documents-toolbar-date"
        disabled={disabled}
        max={max}
        min={min}
        label={label}
        onChange={onChange}
        value={value}
      />
    </div>
  );
}
