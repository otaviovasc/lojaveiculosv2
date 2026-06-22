import { Filter } from "lucide-react";
import {
  getPresetRange,
  type CommissionFilters,
  type CommissionPeriodPreset,
  type CommissionStatusFilter,
} from "./commissionWorkspaceModel";
import { FinanceInput, FinanceSelect } from "./FinanceFormParts";

export function CommissionFiltersPanel({
  filters,
  hasFilters,
  onChange,
  onClear,
  originOptions,
  sellerOptions,
}: {
  filters: CommissionFilters;
  hasFilters: boolean;
  onChange: (filters: CommissionFilters) => void;
  onClear: () => void;
  originOptions: Array<{ label: string; value: string }>;
  sellerOptions: Array<{ label: string; value: string }>;
}) {
  const setPeriod = (period: CommissionPeriodPreset) => {
    if (period === "custom") {
      onChange({ ...filters, period });
      return;
    }
    onChange({ ...filters, ...getPresetRange(period), period });
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter aria-hidden="true" className="size-4 text-accent-strong" />
          <h3 className="text-sm font-black text-app-text">Filtros</h3>
        </div>
        {hasFilters ? (
          <button
            className="rounded-lg border border-line bg-app px-3 py-2 text-xs font-black text-app-text"
            onClick={onClear}
            type="button"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className="grid gap-2 text-sm font-black text-app-text">
          Periodo
          <FinanceSelect
            onChange={(event) =>
              setPeriod(event.target.value as CommissionPeriodPreset)
            }
            value={filters.period}
          >
            <option value="thisMonth">Este mes</option>
            <option value="thisWeek">Esta semana</option>
            <option value="lastMonth">Mes passado</option>
            <option value="custom">Customizado</option>
          </FinanceSelect>
        </label>
        <DateField
          label="De"
          onChange={(from) => onChange({ ...filters, from, period: "custom" })}
          value={filters.from}
        />
        <DateField
          label="Ate"
          onChange={(to) => onChange({ ...filters, period: "custom", to })}
          value={filters.to}
        />
        <label className="grid gap-2 text-sm font-black text-app-text">
          Vendedor
          <FinanceSelect
            onChange={(event) =>
              onChange({ ...filters, sellerId: event.target.value })
            }
            value={filters.sellerId}
          >
            <option value="">Todos</option>
            {sellerOptions.map((seller) => (
              <option key={seller.value} value={seller.value}>
                {seller.label}
              </option>
            ))}
          </FinanceSelect>
        </label>
        <label className="grid gap-2 text-sm font-black text-app-text">
          Status
          <FinanceSelect
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as CommissionStatusFilter,
              })
            }
            value={filters.status}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
          </FinanceSelect>
        </label>
        <label className="grid gap-2 text-sm font-black text-app-text">
          Origem
          <FinanceSelect
            onChange={(event) =>
              onChange({ ...filters, origin: event.target.value })
            }
            value={filters.origin}
          >
            <option value="all">Todas</option>
            {originOptions.map((origin) => (
              <option key={origin.value} value={origin.value}>
                {origin.label}
              </option>
            ))}
          </FinanceSelect>
        </label>
      </div>
    </section>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-app-text">
      {label}
      <FinanceInput
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}
