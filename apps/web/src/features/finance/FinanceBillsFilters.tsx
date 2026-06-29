import { Filter } from "lucide-react";
import {
  FeatureSearchField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureToolbar } from "../../components/ui/FeatureLayout";
import type { FinanceFilters } from "./financeBillsModel";

export function FinanceBillsFilters({
  filters,
  onChange,
}: {
  filters: FinanceFilters;
  onChange: (filters: FinanceFilters) => void;
}) {
  return (
    <FeatureToolbar>
      <div className="mb-3 flex items-center gap-2">
        <Filter aria-hidden="true" className="size-4 text-accent-strong" />
        <h3 className="text-sm font-black text-app-text">Filtros</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
        <label className="grid gap-2 text-sm font-black text-app-text">
          Buscar
          <FeatureSearchField
            label="Buscar"
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="Descricao ou categoria"
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
          Janela
          <FeatureSelect
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
    </FeatureToolbar>
  );
}
