import { Filter } from "lucide-react";
import {
  getPresetRange,
  type CommissionFilters,
  type CommissionPeriodPreset,
  type CommissionStatusFilter,
} from "./commissionWorkspaceModel";
import { FinanceDateField, FinanceSelect } from "./FinanceFormParts";

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
            onChange={setPeriod}
            options={[
              { label: "Este mes", value: "thisMonth" },
              { label: "Esta semana", value: "thisWeek" },
              { label: "Mes passado", value: "lastMonth" },
              { label: "Customizado", value: "custom" },
            ]}
            value={filters.period}
          />
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
            onChange={(sellerId) => onChange({ ...filters, sellerId })}
            options={[{ label: "Todos", value: "" }, ...sellerOptions]}
            value={filters.sellerId}
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-app-text">
          Status
          <FinanceSelect
            onChange={(status) =>
              onChange({
                ...filters,
                status,
              })
            }
            options={[
              { label: "Todos", value: "all" },
              { label: "Pendente", value: "pending" },
              { label: "Pago", value: "paid" },
              { label: "Cancelado", value: "cancelled" },
            ]}
            value={filters.status}
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-app-text">
          Origem
          <FinanceSelect
            onChange={(origin) => onChange({ ...filters, origin })}
            options={[{ label: "Todas", value: "all" }, ...originOptions]}
            value={filters.origin}
          />
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
    <div className="grid gap-2 text-sm font-black text-app-text">
      <span>{label}</span>
      <FinanceDateField label={label} onChange={onChange} value={value} />
    </div>
  );
}
