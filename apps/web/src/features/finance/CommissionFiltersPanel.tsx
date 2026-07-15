import { Filter, Link2, UserRound } from "lucide-react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureToolbar } from "../../components/ui/FeatureLayout";
import { type CommissionFilters } from "./commissionWorkspaceModel";
import { fromInputDate, toInputDate } from "./FinanceDateField";

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
  return (
    <FeatureToolbar className="commission-filter-toolbar" radius="xl">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line/60 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Filter aria-hidden="true" className="size-4" />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-app-text">
            Filtros de comissão
          </h3>
        </div>
        {hasFilters ? (
          <button
            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-panel px-3.5 text-xs font-bold text-muted transition-colors hover:border-line-strong hover:bg-app hover:text-app-text focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            onClick={onClear}
            type="button"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
      <div className="commission-filter-grid grid items-end gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          <span>Período</span>
          <div className="datepicker-range-picker min-w-0 w-full">
            <DatePickerField
              label="De"
              maxDate={fromInputDate(filters.to)}
              onChange={(date) =>
                onChange({
                  ...filters,
                  from: toInputDate(date),
                  period: "custom",
                })
              }
              value={fromInputDate(filters.from)}
            />

            <span className="datepicker-separator-text">até</span>

            <DatePickerField
              align="right"
              label="Até"
              minDate={fromInputDate(filters.from)}
              onChange={(date) =>
                onChange({
                  ...filters,
                  period: "custom",
                  to: toInputDate(date),
                })
              }
              value={fromInputDate(filters.to)}
            />
          </div>
        </div>
        <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          Vendedor
          <FeatureSelect
            className="w-full bg-panel"
            leftIcon={<UserRound aria-hidden="true" className="size-4" />}
            onChange={(sellerId) => onChange({ ...filters, sellerId })}
            options={[{ label: "Todos", value: "" }, ...sellerOptions]}
            value={filters.sellerId}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          Status
          <FeatureSelect
            className="w-full bg-panel"
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
        <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          Origem
          <FeatureSelect
            className="w-full bg-panel"
            leftIcon={<Link2 aria-hidden="true" className="size-4" />}
            onChange={(origin) => onChange({ ...filters, origin })}
            options={[{ label: "Todas", value: "all" }, ...originOptions]}
            value={filters.origin}
          />
        </label>
      </div>
    </FeatureToolbar>
  );
}
