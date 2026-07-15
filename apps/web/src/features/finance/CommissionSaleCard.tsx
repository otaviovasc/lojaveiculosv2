import { CalendarDays, Car, Eye, ReceiptText } from "lucide-react";
import { FinanceBadge } from "./FinanceFormParts";
import { CommissionMobileCard, CommissionRow } from "./CommissionEntryViews";
import { CommissionIconAction } from "./CommissionSellerParts";
import type { CommissionSaleGroup } from "./commissionWorkspaceModel";
import type { FinanceEntry } from "./types";
import { formatCurrency, formatDate } from "./financeBillsFormat";

export function CommissionSaleCard({
  canUpdate,
  onCancel,
  onEdit,
  onViewSale,
  saleGroup,
}: {
  canUpdate: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onViewSale: (sale: CommissionSaleGroup) => void;
  saleGroup: CommissionSaleGroup;
}) {
  const { sale } = saleGroup;
  const title =
    snapshotText(sale.listingSnapshot, "title") ?? "Veículo da venda";
  const mediaUrl = snapshotText(sale.listingSnapshot, "primaryMediaUrl");
  const plate = snapshotText(sale.listingSnapshot, "plate");
  const stock = snapshotText(sale.listingSnapshot, "unitLabel");
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="grid gap-4 border-b border-line bg-app-elevated/40 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-app">
            {mediaUrl ? (
              <img
                alt={title}
                className="size-full object-cover"
                src={mediaUrl}
              />
            ) : (
              <Car aria-hidden="true" className="size-7 text-muted" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-black text-app-text">
                {title}
              </h4>
              {!saleGroup.entries.length ? (
                sale.standardCommissionEnabled ? (
                  <FinanceBadge className="border-warning/35 bg-warning/10 text-warning-strong">
                    Sem comissão padrão
                  </FinanceBadge>
                ) : (
                  <FinanceBadge>Comissão padrão desativada</FinanceBadge>
                )
              ) : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-muted">
              <span>
                {plate
                  ? `Placa ${plate}`
                  : stock
                    ? `Estoque ${stock}`
                    : `Venda ${sale.id.slice(0, 8)}`}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                {sale.closedAt
                  ? formatDate(sale.closedAt)
                  : "Sem data de fechamento"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="grid grid-cols-2 gap-x-5 text-right">
            <SaleMetric
              label="Valor da venda"
              value={formatCurrency(sale.salePriceCents ?? 0)}
            />
            <SaleMetric
              label="Comissão"
              value={formatCurrency(saleGroup.totalCents)}
            />
          </div>
          <CommissionIconAction
            icon={<Eye aria-hidden="true" className="size-4" />}
            label={`Detalhar venda ${title}`}
            onClick={() => onViewSale(saleGroup)}
          />
        </div>
      </div>
      {saleGroup.origins.length ? (
        saleGroup.origins.map((origin) => (
          <div
            className="border-b border-line last:border-b-0"
            key={origin.origin}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <FinanceBadge>{origin.label}</FinanceBadge>
                <span className="text-xs font-bold text-muted">
                  {origin.count} lançamento(s)
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-app-text">
                <ReceiptText
                  aria-hidden="true"
                  className="size-3.5 text-accent-strong"
                />
                {formatCurrency(origin.pendingCents)} pendente ·{" "}
                {formatCurrency(origin.paidCents)} pago
              </span>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-left text-sm">
                <CommissionTableHeader />
                <tbody className="divide-y divide-line">
                  {origin.entries.map((entry) => (
                    <CommissionRow
                      canUpdate={canUpdate}
                      entry={entry}
                      key={entry.id}
                      onCancel={onCancel}
                      onEdit={onEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {origin.entries.map((entry) => (
                <CommissionMobileCard
                  canUpdate={canUpdate}
                  entry={entry}
                  key={entry.id}
                  onCancel={onCancel}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="px-4 py-3 text-xs font-bold text-muted">
          Esta venda está fechada, mas não possui comissão ativa vinculada.
        </div>
      )}
    </article>
  );
}

export function CommissionTableHeader() {
  return (
    <thead className="sr-only">
      <tr>
        <th>Lançamento</th>
        <th>Referência</th>
        <th>Vencimento</th>
        <th>Status</th>
        <th>Valor</th>
        <th>Ações</th>
      </tr>
    </thead>
  );
}

function SaleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="text-sm font-black text-app-text">{value}</p>
    </div>
  );
}

export function snapshotText(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return typeof value === "string" && value.trim() ? value : null;
}
