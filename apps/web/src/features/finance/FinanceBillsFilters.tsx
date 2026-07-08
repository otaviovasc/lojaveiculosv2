import { CalendarClock, Filter, Link2, UserRound } from "lucide-react";
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
import type { FinanceFilters } from "./financeBillsModel";
import type { FinanceEntry } from "./types";

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

  return (
    <FeatureToolbar>
      <div className="mb-3 flex items-center gap-2">
        <Filter aria-hidden="true" className="size-4 text-accent-strong" />
        <h3 className="text-sm font-black text-app-text">Filtros</h3>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_11rem_11rem_12rem]">
        <label className="grid gap-2 text-sm font-black text-app-text">
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
        <label className="grid gap-2 text-sm font-black text-app-text">
          Status
          <FeatureSelect
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
          Período
          <FeatureSelect
            leftIcon={<CalendarClock aria-hidden="true" className="size-4" />}
            onChange={(datePreset) =>
              onChange({
                ...filters,
                datePreset,
                window: datePreset,
              })
            }
            options={
              [
                { label: "Todos", value: "all" },
                { label: "Este mês", value: "thisMonth" },
                { label: "Próximos 7 dias", value: "next7" },
                { label: "Próximos 30 dias", value: "next30" },
                { label: "Vencidos", value: "overdue" },
                { label: "Personalizado", value: "custom" },
              ] satisfies Array<{ label: string; value: FinanceDatePreset }>
            }
            value={filters.datePreset}
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-app-text">
          Origem
          <FeatureSelect
            leftIcon={<Link2 aria-hidden="true" className="size-4" />}
            onChange={(source) => onChange({ ...filters, source })}
            options={sourceOptions}
            value={filters.source}
          />
        </label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-black text-app-text">
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
        {filters.datePreset === "custom" ? (
          <>
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
          </>
        ) : null}
      </div>
    </FeatureToolbar>
  );
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
