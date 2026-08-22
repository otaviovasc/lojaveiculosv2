import { CarFront, Link2, UserRound, X } from "lucide-react";
import {
  FeatureSearchField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureToolbar } from "../../components/ui/FeatureLayout";
import { FinanceDateField } from "./FinanceDateField";
import {
  sellerFilterOptions,
  sourceLabel,
  type FinanceDatePreset,
  type FinanceSourceFilter,
} from "./financeCashFlowModel";
import {
  initialFinanceFilters,
  type FinanceFilters,
} from "./financeBillsModel";
import type { FinanceEntry } from "./types";
import type { FinanceVehicleOption } from "./financeVehicleOptions";
import type { FinanceVehicleOptionsState } from "./useFinanceAccess";

const filterLabelClassName =
  "finance-filters__field finance-filter-label grid min-w-0 gap-1 text-xs font-bold uppercase tracking-wider text-muted";

export function FinanceBillsFilters({
  entries,
  filters,
  onChange,
  vehicleOptions,
  vehicleOptionsState,
}: {
  entries: readonly FinanceEntry[];
  filters: FinanceFilters;
  onChange: (filters: FinanceFilters) => void;
  vehicleOptions: readonly FinanceVehicleOption[];
  vehicleOptionsState: FinanceVehicleOptionsState;
}) {
  const sellers = sellerFilterOptions(entries);
  const hasFilters = hasAnyActiveFilter(filters);

  return (
    <FeatureToolbar className="finance-filters-card">
      <div className="finance-filters__row">
        <label
          className={`${filterLabelClassName} finance-filters__field--search`}
        >
          Buscar
          <FeatureSearchField
            label="Buscar"
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="Descrição ou categoria"
            value={filters.query}
          />
        </label>
        <label className={filterLabelClassName}>
          Status
          <FeatureSelect
            onChange={(status) => onChange({ ...filters, status })}
            options={[
              { label: "Todos", value: "all" },
              { label: "Pendente", value: "pending" },
              { label: "Pago", value: "paid" },
              { label: "Cancelado", value: "cancelled" },
            ]}
            value={filters.status}
          />
        </label>
        <label className={filterLabelClassName}>
          Período
          <FeatureSelect
            onChange={(datePreset) =>
              onChange({ ...filters, datePreset, window: datePreset })
            }
            options={datePresetOptions}
            value={filters.datePreset}
          />
        </label>
        <label className={filterLabelClassName}>
          Origem
          <FeatureSelect
            leftIcon={<Link2 aria-hidden="true" className="size-4" />}
            onChange={(source) => onChange({ ...filters, source })}
            options={sourceOptions}
            value={filters.source}
          />
        </label>
        <label className={filterLabelClassName}>
          Veículo
          <FeatureSelect
            disabled={
              vehicleOptionsState.kind === "loading" ||
              vehicleOptionsState.kind === "error" ||
              vehicleOptions.length === 0
            }
            leftIcon={<CarFront aria-hidden="true" className="size-4" />}
            onChange={(vehicleUnitId) =>
              onChange({ ...filters, vehicleUnitId })
            }
            options={[
              { label: vehicleFilterLabel(vehicleOptionsState), value: "all" },
              ...vehicleOptions.map((vehicle) => ({
                label: vehicle.label,
                searchText: `${vehicle.label} ${vehicle.detail}`,
                value: vehicle.id,
              })),
            ]}
            searchable
            searchPlaceholder="Buscar veículo ou placa"
            value={filters.vehicleUnitId}
          />
        </label>
        <label className={filterLabelClassName}>
          Vendedor
          <FeatureSelect
            disabled={sellers.length === 0}
            leftIcon={<UserRound aria-hidden="true" className="size-4" />}
            onChange={(sellerUserId) => onChange({ ...filters, sellerUserId })}
            options={[
              { label: "Todos os vendedores", value: "all" },
              ...sellers,
            ]}
            value={filters.sellerUserId}
          />
        </label>
        {hasFilters ? (
          <button
            aria-label="Limpar filtros"
            className="finance-filters__clear"
            onClick={() => onChange({ ...initialFinanceFilters })}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
            Limpar
          </button>
        ) : null}
      </div>

      {filters.datePreset === "custom" ? (
        <div className="finance-filters__custom-dates">
          <FinanceDateField
            label="De"
            onChange={(dateFrom) => onChange({ ...filters, dateFrom })}
            value={filters.dateFrom}
          />
          <FinanceDateField
            label="Até"
            onChange={(dateTo) => onChange({ ...filters, dateTo })}
            value={filters.dateTo}
          />
        </div>
      ) : null}
    </FeatureToolbar>
  );
}

function hasAnyActiveFilter(filters: FinanceFilters) {
  return (
    filters.query !== initialFinanceFilters.query ||
    filters.status !== initialFinanceFilters.status ||
    filters.datePreset !== initialFinanceFilters.datePreset ||
    filters.source !== initialFinanceFilters.source ||
    filters.sellerUserId !== initialFinanceFilters.sellerUserId ||
    filters.vehicleUnitId !== initialFinanceFilters.vehicleUnitId
  );
}

const datePresetOptions = [
  { label: "Todos", value: "all" },
  { label: "Hoje", value: "today" },
  { label: "Esta semana", value: "thisWeek" },
  { label: "Este mês", value: "thisMonth" },
  { label: "Este ano", value: "thisYear" },
  { label: "Próximos 7 dias", value: "next7" },
  { label: "Próximos 15 dias", value: "next15" },
  { label: "Próximos 30 dias", value: "next30" },
  { label: "Próximos 90 dias", value: "next90" },
  { label: "Vencidos", value: "overdue" },
  { label: "Personalizado", value: "custom" },
] satisfies Array<{ label: string; value: FinanceDatePreset }>;

function vehicleFilterLabel(state: FinanceVehicleOptionsState) {
  if (state.kind === "loading") return "Carregando veículos";
  if (state.kind === "error") return "Veículos indisponíveis";
  return "Todos os veículos";
}

const sourceOptions = (
  [
    "all",
    "general",
    "vehicle",
    "sale",
    "commission",
    "document",
    "lead",
  ] as const
).map((value) => ({
  label: sourceLabel(value),
  value,
})) satisfies Array<{
  label: string;
  value: FinanceSourceFilter;
}>;
