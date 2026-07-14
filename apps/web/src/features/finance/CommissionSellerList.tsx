import { CheckCircle2, Gift, HandCoins } from "lucide-react";
import {
  pendingSellerEntries,
  type CommissionFilters,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import { originLabel } from "./commissionEntryMeta";
import { CommissionMobileCard, CommissionRow } from "./CommissionEntryViews";
import { FinanceBadge } from "./FinanceFormParts";
import type { FinanceEntry } from "./types";
import { formatCurrency } from "./financeBillsFormat";
import { SellerMetric } from "./CommissionSellerParts";

export function CommissionSellerList({
  canCreate = true,
  canUpdate = true,
  filters,
  isPayingSellerId,
  onCancel,
  onEdit,
  onOpenBonus,
  onOpenPay,
  sellers,
}: {
  canCreate?: boolean;
  canUpdate?: boolean;
  filters: CommissionFilters;
  isPayingSellerId: string | null;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onOpenBonus: (seller: CommissionSellerGroup) => void;
  onOpenPay: (seller: CommissionSellerGroup) => void;
  sellers: CommissionSellerGroup[];
}) {
  return (
    <section className="grid gap-4">
      {sellers.map((seller) => (
        <SellerCard
          canCreate={canCreate}
          canUpdate={canUpdate}
          filters={filters}
          isPaying={isPayingSellerId === seller.sellerId}
          key={seller.sellerId}
          onCancel={onCancel}
          onEdit={onEdit}
          onOpenBonus={onOpenBonus}
          onOpenPay={onOpenPay}
          seller={seller}
        />
      ))}
    </section>
  );
}

function SellerCard({
  canCreate,
  canUpdate,
  filters,
  isPaying,
  onCancel,
  onEdit,
  onOpenBonus,
  onOpenPay,
  seller,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  filters: CommissionFilters;
  isPaying: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onOpenBonus: (seller: CommissionSellerGroup) => void;
  onOpenPay: (seller: CommissionSellerGroup) => void;
  seller: CommissionSellerGroup;
}) {
  const payableEntries = pendingSellerEntries(seller, filters);
  const canPay =
    canUpdate && seller.sellerId !== "unassigned" && payableEntries.length > 0;

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="border-b border-line p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-black text-accent-strong">
              #{seller.rank}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-app-text">
                {seller.sellerName}
              </h3>
              <p className="text-xs font-bold text-muted">
                {seller.count} lançamento(s) no filtro atual
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SellerMetric label="A pagar" value={seller.pendingCents} />
            <SellerMetric label="Pago" value={seller.paidCents} />
            <SellerMetric label="Total" value={seller.totalCents} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canUpdate ? (
            <button
              className="flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-accent-foreground disabled:opacity-60"
              disabled={!canPay || isPaying}
              onClick={() => onOpenPay(seller)}
              type="button"
            >
              <HandCoins aria-hidden="true" className="size-4" />
              Pagar vendedor
            </button>
          ) : null}
          {canCreate ? (
            <button
              className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-app-text"
              onClick={() => onOpenBonus(seller)}
              type="button"
            >
              <Gift aria-hidden="true" className="size-4" />
              Bônus
            </button>
          ) : null}
          {canUpdate && !canPay ? (
            <span className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-accent-strong">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Sem pendências
            </span>
          ) : null}
        </div>
      </div>
      {seller.origins.map((origin) => (
        <OriginGroup
          canUpdate={canUpdate}
          key={origin.origin}
          onCancel={onCancel}
          onEdit={onEdit}
          origin={origin}
        />
      ))}
    </article>
  );
}

function OriginGroup({
  canUpdate,
  onCancel,
  onEdit,
  origin,
}: {
  canUpdate: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  origin: CommissionSellerGroup["origins"][number];
}) {
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex flex-col gap-2 bg-app-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FinanceBadge>{originLabel(origin.origin)}</FinanceBadge>
          <span className="text-xs font-bold text-muted">
            {origin.count} lançamento(s)
          </span>
        </div>
        <span className="text-xs font-black text-app-text">
          {formatCurrency(origin.pendingCents)} a pagar
        </span>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-xs font-black uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Lançamento</th>
              <th className="px-4 py-3">Referência</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
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
  );
}
