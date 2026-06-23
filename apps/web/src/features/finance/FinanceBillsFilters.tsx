import { Filter, Search } from "lucide-react";
import type { FinanceFilters } from "./financeBillsModel";
import { FinanceInput, FinanceSelect } from "./FinanceFormParts";

export function FinanceBillsFilters({
  filters,
  onChange,
}: {
  filters: FinanceFilters;
  onChange: (filters: FinanceFilters) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Filter aria-hidden="true" className="size-4 text-accent-strong" />
        <h3 className="text-sm font-black text-app-text">Filtros</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
        <label className="grid gap-2 text-sm font-black text-app-text">
          Buscar
          <span className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <FinanceInput
              className="pl-9"
              onChange={(event) =>
                onChange({ ...filters, query: event.target.value })
              }
              placeholder="Descricao ou categoria"
              value={filters.query}
            />
          </span>
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
          Janela
          <FinanceSelect
            onChange={(window) =>
              onChange({
                ...filters,
                window,
              })
            }
            options={[
              { label: "Proximos 30 dias", value: "next30" },
              { label: "Vencidos", value: "overdue" },
              { label: "Todos", value: "all" },
            ]}
            value={filters.window}
          />
        </label>
      </div>
    </section>
  );
}
