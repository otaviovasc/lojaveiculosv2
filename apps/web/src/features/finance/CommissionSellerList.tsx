import {
  AlertTriangle,
  Banknote,
  BadgeDollarSign,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gift,
  HandCoins,
  Sigma,
} from "lucide-react";
import { useState } from "react";
import { FeatureStatCard } from "../../components/ui/FeatureCards";
import {
  pendingSellerEntries,
  type CommissionFilters,
  type CommissionOriginGroup,
  type CommissionSaleGroup,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import { originLabel } from "./commissionEntryMeta";
import { CommissionMobileCard, CommissionRow } from "./CommissionEntryViews";
import {
  CommissionSaleCard,
  CommissionTableHeader,
} from "./CommissionSaleCard";
import { FinanceBadge } from "./FinanceFormParts";
import type { FinanceEntry } from "./types";
import { formatCurrency } from "./financeBillsFormat";

export function CommissionSellerList({
  canCreate = true,
  canUpdate = true,
  filters,
  isPayingSellerId,
  onCancel,
  onEdit,
  onOpenBonus,
  onOpenPay,
  onViewSale,
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
  onViewSale: (sale: CommissionSaleGroup, sellerName: string) => void;
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
          onViewSale={onViewSale}
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
  onViewSale,
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
  onViewSale: (sale: CommissionSaleGroup, sellerName: string) => void;
  seller: CommissionSellerGroup;
}) {
  const [expanded, setExpanded] = useState(true);
  const payableEntries = pendingSellerEntries(seller, filters);
  const canPay =
    canUpdate && seller.sellerId !== "unassigned" && payableEntries.length > 0;
  return (
    <article className="commission-seller-card overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="border-b border-line p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-black text-accent-strong">
              #{seller.rank}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-app-text">
                {seller.sellerName}
              </h3>
              <p className="text-xs font-bold text-muted">
                {seller.salesCount} venda(s) próprias · {seller.count}{" "}
                lançamento(s) aptos
                {seller.blockedCount > 0
                  ? ` · ${seller.blockedCount} em exceção`
                  : ""}
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5 xl:w-auto">
            <SellerMetric
              icon={Clock3}
              label="A pagar"
              tone="warning"
              value={formatCurrency(seller.pendingCents)}
            />
            <SellerMetric
              icon={CheckCircle2}
              label="Pago"
              tone="green"
              value={formatCurrency(seller.paidCents)}
            />
            <SellerMetric
              icon={Sigma}
              label="Comissão"
              tone="accent"
              value={formatCurrency(seller.totalCents)}
            />
            <SellerMetric
              icon={BadgeDollarSign}
              label="Vendas"
              tone="violet"
              value={String(seller.salesCount)}
            />
            <SellerMetric
              icon={Banknote}
              label="Valor vendido"
              tone="blue"
              value={formatCurrency(seller.salesValueCents)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canUpdate && canPay ? (
            <button
              aria-busy={isPaying}
              className="commission-seller-action flex min-h-11 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-accent-foreground disabled:opacity-60"
              disabled={isPaying}
              onClick={() => onOpenPay(seller)}
              type="button"
            >
              <HandCoins aria-hidden="true" className="size-4" />
              Fechar pendências
            </button>
          ) : null}
          {canCreate ? (
            <button
              className="commission-seller-action flex min-h-11 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-app-text"
              onClick={() => onOpenBonus(seller)}
              type="button"
            >
              <Gift aria-hidden="true" className="size-4" />
              Bônus
            </button>
          ) : null}
          {canUpdate && !canPay ? (
            <span className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-accent-strong">
              {seller.blockedCount > 0 ? (
                <AlertTriangle aria-hidden="true" className="size-4" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="size-4" />
              )}
              {seller.blockedCount > 0
                ? "Exceções bloqueadas"
                : "Sem pendências"}
            </span>
          ) : null}
          <button
            aria-expanded={expanded}
            className="commission-seller-action flex min-h-11 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-app-text"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded ? "Recolher detalhes" : "Ver vendas e comissões"}
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="grid gap-3 bg-app/35 p-3 sm:p-4">
          {seller.sales.map((sale) => (
            <CommissionSaleCard
              canUpdate={canUpdate}
              key={sale.sale.id}
              onCancel={onCancel}
              onEdit={onEdit}
              onViewSale={(selected) => onViewSale(selected, seller.sellerName)}
              saleGroup={sale}
            />
          ))}
          {groupAdjustmentOrigins(seller.adjustments).map((origin) => (
            <AdjustmentGroup
              canUpdate={canUpdate}
              key={origin.origin}
              onCancel={onCancel}
              onEdit={onEdit}
              origin={origin}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SellerMetric(props: {
  icon: typeof Clock3;
  label: string;
  tone: "accent" | "blue" | "green" | "violet" | "warning";
  value: string;
}) {
  return <FeatureStatCard appearance="tinted" density="compact" {...props} />;
}

function AdjustmentGroup({
  canUpdate,
  onCancel,
  onEdit,
  origin,
}: {
  canUpdate: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  origin: CommissionOriginGroup;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-dashed border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-app-elevated px-4 py-3">
        <div className="flex items-center gap-2">
          <FinanceBadge>{originLabel(origin.origin)}</FinanceBadge>
          <span className="text-xs font-bold text-muted">
            Ajustes e exceções · {origin.count} lançamento(s)
          </span>
        </div>
        <span className="text-xs font-black text-app-text">
          {formatCurrency(origin.pendingCents)} pendente
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
    </section>
  );
}

function groupAdjustmentOrigins(entries: readonly FinanceEntry[]) {
  const groups = new Map<string, FinanceEntry[]>();
  for (const entry of entries) {
    const origin =
      typeof entry.metadata?.origin === "string"
        ? entry.metadata.origin
        : entry.category;
    groups.set(origin, [...(groups.get(origin) ?? []), entry]);
  }
  return [...groups.entries()].map(([origin, originEntries]) => ({
    count: originEntries.length,
    entries: originEntries,
    label: originLabel(origin),
    origin,
    paidCents: sumStatus(originEntries, "paid"),
    pendingCents: sumStatus(originEntries, "pending"),
    totalCents: originEntries.reduce(
      (total, entry) => total + entry.amountCents,
      0,
    ),
  }));
}

function sumStatus(
  entries: readonly FinanceEntry[],
  status: FinanceEntry["status"],
) {
  return entries.reduce(
    (total, entry) => total + (entry.status === status ? entry.amountCents : 0),
    0,
  );
}
