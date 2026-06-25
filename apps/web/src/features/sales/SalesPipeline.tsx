import { Plus, Search } from "lucide-react";
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
  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-line bg-panel p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-app-text">Pipeline</h2>
          <p className="text-xs font-bold text-muted">{sales.length} vendas</p>
        </div>
        <button
          aria-label="Criar venda"
          className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-inverse hover:bg-accent-strong"
          onClick={onCreate}
          type="button"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["all", "draft", "pending", "closed"] as const).map((status) => (
          <button
            className={
              "rounded-lg border px-3 py-2 text-xs font-black " +
              (filter === status
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-line bg-app-elevated text-muted hover:text-app-text")
            }
            key={status}
            onClick={() => onFilterChange(status)}
            type="button"
          >
            {status === "all" ? "Todas" : statusLabels[status]}
          </button>
        ))}
      </div>

      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-app-elevated px-3 text-muted">
        <Search className="size-4" />
        <span className="text-xs font-bold">
          Filtro por lead/veiculo no topo
        </span>
      </div>

      <div className="flex flex-col gap-2 overflow-auto pr-1">
        {sales.map((sale) => (
          <button
            className={
              "rounded-lg border p-3 text-left transition " +
              (activeId === sale.id
                ? "border-accent bg-accent-soft"
                : "border-line bg-app-elevated hover:border-accent/50")
            }
            key={sale.id}
            onClick={() => onSelect(sale)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="truncate text-sm text-app-text">
                {saleSnapshotTitle(sale)}
              </strong>
              <StatusBadge status={sale.status} />
            </div>
            <p className="mt-2 text-xs font-bold text-muted">
              {sale.leadId ? `Lead ${sale.leadId.slice(0, 8)}` : "Sem lead"}
            </p>
            <p className="mt-1 text-xs font-black text-app-text">
              {formatCents(sale.salePriceCents)}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}

export function StatusBadge({ status }: { status: SaleStatus }) {
  return (
    <span className="shrink-0 rounded-full border border-line bg-panel px-2 py-1 text-[11px] font-black text-muted">
      {statusLabels[status]}
    </span>
  );
}

function saleSnapshotTitle(sale: SaleRecord): string {
  const title = sale.listingSnapshot.title;
  if (typeof title === "string" && title.trim()) return title;
  const buyer = sale.buyerSnapshot.name;
  if (typeof buyer === "string" && buyer.trim()) return buyer;
  return `Venda ${sale.id.slice(0, 8)}`;
}
