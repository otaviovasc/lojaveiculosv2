import type {
  BillingChargeableItem,
  BillingChargePreview,
  BillingChargePreviewLineItem,
  BillingStoreAllocation,
} from "../ports/billingRepository.js";

export function createChargePreview(input: {
  allocations?: readonly BillingStoreAllocation[];
  chargeables?: readonly BillingChargeableItem[];
}): BillingChargePreview {
  const billableItems = input.chargeables?.length
    ? input.chargeables.filter((item) => item.amountCents > 0)
    : chargeablesFromAllocations(input.allocations ?? []);
  const subtotalCents = billableItems.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );

  return createChargePreviewFromBillableItems(billableItems, subtotalCents);
}

export function createChargeableItem(input: {
  endsAt?: Date | null;
  id: string;
  itemType: "addon" | "plan";
  label: string;
  periodEnd?: Date | null;
  periodStart?: Date | null;
  quantity: number;
  sourceId?: string | null;
  startsAt?: Date | null;
  storeId?: BillingStoreAllocation["storeId"] | null;
  storeName?: string | null;
  unitAmountCents: number;
}): BillingChargeableItem {
  const fullAmountCents = input.unitAmountCents * input.quantity;
  const proration = calculateProration({
    endsAt: input.endsAt ?? null,
    periodEnd: input.periodEnd ?? null,
    periodStart: input.periodStart ?? null,
    startsAt: input.startsAt ?? null,
  });

  return {
    amountCents: Math.round(fullAmountCents * proration.factor),
    description: chargeableDescription(input.itemType, input.quantity),
    endsAt: input.endsAt ?? null,
    fullAmountCents,
    id: input.id,
    itemType: input.itemType,
    label: input.label,
    periodEnd: input.periodEnd ?? null,
    periodStart: input.periodStart ?? null,
    prorationApplied: proration.applied,
    prorationFactor: proration.factor,
    quantity: input.quantity,
    sourceId: input.sourceId ?? null,
    startsAt: input.startsAt ?? null,
    storeId: input.storeId ?? null,
    storeName: input.storeName ?? null,
    unitAmountCents: input.unitAmountCents,
  };
}

function createChargePreviewFromBillableItems(
  billableItems: readonly BillingChargeableItem[],
  subtotalCents: number,
): BillingChargePreview {
  const lineItems: BillingChargePreviewLineItem[] = billableItems.map(
    (item) => ({
      ...item,
      allocationPercent: percentOfTotal(item.amountCents, subtotalCents),
      kind: "subscription_item",
    }),
  );

  return {
    cadence: "monthly",
    collectionMethod: "card_on_file",
    collectionTiming: "cycle_end",
    currency: "BRL",
    hasAgencyDiscount: false,
    lineItems,
    prorationPolicy: "store_days_active",
    subtotalCents,
    totalCents: subtotalCents,
  };
}

function chargeablesFromAllocations(
  allocations: readonly BillingStoreAllocation[],
): BillingChargeableItem[] {
  return allocations
    .filter((allocation) => allocation.monthlyAmountCents > 0)
    .map((allocation) => ({
      amountCents: allocation.monthlyAmountCents,
      description: allocation.planName
        ? `${allocation.planName} com ${allocation.addonCount} add-on(s)`
        : "Itens de assinatura alocados para a loja",
      endsAt: null,
      fullAmountCents: allocation.monthlyAmountCents,
      id: `allocation:${allocation.storeId}`,
      itemType: "plan",
      label: allocation.planName ?? "Assinatura da loja",
      periodEnd: null,
      periodStart: null,
      prorationApplied: false,
      prorationFactor: 1,
      quantity: 1,
      sourceId: null,
      startsAt: null,
      storeId: allocation.storeId,
      storeName: allocation.storeName,
      unitAmountCents: allocation.monthlyAmountCents,
    }));
}

function calculateProration(input: {
  endsAt: Date | null;
  periodEnd: Date | null;
  periodStart: Date | null;
  startsAt: Date | null;
}) {
  if (!input.periodStart || !input.periodEnd) {
    return { applied: false, factor: 1 };
  }

  const periodStart = input.periodStart.getTime();
  const periodEnd = input.periodEnd.getTime();
  if (periodEnd <= periodStart) return { applied: false, factor: 1 };

  const activeStart = Math.max(
    periodStart,
    input.startsAt?.getTime() ?? periodStart,
  );
  const activeEnd = Math.min(periodEnd, input.endsAt?.getTime() ?? periodEnd);
  const activeMs = Math.max(0, activeEnd - activeStart);
  const periodMs = periodEnd - periodStart;
  const factor = Math.round((activeMs / periodMs) * 10_000) / 10_000;

  return {
    applied: factor !== 1,
    factor,
  };
}

function chargeableDescription(itemType: "addon" | "plan", quantity: number) {
  return itemType === "plan"
    ? "Plano recorrente"
    : `Add-on recorrente x ${quantity}`;
}

function percentOfTotal(amountCents: number, totalCents: number) {
  if (totalCents <= 0) return 0;
  return Math.round((amountCents / totalCents) * 10_000) / 100;
}
