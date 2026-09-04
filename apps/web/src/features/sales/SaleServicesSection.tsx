import { useState } from "react";
import { Banknote } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import type { InventoryApi } from "../inventory/api/apiClient";
import { SaleField, SaleFormSection } from "./SaleWorkspaceForm";
import { localDateInputValue } from "./SalePaymentRow";
import { SaleServicesPaymentsSection } from "./SaleServicesPaymentsSection";
import { SaleServicesTabs } from "./SaleServicesTabs";
import { formatCents, parseCurrency } from "./saleServicesFormat";
import {
  financingPaymentSyncState,
  synchronizeSingleFinancingPayment,
} from "./salePaymentSync";
import { saleSourceOptions } from "./salesModel";
import { asSnapshotRecord } from "./salesSnapshot";
import type {
  ActiveServiceTab,
  ServiceChangeHandler,
  UpdateSale,
} from "./SaleServicesTypes";
import type { SaleRecord } from "./types";

export function ServicesSection({
  inventoryApi,
  sale,
  update,
}: {
  inventoryApi: InventoryApi | null;
  sale: SaleRecord;
  update: UpdateSale;
}) {
  const [activeTab, setActiveTab] = useState<ActiveServiceTab>("financing");

  const insurance = asSnapshotRecord(sale.saleSourceSnapshot.insurance);
  const financing = asSnapshotRecord(sale.saleSourceSnapshot.financing);
  const commission = asSnapshotRecord(sale.saleSourceSnapshot.commission);
  const documentation = asSnapshotRecord(sale.saleSourceSnapshot.documentation);
  const tradeIn = asSnapshotRecord(sale.saleSourceSnapshot.tradeIn);

  const handleServiceChange: ServiceChangeHandler = (
    serviceKey,
    field,
    value,
  ) => {
    update((draft) => {
      const currentService = asSnapshotRecord(
        draft.saleSourceSnapshot[serviceKey],
      );
      const nextService = {
        ...currentService,
        [field]: value,
      };
      const nextDraft = {
        ...draft,
        saleSourceSnapshot: {
          ...draft.saleSourceSnapshot,
          [serviceKey]: nextService,
        },
      };
      return serviceKey === "financing"
        ? synchronizeSingleFinancingPayment(nextDraft, nextService)
        : nextDraft;
    });
  };

  const handleSyncTradeInPayment = () => {
    update((draft) => {
      const currentTradeIn = asSnapshotRecord(draft.saleSourceSnapshot.tradeIn);
      const rawValuation = currentTradeIn.valuationCents;
      const valuation =
        typeof rawValuation === "number"
          ? rawValuation
          : typeof rawValuation === "string"
            ? Number(rawValuation) || 0
            : 0;
      if (valuation <= 0) return draft;

      const refParts = [
        currentTradeIn.brand,
        currentTradeIn.model,
        currentTradeIn.plate,
      ]
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean);
      const methodRef =
        refParts.length > 0 ? refParts.join(" · ") : "Veículo na Troca";

      const existingIndex = draft.payments.findIndex(
        (p) => p.method === "trade_in",
      );

      if (existingIndex >= 0) {
        return {
          ...draft,
          payments: draft.payments.map((p, idx) =>
            idx === existingIndex
              ? {
                  ...p,
                  amountCents: valuation + p.extraCents,
                  metadata: {
                    ...p.metadata,
                    methodReference: methodRef,
                  },
                  principalCents: valuation,
                }
              : p,
          ),
        };
      }

      return {
        ...draft,
        payments: [
          ...draft.payments,
          {
            amountCents: valuation,
            dueAt: localDateInputValue(),
            extraCents: 0,
            id: `draft-payment-${Date.now()}-${draft.payments.length}`,
            installments: null,
            metadata: { methodReference: methodRef },
            method: "trade_in",
            paidAt: null,
            principalCents: valuation,
            providerPaymentId: null,
            status: "pending",
          },
        ],
      };
    });
  };

  const tablePriceCents =
    (typeof sale.saleSourceSnapshot.tablePriceCents === "number"
      ? sale.saleSourceSnapshot.tablePriceCents
      : typeof sale.listingSnapshot.priceCents === "number"
        ? sale.listingSnapshot.priceCents
        : null) ?? null;

  const rawDiscount = sale.saleSourceSnapshot.discountCents;
  const discountCents =
    typeof rawDiscount === "number"
      ? rawDiscount
      : tablePriceCents &&
          sale.salePriceCents &&
          tablePriceCents > sale.salePriceCents
        ? tablePriceCents - sale.salePriceCents
        : 0;

  const handleTablePriceChange = (valCents: number | null) => {
    update((draft) => {
      const nextTable = valCents;
      const currentDiscount =
        typeof draft.saleSourceSnapshot.discountCents === "number"
          ? draft.saleSourceSnapshot.discountCents
          : 0;
      const nextSalePrice =
        nextTable !== null
          ? Math.max(0, nextTable - currentDiscount)
          : draft.salePriceCents;
      return {
        ...draft,
        salePriceCents: nextSalePrice,
        saleSourceSnapshot: {
          ...draft.saleSourceSnapshot,
          tablePriceCents: nextTable,
        },
      };
    });
  };

  const handleDiscountChange = (valCents: number) => {
    update((draft) => {
      const baseTable =
        (typeof draft.saleSourceSnapshot.tablePriceCents === "number"
          ? draft.saleSourceSnapshot.tablePriceCents
          : typeof draft.listingSnapshot.priceCents === "number"
            ? draft.listingSnapshot.priceCents
            : draft.salePriceCents) ??
        (draft.salePriceCents || 0);

      const nextSalePrice = Math.max(0, baseTable - valCents);
      return {
        ...draft,
        salePriceCents: nextSalePrice,
        saleSourceSnapshot: {
          ...draft.saleSourceSnapshot,
          discountCents: valCents > 0 ? valCents : null,
          tablePriceCents: baseTable > 0 ? baseTable : null,
        },
      };
    });
  };

  const handleSalePriceChange = (valCents: number | null) => {
    update((draft) => {
      const baseTable =
        (typeof draft.saleSourceSnapshot.tablePriceCents === "number"
          ? draft.saleSourceSnapshot.tablePriceCents
          : typeof draft.listingSnapshot.priceCents === "number"
            ? draft.listingSnapshot.priceCents
            : null) ?? null;

      const computedDiscount =
        baseTable !== null && valCents !== null && baseTable > valCents
          ? baseTable - valCents
          : null;

      return {
        ...draft,
        salePriceCents: valCents,
        saleSourceSnapshot: {
          ...draft.saleSourceSnapshot,
          discountCents: computedDiscount,
        },
      };
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SaleFormSection
        icon={<Banknote className="size-4.5 text-accent" />}
        title="1. Preço e Origem Comercial"
      >
        <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
          <SaleField label="Preço de Tabela (Anúncio)">
            <input
              className="sales-input font-bold text-muted"
              inputMode="numeric"
              onChange={(event) =>
                handleTablePriceChange(parseCurrency(event.target.value))
              }
              placeholder="R$ 0,00"
              value={tablePriceCents ? formatCents(tablePriceCents) : ""}
            />
          </SaleField>

          <SaleField label="Desconto Aplicado (R$)">
            <input
              className="sales-input font-bold text-danger-strong"
              inputMode="numeric"
              onChange={(event) =>
                handleDiscountChange(parseCurrency(event.target.value) || 0)
              }
              placeholder="R$ 0,00"
              value={discountCents > 0 ? formatCents(discountCents) : ""}
            />
          </SaleField>

          <SaleField label="Preço Final da Venda *">
            <input
              className="sales-input text-lg font-black text-accent-strong"
              inputMode="numeric"
              onChange={(event) =>
                handleSalePriceChange(parseCurrency(event.target.value))
              }
              placeholder="R$ 0,00"
              value={
                sale.salePriceCents ? formatCents(sale.salePriceCents) : ""
              }
            />
          </SaleField>
        </div>

        <div className="md:col-span-2">
          <SaleField label="Origem Comercial">
            <FeatureSelect
              ariaLabel="Origem comercial"
              className="sales-input"
              onChange={(source) =>
                update((draft) => ({
                  ...draft,
                  saleSourceSnapshot: {
                    ...draft.saleSourceSnapshot,
                    source,
                  },
                }))
              }
              options={saleSourceOptions}
              value={String(sale.saleSourceSnapshot.source ?? "lead")}
            />
          </SaleField>
        </div>
      </SaleFormSection>

      <SaleServicesPaymentsSection sale={sale} update={update} />

      <SaleServicesTabs
        activeTab={activeTab}
        commission={commission}
        documentation={documentation}
        financing={financing}
        financingPaymentSyncState={financingPaymentSyncState(sale, financing)}
        insurance={insurance}
        inventoryApi={inventoryApi}
        onChange={handleServiceChange}
        onSyncTradeInPayment={handleSyncTradeInPayment}
        onTabChange={setActiveTab}
        sale={sale}
        tradeIn={tradeIn}
      />
    </div>
  );
}
