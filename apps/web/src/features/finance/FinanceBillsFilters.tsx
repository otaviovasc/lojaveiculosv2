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
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as FinanceFilters["status"],
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
          Janela
          <FinanceSelect
            onChange={(event) =>
              onChange({
                ...filters,
                window: event.target.value as FinanceFilters["window"],
              })
            }
            value={filters.window}
          >
            <option value="next30">Proximos 30 dias</option>
            <option value="overdue">Vencidos</option>
            <option value="all">Todos</option>
          </FinanceSelect>
        </label>
      </div>
    </section>
  );
}
