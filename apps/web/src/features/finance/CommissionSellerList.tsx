import {
  CheckCircle2,
  Gift,
  HandCoins,
  Pencil,
  XCircle,
} from "lucide-react";
import {
  pendingSellerEntries,
  type CommissionFilters,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import {
  entryDescription,
  entryReference,
  originLabel,
} from "./commissionEntryMeta";
import { FinanceBadge, financeStatusLabels } from "./FinanceFormParts";
import type { FinanceEntry } from "./types";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import { CommissionIconAction, SellerMetric } from "./CommissionSellerParts";

export function CommissionSellerList({
  filters,
  isPayingSellerId,
  onCancel,
  onEdit,
  onOpenBonus,
  onOpenPay,
  sellers,
}: {
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
  filters,
  isPaying,
  onCancel,
  onEdit,
  onOpenBonus,
  onOpenPay,
  seller,
}: {
  filters: CommissionFilters;
  isPaying: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onOpenBonus: (seller: CommissionSellerGroup) => void;
  onOpenPay: (seller: CommissionSellerGroup) => void;
  seller: CommissionSellerGroup;
}) {
  const payableEntries = pendingSellerEntries(seller, filters);
  const canPay = seller.sellerId !== "unassigned" && payableEntries.length > 0;

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
                {seller.count} lancamento(s) no filtro atual
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
          <button
            className="flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-inverse disabled:opacity-60"
            disabled={!canPay || isPaying}
            onClick={() => onOpenPay(seller)}
            type="button"
          >
            <HandCoins aria-hidden="true" className="size-4" />
            Pagar vendedor
          </button>
          <button
            className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-app-text"
            onClick={() => onOpenBonus(seller)}
            type="button"
          >
            <Gift aria-hidden="true" className="size-4" />
            Bonus
          </button>
          {!canPay ? (
            <span className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-accent-strong">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Sem pendencias
            </span>
          ) : null}
        </div>
      </div>
      {seller.origins.map((origin) => (
        <OriginGroup
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
  onCancel,
  onEdit,
  origin,
}: {
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
            {origin.count} lancamento(s)
          </span>
        </div>
        <span className="text-xs font-black text-app-text">
          {formatCurrency(origin.pendingCents)} a pagar
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-xs font-black uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Lancamento</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {origin.entries.map((entry) => (
              <CommissionRow
                entry={entry}
                key={entry.id}
                onCancel={onCancel}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommissionRow({
  entry,
  onCancel,
  onEdit,
}: {
  entry: FinanceEntry;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <strong className="block text-app-text">{entry.name}</strong>
        {entryDescription(entry) ? (
          <span className="text-xs font-bold text-muted">
            {entryDescription(entry)}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 font-bold text-muted">{entryReference(entry)}</td>
      <td className="px-4 py-3 font-bold text-muted">{formatDate(entry.dueAt)}</td>
      <td className="px-4 py-3">
        <FinanceBadge>{financeStatusLabels[entry.status]}</FinanceBadge>
      </td>
      <td className="px-4 py-3 text-right font-black text-app-text">
        {formatCurrency(entry.amountCents)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <CommissionIconAction
            icon={<Pencil aria-hidden="true" className="size-4" />}
            label="Editar comissao"
            onClick={() => onEdit(entry)}
          />
          <CommissionIconAction
            disabled={entry.status === "cancelled"}
            icon={<XCircle aria-hidden="true" className="size-4" />}
            label="Cancelar comissao"
            onClick={() => onCancel(entry)}
          />
        </div>
      </td>
    </tr>
  );
}
