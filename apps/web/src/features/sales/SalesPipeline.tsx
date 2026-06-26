import { Car, Layers, Plus, Search, User } from "lucide-react";
import { useState } from "react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { formatCents } from "./salesModel";
import type { SaleRecord, SaleStatus } from "./types";

const statusLabels: Record<SaleStatus, string> = {
  cancelled: "Cancelada",
  closed: "Fechada",
  draft: "Rascunho",
  pending: "Reservada",
};

export function SalesPipeline({
  activeId,
  filter,
  onCreate,
  onFilterChange,
  onSelect,
  sales,
}: {
  activeId: string | null;
  filter: SaleStatus | "all";
  onCreate: () => void;
  onFilterChange: (status: SaleStatus | "all") => void;
  onSelect: (sale: SaleRecord) => void;
  sales: readonly SaleRecord[];
}) {
  const [search, setSearch] = useState("");

  const filteredSales = sales.filter((sale) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const title = saleSnapshotTitle(sale).toLowerCase();
    const buyer = String(sale.buyerSnapshot.name ?? "").toLowerCase();
    const id = sale.id.toLowerCase();
    const lead = String(sale.leadId ?? "").toLowerCase();
    const unit = String(sale.unitId ?? "").toLowerCase();
    return (
      title.includes(query) ||
      buyer.includes(query) ||
      id.includes(query) ||
      lead.includes(query) ||
      unit.includes(query)
    );
  });

  return (
    <aside className="sales-glass-panel sales-pipeline-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent-strong">
            <Layers className="size-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-app-text tracking-wide uppercase">
              Pipeline
            </h2>
            <p className="text-[11px] font-bold text-muted">
              {filteredSales.length} de {sales.length} listadas
            </p>
          </div>
        </div>
        <button
          aria-label="Criar venda"
          className="sales-primary-button !min-h-9 !h-9 !w-9 !p-0 !rounded-lg"
          onClick={onCreate}
          type="button"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(["all", "draft", "pending", "closed"] as const).map((status) => (
          <button
            className={
              "sales-filter-btn " +
              (filter === status ? "sales-filter-btn-active" : "")
            }
            key={status}
            onClick={() => onFilterChange(status)}
            type="button"
          >
            {status === "all" ? "Todas" : statusLabels[status]}
          </button>
        ))}
      </div>

      <div className="sales-search-container">
        <Search className="size-4 text-muted" />
        <input
          className="sales-search-input"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por lead, comprador ou modelo..."
          type="text"
          value={search}
        />
      </div>

      <div className="sales-list-container">
        {filteredSales.length === 0 ? (
          <div className="text-center py-8 text-xs font-bold text-muted border border-dashed border-line rounded-xl">
            Nenhuma venda encontrada
          </div>
        ) : (
          filteredSales.map((sale) => (
            <button
              className={
                "sales-card-item " +
                (activeId === sale.id ? "sales-card-item-active" : "")
              }
              key={sale.id}
              onClick={() => onSelect(sale)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-app-text font-black text-xs min-w-0">
                    <Car className="size-3.5 text-muted shrink-0" />
                    <span className="truncate">{saleSnapshotTitle(sale)}</span>
                  </div>
                  {typeof sale.buyerSnapshot.name === "string" &&
                    sale.buyerSnapshot.name && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted mt-1 min-w-0">
                        <User className="size-3 text-muted shrink-0" />
                        <span className="truncate">
                          {String(sale.buyerSnapshot.name)}
                        </span>
                      </div>
                    )}
                </div>
                <FeatureStatusBadge
                  className="shrink-0"
                  tone={saleStatusTone(sale.status)}
                >
                  {statusLabels[sale.status]}
                </FeatureStatusBadge>
              </div>

              <div className="flex items-center justify-between border-t border-line/40 pt-2 mt-1">
                <span className="text-[10px] font-bold text-muted">
                  {sale.leadId
                    ? `Lead: ${sale.leadId.slice(0, 8)}`
                    : "Sem lead vinculado"}
                </span>
                <span className="text-xs font-black text-accent-strong">
                  {sale.salePriceCents
                    ? formatCents(sale.salePriceCents)
                    : "Preço pendente"}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

function saleStatusTone(status: SaleStatus) {
  if (status === "closed") return "success";
  if (status === "pending") return "warning";
  if (status === "draft") return "blue";
  return "neutral";
}

function saleSnapshotTitle(sale: SaleRecord): string {
  const title = sale.listingSnapshot.title;
  if (typeof title === "string" && title.trim()) return title;
  const buyer = sale.buyerSnapshot.name;
  if (typeof buyer === "string" && buyer.trim()) return buyer;
  return `Venda ${sale.id.slice(0, 8)}`;
}
