import { Filter, Link2, UserRound } from "lucide-react";
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

const filterLabelClassName =
  "grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted";

export function FinanceBillsFilters({
  entries,
  filters,
  onChange,
}: {
  entries: readonly FinanceEntry[];
  filters: FinanceFilters;
  onChange: (filters: FinanceFilters) => void;
}) {
  const sellers = sellerFilterOptions(entries);
  const hasFilters = hasAnyActiveFilter(filters);

  return (
    <FeatureToolbar className="finance-filter-toolbar" radius="xl">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line/60 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Filter aria-hidden="true" className="size-4" />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-app-text">
            Filtros de lançamentos
          </h3>
        </div>
        {hasFilters ? (
          <button
            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-panel px-3.5 text-xs font-bold text-muted transition-colors hover:border-line-strong hover:bg-app hover:text-app-text focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            onClick={() => onChange({ ...initialFinanceFilters })}
            type="button"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      <div className="finance-filter-grid grid items-end gap-3.5 md:grid-cols-2 xl:grid-cols-5">
        <label className={filterLabelClassName}>
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
      </div>

      {filters.datePreset === "custom" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 md:max-w-xl">
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
    filters.sellerUserId !== initialFinanceFilters.sellerUserId
  );
}

const datePresetOptions = [
  { label: "Todos", value: "all" },
  { label: "Este mês", value: "thisMonth" },
  { label: "Próximos 7 dias", value: "next7" },
  { label: "Próximos 30 dias", value: "next30" },
  { label: "Vencidos", value: "overdue" },
  { label: "Personalizado", value: "custom" },
] satisfies Array<{ label: string; value: FinanceDatePreset }>;

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
