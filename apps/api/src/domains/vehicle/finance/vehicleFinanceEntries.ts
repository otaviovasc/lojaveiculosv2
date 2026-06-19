import type {
  FinanceEntryBundle,
  FinanceRepository,
} from "../../finance/ports/financeRepository.js";
import type { VehicleCost } from "../ports/vehicleOperationsRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import type { VehicleSaleBundle } from "../ports/vehicleSalesRepository.js";

export async function createReservationFinanceEntry(input: {
  financeRepository: FinanceRepository;
  listing: VehicleListing;
  paymentMethod: string;
  sale: VehicleSaleBundle;
  sellerUserId: string | null;
  signalAmountCents: number;
  unit: VehicleUnit;
}): Promise<FinanceEntryBundle> {
  return input.financeRepository.createEntry({
    amountCents: input.signalAmountCents,
    category: "vehicle_reservation_signal",
    dueAt: new Date(),
    links: saleLinks(input.sale, input.listing, input.unit),
    metadata: {
      method: input.paymentMethod,
      salePaymentStatus: input.sale.payment?.status ?? null,
      source: "vehicle_reservation",
    },
    name: `Sinal de reserva - ${input.listing.title}`,
    paidAt: input.sale.payment?.paidAt ?? null,
    sellerUserId: input.sellerUserId,
    status: input.sale.payment?.status === "paid" ? "paid" : "pending",
    storeId: input.sale.sale.storeId,
    tenantId: input.sale.sale.tenantId,
    type: "revenue",
  });
}

export async function createSaleFinanceEntry(input: {
  financeRepository: FinanceRepository;
  listing: VehicleListing;
  paymentMethod: string;
  sale: VehicleSaleBundle;
  sellerUserId: string | null;
  unit: VehicleUnit;
}): Promise<FinanceEntryBundle> {
  const paidAt = input.sale.payment?.paidAt ?? new Date();
  return input.financeRepository.createEntry({
    amountCents:
      input.sale.payment?.amountCents ?? input.sale.sale.salePriceCents,
    category: "vehicle_sale",
    dueAt: paidAt,
    links: saleLinks(input.sale, input.listing, input.unit),
    metadata: {
      method: input.paymentMethod,
      salePaymentStatus: input.sale.payment?.status ?? null,
      source: "vehicle_sale",
    },
    name: `Venda de veiculo - ${input.listing.title}`,
    paidAt,
    sellerUserId: input.sellerUserId,
    status: "paid",
    storeId: input.sale.sale.storeId,
    tenantId: input.sale.sale.tenantId,
    type: "revenue",
  });
}

export async function createVehicleCostFinanceEntry(input: {
  cost: VehicleCost;
  financeRepository: FinanceRepository;
  listing: VehicleListing;
}): Promise<FinanceEntryBundle> {
  return input.financeRepository.createEntry({
    amountCents: input.cost.amountCents,
    category: `vehicle_${input.cost.kind}`,
    dueAt: input.cost.costDate,
    links: [
      { targetId: input.cost.id, targetType: "vehicle_cost" },
      { targetId: input.cost.unitId, targetType: "vehicle_unit" },
      { targetId: input.listing.id, targetType: "vehicle_listing" },
    ],
    metadata: {
      description: input.cost.description,
      kind: input.cost.kind,
      source: "vehicle_cost",
    },
    name: `Custo de veiculo - ${input.listing.title}`,
    paidAt: input.cost.costDate,
    sellerUserId: null,
    status: "paid",
    storeId: input.cost.storeId ?? "",
    tenantId: input.cost.tenantId ?? "",
    type: "expense",
  });
}

function saleLinks(
  sale: VehicleSaleBundle,
  listing: VehicleListing,
  unit: VehicleUnit,
) {
  return [
    { targetId: sale.sale.id, targetType: "sale" as const },
    ...(sale.payment
      ? [{ targetId: sale.payment.id, targetType: "sale_payment" as const }]
      : []),
    { targetId: listing.id, targetType: "vehicle_listing" as const },
    { targetId: unit.id, targetType: "vehicle_unit" as const },
  ];
}
