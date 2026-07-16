import { CalendarDays, CircleDollarSign, Hash, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import type { CommissionSaleGroup } from "./commissionWorkspaceModel";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import { originLabel } from "./commissionEntryMeta";
import { SaleVehicleSnapshotCard } from "../sales/SaleVehicleSnapshotCard";

export function CommissionSaleDetailsDialog({
  onClose,
  saleGroup,
  sellerName,
}: {
  onClose: () => void;
  saleGroup: CommissionSaleGroup;
  sellerName: string;
}) {
  const { sale } = saleGroup;
  return (
    <FeatureDialog
      className="commission-dialog"
      icon={<CircleDollarSign aria-hidden="true" />}
      isOpen
      onClose={onClose}
      title="Detalhes da venda e comissões"
    >
      <div className="grid gap-4">
        <SaleVehicleSnapshotCard listingSnapshot={sale.listingSnapshot} />
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Detail
            icon={CalendarDays}
            label="Fechamento"
            value={
              sale.closedAt
                ? formatDate(sale.closedAt)
                : "Sem data de fechamento"
            }
          />
          <Detail icon={UserRound} label="Vendedor" value={sellerName} />
          <Detail
            icon={CircleDollarSign}
            label="Valor vendido"
            value={formatCurrency(sale.salePriceCents ?? 0)}
          />
          <Detail icon={Hash} label="ID da venda" value={sale.id.slice(0, 8)} />
        </section>
        <section className="overflow-hidden rounded-lg border border-line">
          <div className="flex items-center justify-between gap-3 bg-app-elevated/35 px-4 py-3">
            <p className="text-xs font-black text-app-text">
              Composição da comissão
            </p>
            <p className="text-sm font-black text-accent-strong">
              {formatCurrency(saleGroup.totalCents)}
            </p>
          </div>
          {saleGroup.origins.length ? (
            <div className="divide-y divide-line">
              {saleGroup.origins.map((origin) => (
                <div
                  className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3"
                  key={origin.origin}
                >
                  <div>
                    <p className="text-xs font-black text-app-text">
                      {originLabel(origin.origin)}
                    </p>
                    <p className="text-xs font-bold text-muted">
                      {origin.count} lançamento(s)
                    </p>
                  </div>
                  <div className="text-right text-xs font-bold">
                    <p className="text-app-text">
                      {formatCurrency(origin.totalCents)}
                    </p>
                    <p className="text-muted">
                      {formatCurrency(origin.pendingCents)} pendente
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-5 text-sm font-bold text-muted">
              Nenhuma comissão ativa foi atribuída a {sellerName} nesta venda.
            </p>
          )}
        </section>
      </div>
    </FeatureDialog>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-app p-3">
      <Icon aria-hidden="true" className="mb-2 size-4 text-accent-strong" />
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-app-text">
        {value}
      </p>
    </div>
  );
}
